// GET /api/plan?<answers>  →  { plan }   (Vercel serverless function; also used by the local server)
import { fromQuery, validate, buildPlan } from "../plan.js";

export default function handler(req, res) {
  let answers;
  try { answers = validate(fromQuery(new URL(req.url, "http://x").searchParams)); }
  catch (e) { res.statusCode = 400; res.setHeader("Content-Type", "application/json"); return res.end(JSON.stringify({ error: e.message })); }
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store"); // always the current engine; plans are cheap to build
  res.end(JSON.stringify({ plan: buildPlan(answers) }));
}
