# Boris Calisthenics: free skill plan

A 6-question quiz that builds a free 9-week calisthenics plan, shows every workout with an animated demo, and lets you download it as a PDF. Rule-based: no AI, no payments, no accounts, no database.

## Deploy (Vercel)

Import the repo in Vercel and deploy. No settings or environment variables needed; `vercel.json` does the rest:

- `public/` is served as static files (`/legal` → `legal.html`).
- `api/plan.js` and `api/pdf.js` run as serverless functions.
- Security headers are set for every route.

Nothing is stored: the quiz answers live in the plan's link (`/?goal=handstand&check=1&...`), and the server rebuilds the plan or PDF from them on each request.

## Local

```
npm install
npm start              # http://localhost:3000, same routes as Vercel
npm test               # runs every skill × step × schedule through the plan engine
```

## Files

- `plan.js`: the plan engine. Exercises, progressions, sets/reps, "if too hard" options and move-on standards, taken from Boris's YouTube Shorts (video ids next to each entry). Grouped quiz answers → level → workouts. Also renders the PDF.
- `api/`: the two serverless functions.
- `public/index.html`: the whole frontend (landing, quiz, plan + download). `public/figures.js`: the animated exercise figures. `public/legal.html`: terms, health disclaimer and privacy.
- `public/fonts/`: Geist (SIL Open Font License, see `OFL.txt`), self-hosted so no visitor data goes to third parties.
- `server.js`: local runner that mimics Vercel.
