// GET /api/pdf?<answers>  →  the plan as a PDF
import { fromQuery, validate, buildPlan, renderPdf } from "../plan.js";

export default async function handler(req, res) {
  let answers;
  try { answers = validate(fromQuery(new URL(req.url, "http://x").searchParams)); }
  catch (e) { res.statusCode = 400; res.setHeader("Content-Type", "application/json"); return res.end(JSON.stringify({ error: e.message })); }
  const pdf = await renderPdf(buildPlan(answers));
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'attachment; filename="boris-plan.pdf"');
  res.setHeader("Cache-Control", "no-store");
  res.end(pdf);
}
