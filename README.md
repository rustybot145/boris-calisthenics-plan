# Boris Calisthenics: free skill plan

A 6-question quiz that builds a free 9-week calisthenics plan, shows every workout with an animated demo, and lets you download it as a PDF. Rule-based (no AI, no payments, no accounts).

```
npm install
npm start              # http://localhost:3000
npm test               # runs every skill × step × schedule through the plan engine
```

- `plan.js`: the plan engine. Exercises, progressions, sets/reps, "if too hard" options and move-on standards, taken from Boris's YouTube Shorts (video ids next to each entry). Grouped quiz answers → level → workouts. Also renders the PDF.
- `server.js`: routes, SQLite storage (`submissions.db`: quiz answers + plan under a random id), security headers, rate limiting.
- `public/index.html`: the whole frontend (landing, quiz, plan + download). `public/figures.js`: the animated exercise figures. `public/legal.html`: terms, health disclaimer and privacy.
- `fonts/`: Geist (SIL Open Font License, see `fonts/OFL.txt`), self-hosted so no visitor data goes to third parties.

## Config

All optional, via environment variables (see `.env.example`): `PORT`, `DB_PATH`, `BASE_URL`. The email delivery code (`RESEND_API_KEY`, `EMAIL_FROM`) is dormant: the quiz no longer asks for an email.

## Before launch

- Host on something with a persistent disk for `submissions.db` (Railway, Render, Fly with a volume). Serverless hosts lose the database.
- Behind a proxy, the rate limiter reads `X-Forwarded-For`; make sure your host sets it.
