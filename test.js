import assert from "node:assert/strict";
import { validate, buildPlan, renderPdf, levels, SKILLS } from "./plan.js";

const base = { goal: "handstand", check: 0, pushups: 2, pullups: 2, dips: 1, days: 3, minutes: 45, equipment: ["pullup_bar"], weakSpots: ["strength"] };
const v = validate({ email: " Fan@Example.com ", answers: { ...base, equipment: ["none", "dip_bars"] } });
assert.equal(v.email, "fan@example.com");
assert.deepEqual(v.answers.equipment, ["none"]); // "none" wins over real kit
assert.equal(validate({ answers: base }).email, ""); // email is optional
assert.throws(() => validate({ email: "nope", answers: base })); // but must be valid if given

const bad = (patch) => assert.throws(() => validate({ email: "a@b.co", answers: { ...base, ...patch } }));
bad({ goal: "backflip" });
bad({ days: 7 });
bad({ minutes: 25 });
bad({ pushups: 9 });
bad({ check: 99 });
bad({ equipment: [] });
bad({ weakSpots: ["ego"] });
bad({ goal: "front_lever", equipment: ["none"] }); // front lever needs a bar
bad({ goal: "front_lever", equipment: ["dip_bars"] }); // dip bars are not a pull-up bar
bad({ equipment: ["rings"] }); // rings are no longer an option
bad({ weakSpots: ["wrists"] }); // replaced by overall strength

// overall strength adds the basics finisher
{
  const day1 = buildPlan({ ...base, weakSpots: ["strength"] }).phases[0].sessions[0].exercises.filter((e) => e.block === "Weak spot").map((e) => e.name);
  assert.ok(day1.includes("Squats") && day1.some((n) => /pull-ups/i.test(n)), "strength finisher: squats + pull");
}

// dip bars: real dips, and rows on the bars when there is no pull-up bar
{
  const names = buildPlan({ ...base, equipment: ["dip_bars"], days: 6, minutes: 60 }).phases[0].sessions.flatMap((s) => s.exercises.map((e) => e.name));
  assert.ok(names.includes("Dips") && !names.includes("Bench or chair dips"), "dip bars give real dips");
  assert.ok(names.includes("Inverted rows on dip bars"), "dip bars give rows");
}

// grouped answers → levels
assert.equal(levels({ ...base, pushups: 0 }).overall, 1);
assert.equal(levels({ ...base, pushups: 4, pullups: 4, dips: 3 }).overall, 3);
assert.equal(levels({ ...base, pushups: 4, pullups: 0 }).overall, 1); // can't pull yet holds you back
assert.equal(levels({ ...base, pushups: 4, equipment: ["none"] }).overall, 3); // no bar: push decides

// every skill × starting step × schedule builds a complete plan
for (const [goal, s] of Object.entries(SKILLS)) {
  for (let check = 0; check < s.checks.length; check++) {
    for (const days of [2, 3, 4, 5, 6]) {
      for (const minutes of [20, 30, 45, 60]) {
        const p = buildPlan({ ...base, goal, check, days, minutes, weakSpots: ["strength", "balance", "core", "straight_arm"] });
        assert.equal(p.phases.length, 3);
        for (const ph of p.phases) {
          assert.equal(ph.sessions.length, days);
          for (const se of ph.sessions) {
            assert.ok(se.exercises.length >= 2, `${goal} ${check} ${days} ${minutes} ${se.title}`);
            for (const e of se.exercises) assert.ok(e.name && e.dose && !/undefined|NaN/.test(e.name + e.dose), JSON.stringify(e));
          }
        }
        assert.ok(!/undefined/.test(JSON.stringify(p)), `${goal} ${check}`);
      }
    }
  }
}

// skill check maps to the right starting step
assert.match(buildPlan({ ...base, check: 0 }).phases[0].name, /^Step 1: Build shoulder strength/);
assert.match(buildPlan({ ...base, check: 2 }).phases[0].name, /^Step 3: Kick up/);
assert.match(buildPlan({ ...base, goal: "front_lever", check: 2, pullups: 0 }).phases[0].name, /^Step 1: Your first pull-ups/);
assert.match(buildPlan({ ...base, goal: "front_lever", check: 1, pullups: 3 }).phases[0].name, /^Step 3: Advanced tuck/);
// final step pads with "own it" phases
assert.match(buildPlan({ ...base, goal: "oapu", check: 3 }).phases[2].name, /own it/);

const pdf = await renderPdf(buildPlan(base));
assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
console.log("ok");
