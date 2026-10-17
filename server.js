// Local runner only. On Vercel, files in public/ are served as static files and api/*.js run as functions;
// this reproduces that so `npm start` behaves the same as production.
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, normalize } from "node:path";
import plan from "./api/plan.js";
import pdf from "./api/pdf.js";
import config from "./vercel.json" with { type: "json" };

const ROOT = new URL("./public/", import.meta.url);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".ttf": "font/ttf", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8", ".json": "application/json", ".mp4": "video/mp4", ".jpg": "image/jpeg" };
const HEADERS = Object.fromEntries(config.headers[0].headers.map((h) => [h.key, h.value]));
const API = { "/api/plan": plan, "/api/pdf": pdf };

http.createServer(async (req, res) => {
  for (const [k, v] of Object.entries(HEADERS)) res.setHeader(k, v);
  const { pathname } = new URL(req.url, "http://x");
  try {
    if (API[pathname]) return await API[pathname](req, res);
    // static files from public/ (cleanUrls: /legal → legal.html); normalize blocks ../ escapes
    const rel = normalize(pathname === "/" ? "index.html" : pathname.slice(1) + (extname(pathname) ? "" : ".html"));
    if (rel.startsWith("..")) throw new Error("bad path");
    const body = await readFile(new URL(rel, ROOT));
    const type = TYPES[extname(rel)] || "application/octet-stream";
    // byte ranges: iOS Safari refuses to play video without them
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
    if (range) {
      const start = range[1] ? +range[1] : body.length - +range[2], end = range[1] && range[2] ? Math.min(+range[2], body.length - 1) : body.length - 1;
      res.writeHead(206, { "Content-Type": type, "Accept-Ranges": "bytes", "Content-Range": `bytes ${start}-${end}/${body.length}` });
      return res.end(body.subarray(start, end + 1));
    }
    res.writeHead(200, { "Content-Type": type, "Accept-Ranges": "bytes" });
    res.end(body);
  } catch {
    if (!res.headersSent) { res.writeHead(404, { "Content-Type": "text/plain" }); res.end("Not found"); }
  }
}).listen(process.env.PORT || 3000, () => console.log(`http://localhost:${process.env.PORT || 3000}`));
