// Rule-based plan builder. Every exercise, dose, cue and "if too hard" option
// comes from Boris's own YouTube/Instagram tutorials (video ids noted per entry).
import PDFDocument from "pdfkit";
import { fileURLToPath } from "node:url";

export const yt = (id) => `https://www.youtube.com/shorts/${id}`;

/* ---------- answer groups ---------- */
export const PUSHUPS = ["0–4", "5–9", "10–19", "20–29", "30+"];
export const PULLUPS = ["0", "1–4", "5–9", "10–14", "15+", "No bar to test"];
export const DIPS = ["0", "1–9", "10–14", "15+", "Never tried"];
const EQUIPMENT = ["none", "pullup_bar", "parallettes", "dip_bars"];
const WEAK = ["strength", "balance", "core", "straight_arm"];
const LENGTHS = [20, 30, 45, 60];

/* ---------- exercise library ---------- */
// d = [sets, reps, unit]; reps can be "max". easier = Boris's "if too hard" option.
const E = (name, d, cue, easier, video) => ({ name, d, cue, easier, video });
const X = {
  // warm-up (wXHwsgq3y2M)
  buttKicks: E("Butt kicks", [1, 30, "s"], "Stay light on your feet.", null, "wXHwsgq3y2M"),
  kneeTouches: E("Knee touches", [1, 30, "s"], "Drive the knee up to your hand.", null, "wXHwsgq3y2M"),
  backLeans: E("Back leans", [2, 15, "s"], "Sit back on your heels, arms long.", null, "wXHwsgq3y2M"),
  forwardLeans: E("Forward leans", [2, 15, "s"], "Shoulders past your hands, slow.", null, "wXHwsgq3y2M"),
  toeTouch: E("Toe touch", [2, 10, "s"], "Legs straight, reach long.", "Do it on one side at a time.", "wXHwsgq3y2M"),
  lunges: E("Lunges", [1, 10, "/side"], "Back knee kisses the floor.", null, "wXHwsgq3y2M"),
  dorsalWrist: E("Dorsal wrist leans", [1, 10, ""], "Backs of the hands down, lean gently.", null, "wXHwsgq3y2M"),
  sideWrist: E("Side wrist leans", [1, 10, ""], "Fingers out to the side, rock slowly.", null, "wXHwsgq3y2M"),
  wristPumps: E("Wrist pumps", [1, 10, ""], "Lift the palms, keep the fingers down.", null, "wXHwsgq3y2M"),
  warmPushups: E("Push-ups", [2, 8, ""], "Easy pace, just waking the chest up.", "Do them on your knees.", "wXHwsgq3y2M"),

  // push (mBISugz345s, UhoE45gUSmA, T7ejXZD-dxc, 847N82W8LzU, k882INoXjCE, 3588bd49dAw, bQ4I5Qymf7M)
  pushups: E("Push-ups", [3, 15, ""], "Hands under shoulders, elbows 30–45°. Control the drop, then push hard.", "Do them on your knees.", "847N82W8LzU"),
  kneePushups: E("Knee push-ups", [3, 10, ""], "Straight line from knees to head.", "Hands on a chair or bench.", "bQ4I5Qymf7M"),
  widePushups: E("Wide push-ups", [4, 10, ""], "Hands wider than shoulders, chest to the floor.", "Do them on your knees.", "xONk63dM80k"),
  diamond: E("Diamond push-ups", [3, 10, ""], "Hands together under your chest, elbows back.", "Do them on your knees.", "mBISugz345s"),
  archer: E("Archer push-ups", [3, 8, "/side"], "Wide hands, arms angled out, turn the straight-arm hand 90° out.", "Do them on your knees.", "3588bd49dAw"),
  tricepExt: E("Tricep extension push-ups", [3, 12, ""], "Forearms to the floor, then press up to straight arms.", "Do them on your knees.", "mBISugz345s"),
  lean: E("Lean push-ups", [2, 8, ""], "Lean your shoulders past your hands. More lean = harder.", "Lean less.", "mBISugz345s"),
  pike: E("Pike push-ups", [3, 8, ""], "Walk into a pike, shoulders up, head goes in front of the hands, push back.", "Shorter range, keep the shape.", "k882INoXjCE"),
  vPush: E("V-push-ups", [3, 6, ""], "Hips high, head through the arms.", "Shoulder taps 3 × 12.", "T7ejXZD-dxc"),
  dips: E("Dips", [3, 10, ""], "Shoulders down, chest forward, full depth.", "Bench or chair dips.", "bQ4I5Qymf7M"),
  chairDips: E("Bench or chair dips", [3, 12, ""], "Hands behind you, elbows straight back.", "Bend your knees more.", "bQ4I5Qymf7M"),

  // pull (ckyjHYU2HgQ, rpUB4f2rCGE, nc2FJBj3lw0, xONk63dM80k)
  hang: E("Hang holds", [3, 20, "s"], "Grip hard, shoulders active.", "Keep your toes on a chair.", "rpUB4f2rCGE"),
  scapPulls: E("Scapula pull-ups", [3, 10, ""], "Straight arms, pull your shoulders down and back.", null, "rpUB4f2rCGE"),
  negPull: E("Negative pull-ups", [3, 10, ""], "Jump to the top, lower as slow as you can. Slower every time.", "Fewer reps, same slow lowering.", "rpUB4f2rCGE"),
  bandPull: E("Banded pull-ups", [3, 12, ""], "Chest to the bar, don't go straight up.", "Use a bench or chair to help.", "rpUB4f2rCGE"),
  pullups: E("Pull-ups", [4, "max", ""], "Chest to the bar, don't go straight up.", "Banded or negatives.", "ckyjHYU2HgQ"),
  chinups: E("Chin-ups", [4, "max", ""], "Palms toward you, chin over the bar.", "Negatives.", "ckyjHYU2HgQ"),
  widePull: E("Wide grip pull-ups", [4, "max", ""], "Wide hands, pull your elbows down to your sides.", "Regular grip.", "ckyjHYU2HgQ"),
  australian: E("Australian pull-ups", [4, "max", ""], "Body straight, pull your chest to the bar.", "Bend your knees.", "ckyjHYU2HgQ"),
  dipRows: E("Inverted rows on dip bars", [4, 8, ""], "Lie under the bars, body straight, pull your chest up to them.", "Bend your knees.", "xONk63dM80k"),
  tableRows: E("Body rows under a sturdy table", [3, "max", ""], "Body straight, pull your chest up to the edge.", "Bend your knees.", "xONk63dM80k"),
  supermans: E("Supermans", [4, 15, ""], "Lift arms and legs together, squeeze your lower back.", null, "ckyjHYU2HgQ"),

  // legs (8SHgz1JYGDM, xONk63dM80k, bQ4I5Qymf7M)
  squats: E("Squats", [3, 20, ""], "Chest up, full depth.", "Box squats onto a chair.", "bQ4I5Qymf7M"),
  jumpSquats: E("Jumping squats", [3, 10, ""], "Land soft, go straight into the next one.", "Regular squats.", "8SHgz1JYGDM"),
  lungesW: E("Lunges", [4, 10, "/leg"], "Back knee kisses the floor.", "Hold on to a chair.", "8SHgz1JYGDM"),
  sideLunges: E("Side lunges", [4, 10, "/side"], "Sit into one hip, other leg straight.", "Shorter range.", "8SHgz1JYGDM"),
  pistol: E("Pistol squats", [3, 6, "/leg"], "Other leg straight out front, slow down.", "Use support if too hard.", "xONk63dM80k"),
  shrimp: E("Shrimp squats", [3, 8, "/leg"], "Hold your back foot, knee to the floor.", "Use support if too hard.", "xONk63dM80k"),

  // core (T7ejXZD-dxc, UhoE45gUSmA, 8SHgz1JYGDM, xONk63dM80k, aoSJPvLPg_4)
  hollow: E("Hollow body hold", [3, "max", "s"], "Lower back glued to the floor.", "Bend your knees.", "T7ejXZD-dxc"),
  seatedLegLifts: E("Seated leg lifts", [3, 10, ""], "Hands next to your hips, lift straight legs.", "One leg at a time.", "UhoE45gUSmA"),
  legRaises: E("Leg raises", [3, 15, ""], "Slow down, don't drop.", "Bend your knees.", "8SHgz1JYGDM"),
  toeSitups: E("Toe sit-ups", [3, 15, ""], "Reach for your toes at the top.", null, "8SHgz1JYGDM"),
  plank: E("Plank", [3, 60, "s"], "Squeeze glutes, ribs down.", "Straighten your arms.", "xONk63dM80k"),
  reversePlank: E("Reverse plank, one leg lifted", [3, 20, "s/side"], "Hips high. Lifting one leg makes your core fight the rotation.", "Both feet down.", "aoSJPvLPg_4"),
  lsitHold: E("L-sit", [3, "max", "s"], "Lock your arms and push the floor away.", "Leg lifts 3 × max.", "T7ejXZD-dxc"),

  // extras for weak spots
  crow: E("Crow pose", [3, "max", "s"], "Knees on your elbows, lean until your feet float.", "Frog stand with feet touching.", "JPe2Qcn2-uo"),
  planchLean: E("Planche leans", [3, 15, "s"], "Straight arms, lean forward. More lean = better.", "Lean less.", "TT0d1alvT_k"),
};

/* ---------- skill paths (step-by-step, from his tutorials) ---------- */
// Each step: name, what to work on, exercises (dose = start dose), Boris's move-on standard.
const S = (name, about, ex, moveOn, video) => ({ name, about, ex, moveOn, video });
export const SKILLS = {
  handstand: {
    name: "Handstand", img: "handstand", video: "JPe2Qcn2-uo",
    steps: [
      S("Build shoulder strength", "Get your shoulders strong enough to hold you upside down.",
        [E("Elevated pike hold", [3, 20, "s"], "Feet on a chair, hips over your hands.", "Feet on the floor.", "JPe2Qcn2-uo"),
         E("Chest-to-wall handstand", [3, 15, "s"], "Walk your feet up the wall, chest facing it, push the floor away.", "Hold the pike instead.", "UhoE45gUSmA")],
        "Hold a chest-to-wall handstand for 30 seconds", "JPe2Qcn2-uo"),
      S("Balance", "Teach your fingers and wrists to do the balancing.",
        [X.crow, E("Flutter kicks at the wall", [3, 20, "s"], "Belly to the wall, move one foot off at a time.", "Keep both feet on.", "JPe2Qcn2-uo")],
        "Hold crow pose for 15 seconds", "JPe2Qcn2-uo"),
      S("Kick up", "Get up there with control, and learn to come down safely.",
        [E("Kick-ups to the wall", [5, 3, ""], "Hands down, kick with straight legs, soft feet to the wall.", "Smaller kicks.", "JPe2Qcn2-uo"),
         E("Falling safely", [3, 3, "/side"], "Turn one hand out and step down sideways.", null, "JPe2Qcn2-uo")],
        "Kick up to the wall 5 times in a row and bail out safely both ways", "JPe2Qcn2-uo"),
      S("Duration holds", "Build the hold time you'll need away from the wall.",
        [E("Wall-assisted handstand hold", [4, 20, "s"], "Back to the wall, light heels, stack up.", "Chest-to-wall instead.", "JPe2Qcn2-uo"),
         E("Bent arm handstand", [3, 3, ""], "Grip the floor, knees on elbows, head down, tuck, extend, push and lift your head.", "Stay tucked.", "oBXZ7Fta5qY")],
        "Hold 2 × 30 seconds on the wall", "UhoE45gUSmA"),
      S("Freestanding handstand", "Apply every step. Kick up, find the balance, hold.",
        [E("Freestanding attempts", [10, 1, " tries"], "Kick up light, push the floor, fingers fix the balance.", "Back to wall holds.", "JPe2Qcn2-uo"),
         E("Freestanding hold", [5, "max", "s"], "Squeeze everything, push tall.", null, "JPe2Qcn2-uo")],
        "Hold a freestanding handstand for 10 seconds", "JPe2Qcn2-uo"),
    ],
    checks: ["Nothing yet", "30s chest-to-wall hold", "Crow pose", "Kick up to the wall", "30s wall-assisted hold"],
    form: [["Grip the floor", "Fingers spread, press through your fingertips."], ["Push the floor away", "Tall shoulders, ears between your arms."], ["Stack it", "Hands, shoulders, hips, feet in one line."], ["No kicking wild", "Controlled kick, straight legs."], ["Bail safely", "Turn a hand out and step down."]],
  },
  hspu: {
    name: "Handstand push-up", img: "hspu", video: "O1t5sSFC920",
    steps: [
      S("Elevated pike push-ups", "Build pressing strength with your feet up.", [E("Elevated pike push-ups", [3, 8, ""], "Feet on a chair, head in front of the hands.", "Feet on the floor.", "O1t5sSFC920"), X.pike], "Boris's standard: 15 × 5", "O1t5sSFC920"),
      S("Wall handstand", "Get comfortable holding your bodyweight upside down.", [E("Wall handstand", [4, 10, "s"], "Push the floor, squeeze legs together.", "Elevated pike hold.", "O1t5sSFC920")], "Boris's standard: 10 × 4", "O1t5sSFC920"),
      S("Wall handstand push-ups", "Start pressing upside down.", [E("Handstand push-ups (wall)", [3, 3, ""], "Lower under control, head forward of the hands.", "Partial range.", "O1t5sSFC920")], "Boris's standard: 10 × 5", "O1t5sSFC920"),
      S("Negative handstand push-ups", "Own the way down.", [E("Negative handstand push-ups", [4, 3, ""], "Take 3–5 seconds to lower.", "Shorter range.", "O1t5sSFC920")], "Boris's standard: 4 × 6", "O1t5sSFC920"),
      S("Handstand push-ups", "Get lower every try.", [E("Handstand push-ups", [5, 3, ""], "Try to get lower every try.", "Use a pad under your head.", "O1t5sSFC920")], "Boris's standard: 5 × 5", "O1t5sSFC920"),
      S("Full handstand push-ups", "Full range, head to floor and back up.", [E("Full handstand push-ups", [5, "max", ""], "Full range, stay stacked.", "Back to step 5.", "O1t5sSFC920")], "5 full reps", "O1t5sSFC920"),
    ],
    checks: ["Nothing yet", "Elevated pike push-ups", "Wall handstand", "Wall handstand push-ups", "Negative handstand push-ups", "Partial handstand push-ups"],
    form: [["Head in front", "Your head lands in front of your hands, not between them."], ["Elbows in", "Don't flare the elbows out wide."], ["Push the floor", "Drive back to straight arms every rep."], ["Get lower every try", "Add range slowly, not all at once."]],
  },
  oapu: {
    name: "One-arm push-up", img: "oapu", video: "0ulBX2QDtfY",
    steps: [
      S("Clean push-ups", "Own the basic push-up first.", [X.pushups], "5 clean push-ups unlocks your first diamond", "wwJbu4H2UjM"),
      S("Diamond push-ups", "Load the triceps and close the grip.", [X.diamond], "5 diamond push-ups unlocks your first archer", "wwJbu4H2UjM"),
      S("Archer push-ups", "Shift your weight onto one arm.", [X.archer], "5 archer push-ups each side unlocks your first one-arm", "3588bd49dAw"),
      S("One-arm push-up", "Put it all on one arm.", [E("One-arm push-up", [3, "max", "/side"], "Hand turned 45° out, feet wide, shoulder over the hand.", "Archer push-ups.", "0ulBX2QDtfY")], "5 one-arm push-ups each side", "0ulBX2QDtfY"),
    ],
    checks: ["Nothing yet", "Regular push-ups", "Diamond push-ups", "Archer push-ups"],
    form: [["Hand at 45°", "Turn the working hand 45° out."], ["Feet wide", "Wide stance gives you a stable base."], ["Shoulder over hand", "Don't let the shoulder drift forward."], ["Hips square", "No twisting to get up."]],
  },
  front_lever: {
    name: "Front lever", img: "front_lever", video: "q8BrVBpNie4", needsBar: true,
    steps: [
      S("Your first pull-ups", "You need pulling strength before levers.", [X.hang, X.scapPulls, X.negPull, X.bandPull], "5 clean pull-ups", "rpUB4f2rCGE"),
      S("Tuck front lever", "Knees to chest, back flat.", [E("Tuck front lever", [4, "max", "s"], "Arms straight, back flat.", "Hang holds.", "q8BrVBpNie4"), E("Tuck front lever raises", [3, 5, ""], "Raise up to the tuck slowly.", null, "q8BrVBpNie4")], "10 second tuck hold", "q8BrVBpNie4"),
      S("Advanced tuck", "Open your hips, back flat.", [E("Advanced tuck front lever", [4, "max", "s"], "Hips open, back flat.", "Tuck.", "q8BrVBpNie4"), E("Negative advanced tuck", [3, 4, ""], "Lower slowly from the top.", null, "q8BrVBpNie4")], "10 second advanced tuck", "q8BrVBpNie4"),
      S("One-leg front lever", "One leg straight.", [E("One-leg front lever", [4, "max", "s/side"], "Straight leg, body flat.", "Advanced tuck.", "q8BrVBpNie4"), E("Tuck to one leg", [3, 5, ""], "Extend one leg out of the tuck.", null, "q8BrVBpNie4")], "10 seconds each leg", "q8BrVBpNie4"),
      S("Straddle front lever", "Legs wide, then work toward full.", [E("Straddle front lever", [4, "max", "s"], "Wide legs, hips up.", "One leg.", "q8BrVBpNie4"), E("Straddle negatives", [3, 3, ""], "Lower slowly in the straddle.", null, "q8BrVBpNie4")], "10 second straddle", "q8BrVBpNie4"),
      S("Full front lever", "Legs together, straight line.", [E("Full front lever", [5, "max", "s"], "Legs together, squeeze everything.", "Straddle.", "fHPY0iWqi5c")], "5 second full front lever", "fHPY0iWqi5c"),
    ],
    checks: ["Can't do a pull-up yet", "Tuck front lever", "Advanced tuck", "One-leg front lever", "Straddle front lever"],
    form: [["Straight arms", "Elbows locked the whole time."], ["Back flat", "Don't round your back in the tuck."], ["Hips up", "Hips in line with shoulders."], ["Pull the bar down", "Drive the bar toward your hips."]],
  },
  lsit: {
    name: "L-sit", img: "lsit", video: "DMqnc1obSss",
    steps: [
      S("Leg lifts", "Wake up the hip flexors.", [E("Leg lifts", [3, 10, "/leg"], "Hands by your hips, lift one straight leg.", null, "DMqnc1obSss")], "10 lifts each leg", "DMqnc1obSss"),
      S("Leg compressions", "Lift both legs at once.", [E("Leg compressions", [3, 10, ""], "Both legs lift, knees locked.", "One leg.", "DMqnc1obSss")], "10 compressions", "DMqnc1obSss"),
      S("Tuck L-sit", "Get your hips off the floor.", [E("Tuck L-sit", [4, "max", "s"], "Push the floor away, knees to chest.", "Feet touching.", "DMqnc1obSss")], "15 second tuck L-sit", "DMqnc1obSss"),
      S("One-leg shifts", "Straighten one leg at a time.", [E("One-leg L-sit shifts", [3, 6, "/side"], "Extend one leg, switch.", "Tuck.", "DMqnc1obSss")], "6 shifts each side", "DMqnc1obSss"),
      S("L-sit", "Both legs straight.", [X.lsitHold], "20 second L-sit", "DMqnc1obSss"),
    ],
    checks: ["Nothing yet", "Leg lifts", "Leg compressions", "Tuck L-sit", "One-leg shifts"],
    form: [["Lock your arms", "Arms straight the whole time."], ["Push the floor away", "Shoulders down, chest up."], ["Legs straight", "Knees locked, toes pointed."], ["Don't lean back", "Stay over your hands."]],
  },
  lsit_hs: {
    name: "L-sit to handstand", img: "lsit_hs", video: "Js1c9jC_yAE",
    steps: [
      S("Pike push-ups", "Start with these.", [X.pike, X.lsitHold], "10 clean pike push-ups", "Js1c9jC_yAE"),
      S("Elevated pike push-ups", "Get stronger with these.", [E("Elevated pike push-ups", [3, 8, ""], "Feet on a chair, head in front of the hands.", "Feet on the floor.", "Js1c9jC_yAE"), X.lsitHold], "10 elevated pike push-ups", "Js1c9jC_yAE"),
      S("Wall handstand push-ups", "Keep going up with these.", [E("Handstand push-ups (wall)", [3, 3, ""], "Lower under control.", "Partial range.", "Js1c9jC_yAE"), X.lsitHold], "5 wall handstand push-ups", "Js1c9jC_yAE"),
      S("Wall handstand holds", "Work on these every day until you can hold them.", [E("Chest-to-wall handstand", [3, 30, "s"], "Work on these every day.", "Shorter holds.", "Js1c9jC_yAE"), E("Floating push-ups", [3, 5, ""], "Shift forward until your feet get light.", "V-push-ups.", "oW0pluGMDcQ")], "60 second chest-to-wall hold", "Js1c9jC_yAE"),
      S("L-sit to handstand", "Then you can do it.", [E("L-sit to handstand attempts", [5, 1, " tries"], "L-sit, lean forward, press up.", "Frogstand to handstand.", "c4tOkNwYTOw"), X.lsitHold], "One clean L-sit to handstand", "c4tOkNwYTOw"),
    ],
    checks: ["Nothing yet", "Pike push-ups", "Elevated pike push-ups", "Wall handstand push-ups", "60s wall hold"],
    form: [["Lean forward", "Shoulders travel past your hands."], ["Straight arms in the press", "Let the shoulders do the work."], ["Hips high first", "Hips over hands before the legs come up."], ["Slow is better", "Control beats momentum."]],
  },
};
export const GOALS = Object.fromEntries(Object.entries(SKILLS).map(([k, v]) => [k, v.name]));

/* ---------- push-up ladder ---------- */
const LADDER = [
  ["Clap", "Push hard enough to clap, land soft.", "5oHhDKc_E0Q"],
  ["Fist", "Knuckles flat, wrists straight.", null],
  ["Finger", "Up on your fingertips, spread wide.", "pJCpzw5LFpY"],
  ["Diamond", "Hands together under your chest.", "mBISugz345s"],
  ["Wide", "Hands wider than shoulders.", "xONk63dM80k"],
  ["Archer", "Turn the straight-arm hand 90° out.", "3588bd49dAw"],
  ["Tiger", "From forearms, push up to straight arms.", "mBISugz345s"],
  ["One-arm", "Hand at 45°, feet wide.", "0ulBX2QDtfY"],
];

/* ---------- validation (trust boundary) ---------- */
const int = (v, lo, hi) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < lo || n > hi) throw new Error(`out of range: ${v}`);
  return n;
};
const subset = (v, allowed) => {
  if (!Array.isArray(v) || v.some((x) => !allowed.includes(x))) throw new Error(`bad list: ${v}`);
  return [...new Set(v)];
};

// The plan link carries the answers: /?goal=handstand&check=1&...&equipment=pullup_bar,dip_bars
export const QUERY_KEYS = ["goal", "check", "pushups", "pullups", "dips", "days", "minutes", "equipment", "weakSpots"];
export function fromQuery(params) {
  const a = Object.fromEntries(QUERY_KEYS.map((k) => [k, params.get(k) ?? undefined]));
  for (const k of ["equipment", "weakSpots"]) a[k] = a[k] ? a[k].split(",") : [];
  return a;
}

export function validate(a = {}) {
  const skill = SKILLS[a.goal];
  if (!skill) throw new Error("bad goal");
  if (!LENGTHS.includes(Number(a.minutes))) throw new Error("bad minutes");
  let equipment = subset(a.equipment, EQUIPMENT);
  if (!equipment.length) throw new Error("pick equipment");
  if (equipment.includes("none")) equipment = ["none"];
  if (skill.needsBar && !equipment.includes("pullup_bar")) throw new Error("front lever needs a pull-up bar");
  return {
    goal: a.goal,
    check: int(a.check, 0, skill.checks.length - 1),
    pushups: int(a.pushups, 0, PUSHUPS.length - 1),
    pullups: int(a.pullups, 0, PULLUPS.length - 1),
    dips: int(a.dips, 0, DIPS.length - 1),
    days: int(a.days, 2, 6),
    minutes: Number(a.minutes),
    equipment,
    weakSpots: subset(a.weakSpots ?? [], WEAK),
  };
}

/* ---------- levels from grouped answers ---------- */
// Boris: "Master these first: 20–30 push-ups, 10–15 pull-ups, 10–15 dips."
export function levels(a) {
  const hasBar = a.equipment.includes("pullup_bar");
  const pull = a.pullups === 5 ? 1 : a.pullups === 0 ? 1 : a.pullups <= 2 ? 2 : 3;
  const dips = a.dips === 4 ? 0 : a.dips;
  const push = a.pushups <= 1 ? 1 : a.pushups <= 3 ? (a.pushups === 3 && dips >= 2 ? 3 : 2) : 3;
  const overall = hasBar ? Math.min(push, pull) : push;
  const label = ["", "Starting out", "Building", "Basics mastered"][overall];
  const rung = a.pushups <= 1 ? -1 : [0, 0, 0, 2, 4][a.pushups];
  return { push, pull, overall, label, hasBar, rung };
}

/* ---------- plan builder ---------- */
const DAY_TYPES = {
  2: [["skill", "push", "pull", "core"], ["skill", "pull", "legs", "core"]],
  3: [["skill", "push"], ["skill", "pull", "core"], ["skill", "legs", "core"]],
  4: [["skill", "push"], ["pull", "core"], ["skill", "legs"], ["skill", "pull", "core"]],
  5: [["skill", "push"], ["pull", "core"], ["skill", "legs"], ["push", "core"], ["skill", "pull"]],
  6: [["skill", "push"], ["pull", "core"], ["skill", "legs"], ["push", "core"], ["skill", "pull"], ["legs", "core"]],
};
const TITLE = { push: "Push", pull: "Pull", legs: "Legs", core: "Core", skill: "Skill" };
// how many exercises fit: [skill, strength per block, core]
const BUDGET = { 20: [2, 2, 1], 30: [2, 2, 1], 45: [3, 3, 2], 60: [3, 4, 2] };

const dose = ([sets, reps, unit]) => unit === " tries" ? `${sets} tries` : reps === "max" && unit.startsWith("s") ? `${sets} × max hold${unit === "s/side" ? " each side" : ""}` : `${sets} × ${reps}${unit === "s" ? "s" : unit === "s/side" ? "s each side" : unit === "/side" ? " each side" : unit === "/leg" ? " each leg" : unit}`;
const pack = (e) => ({ name: e.name, dose: dose(e.d), cue: e.cue, easier: e.easier, video: e.video });

function strength(kind, L, a) {
  const dipBars = a.equipment.includes("dip_bars");
  if (kind === "push") {
    const dip = dipBars ? X.dips : X.chairDips;
    return { 1: [X.kneePushups, X.vPush, dip, X.tricepExt], 2: [X.pushups, dip, X.diamond, X.pike, X.archer], 3: [X.archer, X.lean, dip, X.pike, X.diamond] }[L.push];
  }
  if (kind === "pull") {
    if (!L.hasBar) return [dipBars ? X.dipRows : X.tableRows, X.supermans, X.reversePlank];
    return { 1: [X.hang, X.scapPulls, X.negPull, X.australian], 2: [X.pullups, X.australian, X.chinups, X.supermans], 3: [X.pullups, X.widePull, X.chinups, X.australian, X.supermans] }[L.pull];
  }
  if (kind === "legs") return { 1: [X.squats, X.lungesW], 2: [X.jumpSquats, X.lungesW, X.sideLunges], 3: [X.pistol, X.shrimp, X.jumpSquats] }[L.overall];
  return [];
}

function coreBlock(a) {
  const list = [X.hollow, X.legRaises, X.plank, X.reversePlank, X.toeSitups];
  if (a.goal === "lsit_hs" || a.goal === "lsit") list.unshift(X.seatedLegLifts);
  return list;
}

function extras(a, L) {
  const out = [];
  if (a.weakSpots.includes("strength")) {
    // Boris: "Master these first" — push-ups, pull-ups, dips, squats
    const fin = (e) => ({ ...e, d: [2, e.d[1] === "max" ? "max" : e.d[1], e.d[2]] });
    out.push(fin(L.push === 1 ? X.kneePushups : X.pushups));
    out.push(fin(L.hasBar ? (L.pull === 1 ? X.negPull : X.pullups) : a.equipment.includes("dip_bars") ? X.dipRows : X.tableRows));
    out.push(fin(X.squats));
  }
  if (a.weakSpots.includes("balance")) out.push(X.crow);
  if (a.weakSpots.includes("core")) out.push(X.hollow);
  if (a.weakSpots.includes("straight_arm")) out.push(X.planchLean, L.hasBar ? X.scapPulls : X.lsitHold);
  return out;
}

function warmup(a, minutes) {
  const wrists = [X.dorsalWrist, X.sideWrist, X.wristPumps];
  const base = minutes <= 30
    ? [X.buttKicks, X.kneeTouches, ...wrists, X.warmPushups]
    : [X.buttKicks, X.kneeTouches, X.backLeans, X.forwardLeans, X.toeTouch, X.lunges, ...wrists, X.warmPushups];
  return { items: base.map((e) => `${e.name} ${dose(e.d)}`), video: "wXHwsgq3y2M" };
}

export function buildPlan(a) {
  const skill = SKILLS[a.goal];
  const L = levels(a);
  // where they start: the step after the one they can already do
  // checks[k] = "I can already do steps[k-1]" → start at steps[k]
  let start = Math.min(a.check, skill.steps.length - 1);
  // front lever: step 0 is the pull-up base, so checks map one step later,
  // and fewer than 5 pull-ups always starts on the base
  if (a.goal === "front_lever") start = a.pullups <= 1 ? 0 : Math.min(a.check + 1, skill.steps.length - 1);
  const path = skill.steps.slice(start, start + 3);
  while (path.length < 3) path.push({ ...path.at(-1), name: `${path.at(-1).name}: own it`, about: "Same skill, longer holds and cleaner reps.", ownIt: true });

  const [nSkill, nStrength, nCore] = BUDGET[a.minutes];
  const types = DAY_TYPES[a.days];
  const rung = L.rung;
  const ladder = LADDER.map(([variation, cue, video], i) => ({
    variation, cue, video,
    prescription: i < rung ? "Done. Use it as a warm-up set." : i === rung ? "3 × 5 clean reps" : i === rung + 1 ? "Try 1–2 reps at the end of push days" : "Locked for now",
    unlockWhen: "5 clean reps, 3 sets",
    current: i === rung,
  }));
  const extra = extras(a, L);
  const dailyPractice = ["handstand", "lsit_hs"].includes(a.goal); // "Work on these every day"

  const phases = path.map((step, p) => {
    const skillEx = step.ex.slice(0, nSkill);
    const sessions = types.map((blocks, d) => {
      const exercises = [];
      const title = blocks.map((b) => TITLE[b]).join(" + ");
      const label = `Day ${d + 1}`;
      if (blocks.includes("skill")) skillEx.forEach((e) => exercises.push({ ...pack(e), block: "Skill" }));
      else if (dailyPractice) exercises.push({ ...pack({ ...skillEx[0], d: [2, skillEx[0].d[1], skillEx[0].d[2]] }), block: "Daily practice" });
      for (const b of blocks.filter((b) => b === "push" || b === "pull" || b === "legs")) {
        let list = strength(b, L, a).filter(Boolean);
        if (b === "push" && rung >= 0 && rung < LADDER.length) {
          list = [{ ...X.pushups, name: `${LADDER[rung][0]} push-ups (ladder)`, d: [3, 5, ""], cue: LADDER[rung][1], easier: "Regular push-ups.", video: LADDER[rung][2] }, ...list];
        }
        list.slice(0, nStrength).forEach((e) => exercises.push({ ...pack(e), block: TITLE[b] }));
      }
      if (blocks.includes("core")) coreBlock(a).slice(0, nCore).forEach((e) => exercises.push({ ...pack(e), block: "Core" }));
      if (d % 2 === 0) extra.filter((e) => !exercises.some((x) => x.name === e.name)).forEach((e) => exercises.push({ ...pack(e), block: "Weak spot" }));
      return { day: label, title, exercises };
    });
    const w0 = p * 3 + 1;
    return {
      name: `Step ${start + Math.min(p, skill.steps.length - start - 1) + 1}: ${step.name}`,
      weeks: `${w0}–${w0 + 2}`,
      goal: step.about,
      moveOn: step.ownIt ? `Beat your last retest: ${step.moveOn.toLowerCase()}, then add 5 seconds or 1 rep.` : step.moveOn,
      video: yt(step.video),
      weekByWeek: [
        { week: w0, focus: "Learn the positions. Use the doses as written and film one set to compare with Boris's video." },
        { week: w0 + 1, focus: "Add 1 rep or 5 seconds to every set." },
        { week: w0 + 2, focus: "Add 1 set to your skill work. Retest on your last training day." },
      ],
      sessions,
      retest: {
        when: `Week ${w0 + 2}, last training day`,
        tests: [
          { name: step.name, target: step.moveOn },
          { name: "Max push-ups", target: "Beat your last number" },
          ...(L.hasBar ? [{ name: "Max pull-ups", target: "Beat your last number" }] : []),
          ...(rung >= 0 ? [{ name: `${LADDER[Math.min(rung, 7)][0]} push-ups`, target: "5 clean reps unlocks the next rung" }] : []),
        ],
      },
    };
  });

  const started = a.check > 0 ? `Already done: ${skill.checks[a.check].toLowerCase()}. So we skip ahead. ` : "";
  const basics = L.overall === 1 ? " Before big skills, master the basics: 20–30 push-ups, 10–15 pull-ups, 10–15 dips. Your plan builds those at the same time." : "";
  return {
    title: `Your ${skill.name.toLowerCase()} plan`,
    skill: a.goal, img: skill.img, skillVideo: yt(skill.video),
    level: L.overall, levelLabel: L.label,
    intro: `${started}You start at step ${start + 1}: ${skill.steps[start].name.toLowerCase()}. ${a.days} days a week, ${a.minutes} minutes a session.${basics}`,
    totalWeeks: 9,
    warmup: warmup(a, a.minutes),
    phases,
    pushupLadder: rung < 0 ? { start: "Get to 10 clean push-ups first. Knee push-ups count while you build up.", rungs: ladder } : { start: `You start on the ${LADDER[rung][0].toLowerCase()} push-up.`, rungs: ladder },
    formCheckpoints: skill.form.map(([checkpoint, cue]) => ({ checkpoint, cue })),
    finalWord: "Save this. Do the work on your days, film your sets, and move on only when you hit the standard. Follow for more.",
  };
}

/* ---------- PDF ---------- */
const FONT = (f) => fileURLToPath(new URL(`./public/fonts/${f}`, import.meta.url));

export function renderPdf(plan) {
  const C = { bg: "#070707", card: "#151515", text: "#f4f4f4", dim: "#8e8e8e", lamp: "#ff7a1a", line: "#242424" };
  const doc = new PDFDocument({ size: "A4", margin: 44 });
  doc.registerFont("display", FONT("Geist-SemiBold.ttf"));
  doc.registerFont("body", FONT("Geist-Regular.ttf"));
  doc.registerFont("bold", FONT("Geist-SemiBold.ttf"));
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));
  const paint = () => doc.save().rect(0, 0, doc.page.width, doc.page.height).fill(C.bg).restore();
  doc.on("pageAdded", () => { paint(); doc.y = 44; });
  paint();

  const X = 44, W = doc.page.width - 88, BOTTOM = doc.page.height - 60;
  const room = (h) => { if (doc.y + h > BOTTOM) doc.addPage(); };
  const display = (t, size, color = C.text) => doc.font("display").fontSize(size).fillColor(color).text(t, X, doc.y, { width: W, lineGap: -size * 0.08, characterSpacing: -size * 0.02 });
  const body = (t, color = C.dim, size = 10, font = "body") => doc.font(font).fontSize(size).fillColor(color).text(t, X, doc.y, { width: W, lineGap: 2 });
  const gap = (n = 10) => { doc.y += n; };
  const rule = () => { doc.moveTo(X, doc.y).lineTo(X + W, doc.y).lineWidth(0.6).strokeColor(C.line).stroke(); };

  function exercise(e) {
    room(54);
    const y = doc.y;
    doc.font("bold").fontSize(10.5).fillColor(C.text).text(e.name, X, y, { width: W - 110 });
    const afterName = doc.y;
    doc.font("display").fontSize(11).fillColor(C.lamp).text(e.dose, X + W - 108, y, { width: 108, align: "right" });
    doc.y = Math.max(afterName, y + 14);
    body(e.cue, C.dim, 8.5);
    if (e.easier) doc.font("bold").fontSize(8.5).fillColor(C.lamp).text("If too hard: ", X, doc.y, { continued: true }).font("body").fillColor(C.dim).text(e.easier);
    gap(7); rule(); gap(8);
  }

  // cover
  gap(6);
  body("Boris Calisthenics: free skill plan", C.lamp, 9, "bold");
  gap(18);
  display(plan.title, 40);
  gap(10);
  body(`Level ${plan.level}: ${plan.levelLabel}.  ${plan.totalWeeks} weeks.`, C.text, 11, "bold");
  gap(8);
  body(plan.intro, C.dim, 11);
  gap(22);
  display("Warm-up, every session", 18, C.lamp);
  gap(4);
  body(plan.warmup.items.join("  /  "), C.dim, 9.5);
  gap(22);
  display("Your 3 steps", 18, C.lamp);
  gap(6);
  for (const ph of plan.phases) {
    body(`Weeks ${ph.weeks}`, C.dim, 9, "bold");
    body(ph.name, C.text, 12, "bold");
    body(`Move on when: ${ph.moveOn}`, C.dim, 9.5);
    gap(8);
  }

  for (const ph of plan.phases) {
    doc.addPage();
    body(`Weeks ${ph.weeks}`, C.lamp, 9, "bold");
    gap(4);
    display(ph.name, 34);
    gap(4);
    body(ph.goal, C.dim, 10.5);
    gap(10);
    const boxY = doc.y;
    doc.save().roundedRect(X, boxY, W, 40, 8).fill(C.card).restore();
    doc.font("bold").fontSize(8.5).fillColor(C.lamp).text("Move on when", X + 12, boxY + 8);
    doc.font("bold").fontSize(10.5).fillColor(C.text).text(ph.moveOn, X + 12, boxY + 21, { width: W - 24 });
    doc.y = boxY + 52;
    for (const w of ph.weekByWeek) body(`Week ${w.week}:  ${w.focus}`, C.text, 9.5);
    for (const s of ph.sessions) {
      gap(16);
      room(80);
      display(`${s.day}  ${s.title}`, 20, C.lamp);
      gap(8); rule(); gap(8);
      s.exercises.forEach(exercise);
    }
    gap(10);
    room(90);
    display(`Retest day`, 20, C.lamp);
    body(ph.retest.when, C.dim, 9.5);
    gap(6);
    for (const t of ph.retest.tests) { room(20); body(`${t.name}:  ${t.target}`, C.text, 10); }
  }

  doc.addPage();
  display("Push-up ladder", 34);
  gap(4);
  body(plan.pushupLadder.start + " Hit 5 clean reps for 3 sets, then move up a rung.", C.dim, 10.5);
  gap(10);
  plan.pushupLadder.rungs.forEach((r, i) => {
    room(30);
    body(`${i + 1}.  ${r.variation}${r.current ? "   (you're here)" : ""}`, r.current ? C.lamp : C.text, 11, "bold");
    body(`${r.prescription}. ${r.cue}`, C.dim, 9);
    gap(6);
  });
  gap(16);
  display("Form checks", 28);
  gap(8);
  for (const f of plan.formCheckpoints) { room(30); body(f.checkpoint, C.text, 11, "bold"); body(f.cue, C.dim, 9.5); gap(6); }
  gap(18);
  body(plan.finalWord, C.text, 12);
  gap(6);
  display("Boris", 26, C.lamp);
  gap(18);
  body("This plan is general training guidance, not medical advice. Check with a doctor before starting if you have an injury or health condition. Stop any exercise that causes pain. You train at your own risk.", C.dim, 8.5);

  return new Promise((resolve) => { doc.on("end", () => resolve(Buffer.concat(chunks))); doc.end(); });
}
