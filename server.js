import http from "node:http";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { validate, buildPlan, renderPdf } from "./plan.js";

try { process.loadEnvFile(".env"); } catch {} // .env is optional; real hosts set env vars directly
const env = process.env;
env.BASE_URL ||= `http://localhost:${env.PORT || 3000}`;

const db = new DatabaseSync(env.DB_PATH || "submissions.db");
db.exec(`CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY, email TEXT NOT NULL, answers TEXT NOT NULL, plan TEXT NOT NULL,
  emailed INTEGER NOT NULL DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`);
const get = db.prepare("SELECT * FROM submissions WHERE id = ?");

const figuresJs = readFileSync(new URL("./public/figures.js", import.meta.url), "utf8");
const html = readFileSync(new URL("./public/index.html", import.meta.url), "utf8");
const legal = readFileSync(new URL("./public/legal.html", import.meta.url), "utf8");
const FONTS = { "Geist-Light.ttf": 1, "Geist-Regular.ttf": 1, "Geist-Medium.ttf": 1, "Geist-SemiBold.ttf": 1 };

// security headers on every response: no framing, no sniffing, no third-party scripts
const SECURITY = {
  "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

// ponytail: in-memory rate limit, per process. Use the host's limiter / Redis if you run several instances.
const hits = new Map();
function limited(req) {
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress;
  const now = Date.now(), list = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  list.push(now); hits.set(ip, list);
  if (hits.size > 10_000) hits.clear();
  return list.length > 20; // 20 plans a minute per visitor is plenty
}

async function emailPlan(id, email, plan) {
  if (!env.RESEND_API_KEY) return console.warn("RESEND_API_KEY not set, skipping email");
  const pdf = await renderPdf(plan);
  const link = `${env.BASE_URL}/?id=${id}`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: email,
      subject: plan.title.replace(/^Your/, "Your free"),
      html: `<div style="background:#071a1c;color:#f3efe7;padding:32px;font-family:Helvetica,Arial,sans-serif">
        <p style="color:#f2a541;font-size:14px;font-weight:bold">Boris Calisthenics</p>
        <h1 style="font-size:26px;margin:8px 0 16px">${plan.title}</h1>
        <p>Your full plan is attached as a PDF. Open it any time here:</p>
        <p><a href="${link}" style="color:#f2a541">${link}</a></p>
        <p style="color:#8fb3b1">Save it, do the work, follow for more.</p>
        <p style="color:#f2a541;font-size:20px;font-weight:bold">Boris</p></div>`,
      attachments: [{ filename: "boris-plan.pdf", content: pdf.toString("base64") }],
    }),
  });
  if (!r.ok) throw new Error(`resend: ${await r.text()}`);
  db.prepare("UPDATE submissions SET emailed = 1 WHERE id = ?").run(id);
}

const send = (res, code, body, type = "application/json", extra = {}) => {
  res.writeHead(code, { "Content-Type": type, ...SECURITY, ...extra });
  res.end(type === "application/json" ? JSON.stringify(body) : body);
};

const readJson = (req) => new Promise((resolve, reject) => {
  let s = "";
  req.on("data", (c) => { s += c; if (s.length > 1e4) { reject(new Error("too large")); req.destroy(); } });
  req.on("end", () => { try { resolve(JSON.parse(s)); } catch (e) { reject(e); } });
});

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  try {
    if (req.method === "GET" && url.pathname === "/") return send(res, 200, html, "text/html; charset=utf-8");
    if (req.method === "GET" && url.pathname === "/legal") return send(res, 200, legal, "text/html; charset=utf-8");
    const font = url.pathname.match(/^\/fonts\/([\w-]+\.ttf)$/);
    if (req.method === "GET" && font && FONTS[font[1]]) return send(res, 200, readFileSync(new URL(`./fonts/${font[1]}`, import.meta.url)), "font/ttf", { "Cache-Control": "public, max-age=31536000, immutable" });
    if (req.method === "GET" && url.pathname === "/figures.js") return send(res, 200, figuresJs, "text/javascript; charset=utf-8", { "Cache-Control": "no-cache" });

    if (req.method === "POST" && url.pathname === "/api/plan") {
      if (limited(req)) return send(res, 429, { error: "too many requests" });
      let input;
      try { input = validate(await readJson(req)); } catch (e) { return send(res, 400, { error: e.message }); }
      const id = randomUUID();
      const plan = buildPlan(input.answers);
      db.prepare("INSERT INTO submissions (id, email, answers, plan) VALUES (?, ?, ?, ?)")
        .run(id, input.email, JSON.stringify(input.answers), JSON.stringify(plan));
      if (input.email) emailPlan(id, input.email, plan).catch((e) => console.error("email failed", id, e.message));
      return send(res, 200, { id, plan });
    }

    const row = url.searchParams.get("id") && get.get(url.searchParams.get("id"));
    if (url.pathname.startsWith("/api/") && !row) return send(res, 404, { error: "not found" });

    if (req.method === "GET" && url.pathname === "/api/plan") return send(res, 200, { plan: JSON.parse(row.plan) });

    if (req.method === "GET" && url.pathname === "/api/pdf") {
      const pdf = await renderPdf(JSON.parse(row.plan));
      return send(res, 200, pdf, "application/pdf", { "Content-Disposition": 'attachment; filename="boris-plan.pdf"' });
    }

    send(res, 404, { error: "not found" });
  } catch (e) {
    console.error(e);
    send(res, 500, { error: "server error" });
  }
}).listen(env.PORT || 3000, () => console.log(`http://localhost:${env.PORT || 3000}`));
