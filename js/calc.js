// Dear Days — dates and all the counting: % done for a day, week, month and year, the month score,
// repeating tasks, carry-over and goal progress. Pure functions only (tested in tests/calc.test.mjs).

export const pad = n => String(n).padStart(2, "0");
export const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
export const parts = s => String(s).split("-").map(Number);
export function todayISO() { const d = new Date(); return iso(d.getFullYear(), d.getMonth() + 1, d.getDate()); }
const toUTC = s => { const [y, m, d] = parts(s); return Date.UTC(y, m - 1, d); };
const fromUTC = t => { const d = new Date(t); return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()); };
export const addDays = (s, n) => fromUTC(toUTC(s) + n * 864e5);
export const diffDays = (a, b) => Math.round((toUTC(b) - toUTC(a)) / 864e5);
export const dow = s => new Date(toUTC(s)).getUTCDay();                  // 0 = Sunday
export const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
export const ymOf = s => String(s).slice(0, 7);
export const sum = (a, f = x => x) => a.reduce((t, x) => t + (Number(f(x)) || 0), 0);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function addMonths(ym, n) { const [y, m] = parts(ym + "-01"); const t = y * 12 + (m - 1) + n; return `${Math.floor(t / 12)}-${pad((t % 12) + 1)}`; }
export function monthDays(ym) { const [y, m] = parts(ym + "-01"); return Array.from({ length: daysInMonth(y, m) }, (_, i) => iso(y, m, i + 1)); }
export const weekStart = (s, ws = 1) => addDays(s, -((dow(s) - ws + 7) % 7));
export const weekDays = (s, ws = 1) => { const a = weekStart(s, ws); return Array.from({ length: 7 }, (_, i) => addDays(a, i)); };
export const dayOfYear = s => diffDays(`${s.slice(0, 4)}-01-01`, s) + 1;
export const daysInYear = y => diffDays(`${y}-01-01`, `${y + 1}-01-01`);
export function isoWeek(s) {
  const t = addDays(s, 3 - ((dow(s) + 6) % 7));                             // Thursday of this week
  return Math.floor((dayOfYear(t) - 1) / 7) + 1;
}
// Calendar cells for a month: leading blanks so the first day sits under the right weekday.
export function monthGrid(ym, ws = 1) { const days = monthDays(ym); return [...Array((dow(days[0]) - ws + 7) % 7).fill(null), ...days]; }

export const toMin = t => { const [h, m] = String(t || "0:0").split(":").map(Number); return (h || 0) * 60 + (m || 0); };
export const toTime = m => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;

// ---------- repeating tasks ----------
export const REPEATS = { daily: "Every day", weekdays: "Weekdays", days: "Chosen days", weekly: "Every week", monthly: "Every month" };
export function repeatOn(r, date) {
  if (!r || date < r.start || (r.end && date > r.end) || (r.skip || []).includes(date)) return false;
  const d = dow(date);
  if (r.rule === "daily") return true;
  if (r.rule === "weekdays") return d >= 1 && d <= 5;
  if (r.rule === "days") return (r.days || []).includes(d);
  if (r.rule === "weekly") return d === dow(r.start);
  if (r.rule === "monthly") { const [y, m, dd] = parts(date); return dd === Math.min(parts(r.start)[2], daysInMonth(y, m)); }
  return false;
}

// ---------- one index per render: tasks and schedule blocks by date ----------
export function index(S) {
  const tasks = new Map(), blocks = new Map();
  const add = (map, k, v) => { if (!map.has(k)) map.set(k, []); map.get(k).push(v); };
  for (const t of S.tasks) if (t.date && !t.dropped) add(tasks, t.date, t);
  for (const b of S.blocks) add(blocks, b.date, b);
  return { S, tasks, blocks };
}

// Everything to do on a day: its own tasks, then repeating ones. Repeats appear as items with ids "r:<repeat id>:<date>".
export function itemsFor(X, date) {
  const own = (X.tasks.get(date) || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const reps = X.S.repeats.filter(r => repeatOn(r, date)).map(r => ({ id: `r:${r.id}:${date}`, rid: r.id, text: r.text, cat: r.cat, time: r.time || "", date, repeat: true, done: (r.done || []).includes(date) }));
  return [...own, ...reps];
}
export const blocksFor = (X, date) => (X.blocks.get(date) || []).slice().sort((a, b) => toMin(a.start) - toMin(b.start));
export const topOf = (S, date) => (S.days[date]?.top || []).filter(t => t && String(t.text || "").trim());
const activeChecks = S => S.checkins.filter(c => c.on !== false);

export function dayStats(X, date) {
  const S = X.S, day = S.days[date] || {};
  const items = itemsFor(X, date), top = topOf(S, date), checks = activeChecks(S);
  const total = items.length + top.length, done = items.filter(i => i.done).length + top.filter(t => t.done).length;
  const checkDone = checks.filter(c => day.checks?.[c.id]).length;
  // a day counts as used when she did something on it (repeats that only appeared by themselves don't count)
  const used = items.some(i => !i.repeat || i.done) || top.length > 0 || !!day.mood || checkDone > 0 || !!String(day.notes || "").trim();
  return { date, items, top, total, done, pct: total ? done / total : null, topDone: top.filter(t => t.done).length, topTotal: top.length,
    mood: day.mood || "", checkDone, checkTotal: used ? checks.length : 0, used };
}

// Add up a run of days (a week, a month, a year so far). Check-ins only count up to today.
export function rangeStats(X, dates, today = null) {
  const days = dates.map(d => { const s = dayStats(X, d); if (today && d > today) s.checkTotal = 0; return s; });
  const r = { days, total: sum(days, d => d.total), done: sum(days, d => d.done), topDone: sum(days, d => d.topDone), topTotal: sum(days, d => d.topTotal),
    checkDone: sum(days, d => d.checkDone), checkTotal: sum(days, d => d.checkTotal), moods: {}, best: null, used: days.filter(d => d.used).length };
  r.pct = r.total ? r.done / r.total : null;
  for (const d of days) if (d.mood) r.moods[d.mood] = (r.moods[d.mood] || 0) + 1;
  for (const d of days) if (d.total >= 3 && (!r.best || d.pct > r.best.pct || (d.pct === r.best.pct && d.done > r.best.done))) r.best = d;
  return r;
}
export const topMood = moods => Object.entries(moods).sort((a, b) => b[1] - a[1])[0]?.[0] || "";

// Month score out of 100: tasks done (50), top 3 done (20), month goals hit (15), check-ins (15).
// Parts with nothing in them drop out and the rest share the weight, so nobody is marked down for not using a feature.
export function monthScore(X, ym, today) {
  const dates = monthDays(ym).filter(d => d <= today);
  if (!dates.length) return null;
  const r = rangeStats(X, dates), goals = (X.S.months[ym]?.goals || []).filter(g => String(g.text || "").trim());
  const w = [];
  if (r.total) w.push([50, r.done / r.total]);
  if (r.topTotal) w.push([20, r.topDone / r.topTotal]);
  if (goals.length) w.push([15, goals.filter(g => g.done).length / goals.length]);
  if (r.checkTotal) w.push([15, r.checkDone / r.checkTotal]);
  if (!w.length) return null;
  return Math.round((sum(w, p => p[0] * p[1]) / sum(w, p => p[0])) * 100);
}
export const scoreWord = s => (s == null ? "" : s >= 85 ? "big month" : s >= 70 ? "steady month" : s >= 50 ? "gentle month" : "quiet month");

export function monthReview(X, ym, today) {
  const dates = monthDays(ym).filter(d => d <= today);
  const r = rangeStats(X, dates), goals = (X.S.months[ym]?.goals || []).filter(g => String(g.text || "").trim());
  return { ...r, goals, goalsDone: goals.filter(g => g.done).length, score: monthScore(X, ym, today), elapsed: dates.length };
}

// Tasks left undone on the last 7 days (and since she last cleared them), for the "left from before" note on Today.
export function leftovers(S, today) {
  const from = [addDays(today, -7), S.meta?.carryFrom || ""].sort().pop();
  return S.tasks.filter(t => t.date && t.date >= from && t.date < today && !t.done && !t.dropped).sort((a, b) => a.date.localeCompare(b.date));
}

// ---------- goals ----------
export function goalProgress(g) {
  const steps = g.steps || [], done = steps.filter(s => s.done).length;
  return { done, total: steps.length, pct: g.done ? 1 : steps.length ? done / steps.length : 0 };
}
export const goalDaysLeft = (g, today) => (g.end ? diffDays(today, g.end) : null);
export const goalsForYear = (S, y) => S.goals.filter(g => (!g.start || Number(g.start.slice(0, 4)) <= y) && (!g.end || Number(g.end.slice(0, 4)) >= y));
