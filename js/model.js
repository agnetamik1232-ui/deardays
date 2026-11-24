// Dear Days — the shape of a buyer's planner, and the defaults.
export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);

// Colours are slots, so every look (and dark mode) paints them in its own family. p1–p4 follow the look's plum, rose, gold and blush.
export const PALETTE = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"];
export const DEFAULT_CATS = [["Work", "p1"], ["Self-care", "p2"], ["Home", "p3"], ["Social", "p4"], ["Errand", "p5"]];
export const MOOD_SLOTS = ["m1", "m2", "m3", "m4", "m5", "m6"];
export const DEFAULT_MOODS = ["Great", "Good", "Calm", "Tired", "Low", "Stressed"];
export const CHECKIN_IDEAS = ["Water", "Walk", "Read", "Stretch", "Vitamins", "No-spend day", "Journal", "Early night"];
export const WEEK_HOW = { great: "Great", steady: "Steady", hard: "Hard" };

function guessClock() { try { return !/AM|PM/i.test(new Intl.DateTimeFormat(undefined, { hour: "numeric" }).format(new Date(2020, 0, 1, 15))); } catch { return true; } }
function navLocale() { try { return navigator.language || "en-GB"; } catch { return "en-GB"; } }

export function blankState() {
  return {
    v: 1,
    profile: { name: "", look: "strawberry", dark: false, bigText: false, easyFont: false, weekStart: 1, clock24: guessClock(), locale: navLocale(), dayStart: 7, dayEnd: 22 },
    categories: DEFAULT_CATS.map(([name, color]) => ({ id: uid(), name, color })),
    moods: MOOD_SLOTS.map((id, i) => ({ id, name: DEFAULT_MOODS[i] })),
    checkins: [],
    days: {},       // "2026-11-24": { mood, top: [{text, done} x3], notes, checks: { id: true } }
    tasks: [],      // { id, text, date, done, cat, time, order, carried: "2026-11-23", dropped, goal: { g, s } }
    repeats: [],    // { id, text, cat, time, rule, days: [0-6], start, end, skip: [dates], done: [dates] }
    blocks: [],     // { id, date, start "09:00", end "10:30", text, cat }
    weeks: {},      // week start date: { focus, pri: [{text, done} x3], how, line }
    months: {},     // "2026-11": { goals: [{id, text, done}], wins, better, change }
    goals: [],      // { id, name, why, cat, start, end, done, steps: [{id, text, done}] }
    meta: { unlocked: false, setupDone: false, demo: false, createdAt: null, lastBackup: null },
  };
}

export function normalise(raw) {
  const b = blankState(), s = { ...b, ...(raw || {}) };
  s.profile = { ...b.profile, ...(raw?.profile || {}) };
  s.meta = { ...b.meta, ...(raw?.meta || {}) };
  for (const k of ["categories", "checkins", "tasks", "repeats", "blocks", "goals"]) if (!Array.isArray(s[k])) s[k] = b[k];
  for (const k of ["days", "weeks", "months"]) if (!s[k] || typeof s[k] !== "object") s[k] = {};
  if (!Array.isArray(s.moods) || s.moods.length !== 6) s.moods = b.moods;
  return s;
}

export const newTask = (o = {}) => ({ id: uid(), text: "", date: null, done: false, cat: "", time: "", order: Date.now(), ...o });
export const newGoal = (o = {}) => ({ id: uid(), name: "", why: "", cat: "", start: null, end: null, done: false, steps: [], ...o });
