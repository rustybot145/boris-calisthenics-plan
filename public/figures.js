// Animated exercise figures, drawn on a real skeleton with fixed bone lengths.
// Each exercise is a function of one progress value p (0 = start position, 1 = end position).
// Hands or feet that touch the floor / bar stay pinned; elbows and knees are solved with IK,
// so limbs never stretch. Lit like the page: key light top-left, shadow down-right.
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const L = { torso: 25, neck: 3.4, head: 5.4, ua: 15.5, fa: 14.5, th: 19, sh: 18, foot: 6 };
  const LEG = L.th + L.sh, ARM = L.ua + L.fa, BODY = LEG + L.torso;
  const F = 94; // floor

  /* ---------- vector helpers ---------- */
  const rad = (d) => d * Math.PI / 180, deg = (r) => r * 180 / Math.PI;
  const dir = (a, len = 1) => [Math.cos(rad(a)) * len, Math.sin(rad(a)) * len];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const mul = (a, k) => [a[0] * k, a[1] * k];
  const len = (a) => Math.hypot(a[0], a[1]);
  const ang = (a, b) => deg(Math.atan2(b[1] - a[1], b[0] - a[0]));
  const mix = (a, b, t) => a + (b - a) * t;
  const mixP = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t)];
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  // two-bone IK: root → target, joint on the `side` (+1 / -1) of the line; unreachable = straight toward target
  function ik(root, target, l1, l2, side) {
    const d = sub(target, root), D = len(d) || 1e-6, u = mul(d, 1 / D);
    if (D >= l1 + l2) { const j = add(root, mul(u, l1)); return [j, add(j, mul(u, l2))]; }
    const along = (l1 * l1 - l2 * l2 + D * D) / (2 * D), h = Math.sqrt(Math.max(0, l1 * l1 - along * along));
    return [add(add(root, mul(u, along)), mul([-u[1], u[0]], h * side)), target];
  }
  // point at distance r1 from a and r2 from b (side picks which intersection)
  function circles(a, r1, b, r2, side) {
    const d = sub(b, a), D = len(d);
    const x = (r1 * r1 - r2 * r2 + D * D) / (2 * D), h = Math.sqrt(Math.max(0, r1 * r1 - x * x)), u = mul(d, 1 / D);
    return add(add(a, mul(u, x)), mul([-u[1], u[0]], h * side));
  }

  /* ---------- the body ---------- */
  // spec: S (shoulder), tor (direction shoulder→hip, deg), head (tilt), face (+1 right / -1 left)
  // arm/farArm: { t: target, b: bend side } or { a: [upper, fore] }  — from the shoulder
  // leg/farLeg: { t, b } or { a: [thigh, shin] } — from the hip;  foot/farFoot: "flex" | "point" | angle
  function build(s) {
    const S = s.S, P = add(S, dir(s.tor, L.torso));
    const H = add(S, dir(s.tor + 180 + (s.head || 0), L.neck + L.head));
    const fo = s.far || [2.4, -1.4];
    const limb = (root, spec, l1, l2) => {
      if (spec.t) return ik(root, spec.t, l1, l2, spec.b);
      const j = add(root, dir(spec.a[0], l1)); return [j, add(j, dir(spec.a[1], l2))];
    };
    const [E, W] = limb(S, s.arm, L.ua, L.fa);
    const fS = add(S, fo), [fE, fW] = limb(fS, s.farArm || shift(s.arm, fo), L.ua, L.fa);
    const [K, A] = limb(P, s.leg, L.th, L.sh);
    const fP = add(P, fo), [fK, fA] = limb(fP, s.farLeg || shift(s.leg, fo), L.th, L.sh);
    const face = s.face || -1;
    const toe = (k, a, f) => {
      const shin = ang(k, a);
      const t = f === "point" ? shin : typeof f === "number" ? f : shin - 90 * face;
      return add(a, dir(t, L.foot));
    };
    return { S, P, H, E, W, fS, fE, fW, K, A, T: toe(K, A, s.foot), fP, fK, fA, fT: toe(fK, fA, s.farFoot || s.foot), face };
  }
  // the far limb aims at the same contact point, nudged a little so it reads as a second limb
  const shift = (spec, o) => (spec.t ? { ...spec, t: [spec.t[0] + o[0], spec.t[1] >= F - 2 ? spec.t[1] : spec.t[1] + o[1]] } : spec);

  /* ---------- exercise families: p → body ---------- */
  // straight-body support on hands and toes (push-up family), face left
  function plank(p, o = {}) {
    const ankle = [o.ax ?? 94, F - 3], top = o.top ?? F - ARM - 1, bottom = o.bottom ?? F - 10;
    const at = (y) => { const phi = deg(Math.asin(clamp((ankle[1] - y) / BODY, -1, 1))); return { phi, S: add(ankle, dir(180 + phi, BODY)) }; };
    const T0 = at(top), hand = o.hand ?? [T0.S[0] + (o.lean || 0), F - 1.5];
    let y = mix(top, bottom, clamp(p, 0, 1)), W = hand;
    if (o.clap && p > 1) { // explosive push: body rises past the top, hands leave the floor
      const s = clamp(p - 1, 0, 1);
      y = mix(bottom, top - 9, s);
      if (s > .55) { const k = (s - .55) / .45; W = [mix(hand[0], hand[0] - 3, k), mix(hand[1], top - 9 + 15, k)]; }
    }
    const { phi, S } = at(y);
    return build({ S, tor: phi, face: -1, arm: { t: W, b: -1 }, leg: { a: [phi, phi] }, foot: 110 });
  }
  function kneePlank(p) {
    const knee = [78, F - 2.5], len1 = L.th + L.torso, top = F - ARM + 2;
    const at = (y) => { const phi = deg(Math.asin(clamp((knee[1] - y) / len1, -1, 1))); return { phi, S: add(knee, dir(180 + phi, len1)) }; };
    const hand = [at(top).S[0], F - 1.5], { phi, S } = at(mix(top, F - 11, p));
    return build({ S, tor: phi, face: -1, arm: { t: hand, b: -1 }, leg: { a: [phi, -40] }, foot: "point" });
  }
  // hands + feet down, hips high (pike push-up family)
  function pike(p, o = {}) {
    const ankle = o.elev ? [92, 70] : [90, F - 3], hand = [36, F - 1.5];
    const S = mixP(o.s0 || [40, 66], o.s1 || [31, 82], p);
    const P = circles(S, L.torso, ankle, LEG, -1); // hips up: an upside-down V
    const tor = ang(S, P), legA = ang(P, ankle);
    return build({ S, tor, face: -1, head: -8, arm: { t: hand, b: -1 }, leg: { a: [legA, legA] }, foot: o.elev ? 0 : 115 });
  }
  // handstand family: hands pinned, body inverted
  function handstand(p, o = {}) {
    const hand = [56, F - 1.5];
    const drop = o.hspu ? p : 0;
    const S = [hand[0] - 6 * drop, F - ARM - 1 + 16 * drop];
    const tor = -90 + deg(Math.asin(clamp((hand[0] + 1 - S[0]) / L.torso, -1, 1)));
    const legA = -88 + (o.sway || 0) * (p - .5);
    const far = o.flutter ? { a: [mix(-88, -130, p), mix(-88, -130, p)] } : null;
    return build({ S, tor, face: -1, head: 0, arm: { t: hand, b: 1 }, leg: { a: [legA, legA] }, farLeg: far, foot: "point" });
  }
  // FK keyframes: interpolate angles / points between poses
  function frames(keys, p, base = {}) {
    const n = keys.length - 1, x = clamp(p, 0, 1) * n, i = Math.min(Math.floor(x), n - 1), t = x - i;
    const a = keys[i], b = keys[i + 1], out = { ...base };
    for (const k in a) {
      const va = a[k], vb = b[k];
      if (typeof va === "number") out[k] = mix(va, vb, t);
      else if (Array.isArray(va) && typeof va[0] === "number") out[k] = mixP(va, vb, t);
      else if (va && va.a) out[k] = { a: mixP(va.a, vb.a, t) };
      else if (va && va.t) out[k] = { t: mixP(va.t, vb.t, t), b: va.b };
      else out[k] = va;
    }
    return build(out);
  }
  // crow: knees on the elbows, feet lift (and on to a bent-arm handstand)
  function crow(p, o = {}) {
    const keys = [
      { S: [42, 70], tor: 22, leg: { a: [208, 64] }, head: 0 },
      { S: [36, 73], tor: -14, leg: { a: [135, -12] }, head: 0 },
      { S: [40, 80], tor: -78, leg: { a: [-82, -84] }, head: 0 },
    ];
    return frames(o.bent ? keys : keys.slice(0, 2), p, { face: -1, arm: { t: [48, F - 1.5], b: -1 }, foot: "point" });
  }
  // seated on the floor / parallettes (L-sit family), face right
  function seated(p, o = {}) {
    const hand = [49, F - 1.5];
    const S = [49.5, hand[1] - ARM + (o.lift ? .5 : 2.5)];
    return build({ S, tor: 91, face: 1, arm: { t: hand, b: -1 }, leg: { a: o.leg(p) }, farLeg: o.farLeg ? { a: o.farLeg(p) } : null, foot: "point" });
  }
  // parallel bars (dips), hands pinned on the rail
  function dip(p, o = {}) {
    const hand = [52, 53], face = o.face || -1;
    const S = [hand[0] + 3 * face * p, hand[1] - ARM + 1 + 15 * p];
    const tor = 90 - 12 * face * p;
    const leg = o.lsit ? { a: face > 0 ? [-3, -3] : [183, 183] } : { a: face < 0 ? [100, 28] : [80, 152] }; // feet behind
    return build({ S, tor, face, arm: { t: hand, b: face }, leg, foot: o.lsit ? "point" : 90 });
  }
  function chairDip(p) {
    const hand = [62, 66], ankle = [30, F - 3];
    const S = [62.5, mix(hand[1] - ARM + 1, hand[1] - 14, p)];
    return build({ S, tor: 97, face: -1, arm: { t: hand, b: 1 }, leg: { t: ankle, b: 1 }, foot: "flex" });
  }
  // hanging from a bar
  function hang(p, o = {}) {
    const hand = [60, 10];
    const up = o.pull ? p : 0, scap = o.scap ? p * 4 : 0;
    const S = [60 + 2 * up, hand[1] + ARM - 1 - scap - 20 * up];
    const legA = 95 - 4 * up;
    return build({ S, tor: 92 + 4 * up, face: -1, head: -4, arm: { t: hand, b: -1 }, leg: { a: [legA, legA + 2] }, foot: "point" });
  }
  // front lever family, hands on the bar, body below it
  function lever(p, o = {}) {
    const hand = [44, 12], t = clamp(p, 0, 1), k0 = o.k0, k1 = o.k1 || o.k0;
    const tor = mix(k0.tor, k1.tor, t);
    const armA = mix(100, 92, clamp(tor / 88, 0, 1));         // straight arms: angled out under the bar, vertical when hanging
    const S = add(hand, dir(armA, ARM));
    const far = k0.far ? { a: mixP(k0.far, k1.far || k0.far, t) } : null;
    return build({ S, tor, face: -1, head: -8, arm: { t: hand, b: -1 }, leg: { a: mixP(k0.leg, k1.leg, t) }, farLeg: far, foot: "point" });
  }
  // rows: hands on a low bar, heels on the floor, body straight, face up
  function row(p, o = {}) {
    const hand = [46, o.barY || 55], heel = [104, F - 3];
    const y = mix(hand[1] + ARM - 2, hand[1] + 6, p), phi = deg(Math.asin(clamp((heel[1] - y) / BODY, -1, 1)));
    const S = add(heel, dir(180 + phi, BODY));
    return build({ S, tor: phi, face: -1, head: -6, arm: { t: hand, b: 1 }, leg: { a: [phi, phi] }, foot: -20 });
  }
  // standing: feet pinned, knees solved from the hip position
  const STAND_Y = F - 3 - LEG + .5;
  function stand(p, o) {
    const v = o(p), ankle = v.ankle || [58, F - 3];
    const S = add(v.P, dir(v.tor + 180, L.torso));
    return build({ S, tor: v.tor, face: -1, head: v.head || 0, arm: v.arm, farArm: v.farArm, leg: v.leg || { t: ankle, b: 1 }, farLeg: v.farLeg, foot: v.foot || "flex", farFoot: v.farFoot });
  }

  /* ---------- exercises ---------- */
  const rep = [[0, .45], [1, .9], [1, .3], [0, .9]];     // hold, go, hold, back
  const holdSeq = [[0, 1.4], [1, 1.4]];                    // gentle breathing on holds
  const P_TOP = F - ARM - 1;
  const lie = (keys) => (p) => frames(keys, p, { face: -1 });

  const EX = {
    pushup: { f: (p) => plank(p), seq: rep },
    clap: { f: (p) => plank(p, { clap: true }), seq: [[0, .4], [1, .7], [2, .32], [2, .1], [0, .45]] },
    pushfist: { f: (p) => plank(p, { top: P_TOP - 2 }), seq: rep, mark: "fist" },
    pushfinger: { f: (p) => plank(p, { top: P_TOP - 2.5 }), seq: rep, mark: "finger" },
    kneepush: { f: (p) => kneePlank(p), seq: rep },
    lean: { f: (p) => plank(p, { lean: 9, top: P_TOP + 2 }), seq: rep },
    planche: { f: (p) => plank(0, { lean: mix(0, 12, p), top: P_TOP + 2 }), seq: [[0, .8], [1, 1.2], [1, .8], [0, 1.2]] },
    tiger: { f: (p) => { const s = plank(0, { top: F - L.ua - 2 }).S; return plank(1 - p, { top: F - ARM + 4, bottom: F - L.ua - 2, hand: [s[0] - L.fa + 1, F - 1.5] }); }, seq: rep },
    pike: { f: (p) => pike(p), seq: rep },
    vpush: { f: (p) => pike(p, { s0: [42, 67], s1: [34, 80] }), seq: rep },
    floating: { f: (p) => pike(p, { s0: [40, 66], s1: [33, 72] }), seq: rep },
    elevpike: { f: (p) => pike(p, { elev: true, s0: [40, 66], s1: [33, 81] }), seq: rep, props: [["box", 82, 72, 22, 22]] },
    elevhold: { f: (p) => pike(p * .06, { elev: true, s0: [40, 66], s1: [33, 81] }), seq: holdSeq, props: [["box", 82, 72, 22, 22]] },
    hs: { f: (p) => handstand(p, { sway: 1.2 }), seq: holdSeq, props: [["wall", 64]], tall: true },
    hsfree: { f: (p) => handstand(p, { sway: 3 }), seq: holdSeq, tall: true },
    hspu: { f: (p) => handstand(p, { hspu: true }), seq: rep, props: [["wall", 64]], tall: true },
    flutter: { f: (p) => handstand(p, { flutter: true }), seq: [[0, .4], [1, .7], [0, .7]], props: [["wall", 64]], tall: true },
    kickup: { f: (p) => frames(KICK, p, { face: -1, arm: { t: [56, F - 1.5], b: 1 }, foot: "point" }), seq: [[0, .5], [1, 1.1], [1, .8], [0, .9]], props: [["wall", 64]], tall: true },
    kickupfree: { f: (p) => frames(KICK, p, { face: -1, arm: { t: [56, F - 1.5], b: 1 }, foot: "point" }), seq: [[0, .5], [1, 1.1], [1, .8], [0, .9]], tall: true },
    bail: { f: (p) => frames([
      { S: [56, P_TOP], tor: 270, leg: { a: [272, 272] }, farLeg: { a: [270, 270] } },
      { S: [58, P_TOP + 1], tor: 300, leg: { a: [330, 340] }, farLeg: { a: [290, 290] } },
      { S: [60, P_TOP + 3], tor: 330, leg: { a: [40, 80] }, farLeg: { a: [20, 60] } },
    ], p, { face: -1, arm: { t: [56, F - 1.5], b: 1 }, foot: "flex" }), seq: [[0, .6], [1, 1.1], [1, .6], [0, 1]], tall: true },
    crow: { f: (p) => crow(p), seq: [[0, .6], [1, 1], [1, 1.2], [0, .9]] },
    bentarm: { f: (p) => crow(p, { bent: true }), seq: [[0, .5], [.5, .9], [.5, .4], [1, 1.1], [1, .8], [0, 1.2]], tall: true },
    press: { f: (p) => frames([
      { S: [49.5, F - ARM], tor: 91, leg: { a: [-2, -2] } },
      { S: [55, F - ARM + 1], tor: 210, leg: { a: [60, 110] } },
      { S: [55, P_TOP], tor: 270, leg: { a: [272, 272] } },
    ], p, { face: 1, arm: { t: [51, F - 1.5], b: -1 }, foot: "point" }), seq: [[0, .6], [1, 1.6], [1, .7], [0, 1.2]], tall: true },
    lsit: { f: (p) => seated(p, { lift: true, leg: (q) => [-2 - 3 * q, -2 - 3 * q] }), seq: holdSeq },
    tucklsit: { f: (p) => seated(p, { lift: true, leg: (q) => [-58 - 4 * q, 52 - 4 * q] }), seq: holdSeq },
    lsitshift: { f: (p) => seated(p, { lift: true, leg: (q) => [mix(-2, -58, q), mix(-2, 52, q)], farLeg: (q) => [mix(-58, -2, q), mix(52, -2, q)] }), seq: [[0, .6], [1, .7], [1, .6], [0, .7]] },
    leglift: { f: (p) => seated(p, { leg: (q) => [mix(2, -24, q), mix(2, -24, q)] }), seq: rep },
    legliftone: { f: (p) => seated(p, { leg: (q) => [mix(2, -26, q), mix(2, -26, q)], farLeg: () => [2, 2] }), seq: rep },
    dip: { f: (p) => dip(p), seq: rep, props: [["rails"]] },
    lsitdip: { f: (p) => dip(p, { lsit: true, face: 1 }), seq: rep, props: [["rails"]] },
    chairdip: { f: (p) => chairDip(p), seq: rep, props: [["chair"]] },
    pullup: { f: (p) => hang(p, { pull: true }), seq: rep, props: [["bar", 10]], hang: true },
    negpull: { f: (p) => hang(1 - p, { pull: true }), seq: [[0, .5], [1, 2.2], [1, .3], [0, .5]], props: [["bar", 10]], hang: true },
    hang: { f: (p) => hang(p), seq: holdSeq, props: [["bar", 10]], hang: true },
    scap: { f: (p) => hang(p, { scap: true }), seq: [[0, .5], [1, .6], [1, .4], [0, .6]], props: [["bar", 10]], hang: true },
    fltuck: { f: (p) => lever(p, { k0: { tor: -4, leg: [-140, 30] }, k1: { tor: -6, leg: [-142, 28] } }), seq: holdSeq, props: [["bar", 12]] },
    fladv: { f: (p) => lever(p, { k0: { tor: -4, leg: [-95, 0] }, k1: { tor: -6, leg: [-97, -2] } }), seq: holdSeq, props: [["bar", 12]] },
    flone: { f: (p) => lever(p, { k0: { tor: -4, leg: [-3, -3], far: [-140, 30] }, k1: { tor: -6, leg: [-5, -5], far: [-142, 28] } }), seq: holdSeq, props: [["bar", 12]] },
    flfull: { f: (p) => lever(p, { k0: { tor: -3, leg: [-3, -3] }, k1: { tor: -5, leg: [-5, -5] } }), seq: holdSeq, props: [["bar", 12]] },
    flraise: { f: (p) => lever(p, { k0: { tor: 88, leg: [86, 86] }, k1: { tor: -4, leg: [-140, 30] } }), seq: rep, props: [["bar", 12]], hang: true },
    flneg: { f: (p) => lever(p, { k0: { tor: -3, leg: [-3, -3] }, k1: { tor: 88, leg: [88, 88] } }), seq: [[0, .5], [1, 2.2], [1, .3], [0, .6]], props: [["bar", 12]], hang: true },
    row: { f: (p) => row(p), seq: rep, props: [["table"]] },
    rowbars: { f: (p) => row(p, { barY: 53 }), seq: rep, props: [["rails"]] },
    squat: { f: (p) => stand(p, (q) => ({ P: [mix(58, 70, q), mix(STAND_Y, 72, q)], tor: mix(90, 62, q), arm: { a: [mix(96, 180, q), mix(96, 178, q)] } })), seq: rep },
    jumpsquat: { f: (p) => {
      if (p <= 1) return stand(p, (q) => ({ P: [mix(70, 58, q), mix(72, STAND_Y, q)], tor: mix(62, 90, q), arm: { a: [mix(180, 110, q), mix(178, 110, q)] } }));
      const air = Math.sin((p - 1) * Math.PI) * 9;
      return stand(1, () => ({ P: [58, STAND_Y - air], tor: 90, arm: { a: [100, 100] }, leg: { a: [91, 89] }, foot: "point" }));
    }, seq: [[0, .5], [1, .45], [2, .5], [0, .55]] },
    lunge: { f: (p) => stand(p, (q) => ({ P: [mix(60, 62, q), mix(59, 71, q)], tor: 90, arm: { a: [92, 92] }, leg: { t: [42, F - 3], b: 1 }, farLeg: { t: [84, F - 3], b: 1 }, farFoot: 20 })), seq: rep },
    pistol: { f: (p) => stand(p, (q) => ({ P: [mix(58, 70, q), mix(STAND_Y, 76, q)], tor: mix(90, 60, q), arm: { a: [mix(100, 182, q), mix(100, 180, q)] }, farLeg: { a: [mix(96, 186, q), mix(94, 182, q)] }, farFoot: "point" })), seq: rep },
    shrimp: { f: (p) => stand(p, (q) => ({ P: [mix(58, 68, q), mix(STAND_Y, 76, q)], tor: mix(90, 64, q), arm: { a: [mix(100, 175, q), mix(100, 172, q)] }, farLeg: { a: [mix(92, 70, q), mix(92, -40, q)] }, farFoot: "point" })), seq: rep },
    buttkick: { f: (p) => stand(p, (q) => ({ P: [58, STAND_Y], tor: 90, arm: { a: [mix(96, 70, q), mix(96, 30, q)] }, leg: { a: [mix(90, 98, q), mix(90, -40, q)] }, farLeg: { t: [60, F - 3], b: 1 }, foot: "point" })), seq: [[0, .2], [1, .35], [0, .35]] },
    kneeup: { f: (p) => stand(p, (q) => ({ P: [58, STAND_Y], tor: 90, arm: { a: [mix(96, 150, q), mix(96, 120, q)] }, leg: { a: [mix(90, 182, q), mix(90, 92, q)] }, farLeg: { t: [60, F - 3], b: 1 } })), seq: [[0, .25], [1, .4], [1, .15], [0, .4]] },
    sidelunge: { front: true, f: (p) => front(p, "sidelunge"), seq: rep },
    plank: { f: lie([
      { S: [32, F - L.ua - 2], tor: 9.5, arm: { t: [18, F - 2], b: -1 }, leg: { a: [9.5, 9.5] }, foot: 110 },
      { S: [32, F - L.ua - 2.6], tor: 9.8, arm: { t: [18, F - 2], b: -1 }, leg: { a: [9.8, 9.8] }, foot: 110 },
    ]), seq: holdSeq },
    hollow: { f: lie([
      { S: [36, F - 10], tor: 8, head: -8, arm: { a: [196, 196] }, leg: { a: [-10, -10] }, foot: "point" },
      { S: [36, F - 12], tor: 10, head: -10, arm: { a: [200, 200] }, leg: { a: [-13, -13] }, foot: "point" },
    ]), seq: holdSeq },
    superman: { f: lie([
      { S: [34, F - 6], tor: 2, arm: { a: [182, 182] }, leg: { a: [-1, -1] }, foot: "point" },
      { S: [34, F - 12], tor: 14, head: 6, arm: { a: [200, 200] }, leg: { a: [-12, -12] }, foot: "point" },
    ]), seq: rep },
    legraise: { f: lie([
      { S: [30, F - 6], tor: 0, arm: { a: [4, 4] }, leg: { a: [-1, -1] }, foot: "point" },
      { S: [30, F - 6], tor: 0, arm: { a: [4, 4] }, leg: { a: [-88, -88] }, foot: "point" },
    ]), seq: rep },
    situp: { f: lie([
      { S: [33, F - 6], tor: 0, arm: { a: [182, 182] }, leg: { a: [-1, -1] }, foot: "point" },
      { S: [44, F - 23], tor: 50, arm: { a: [240, 240] }, leg: { a: [-1, -1] }, foot: "point" },
      { S: [62, F - 26], tor: 112, head: -10, arm: { a: [12, 12] }, leg: { a: [-1, -1] }, foot: "point" },
    ]), seq: rep },
    revplank: { f: (p) => {
      const heel = [94, F - 3], phi = deg(Math.asin((heel[1] - P_TOP) / BODY)), S = add(heel, dir(180 + phi, BODY));
      return build({ S, tor: phi, face: -1, head: -14, arm: { t: [S[0], F - 1.5], b: 1 }, leg: { a: [phi, phi] }, farLeg: { a: [mix(phi, -32, p), mix(phi, -32, p)] }, foot: -40, farFoot: "point" });
    }, seq: rep },
    quad: { f: lie([
      { S: [38, P_TOP], tor: 6, arm: { t: [38, F - 1.5], b: 1 }, leg: { a: [90, 0] }, foot: "point" },
      { S: [31, P_TOP + 2], tor: 10, arm: { t: [38, F - 1.5], b: 1 }, leg: { a: [80, 0] }, foot: "point" },
    ]), seq: rep },
    backlean: { f: lie([
      { S: [38, P_TOP], tor: 6, arm: { t: [30, F - 1.5], b: 1 }, leg: { a: [90, 0] }, foot: "point" },
      { S: [44, F - 16], tor: 18, head: 6, arm: { t: [30, F - 1.5], b: 1 }, leg: { a: [170, 4] }, foot: "point" },
    ]), seq: rep },
    reach: { f: lie([
      { S: [46, F - 31], tor: 92, arm: { a: [70, 70] }, leg: { a: [-1, -1] }, foot: -60 },
      { S: [62, F - 22], tor: 132, head: -14, arm: { a: [8, 8] }, leg: { a: [-1, -1] }, foot: -60 },
    ]), seq: rep },
    // front view: where the hands go is the whole point
    wide: { front: true, f: (p) => front(p, "wide"), seq: rep },
    diamond: { front: true, f: (p) => front(p, "diamond"), seq: rep },
    archer: { front: true, f: (p) => front(p, "archer"), seq: rep },
    onearm: { front: true, f: (p) => front(p, "onearm"), seq: rep },
  };
  // kick up to handstand: hands down, one leg swings up, the other follows
  const KICK = [
    { S: [46, 66], tor: 196, leg: { a: [96, 82] }, farLeg: { a: [205, 205] }, head: -10 },
    { S: [52, 64], tor: 235, leg: { a: [170, 140] }, farLeg: { a: [240, 240] }, head: 0 },
    { S: [56, P_TOP], tor: 270, leg: { a: [274, 274] }, farLeg: { a: [272, 272] }, head: 0 },
  ];

  /* ---------- front view ---------- */
  function front(p, kind) {
    if (kind === "sidelunge") {
      const sx = -12 * p, sink = 14 * p;
      const SL = [49 + sx, 28 + sink], SR = [71 + sx, 28 + sink];
      return { kind: "front", H: [60 + sx, 28 + sink - 9.5], SL, SR, WL: add(SL, [-3, 24]), WR: add(SR, [3, 24]), WLb: 1, WRb: -1,
        HL: [54 + sx, 52 + sink], HR: [66 + sx, 52 + sink], AL: [mix(52, 30, p), F - 3], AR: [mix(68, 84, p), F - 3], KLb: 1, KRb: -1 };
    }
    const hands = { wide: [26, 94], diamond: [56, 64], archer: [30, 90], onearm: [62, 62] }[kind];
    const y = mix(F - ARM + 2, F - 12, p), cx = kind === "archer" ? mix(60, 72, p) : 60;
    const SL = [cx - 13, y], SR = [cx + 13, y];
    const WL = kind === "onearm" ? [cx - 6, y + 14] : [hands[0], F - 1.5], WR = [hands[1], F - 1.5];
    return { kind: "front", H: [cx, y - 9], SL, SR, WL, WR, WLb: 1, WRb: -1, WLbehind: kind === "onearm" };
  }

  /* ---------- drawing ---------- */
  const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent && parent.appendChild(e); return e; };
  const f2 = (n) => n.toFixed(2);
  // tapered capsule from a (radius r1) to b (radius r2)
  function capsule(a, b, r1, r2) {
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy);
    if (d < Math.abs(r1 - r2) + .01) return circ(r1 > r2 ? a : b, Math.max(r1, r2));
    const phi = Math.atan2(dy, dx), al = Math.acos((r1 - r2) / d);
    const p1 = [a[0] + r1 * Math.cos(phi + al), a[1] + r1 * Math.sin(phi + al)];
    const p2 = [b[0] + r2 * Math.cos(phi + al), b[1] + r2 * Math.sin(phi + al)];
    const p3 = [b[0] + r2 * Math.cos(phi - al), b[1] + r2 * Math.sin(phi - al)];
    const p4 = [a[0] + r1 * Math.cos(phi - al), a[1] + r1 * Math.sin(phi - al)];
    return `M${f2(p1[0])} ${f2(p1[1])}L${f2(p2[0])} ${f2(p2[1])}A${f2(r2)} ${f2(r2)} 0 ${al < Math.PI / 2 ? 0 : 1} 0 ${f2(p3[0])} ${f2(p3[1])}L${f2(p4[0])} ${f2(p4[1])}A${f2(r1)} ${f2(r1)} 0 ${al < Math.PI / 2 ? 1 : 0} 0 ${f2(p1[0])} ${f2(p1[1])}Z`;
  }
  const circ = (c, r) => `M${f2(c[0] - r)} ${f2(c[1])}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
  // dark hair on the crown and back of the head, centred on `hairDir`
  function hairPath(H, hairDir) {
    const r = L.head + .3, b = rad(hairDir), a1 = b - 1.7, a2 = b + 1.7;
    const p1 = [H[0] + r * Math.cos(a1), H[1] + r * Math.sin(a1)], p2 = [H[0] + r * Math.cos(a2), H[1] + r * Math.sin(a2)];
    const c = [H[0] + Math.cos(b) * 1.4, H[1] + Math.sin(b) * 1.4];
    return `M${f2(p1[0])} ${f2(p1[1])}A${r} ${r} 0 0 1 ${f2(p2[0])} ${f2(p2[1])}Q${f2(c[0])} ${f2(c[1])} ${f2(p1[0])} ${f2(p1[1])}Z`;
  }

  function drawProps(g, props, front) {
    for (const [kind, ...v] of props || []) {
      if (!front && kind === "floor") el("line", { x1: -10, y1: F + .6, x2: 130, y2: F + .6, stroke: "url(#fx-floor)", "stroke-width": .7 }, g);
      if (!front && kind === "wall") el("rect", { x: v[0], y: -30, width: 3.5, height: F + 30, fill: "url(#fx-wall)" }, g);
      if (!front && kind === "box") el("rect", { x: v[0], y: v[1], width: v[2], height: v[3], rx: 1.5, fill: "url(#fx-wood)" }, g);
      if (!front && kind === "chair") {
        el("rect", { x: 56, y: 64.5, width: 26, height: 3.2, rx: 1, fill: "url(#fx-wood)" }, g);
        el("rect", { x: 79, y: 36, width: 3, height: F - 36, rx: 1, fill: "url(#fx-wood)" }, g);
        el("rect", { x: 58, y: 67, width: 2.4, height: F - 67, fill: "url(#fx-metal)" }, g);
      }
      if (!front && kind === "table") {
        el("rect", { x: 26, y: 53.5, width: 44, height: 3, rx: 1, fill: "url(#fx-wood)" }, g);
        el("rect", { x: 28, y: 56, width: 2.4, height: F - 56, fill: "url(#fx-metal)" }, g);
        el("rect", { x: 66, y: 56, width: 2.4, height: F - 56, fill: "url(#fx-metal)" }, g);
      }
      if (!front && kind === "rails") {
        el("line", { x1: 36, y1: 50, x2: 82, y2: 50, stroke: "url(#fx-metal)", "stroke-width": 2.6, "stroke-linecap": "round", opacity: .45 }, g);
        el("line", { x1: 39, y1: 50, x2: 39, y2: F, stroke: "url(#fx-metal)", "stroke-width": 2.2, opacity: .45 }, g);
        el("line", { x1: 79, y1: 50, x2: 79, y2: F, stroke: "url(#fx-metal)", "stroke-width": 2.2, opacity: .45 }, g);
      }
      if (front && kind === "rails") {
        el("line", { x1: 30, y1: 54, x2: 78, y2: 54, stroke: "url(#fx-metal)", "stroke-width": 3, "stroke-linecap": "round" }, g);
        el("line", { x1: 33, y1: 54, x2: 33, y2: F, stroke: "url(#fx-metal)", "stroke-width": 2.6 }, g);
        el("line", { x1: 75, y1: 54, x2: 75, y2: F, stroke: "url(#fx-metal)", "stroke-width": 2.6 }, g);
        el("line", { x1: 28, y1: F, x2: 38, y2: F, stroke: "url(#fx-metal)", "stroke-width": 2.4, "stroke-linecap": "round" }, g);
        el("line", { x1: 70, y1: F, x2: 80, y2: F, stroke: "url(#fx-metal)", "stroke-width": 2.4, "stroke-linecap": "round" }, g);
      }
      if (front && kind === "bar") el("line", { x1: 22, y1: v[0], x2: 98, y2: v[0], stroke: "url(#fx-metal)", "stroke-width": 2.6, "stroke-linecap": "round" }, g);
    }
  }

  // outfit, drawn as silhouettes: hood up (face in shadow), loose black hoodie, baggy grey joggers, black shoes.
  // Every garment is one smooth outline traced around the skeleton, rim-lit from the top left.
  const SKIN = "url(#fx-skin)", HOOD = "url(#fx-hoodie)", PANTS = "url(#fx-pants)", SHOE = "url(#fx-shoe)";
  const RIM = "rgba(255,206,160,.4)", PEDGE = "rgba(14,12,11,.8)", SHADOW = "#0a0908";
  const unit = (a, b) => { const d = sub(b, a), l = len(d) || 1; return [d[0] / l, d[1] / l]; };
  const perp = (u) => [-u[1], u[0]];
  // closed smooth path through points (Catmull-Rom → cubic Bézier)
  function smooth(pts) {
    const n = pts.length; let d = `M${f2(pts[0][0])} ${f2(pts[0][1])}`;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      d += `C${f2(p1[0] + (p2[0] - p0[0]) / 6)} ${f2(p1[1] + (p2[1] - p0[1]) / 6)} ${f2(p2[0] - (p3[0] - p1[0]) / 6)} ${f2(p2[1] - (p3[1] - p1[1]) / 6)} ${f2(p2[0])} ${f2(p2[1])}`;
    }
    return d + "Z";
  }
  // a limb's outline: offset both sides of a joint chain by half-widths, rounded ends
  function limbShape(chain, w, capEnd = .7, capStart = .5) {
    const n = chain.length, Lp = [], Rp = [];
    for (let i = 0; i < n; i++) {
      const nn = perp(unit(chain[Math.max(0, i - 1)], chain[Math.min(n - 1, i + 1)]));
      Lp.push(add(chain[i], mul(nn, w[i]))); Rp.push(add(chain[i], mul(nn, -w[i])));
    }
    const t0 = unit(chain[0], chain[1]), t1 = unit(chain[n - 2], chain[n - 1]);
    return smooth([...Lp, add(chain[n - 1], mul(t1, w[n - 1] * capEnd)), ...Rp.reverse(), add(chain[0], mul(t0, -w[0] * capStart))]);
  }
  const pts = (a, b, ts) => ts.map((t) => mixP(a, b, t));
  const LEG_W = [6.4, 6, 5.1, 5, 5.3, 3.5, 3.1];                 // baggy, stacked above a gathered cuff
  const legChain = (P, K, A) => [P, mixP(P, K, .5), K, mixP(K, A, .45), mixP(K, A, .76), mixP(K, A, .9), A];
  const ARM_W = [4.9, 4.4, 4.2, 4, 3.9, 3, 2.7];                 // loose sleeve, ribbed cuff at the wrist
  const armChain = (S, E, W) => [S, mixP(S, E, .5), E, mixP(E, W, .45), mixP(E, W, .78), mixP(E, W, .9), W];
  const handShape = (E, W) => { const u = unit(E, W); return limbShape([W, add(W, mul(u, 2.6))], [1.9, 1.5], .9, .3); };
  const shoeShape = (K, A, T) => { const u = unit(A, T), back = mul(unit(K, A), -1); return limbShape([add(A, mul(back, 1.2)), add(A, mul(u, 2.8)), add(T, mul(u, 1.8))], [3.2, 3, 2.3], .8, .7); };
  const line = (a, b) => `M${f2(a[0])} ${f2(a[1])}L${f2(b[0])} ${f2(b[1])}`;
  const curve = (a, c, b) => `M${f2(a[0])} ${f2(a[1])}Q${f2(c[0])} ${f2(c[1])} ${f2(b[0])} ${f2(b[1])}`;
  const across = (A, B, t, w) => { const c = mixP(A, B, t), n = perp(unit(A, B)); return line(add(c, mul(n, w)), add(c, mul(n, -w))); };

  // cel shading, like a comic: flat base colour, bold ink outline, a hard shadow band on the side away
  // from the light (bottom-right) and a light band on the lit side (top-left). Done with two masks per garment:
  // the garment shape minus a copy of itself nudged toward / away from the light.
  const INK = "#0b0b0d", INK_W = 1.5, SHADE_D = 1.9, LIGHT_D = 1.1;
  const COL = {
    hoodie: { base: "#353d4c", shade: "#212631", light: "#55607a" },
    pants: { base: "#5b5c61", shade: "#3a3b3f", light: "#83848a" },
    shoe: { base: "#2a2b2f", shade: "#131315", light: "#4d5056" },
    skin: { base: "#dfa173", shade: "#b0744a", light: "#f2c49b" },
  };
  let uid = 0;
  function mount(svg, ex) {
    svg.innerHTML = "";
    const props = [...(ex.hang ? [] : [["floor"]]), ...(ex.props || [])];
    const back = el("g", {}, svg), far = el("g", { class: "far" }, svg), body = el("g", {}, svg), front = el("g", {}, svg);
    drawProps(back, props, false);
    const defs = el("defs", {}, svg);
    function garment(parent, c) {
      const id = "cel" + (++uid), box = { maskUnits: "userSpaceOnUse", x: -300, y: -300, width: 800, height: 800 };
      const mS = el("mask", { id: id + "s", ...box }, defs), mL = el("mask", { id: id + "l", ...box }, defs);
      const layers = [
        el("g", { fill: INK, stroke: INK, "stroke-width": INK_W * 2, "stroke-linejoin": "round" }, null),
        el("g", { fill: c.base }, null),
        el("g", { fill: c.shade, mask: `url(#${id}s)` }, null),
        el("g", { fill: c.light, mask: `url(#${id}l)` }, null),
        el("g", { fill: "#fff" }, mS), el("g", { fill: "#000", transform: `translate(${-SHADE_D} ${-SHADE_D})` }, mS),
        el("g", { fill: "#fff" }, mL), el("g", { fill: "#000", transform: `translate(${LIGHT_D} ${LIGHT_D})` }, mL),
      ];
      const g = el("g", {}, parent);
      layers.slice(0, 4).forEach((l) => g.appendChild(l));
      return () => { const ps = layers.map((l) => el("path", {}, l)); return { setAttribute: (k, v) => ps.forEach((q) => q.setAttribute(k, v)) }; };
    }
    const ink = (parent, stroke, w) => el("path", { fill: "none", stroke, "stroke-width": w, "stroke-linecap": "round", "stroke-linejoin": "round" }, parent);
    const solid = (parent, fill) => el("path", { fill }, parent);
    const FOLD = "rgba(8,8,10,.85)", STRING = "#e9e6e1";
    let parts;
    if (ex.front) {
      const armB = garment(far, COL.hoodie), handB = garment(far, COL.skin);
      const legs = garment(body, COL.pants), shoes = garment(body, COL.shoe), legInk = el("g", {}, body);
      const top = garment(body, COL.hoodie), topInk = el("g", {}, body);
      const armL = garment(body, COL.hoodie), armR = garment(body, COL.hoodie), hands = garment(body, COL.skin), armInk = el("g", {}, body);
      parts = {
        armLb: armB(), handLb: handB(),
        legL: legs(), legR: legs(), shoeL: shoes(), shoeR: shoes(), legFolds: ink(legInk, FOLD, .55),
        torso: top(), hood: top(),
        opening: solid(topInk, "#030303"), strings: ink(topInk, STRING, .6),
        topFolds: ink(topInk, FOLD, .55), pocket: ink(topInk, FOLD, .6),
        armL: armL(), armR: armR(), handL: hands(), handR: hands(), armFolds: ink(armInk, FOLD, .55),
      };
    } else {
      const fLeg = garment(far, COL.pants), fShoe = garment(far, COL.shoe), fArm = garment(far, COL.hoodie), fHand = garment(far, COL.skin);
      const legs = garment(body, COL.pants), shoes = garment(body, COL.shoe), legInk = el("g", {}, body);
      const top = garment(body, COL.hoodie), topInk = el("g", {}, body);
      const arm = garment(body, COL.hoodie), hand = garment(body, COL.skin), armInk = el("g", {}, body);
      parts = {
        fLeg: fLeg(), fShoe: fShoe(), fArm: fArm(), fHand: fHand(),
        leg: legs(), shoe: shoes(), sole: ink(legInk, "#e9e6e1", .7), legFolds: ink(legInk, FOLD, .55),
        torso: top(), hood: top(),
        opening: solid(topInk, "#030303"), strings: ink(topInk, STRING, .6),
        topFolds: ink(topInk, FOLD, .55), pocket: ink(topInk, FOLD, .6),
        arm: arm(), hand: hand(), armFolds: ink(armInk, FOLD, .55),
        ...(ex.mark === "finger" ? { fingers: ink(body, COL.skin.base, 1.4) } : {}),
      };
    }
    drawProps(front, props, true);
    return { ex, parts };
  }

  function draw(fig, p) {
    const { ex, parts: q } = fig, b = ex.f(p);
    const set = (k, d) => q[k] && q[k].setAttribute("d", d);
    if (b.kind === "front") return drawFront(q, b, set);
    const u = unit(b.P, b.S), fr = dir(ang(b.P, b.S) + 90 * b.face);
    const T = (a, l) => add(b.P, add(mul(u, a), mul(fr, l)));          // torso frame: a = up from hip, l = toward the front
    const TL = L.torso;

    // far side (darkened)
    set("fLeg", limbShape(legChain(b.fP, b.fK, b.fA), LEG_W)); set("fShoe", shoeShape(b.fK, b.fA, b.fT));
    set("fArm", limbShape(armChain(b.fS, b.fE, b.fW), ARM_W)); set("fHand", handShape(b.fE, b.fW));

    // joggers + shoes
    set("leg", limbShape(legChain(b.P, b.K, b.A), LEG_W)); set("shoe", shoeShape(b.K, b.A, b.T));
    const su = unit(b.A, b.T), down = perp(su).map((v) => v * (perp(su)[1] >= 0 ? 1 : -1));
    set("sole", line(add(add(b.A, mul(su, -1.4)), mul(down, 2.9)), add(add(b.T, mul(su, 2.2)), mul(down, 2))));
    set("legFolds", across(b.K, b.A, .74, 4.6) + across(b.K, b.A, .9, 3.2) + curve(mixP(b.P, b.K, .78), add(b.K, mul(unit(b.P, b.K), -.5)), mixP(b.K, b.A, .2)));

    // hoodie body: loose, hangs past the hips, ribbed hem
    set("torso", smooth([T(TL + 1, -3.4), T(TL - 2.4, -7), T(13, -7.6), T(1, -7.2), T(-2.6, -6.4), T(-2.8, 5.6), T(-.4, 7), T(9, 7.9), T(17, 7.6), T(TL - 1.6, 5.8), T(TL + 1.4, 2.4)]));
    set("pocket", curve(T(3, 2.6), T(8, 3.6), T(11.5, 6.8)) + line(T(2.6, 2.6), T(2.2, 7.4)));
    set("topFolds", line(T(.8, -6.8), T(.8, 6.8)) + curve(T(16, -5), T(13, -2), T(10, -4.6)) + curve(T(20, 2), T(17.5, 4), T(15, 2.4)));

    // hood up: peaked at the back, face hidden in shadow, drawstrings hanging
    const hu = unit(b.S, b.H), H = b.H;
    const HH = (a, l) => add(H, add(mul(hu, a), mul(fr, l)));
    set("hood", smooth([HH(5.6, 2.4), HH(6.9, -1.4), HH(5.4, -5.2), HH(1.4, -7.5), HH(-4, -6.8), T(TL - 1, -6), T(TL - .5, 4.6), HH(-4.8, 3.6), HH(-2.4, 5.6), HH(1.8, 5.9)]));
    set("opening", smooth([HH(4.6, 2.8), HH(3.4, -.2), HH(-.6, -.8), HH(-3.6, 1), HH(-3.6, 4.4), HH(.4, 5.6), HH(3.9, 4.9)]));
    set("strings", line(HH(-4.4, 3.2), add(HH(-4.4, 3.2), mul(hu, -6))) + line(HH(-4.2, 4.6), add(HH(-4.2, 4.6), mul(hu, -5))));

    // near arm: loose sleeve bunched at the elbow, cuff, hand
    set("arm", limbShape(armChain(b.S, b.E, b.W), ARM_W)); set("hand", handShape(b.E, b.W));
    set("armFolds", across(b.E, b.W, .88, 3.4) + curve(mixP(b.S, b.E, .78), add(b.E, mul(unit(b.S, b.E), -.4)), mixP(b.E, b.W, .22)));
    if (ex.mark === "fist") set("hand", limbShape([b.W, add(b.W, mul(unit(b.E, b.W), 1.4))], [2.5, 2.3], .9, .5));
    if (ex.mark === "finger") set("fingers", `M${f2(b.W[0] - 3)} ${F}L${f2(b.W[0])} ${f2(b.W[1])}L${f2(b.W[0] + 3)} ${F}`);
  }

  function drawFront(q, b, set) {
    const Sc = mixP(b.SL, b.SR, .5);
    const side = unit(b.SL, b.SR);
    const Hc = b.HL ? mixP(b.HL, b.HR, .5) : add(Sc, [0, 9]);
    const up = unit(Hc, Sc), len1 = len(sub(Sc, Hc));
    const FT = (a, l) => add(Hc, add(mul(up, a), mul(side, l)));
    const EL = ik(b.SL, b.WL, L.ua, L.fa, b.WLb)[0], ER = ik(b.SR, b.WR, L.ua, L.fa, b.WRb)[0];

    if (b.HL) {
      const KL = ik(b.HL, b.AL, L.th, L.sh, b.KLb)[0], KR = ik(b.HR, b.AR, L.th, L.sh, b.KRb)[0];
      set("legL", limbShape(legChain(b.HL, KL, b.AL), LEG_W)); set("legR", limbShape(legChain(b.HR, KR, b.AR), LEG_W));
      set("shoeL", shoeShape(KL, b.AL, [b.AL[0] - 4, b.AL[1] + 1])); set("shoeR", shoeShape(KR, b.AR, [b.AR[0] + 4, b.AR[1] + 1]));
      set("legFolds", across(KL, b.AL, .74, 4.6) + across(KR, b.AR, .74, 4.6) + across(KL, b.AL, .9, 3.2) + across(KR, b.AR, .9, 3.2));
      set("torso", smooth([FT(len1 + 1.4, -4.2), FT(len1, -12.6), FT(len1 - 6, -12.4), FT(6, -11.6), FT(-2.8, -11.4), FT(-2.8, 11.4), FT(6, 11.6), FT(len1 - 6, 12.4), FT(len1, 12.6), FT(len1 + 1.4, 4.2)]));
      set("pocket", smooth([FT(10, -6.4), FT(10, 6.4), FT(3.4, 8), FT(3.4, -8)]));
      set("topFolds", line(FT(.6, -11), FT(.6, 11)) + curve(FT(len1 - 5, -6), FT(len1 - 8, -3), FT(len1 - 11, -6)));
    } else {
      ["legL", "legR", "shoeL", "shoeR", "legFolds", "pocket"].forEach((k) => set(k, ""));
      set("torso", smooth([FT(len1 + 1.4, -4.2), FT(len1, -12.6), FT(len1 - 6, -12), FT(-1, -10.4), FT(-1, 10.4), FT(len1 - 6, 12), FT(len1, 12.6), FT(len1 + 1.4, 4.2)]));
      set("topFolds", curve(FT(len1 - 3, -6), FT(len1 - 6, -2.5), FT(len1 - 8, -6)));
    }
    // hood, front: rounded peak, dark opening, drawstrings
    const H = b.H;
    set("hood", smooth([add(H, [0, -7.6]), add(H, [5.6, -5.6]), add(H, [7.2, -.4]), add(H, [6.6, 4.6]), add(Sc, [5.4, 0]), add(Sc, [-5.4, 0]), add(H, [-6.6, 4.6]), add(H, [-7.2, -.4]), add(H, [-5.6, -5.6])]));
    set("opening", smooth([add(H, [0, -4.8]), add(H, [4.2, -2.2]), add(H, [4.5, 2.4]), add(H, [0, 5.6]), add(H, [-4.5, 2.4]), add(H, [-4.2, -2.2])]));
    set("strings", line(add(H, [-1.8, 5.6]), add(H, [-1.6, 11.6])) + line(add(H, [1.8, 5.6]), add(H, [2, 11])));

    const armOf = (S, E, W) => limbShape(armChain(S, E, W), ARM_W);
    if (b.WLbehind) { set("armLb", armOf(b.SL, EL, b.WL)); set("handLb", handShape(EL, b.WL)); set("armL", ""); set("handL", ""); }
    else { set("armLb", ""); set("handLb", ""); set("armL", armOf(b.SL, EL, b.WL)); set("handL", handShape(EL, b.WL)); }
    set("armR", armOf(b.SR, ER, b.WR)); set("handR", handShape(ER, b.WR));
    set("armFolds", across(ER, b.WR, .88, 3.4) + (b.WLbehind ? "" : across(EL, b.WL, .88, 3.4)));
  }

  /* ---------- exercise name → movement ---------- */
  const MAP = [
    [/l-?sit dip/i, "lsitdip"],
    [/front lever raises/i, "flraise"],
    [/straddle negatives|negative advanced/i, "flneg"],
    [/one-leg front lever|tuck to one leg/i, "flone"],
    [/straddle|full front lever|half lay/i, "flfull"],
    [/advanced tuck/i, "fladv"],
    [/front lever/i, "fltuck"],
    [/flutter/i, "flutter"],
    [/handstand push|hspu/i, "hspu"],
    [/freestanding attempts/i, "kickupfree"],
    [/freestanding/i, "hsfree"],
    [/kick-?up/i, "kickup"],
    [/falling safely/i, "bail"],
    [/bent arm/i, "bentarm"],
    [/l-sit to handstand/i, "press"],
    [/elevated pike hold/i, "elevhold"],
    [/handstand|wall/i, "hs"],
    [/crow|frog/i, "crow"],
    [/elevated pike/i, "elevpike"],
    [/v-push/i, "vpush"],
    [/floating/i, "floating"],
    [/pike/i, "pike"],
    [/clap/i, "clap"],
    [/fist/i, "pushfist"],
    [/finger/i, "pushfinger"],
    [/tiger|tricep extension/i, "tiger"],
    [/archer/i, "archer"],
    [/one-arm push/i, "onearm"],
    [/diamond/i, "diamond"],
    [/wide push/i, "wide"],
    [/knee push/i, "kneepush"],
    [/planche lean/i, "planche"],
    [/lean push|pseudo/i, "lean"],
    [/push-?up/i, "pushup"],
    [/rows on dip bars/i, "rowbars"],
    [/chair dips|bench/i, "chairdip"],
    [/dips/i, "dip"],
    [/one-leg l-sit/i, "lsitshift"],
    [/tuck l-sit/i, "tucklsit"],
    [/l-sit/i, "lsit"],
    [/reverse plank/i, "revplank"],
    [/seated leg lift|leg compression/i, "leglift"],
    [/leg lift/i, "legliftone"],
    [/leg raise/i, "legraise"],
    [/sit-?up/i, "situp"],
    [/hollow/i, "hollow"],
    [/plank/i, "plank"],
    [/superman/i, "superman"],
    [/scapula/i, "scap"],
    [/negative pull/i, "negpull"],
    [/hang/i, "hang"],
    [/australian|\brows?\b/i, "row"],
    [/pull-?up|chin-?up/i, "pullup"],
    [/side lunge/i, "sidelunge"],
    [/lunge/i, "lunge"],
    [/jumping squat/i, "jumpsquat"],
    [/pistol/i, "pistol"],
    [/shrimp/i, "shrimp"],
    [/squat/i, "squat"],
    [/butt kick/i, "buttkick"],
    [/knee touch/i, "kneeup"],
    [/back lean/i, "backlean"],
    [/wrist|forward lean/i, "quad"],
    [/toe touch/i, "reach"],
  ];
  const typeFor = (name) => (MAP.find(([re]) => re.test(name)) || [, "pushup"])[1];

  /* ---------- timing ---------- */
  const ease = (x) => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  function progress(seq, sec) {
    const total = seq.reduce((s, [, d]) => s + d, 0);
    let t = ((sec % total) + total) % total, prev = seq[seq.length - 1][0];
    for (const [target, d] of seq) {
      if (t <= d) return mix(prev, target, ease(t / d));
      t -= d; prev = target;
    }
    return prev;
  }

  /* ---------- shared gradients (lit top-left) ---------- */
  document.body.insertAdjacentHTML("afterbegin", `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <linearGradient id="fx-skin" gradientUnits="userSpaceOnUse" x1="10" y1="0" x2="110" y2="100"><stop offset="0" stop-color="#ffeedd"/><stop offset=".3" stop-color="#f0b98a"/><stop offset=".62" stop-color="#c47b46"/><stop offset="1" stop-color="#5e2c0f"/></linearGradient>
    <linearGradient id="fx-pants" gradientUnits="userSpaceOnUse" x1="10" y1="0" x2="110" y2="100"><stop offset="0" stop-color="#e4e1dd"/><stop offset=".3" stop-color="#a9a5a1"/><stop offset=".65" stop-color="#666360"/><stop offset="1" stop-color="#262524"/></linearGradient>
    <linearGradient id="fx-cuff" gradientUnits="userSpaceOnUse" x1="10" y1="0" x2="110" y2="100"><stop offset="0" stop-color="#cfcbc7"/><stop offset=".5" stop-color="#6a6764"/><stop offset="1" stop-color="#252423"/></linearGradient>
    <linearGradient id="fx-rib" gradientUnits="userSpaceOnUse" x1="10" y1="0" x2="110" y2="100"><stop offset="0" stop-color="#4a4541"/><stop offset=".4" stop-color="#1f1d1b"/><stop offset="1" stop-color="#060606"/></linearGradient>
    <linearGradient id="fx-pocket" gradientUnits="userSpaceOnUse" x1="10" y1="0" x2="110" y2="100"><stop offset="0" stop-color="#6a645e"/><stop offset=".35" stop-color="#34302d"/><stop offset="1" stop-color="#0e0e0d"/></linearGradient>
    <linearGradient id="fx-band" gradientUnits="userSpaceOnUse" x1="10" y1="0" x2="110" y2="100"><stop offset="0" stop-color="#e2dfdb"/><stop offset=".4" stop-color="#a29e9a"/><stop offset="1" stop-color="#3a3836"/></linearGradient>
    <linearGradient id="fx-shoe" gradientUnits="userSpaceOnUse" x1="10" y1="0" x2="110" y2="100"><stop offset="0" stop-color="#6b6560"/><stop offset=".4" stop-color="#2a2725"/><stop offset="1" stop-color="#0c0c0b"/></linearGradient>
    <linearGradient id="fx-hoodie" gradientUnits="userSpaceOnUse" x1="10" y1="0" x2="110" y2="100"><stop offset="0" stop-color="#5e5853"/><stop offset=".3" stop-color="#2d2a27"/><stop offset=".65" stop-color="#161514"/><stop offset="1" stop-color="#090909"/></linearGradient>
    <linearGradient id="fx-metal" gradientUnits="userSpaceOnUse" x1="10" y1="0" x2="110" y2="100"><stop offset="0" stop-color="#fff6ec"/><stop offset=".4" stop-color="#a39c95"/><stop offset="1" stop-color="#2e2c2a"/></linearGradient>
    <linearGradient id="fx-wood" gradientUnits="userSpaceOnUse" x1="10" y1="0" x2="110" y2="100"><stop offset="0" stop-color="#ffe3c4"/><stop offset=".35" stop-color="#d8995a"/><stop offset=".7" stop-color="#8a4a1c"/><stop offset="1" stop-color="#3a1d08"/></linearGradient>
    <linearGradient id="fx-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a342f" stop-opacity="0"/><stop offset=".4" stop-color="#3a342f"/><stop offset="1" stop-color="#1a1816"/></linearGradient>
    <linearGradient id="fx-floor" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffcf9e" stop-opacity="0"/><stop offset=".3" stop-color="#ffcf9e" stop-opacity=".45"/><stop offset=".8" stop-color="#fff" stop-opacity=".1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  </defs></svg>`);

  /* ---------- frame each movement: zoom so the whole motion fills the tile ---------- */
  function fit(ex) {
    const ps = ex.seq.map(([v]) => v), lo = Math.min(0, ...ps), hi = Math.max(...ps);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    const take = (pt, r = 0) => { if (!pt) return; x0 = Math.min(x0, pt[0] - r); y0 = Math.min(y0, pt[1] - r); x1 = Math.max(x1, pt[0] + r); y1 = Math.max(y1, pt[1] + r); };
    for (let i = 0; i <= 16; i++) {
      const b = ex.f(mix(lo, hi, i / 16));
      ["S", "P", "E", "W", "fS", "fE", "fW", "K", "A", "T", "fK", "fA", "fT", "SL", "SR", "WL", "WR", "HL", "HR", "AL", "AR"].forEach((k) => take(b[k], 6));
      take(b.H, L.head + 1.5);
    }
    if (!ex.hang) take([x0, F + 2]);
    for (const [kind, ...v] of ex.props || []) {
      if (kind === "bar") take([x0, v[0] - 3]);
      if (kind === "rails") { take([36, 50]); take([82, F]); }
      if (kind === "table") { take([26, 53]); take([70, F]); }
      if (kind === "chair") { take([56, 36]); take([82, F]); }
      if (kind === "box") { take([v[0], v[1]]); take([v[0] + v[2], v[1] + v[3]]); }
      if (kind === "wall") take([v[0] + 4, y0]);
    }
    let w = x1 - x0 + 8, h = y1 - y0 + 8;
    if (w / h < 1.2) w = h * 1.2; else h = w / 1.2;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    return [cx - w / 2, cy - h / 2, w, h].map((n) => n.toFixed(1)).join(" ");
  }

  /* ---------- animate only what's on screen ---------- */
  const live = new Set();
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const io = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? live.add(e.target.__fig) : live.delete(e.target.__fig))));
  function attach(svg, nameOrType) {
    const type = EX[nameOrType] ? nameOrType : typeFor(nameOrType);
    const ex = EX[type];
    if (!svg.hasAttribute("data-keep-view")) svg.setAttribute("viewBox", fit(ex));
    const fig = mount(svg, ex);
    fig.offset = Math.random() * 4;
    svg.__fig = fig;
    draw(fig, still ? .5 : 0);
    io.observe(svg);
    return fig;
  }
  function frame(ms) {
    for (const fig of live) draw(fig, progress(fig.ex.seq, ms / 1000 + fig.offset));
    requestAnimationFrame(frame);
  }
  if (!still && !window.FIG_STATIC) requestAnimationFrame(frame);

  window.Figures = { attach, typeFor, pose: draw, types: Object.keys(EX),
    scan(root = document) { root.querySelectorAll("svg[data-fig]:not([data-ready])").forEach((s) => { s.setAttribute("data-ready", ""); attach(s, s.dataset.fig); }); } };
})();
