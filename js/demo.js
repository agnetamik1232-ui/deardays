// Dear Days — the free demo: Ella's planner, always dated around today so it never looks old.
// Everything is made from a fixed seed, so the demo looks the same on every visit. Nothing is saved.
import * as C from "./calc.js";
import { blankState, uid } from "./model.js";

function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const seedOf = s => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);

const POOL = {
  Work: ["Edit product photos", "Send invoices", "Client call", "Plan next week's posts", "Update the shop banner", "Order packaging", "Write listing copy", "Reply to wholesale email"],
  Home: ["Wash the bedding", "Plan Saturday dinner", "Clean the fridge", "Hoover upstairs", "Fold laundry", "Meal prep for the week", "Empty the dishwasher", "Change the towels"],
  "Self-care": ["Face mask night", "Yoga 20 min", "Read 30 pages", "Early night", "Long bath", "Walk in the park", "Paint my nails"],
  Social: ["Call Grandma", "Coffee with Lina", "Birthday card for Mum", "Book Friday dinner", "Reply to the group chat", "Voice note to Sara"],
  Errand: ["Pick up parcel", "Pharmacy", "Post office", "Buy stamps", "Car wash", "Return library books", "Get flowers"],
};
const CATS = Object.keys(POOL);
const MOODW = [["m1", 2], ["m2", 3], ["m3", 3], ["m4", 2], ["m5", 1], ["m6", 1]];
const pick = (r, a) => a[Math.floor(r() * a.length)];
const pickW = (r, a) => { let t = r() * a.reduce((s, x) => s + x[1], 0); for (const [v, w] of a) { if ((t -= w) < 0) return v; } return a[0][0]; };

export function demoState(today) {
  const S = blankState();
  S.profile = { ...S.profile, name: "Ella", locale: "en-GB", clock24: true, weekStart: 1, dayStart: 7, dayEnd: 22 };
  S.meta = { ...S.meta, unlocked: true, setupDone: true, demo: true, createdAt: today };
  const cat = n => S.categories.find(c => c.name === n)?.id || "";
  S.checkins = ["Water", "Walk", "Read", "Vitamins"].map(name => ({ id: uid(), name, on: true }));

  const y = Number(today.slice(0, 4));
  const from = [`${y}-01-01`, C.addDays(today, -120)].sort()[0];
  const ws = C.weekStart(today, 1);

  // repeating tasks
  const gym = { id: uid(), text: "Gym", cat: cat("Self-care"), time: "07:30", rule: "days", days: [1, 3, 5], start: from, skip: [], done: [] };
  const etsy = { id: uid(), text: "Answer Etsy messages", cat: cat("Work"), time: "09:30", rule: "weekdays", start: from, skip: [], done: [] };
  const plants = { id: uid(), text: "Water the plants", cat: cat("Home"), time: "", rule: "weekly", start: C.addDays(from, (7 - C.dow(from)) % 7), skip: [], done: [] };
  S.repeats = [gym, etsy, plants];

  // a mood for how each month went, so the year view has a shape
  const monthLift = {};
  for (let d = from; d < today; d = C.addDays(d, 1)) {
    const ym = C.ymOf(d); if (!(ym in monthLift)) { const r = rng(seedOf(ym)); monthLift[ym] = 0.6 + r() * 0.3; }
    const r = rng(seedOf(d)), lift = monthLift[ym];
    const weekend = [0, 6].includes(C.dow(d));
    const n = weekend ? 2 + Math.floor(r() * 3) : 4 + Math.floor(r() * 4);
    const used = new Set();
    for (let i = 0; i < n; i++) {
      const c = pick(r, CATS); const text = pick(r, POOL[c]); if (used.has(text)) continue; used.add(text);
      S.tasks.push({ id: uid(), text, date: d, done: r() < lift + 0.08, cat: cat(c), time: "", order: i });
    }
    const top = [];
    for (let i = 0; i < 3; i++) { if (weekend && i === 2) break; const c = pick(r, CATS); top.push({ text: pick(r, POOL[c]), done: r() < lift + 0.12 }); }
    const checks = {};
    for (const ch of S.checkins) if (r() < lift) checks[ch.id] = true;
    S.days[d] = { mood: pickW(r, MOODW), top, checks, notes: "" };
    for (const rep of S.repeats) if (C.repeatOn(rep, d) && r() < lift + 0.1) rep.done.push(d);
  }

  // yesterday: everything ticked off except one thing, so the "left from before" note shows; earlier days were cleared already
  const yday = C.addDays(today, -1);
  for (const t of S.tasks) if (t.date === yday) t.done = true;
  S.meta.carryFrom = yday;
  S.tasks.push({ id: uid(), text: "Return the jacket", date: yday, done: false, cat: cat("Errand"), time: "", order: 50 });

  // today, matching the listing photos
  const T = (text, c, done, o, extra = {}) => S.tasks.push({ id: uid(), text, date: today, done, cat: cat(c), time: "", order: o, ...extra });
  T("Pick up parcel", "Errand", true, 1); T("Wash the bedding", "Home", true, 2); T("Plan Saturday dinner", "Home", false, 3);
  T("Write 3 gift ideas for Mum", "Social", false, 4); T("Edit product photos", "Work", true, 5, { time: "15:00" }); T("Face mask night", "Self-care", false, 6);
  S.days[today] = { mood: "m3", top: [{ text: "Send the Christmas order list", done: true }, { text: "Book dentist for January", done: false }, { text: "Call Grandma", done: true }],
    checks: { [S.checkins[0].id]: true, [S.checkins[1].id]: true }, notes: "Lina's birthday is the 3rd.\nAsk about the window cleaner." };
  for (const rep of S.repeats) { rep.done = rep.done.filter(d => d < today); if (rep === gym || rep === etsy) { if (C.repeatOn(rep, today)) rep.done.push(today); } }

  // the rest of this week: a few things planned
  for (let i = 1; i <= 6; i++) {
    const d = C.addDays(today, i); if (d >= C.addDays(ws, 7)) break;
    const r = rng(seedOf("f" + d)); const n = 2 + Math.floor(r() * 3), seen = new Set();
    for (let k = 0; k < n; k++) { const c = pick(r, CATS), text = pick(r, POOL[c]); if (seen.has(text)) continue; seen.add(text); S.tasks.push({ id: uid(), text, date: d, done: false, cat: cat(c), time: "", order: k }); }
  }

  // schedule blocks around today
  const day = [["07:30", "08:30", "Gym: legs", "Self-care"], ["09:00", "12:30", "Client orders + messages", "Work"], ["13:00", "14:00", "Lunch with Lina", "Social"],
    ["15:00", "17:00", "Product photos", "Work"], ["17:30", "18:15", "Pick up parcel", "Errand"], ["18:30", "19:30", "Dinner + call Grandma", "Home"], ["20:00", "21:00", "Read in bed", "Self-care"]];
  for (let i = -2; i <= 2; i++) {
    const d = C.addDays(today, i), set = i === 0 ? day : day.filter((_, k) => (k + i + 9) % 3 !== 0);
    for (const [a, b, text, c] of set) S.blocks.push({ id: uid(), date: d, start: a, end: b, text, cat: cat(c) });
  }

  // weeks: this week planned, earlier weeks looked back on
  S.weeks[ws] = { focus: "Finish Christmas shopping before December", pri: [{ text: "Christmas gift list done", done: true }, { text: "3 new listings", done: false }, { text: "Two early nights", done: true }], how: "", line: "" };
  const hows = [["steady", "Busy but calm, slept well"], ["great", "Sold out of the winter planner!"], ["hard", "Tired, too many late nights"], ["steady", "Good balance this week"]];
  hows.forEach(([how, line], i) => { const w = C.addDays(ws, -7 * (i + 1)); if (w >= from) S.weeks[w] = { focus: ["Rest more", "Launch the new planner", "Catch up on orders", "Plan the month"][i], pri: [{ text: "Gym 3 times", done: true }, { text: "Call Grandma", done: i !== 2 }, { text: "Inbox zero", done: i === 1 }], how, line }; });

  // months: goals and reflections
  const ymNow = C.ymOf(today);
  for (let m = C.ymOf(from); m <= ymNow; m = C.addMonths(m, 1)) {
    const r = rng(seedOf("m" + m)), past = m < ymNow;
    S.months[m] = { goals: [{ id: uid(), text: "Read 2 books", done: past ? r() < 0.8 : true }, { id: uid(), text: "Gym 12 times", done: past ? r() < 0.7 : true }, { id: uid(), text: "Save 150 for Lisbon", done: past ? r() < 0.75 : true }, { id: uid(), text: "One screen-free Sunday", done: past ? r() < 0.6 : false }],
      wins: past ? pick(r, ["Finished the bathroom shelf", "New best month in the shop", "Ran 5K without stopping", "Booked Lisbon!"]) : "Christmas list done early\nNew planner listing is live\nSaw Grandma twice",
      better: past ? "Mornings feel calmer" : "Going to bed before 11 most nights", change: past ? "Fewer late screens" : "Plan meals on Sunday" };
  }

  // goals with steps
  const G = (name, why, c, start, end, steps, doneN) => S.goals.push({ id: uid(), name, why, cat: cat(c), start, end, done: false, steps: steps.map((t, i) => ({ id: uid(), text: t, done: i < doneN })) });
  G("Read 24 books", "Less phone, more stories", "Self-care", `${y}-01-01`, `${y}-12-31`, Array.from({ length: 24 }, (_, i) => `Book ${i + 1}`), 19);
  G("Save for Lisbon", "A week in the sun with Lina", "Social", `${y}-01-01`, `${y + 1}-05-01`, ["Open a savings pot", "150 in January", "150 in February", "150 in March", "Book flights", "150 in April", "Book the flat", "150 in May", "150 in June", "Spending money"], 7);
  G("Run a 10K", "Feel strong", "Self-care", `${y}-03-01`, `${y + 1}-04-30`, ["Run 2K", "Run 5K", "Run 7K", "Sign up for a race", "Run 9K", "Race day"], 4);
  G("Learn sourdough", "Cosy Sunday mornings", "Home", C.addDays(today, -40), C.addDays(today, 50), ["Make a starter", "First loaf", "A loaf that rises", "Bake for Grandma", "Teach Lina"], 2);
  return S;
}
