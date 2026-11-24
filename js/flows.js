// Dear Days — everything you can tap: ticking, adding, editing, moving, repeating, the schedule, weeks, months, goals,
// settings, backup, unlock and setup.
import * as C from "./calc.js";
import { app, actions, forms, live, esc, render, commit, toast, openSheet, updateSheet, closeSheet, sheetHead, shareOrDownload, pickFile, fd, fdLong, fWeekday, ftime, isIOS, isStandalone } from "./core.js";
import { ic, brand, tick, chip, catOf, pl } from "./ui.js";
import { LOOKS, ETSY_URL, ix } from "./views.js";
import { blankState, normalise, uid, newTask, newGoal, PALETTE, CHECKIN_IDEAS } from "./model.js";
import { monthCard } from "./card.js";
import * as store from "./store.js";

const S = () => app.S;
const val = (f, n) => f.elements[n]?.value ?? "";
const day = (s, d) => (s.days[d] ||= { mood: "", top: [], notes: "", checks: {} });
const taskById = id => S().tasks.find(t => t.id === id);
const repById = id => S().repeats.find(r => r.id === id);
const parseItem = id => { const m = /^r:([^:]+):(\d{4}-\d{2}-\d{2})$/.exec(id || ""); return m ? { rid: m[1], date: m[2] } : null; };
const cleanText = (v, n = 100) => String(v || "").replace(/\s+/g, " ").trim().slice(0, n);

// ============ Navigation and looks ============
actions["nav"] = el => { app.view = el.dataset.view; if (app.view === "today") app.day = null; if (app.view === "week") app.week = null; if (app.view === "month") app.month = null; if (app.view === "year") app.year = null; render(); scrollTo({ top: 0 }); };
actions["close-sheet"] = () => closeSheet();
actions["go-day"] = el => { app.day = el.dataset.d; app.view = "today"; render(); if (innerWidth > 900) return; scrollTo({ top: 0 }); };
actions["day-step"] = el => { app.day = C.addDays(app.day || app.today, Number(el.dataset.n)); render(); };
actions["week-step"] = el => { const n = Number(el.dataset.n); app.week = n === 0 ? null : C.addDays(app.week || app.day || app.today, 7 * n); render(); };
actions["month-step"] = el => { const n = Number(el.dataset.n); app.month = n === 0 ? null : C.addMonths(app.month || C.ymOf(app.day || app.today), n); render(); };
actions["go-month"] = el => { app.month = el.dataset.ym; app.view = "month"; render(); scrollTo({ top: 0 }); };
actions["year-step"] = el => { app.year = (app.year || Number(app.today.slice(0, 4))) + Number(el.dataset.n); render(); };

export function applyLook() {
  const P = S()?.profile || {}, h = document.documentElement;
  h.dataset.look = P.look in LOOKS ? P.look : "strawberry";
  for (const [k, on] of [["data-dark", P.dark], ["data-big", P.bigText], ["data-easy", P.easyFont]]) on ? h.setAttribute(k, "") : h.removeAttribute(k);
  const mt = document.querySelector('meta[name="theme-color"]');
  if (mt) mt.content = getComputedStyle(h).getPropertyValue("--leather").trim() || "#E7B3C1";
}
actions["set-look"] = el => commit(s => { s.profile.look = el.dataset.v; applyLook(); });
for (const [a, k] of [["set-dark", "dark"], ["set-big", "bigText"], ["set-easy", "easyFont"]]) actions[a] = () => commit(s => { s.profile[k] = !s.profile[k]; applyLook(); });

// ============ The day: mood, top 3, notes, check-ins ============
actions["mood"] = el => { const d = app.day || app.today, m = el.dataset.m; commit(s => { const x = day(s, d); x.mood = x.mood === m ? "" : m; }); };
live["top"] = el => { const d = el.dataset.d, i = Number(el.dataset.i); commit(s => { const x = day(s, d); while (x.top.length < 3) x.top.push({ text: "", done: false }); x.top[i].text = el.value.slice(0, 80); if (!el.value.trim()) x.top[i].done = false; }, { render: false }); };
actions["top-tick"] = el => {
  const d = el.dataset.d, i = Number(el.dataset.i), t = S().days[d]?.top?.[i];
  if (!t || !String(t.text || "").trim()) { el.closest("li")?.querySelector("input")?.focus(); return toast("Write it first, then tick it off."); }
  commit(s => { s.days[d].top[i].done = !s.days[d].top[i].done; });
};
live["notes"] = el => commit(s => { day(s, el.dataset.d).notes = el.value.slice(0, 2000); }, { render: false });
actions["check"] = el => commit(s => { const x = day(s, el.dataset.d); x.checks ||= {}; x.checks[el.dataset.c] = !x.checks[el.dataset.c]; if (!x.checks[el.dataset.c]) delete x.checks[el.dataset.c]; });

// ============ Tasks ============
function setGoalStep(s, link, done) { const g = s.goals.find(x => x.id === link?.g); const st = g?.steps.find(x => x.id === link.s); if (st) st.done = done; }
actions["tick"] = el => {
  const id = el.dataset.id, r = parseItem(id);
  if (r) return commit(s => { const rep = s.repeats.find(x => x.id === r.rid); if (!rep) return; rep.done ||= []; const i = rep.done.indexOf(r.date); i >= 0 ? rep.done.splice(i, 1) : rep.done.push(r.date); });
  commit(s => { const t = s.tasks.find(x => x.id === id); if (!t) return; t.done = !t.done; if (t.goal) setGoalStep(s, t.goal, t.done); });
};
forms["task-add"] = f => {
  const text = cleanText(val(f, "text")); if (!text) return f.elements.text.focus();
  const d = f.dataset.d;
  commit(s => s.tasks.push(newTask({ text, date: d })));
  const again = document.querySelector(`form[data-form="task-add"][data-d="${d}"] input[name="text"]`); again?.focus();
};

const catPicker = sel => `<div class="field"><span>Category</span><div class="cpick"><label><input type="radio" name="cat" value=""${!sel ? " checked" : ""}><span>None</span></label>${S().categories.map(c => `<label><input type="radio" name="cat" value="${c.id}"${c.id === sel ? " checked" : ""}><span><i style="background:var(--${c.color})"></i>${esc(c.name)}</span></label>`).join("")}</div></div>`;
const dayPick = sel => `<div class="field daypick" data-daypick><span>On these days</span><div class="cpick">${[1, 2, 3, 4, 5, 6, 0].map(d => `<label><input type="checkbox" name="wd" value="${d}"${(sel || []).includes(d) ? " checked" : ""}><span>${esc(fWeekday(C.addDays("2026-11-22", d)))}</span></label>`).join("")}</div></div>`;
const ruleSelect = (rule, allowNone) => `<label class="field"><span>Repeat</span><select class="input" name="rule" data-live="rule">${allowNone ? `<option value="">Doesn't repeat</option>` : ""}${Object.entries(C.REPEATS).map(([k, l]) => `<option value="${k}"${k === rule ? " selected" : ""}>${l}</option>`).join("")}</select></label>`;
live["rule"] = el => { const box = el.form.querySelector("[data-daypick]"); if (box) box.hidden = el.value !== "days"; };

export function taskSheet(id) {
  const r = parseItem(id);
  if (r) {
    const rep = repById(r.rid); if (!rep) return "";
    const done = (rep.done || []).includes(r.date);
    return `${sheetHead("Repeating task")}<form data-form="rep-save" data-rid="${rep.id}" data-d="${r.date}">
      <label class="field"><span>Task</span><input class="input" name="text" value="${esc(rep.text)}" maxlength="100" required></label>${catPicker(rep.cat)}
      <div class="row2">${ruleSelect(rep.rule, false)}<label class="field"><span>Time <span class="muted">(optional)</span></span><input class="input" type="time" name="time" value="${esc(rep.time || "")}"></label></div>
      <div${rep.rule === "days" ? "" : " hidden"} data-daypick>${dayPick(rep.days)}</div>
      <p class="small muted" style="margin:-.2rem 0 1rem">Changes apply to every day it repeats. ${done ? `Done on ${esc(fd(r.date))}.` : ""}</p>
      <div class="row-btns"><button class="btn" type="submit">Save</button><button type="button" class="btn ghost" data-act="rep-skip" data-rid="${rep.id}" data-d="${r.date}">Skip ${esc(fd(r.date))}</button><button type="button" class="btn ghost" data-act="rep-stop" data-rid="${rep.id}" data-d="${r.date}">Stop from here</button><button type="button" class="btn text" data-act="rep-del" data-rid="${rep.id}">Delete</button></div></form>`;
  }
  const t = taskById(id); if (!t) return "";
  return `${sheetHead("Task")}<form data-form="task-save" data-id="${t.id}">
    <label class="field"><span>Task</span><input class="input" name="text" value="${esc(t.text)}" maxlength="100" required></label>${catPicker(t.cat)}
    <div class="row2"><label class="field"><span>Day</span><input class="input" type="date" name="date" value="${t.date}" required></label><label class="field"><span>Time <span class="muted">(optional)</span></span><input class="input" type="time" name="time" value="${esc(t.time || "")}"></label></div>
    ${ruleSelect("", true)}<div hidden data-daypick>${dayPick([C.dow(t.date)])}</div>
    <div class="row-btns"><button class="btn" type="submit">Save</button><button type="button" class="btn ghost" data-act="task-tomorrow" data-id="${t.id}">${ic("move")}Move to ${t.date < app.today ? "today" : "the next day"}</button><button type="button" class="btn text" data-act="task-del" data-id="${t.id}">Delete</button></div></form>`;
}
actions["task-edit"] = el => openSheet(taskSheet(el.dataset.id), { label: "Task" });
const readDays = f => [...f.querySelectorAll('input[name="wd"]:checked')].map(i => Number(i.value));
forms["task-save"] = f => {
  const id = f.dataset.id, text = cleanText(val(f, "text")); if (!text) return;
  const rule = val(f, "rule"), date = val(f, "date") || app.today, cat = f.querySelector('input[name="cat"]:checked')?.value || "", time = val(f, "time");
  if (rule) {
    const days = rule === "days" ? readDays(f) : [];
    if (rule === "days" && !days.length) return toast("Pick at least one day.");
    commit(s => { const t = s.tasks.find(x => x.id === id); s.repeats.push({ id: uid(), text, cat, time, rule, days, start: date, skip: [], done: t?.done ? [date] : [] }); s.tasks = s.tasks.filter(x => x.id !== id); });
    closeSheet(); return toast(`Repeats: ${C.REPEATS[rule].toLowerCase()}.`);
  }
  commit(s => { const t = s.tasks.find(x => x.id === id); if (!t) return; if (t.date !== date) { t.carried = undefined; } Object.assign(t, { text, cat, time, date }); });
  closeSheet();
};
actions["task-tomorrow"] = el => {
  const t = taskById(el.dataset.id); if (!t) return;
  const to = t.date < app.today ? app.today : C.addDays(t.date, 1), from = t.date;
  commit(s => { const x = s.tasks.find(y => y.id === t.id); x.carried = x.carried || from; x.date = to; x.order = Date.now(); });
  closeSheet(); toast(`Moved to ${to === app.today ? "today" : fd(to)}.`, () => commit(s => { const x = s.tasks.find(y => y.id === t.id); x.date = from; }));
};
actions["task-del"] = el => {
  const t = taskById(el.dataset.id); if (!t) return; const i = S().tasks.indexOf(t);
  commit(s => { s.tasks = s.tasks.filter(x => x.id !== t.id); }); closeSheet();
  toast("Task deleted.", () => commit(s => { s.tasks.splice(i, 0, t); }));
};
forms["rep-save"] = f => {
  const rid = f.dataset.rid, text = cleanText(val(f, "text")); if (!text) return;
  const rule = val(f, "rule"), days = rule === "days" ? readDays(f) : [];
  if (rule === "days" && !days.length) return toast("Pick at least one day.");
  commit(s => { const r = s.repeats.find(x => x.id === rid); Object.assign(r, { text, rule, days, time: val(f, "time"), cat: f.querySelector('input[name="cat"]:checked')?.value || "" }); });
  closeSheet(); toast("Saved for every day it repeats.");
};
actions["rep-skip"] = el => { const { rid, d } = el.dataset; commit(s => { const r = s.repeats.find(x => x.id === rid); r.skip = [...(r.skip || []), d]; r.done = (r.done || []).filter(x => x !== d); }); closeSheet(); toast(`Skipped on ${fd(d)}.`, () => commit(s => { const r = s.repeats.find(x => x.id === rid); r.skip = r.skip.filter(x => x !== d); })); };
actions["rep-stop"] = el => { const { rid, d } = el.dataset, before = repById(rid).end; commit(s => { const r = s.repeats.find(x => x.id === rid); r.end = C.addDays(d, -1); }); closeSheet(); toast("It won't repeat from here on. Earlier days keep their ticks.", () => commit(s => { s.repeats.find(x => x.id === rid).end = before; })); };
actions["rep-del"] = el => { const r = repById(el.dataset.rid); if (!confirm(`Delete "${r.text}" on every day, with its ticks?`)) return; const i = S().repeats.indexOf(r); commit(s => { s.repeats = s.repeats.filter(x => x.id !== r.id); }); closeSheet(); toast("Repeating task deleted.", () => commit(s => { s.repeats.splice(i, 0, r); })); };

// ============ Carry over ============
function moveToToday(ids) {
  const before = S().tasks.filter(t => ids.includes(t.id)).map(t => ({ id: t.id, date: t.date, carried: t.carried }));
  commit(s => { for (const t of s.tasks) if (ids.includes(t.id)) { t.carried = t.carried || t.date; t.date = app.today; t.order = Date.now(); } s.meta.carryFrom = app.today; });
  toast(`${pl(ids.length, "thing", "things")} moved to today.`, () => commit(s => { for (const b of before) Object.assign(s.tasks.find(t => t.id === b.id), { date: b.date, carried: b.carried }); }));
}
actions["carry-all"] = () => moveToToday(C.leftovers(S(), app.today).map(t => t.id));
actions["carry-pick"] = () => {
  const left = C.leftovers(S(), app.today);
  openSheet(`${sheetHead("Left from before")}<p class="small muted" style="margin-bottom:1rem">Tick what you still want to do. The rest can go.</p>
    <form data-form="carry-go"><div class="list">${left.map(t => `<label class="li check" style="margin:0"><span class="t"><input type="checkbox" name="t" value="${t.id}" checked>${esc(t.text)}<small style="margin-left:.4rem">${esc(fd(t.date))}</small></span>${chip(t.cat)}</label>`).join("")}</div>
    <div class="row-btns"><button class="btn" type="submit">Move ticked to today</button><button type="button" class="btn text" data-act="carry-drop">Let go of all</button></div></form>`, { label: "Left from before" });
};
forms["carry-go"] = f => { const ids = [...f.querySelectorAll('input[name="t"]:checked')].map(i => i.value); const all = C.leftovers(S(), app.today).map(t => t.id); closeSheet(); if (ids.length) moveToToday(ids); const drop = all.filter(id => !ids.includes(id)); if (drop.length) commit(s => { for (const t of s.tasks) if (drop.includes(t.id)) t.dropped = true; }); };
actions["carry-drop"] = () => {
  const ids = C.leftovers(S(), app.today).map(t => t.id); closeSheet();
  commit(s => { for (const t of s.tasks) if (ids.includes(t.id)) t.dropped = true; s.meta.carryFrom = app.today; });
  toast("Let go. They won't count against those days.", () => commit(s => { for (const t of s.tasks) if (ids.includes(t.id)) t.dropped = false; }));
};

// ============ Schedule ============
function blockSheet(b, d) {
  const isNew = !b.id;
  return `${sheetHead(isNew ? "Add to your schedule" : "Schedule")}<form data-form="block-save" data-id="${b.id || ""}" data-d="${d}">
    <label class="field"><span>What</span><input class="input" name="text" value="${esc(b.text || "")}" maxlength="60" required autofocus></label>${catPicker(b.cat)}
    <div class="row2"><label class="field"><span>From</span><input class="input" type="time" name="start" value="${b.start}" step="900" required></label><label class="field"><span>To</span><input class="input" type="time" name="end" value="${b.end}" step="900" required></label></div>
    <p class="small muted" style="margin:-.3rem 0 1rem">${esc(fdLong(d))}</p>
    <div class="row-btns"><button class="btn" type="submit">${isNew ? "Add" : "Save"}</button>${isNew ? "" : `<button type="button" class="btn text" data-act="block-del" data-id="${b.id}">Delete</button>`}</div></form>`;
}
actions["block-new"] = el => { const st = el.dataset.t; openSheet(blockSheet({ start: st, end: C.toTime(C.toMin(st) + 60) }, el.dataset.d), { label: "Schedule" }); };
actions["block-edit"] = el => { const b = S().blocks.find(x => x.id === el.dataset.id); if (b) openSheet(blockSheet(b, b.date), { label: "Schedule" }); };
forms["block-save"] = f => {
  const text = cleanText(val(f, "text"), 60), start = val(f, "start"), end = val(f, "end"); if (!text) return;
  if (C.toMin(end) <= C.toMin(start)) return toast("The end time needs to be after the start.");
  const cat = f.querySelector('input[name="cat"]:checked')?.value || "", id = f.dataset.id;
  commit(s => { if (id) Object.assign(s.blocks.find(x => x.id === id), { text, start, end, cat }); else s.blocks.push({ id: uid(), date: f.dataset.d, text, start, end, cat }); });
  closeSheet();
};
actions["block-del"] = el => { const b = S().blocks.find(x => x.id === el.dataset.id); commit(s => { s.blocks = s.blocks.filter(x => x.id !== b.id); }); closeSheet(); toast("Removed from the schedule.", () => commit(s => s.blocks.push(b))); };

// ============ Week ============
const wk = (s, k) => (s.weeks[k] ||= { focus: "", pri: [], how: "", line: "" });
live["wfocus"] = el => commit(s => { wk(s, el.dataset.w).focus = el.value.slice(0, 90); }, { render: false });
live["wline"] = el => commit(s => { wk(s, el.dataset.w).line = el.value.slice(0, 100); }, { render: false });
live["wpri"] = el => commit(s => { const w = wk(s, el.dataset.w); while (w.pri.length < 3) w.pri.push({ text: "", done: false }); w.pri[Number(el.dataset.i)].text = el.value.slice(0, 70); }, { render: false });
actions["pri-tick"] = el => {
  const w = S().weeks[el.dataset.w], p = w?.pri?.[Number(el.dataset.i)];
  if (!p || !String(p.text || "").trim()) return toast("Write the priority first.");
  commit(s => { const q = s.weeks[el.dataset.w].pri[Number(el.dataset.i)]; q.done = !q.done; });
};
actions["whow"] = el => commit(s => { const w = wk(s, el.dataset.w); w.how = w.how === el.dataset.v ? "" : el.dataset.v; });

// ============ Month ============
const mo = (s, ym) => (s.months[ym] ||= { goals: [], wins: "", better: "", change: "" });
forms["mgoal-add"] = f => { const text = cleanText(val(f, "text"), 80); if (!text) return; const ym = f.dataset.ym; commit(s => mo(s, ym).goals.push({ id: uid(), text, done: false })); document.querySelector(`form[data-form="mgoal-add"] input`)?.focus(); };
actions["mgoal-tick"] = el => commit(s => { const g = mo(s, el.dataset.ym).goals.find(x => x.id === el.dataset.id); if (g) g.done = !g.done; });
live["mgoal"] = el => commit(s => { const g = mo(s, el.dataset.ym).goals.find(x => x.id === el.dataset.id); if (g) g.text = el.value.slice(0, 80); }, { render: false });
actions["mgoal-del"] = el => { const m = mo(S(), el.dataset.ym), g = m.goals.find(x => x.id === el.dataset.id), i = m.goals.indexOf(g); commit(s => { mo(s, el.dataset.ym).goals = m.goals.filter(x => x !== g); }); toast("Goal removed.", () => commit(s => { mo(s, el.dataset.ym).goals.splice(i, 0, g); })); };
live["mref"] = el => commit(s => { mo(s, el.dataset.ym)[el.dataset.k] = el.value.slice(0, 1000); }, { render: false });

// ============ Goals ============
export function goalSheet(id) {
  const g = id ? S().goals.find(x => x.id === id) : newGoal({ start: app.today });
  if (!g) return "";
  const p = C.goalProgress(g);
  return `${sheetHead(id ? esc(g.name) : "New goal")}<form data-form="goal-save" data-id="${id || ""}">
    <label class="field"><span>Goal</span><input class="input" name="name" value="${esc(g.name)}" maxlength="60" required placeholder="Read 24 books"></label>
    <label class="field"><span>Why it matters <span class="muted">(optional)</span></span><input class="input" name="why" value="${esc(g.why)}" maxlength="80" placeholder="Less phone, more stories"></label>${catPicker(g.cat)}
    <div class="row2"><label class="field"><span>Start</span><input class="input" type="date" name="start" value="${g.start || ""}"></label><label class="field"><span>By <span class="muted">(optional)</span></span><input class="input" type="date" name="end" value="${g.end || ""}"></label></div>
    <button class="btn${id ? " ghost small" : " full"}" type="submit">${id ? "Save changes" : "Add goal"}</button></form>
    ${id ? `<div class="gsteps"><div class="ch" style="margin-top:1.4rem"><h3 class="fr">Steps</h3><span class="small muted">${p.total ? `${p.done} of ${p.total} done` : "Break it into small steps"}</span></div>
      <ul class="top">${g.steps.map(st => `<li class="${st.done ? "x" : ""}">${tick(st.done, "step-tick", `data-g="${g.id}" data-s="${st.id}"`, st.text)}<span class="t">${esc(st.text)}</span>${st.done ? "" : `<button type="button" class="act" data-act="step-today" data-g="${g.id}" data-s="${st.id}">To today</button>`}<button type="button" class="del" data-act="step-del" data-g="${g.id}" data-s="${st.id}" aria-label="Delete step">${ic("bin")}</button></li>`).join("")}</ul>
      <form data-form="step-add" data-g="${g.id}" class="addrow"><input class="tin" name="text" placeholder="Add a step" maxlength="70"><button class="addb" type="submit" aria-label="Add step">${ic("plus")}</button></form>
      <div class="row-btns"><button type="button" class="btn soft small" data-act="goal-done" data-g="${g.id}">${g.done ? "Not done yet" : `${ic("check")}Mark as done`}</button><button type="button" class="btn text small" data-act="goal-del" data-g="${g.id}">Delete goal</button></div></div>` : ""}`;
}
actions["goal-new"] = () => openSheet(goalSheet(null), { label: "New goal" });
actions["goal-open"] = el => openSheet(goalSheet(el.dataset.id), { label: "Goal" });
forms["goal-save"] = f => {
  const name = cleanText(val(f, "name"), 60); if (!name) return;
  const o = { name, why: cleanText(val(f, "why"), 80), cat: f.querySelector('input[name="cat"]:checked')?.value || "", start: val(f, "start") || null, end: val(f, "end") || null };
  if (f.dataset.id) { commit(s => Object.assign(s.goals.find(x => x.id === f.dataset.id), o)); updateSheet(goalSheet(f.dataset.id)); toast("Saved."); return; }
  const g = newGoal(o); commit(s => s.goals.push(g)); app.view = app.view === "year" ? "year" : "goals"; render(); updateSheet(goalSheet(g.id));
  if (!document.querySelector("#sheet-root .sheet")) openSheet(goalSheet(g.id), { label: "Goal" });
  setTimeout(() => document.querySelector('form[data-form="step-add"] input')?.focus(), 50);
};
const refreshGoal = gid => { render(); updateSheet(goalSheet(gid)); };
forms["step-add"] = f => { const text = cleanText(val(f, "text"), 70); if (!text) return; const gid = f.dataset.g; commit(s => s.goals.find(x => x.id === gid).steps.push({ id: uid(), text, done: false }), { render: false }); refreshGoal(gid); document.querySelector('form[data-form="step-add"] input')?.focus(); };
actions["step-tick"] = el => { const { g, s: sid } = el.dataset; commit(s => { const st = s.goals.find(x => x.id === g).steps.find(x => x.id === sid); st.done = !st.done; for (const t of s.tasks) if (t.goal?.g === g && t.goal.s === sid) t.done = st.done; }, { render: false }); refreshGoal(g); };
actions["step-today"] = el => { const { g, s: sid } = el.dataset, goal = S().goals.find(x => x.id === g), st = goal.steps.find(x => x.id === sid); commit(s => s.tasks.push(newTask({ text: st.text, date: app.today, cat: goal.cat, goal: { g, s: sid } })), { render: false }); refreshGoal(g); toast(`"${st.text}" is on today's list.`); };
actions["step-del"] = el => { const { g, s: sid } = el.dataset; commit(s => { const goal = s.goals.find(x => x.id === g); goal.steps = goal.steps.filter(x => x.id !== sid); }, { render: false }); refreshGoal(g); };
actions["goal-done"] = el => { const g = el.dataset.g; commit(s => { const goal = s.goals.find(x => x.id === g); goal.done = !goal.done; }, { render: false }); refreshGoal(g); };
actions["goal-del"] = el => { const g = S().goals.find(x => x.id === el.dataset.g); if (!confirm(`Delete "${g.name}" and its steps?`)) return; const i = S().goals.indexOf(g); commit(s => { s.goals = s.goals.filter(x => x.id !== g.id); }); closeSheet(); toast("Goal deleted.", () => commit(s => { s.goals.splice(i, 0, g); })); };

// ============ Settings ============
forms["profile"] = f => { commit(s => { Object.assign(s.profile, { name: cleanText(val(f, "name"), 30), weekStart: Number(val(f, "weekStart")), clock24: val(f, "clock24") === "1" }); const a = Number(val(f, "dayStart")), b = Number(val(f, "dayEnd")); if (b > a) { s.profile.dayStart = a; s.profile.dayEnd = b; } }); toast("Saved."); };
actions["cat-color"] = el => commit(s => { const c = s.categories.find(x => x.id === el.dataset.id); c.color = PALETTE[(PALETTE.indexOf(c.color) + 1) % PALETTE.length]; });
live["cat-name"] = el => commit(s => { const c = s.categories.find(x => x.id === el.dataset.id); if (el.value.trim()) c.name = el.value.slice(0, 20); }, { render: false });
actions["cat-add"] = () => { commit(s => { const used = s.categories.map(c => c.color); s.categories.push({ id: uid(), name: "New category", color: PALETTE.find(p => !used.includes(p)) || "p5" }); }); setTimeout(() => { const ins = document.querySelectorAll('[data-live="cat-name"]'); ins[ins.length - 1]?.select(); }, 30); };
actions["cat-del"] = el => { const c = S().categories.find(x => x.id === el.dataset.id), i = S().categories.indexOf(c); commit(s => { s.categories = s.categories.filter(x => x !== c); }); toast(`"${c.name}" removed. Its tasks keep their text.`, () => commit(s => { s.categories.splice(i, 0, c); })); };
live["mood-name"] = el => commit(s => { const m = s.moods.find(x => x.id === el.dataset.id); if (el.value.trim()) m.name = el.value.slice(0, 14); }, { render: false });
actions["ci-add"] = el => { if (S().checkins.length >= 8) return toast("Up to 8 check-ins."); const name = el.dataset.n || "New check-in"; commit(s => s.checkins.push({ id: uid(), name, on: true })); if (!el.dataset.n) setTimeout(() => { const ins = document.querySelectorAll('[data-live="ci-name"]'); ins[ins.length - 1]?.select(); }, 30); };
live["ci-name"] = el => commit(s => { const c = s.checkins.find(x => x.id === el.dataset.id); if (el.value.trim()) c.name = el.value.slice(0, 20); }, { render: false });
actions["ci-on"] = el => commit(s => { const c = s.checkins.find(x => x.id === el.dataset.id); c.on = c.on === false; });
actions["ci-del"] = el => { const c = S().checkins.find(x => x.id === el.dataset.id), i = S().checkins.indexOf(c); commit(s => { s.checkins = s.checkins.filter(x => x !== c); }); toast(`"${c.name}" removed.`, () => commit(s => { s.checkins.splice(i, 0, c); })); };

// ============ Data: backup, restore, export, move, install ============
actions["backup"] = async () => {
  const data = JSON.stringify({ app: "deardays", version: 1, exportedAt: new Date().toISOString(), state: S() }, null, 1);
  const r = await shareOrDownload(`dear-days-backup-${app.today}.json`, data, "application/json");
  if (r === "cancelled") return;
  commit(s => { s.meta.lastBackup = new Date().toISOString(); });
  toast(r === "shared" ? "Backup ready. Save it to Files, Drive or email." : "Backup saved to your downloads.");
};
actions["restore"] = async () => {
  const f = await pickFile(".json,application/json"); if (!f) return;
  let d; try { d = JSON.parse(f.text); } catch { return toast("That file isn't a Dear Days backup."); }
  if (d?.app !== "deardays" || !d.state) return toast("That file isn't a Dear Days backup.");
  openSheet(`${sheetHead("Restore this backup?", "Cancel")}<p style="font-weight:700;margin-bottom:1rem">Backup from ${esc(fd(String(d.exportedAt || "").slice(0, 10) || app.today))} with ${(d.state.tasks || []).length} tasks and ${(d.state.goals || []).length} goals. It replaces what's on this device now.</p><button type="button" class="btn full" data-act="restore-go">Yes, restore it</button>`, { label: "Restore" });
  actions["restore-go"] = () => { const st = normalise(d.state); st.meta.unlocked = true; st.meta.setupDone = true; st.meta.demo = app.demo; app.S = st; commit(null); applyLook(); closeSheet(); app.view = "today"; app.day = null; render(); toast("Restored. Welcome back."); };
};
actions["move-phone"] = () => {
  const link = location.origin + location.pathname.replace(/index\.html$/, "");
  openSheet(`${sheetHead("Move to another device")}<p class="small muted" style="margin-bottom:1rem">Your planner lives on this device only, for privacy. Moving it takes a minute.</p>
    <ol class="steps"><li>Make a backup here<div style="margin-top:.4rem"><button type="button" class="btn soft small" data-act="backup">Back up now</button></div></li><li>Send the file to yourself<small>AirDrop, WhatsApp to yourself, email or Google Drive.</small></li>
    <li>On the other device, open Dear Days<small><span style="word-break:break-all">${esc(link)}</span></small></li><li>Unlock, then Settings, Restore from a backup</li></ol>`, { label: "Move" });
};
actions["export-csv"] = async () => {
  const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`, cat = id => catOf(id)?.name || "";
  const X = ix(), rows = [];
  for (const t of S().tasks) if (t.date) rows.push([t.date, "Task", q(t.text), q(cat(t.cat)), t.time || "", t.done ? "yes" : "no"]);
  for (const r of S().repeats) for (const d of r.done || []) rows.push([d, "Repeating task", q(r.text), q(cat(r.cat)), r.time || "", "yes"]);
  for (const [d, x] of Object.entries(S().days)) (x.top || []).forEach(t => { if (t?.text) rows.push([d, "Top 3", q(t.text), "", "", t.done ? "yes" : "no"]); });
  for (const b of S().blocks) rows.push([b.date, "Schedule", q(b.text), q(cat(b.cat)), `${b.start}-${b.end}`, ""]);
  for (const [d, x] of Object.entries(S().days)) if (x.mood) rows.push([d, "Mood", q(S().moods.find(m => m.id === x.mood)?.name || ""), "", "", ""]);
  rows.sort((a, b) => a[0].localeCompare(b[0])); void X;
  await shareOrDownload(`dear-days-${app.today}.csv`, "﻿" + ["Date,What,Text,Category,Time,Done", ...rows.map(r => r.join(","))].join("\r\n"), "text/csv");
  toast("Exported. Open it in Google Sheets (File, Import) or Excel.");
};
let deferredPrompt = null;
addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferredPrompt = e; });
actions["install-now"] = async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice.catch(() => {}); deferredPrompt = null; closeSheet(); };
actions["install-help"] = () => openSheet(`${sheetHead("Put it on your home screen")}<p class="small muted" style="margin-bottom:1rem">Then it opens like an app, works offline, and your planner is two taps away.</p>
  ${deferredPrompt ? `<button type="button" class="btn full" data-act="install-now" style="margin-bottom:1rem">Install now</button>` : ""}
  <h3 class="fr" style="margin-bottom:.5rem">iPhone or iPad</h3><ol class="steps"><li>Open this page in Safari</li><li>Tap the Share button<small>The square with an arrow.</small></li><li>Tap "Add to Home Screen", then "Add"</li></ol>
  <h3 class="fr" style="margin:.4rem 0 .5rem">Android</h3><ol class="steps"><li>Open this page in Chrome</li><li>Tap the three dots, top right</li><li>Tap "Install app" or "Add to Home screen"</li></ol>
  <h3 class="fr" style="margin:.4rem 0 .5rem">Laptop</h3><ol class="steps"><li>Chrome or Edge: the install icon at the right end of the address bar</li><li>Safari on Mac: File, then "Add to Dock"</li></ol>`, { label: "Install" });
actions["wipe"] = async () => {
  if (app.demo) return toast("This is the demo. Nothing is saved anyway.");
  if (!confirm("Delete your whole planner from this device? Make a backup first if you might want it back.")) return;
  await store.wipe(); location.reload();
};

// ============ My month card (story picture) ============
actions["month-card"] = async el => {
  const ym = el.dataset.ym || C.ymOf(app.today);
  openSheet(`${sheetHead("My month card")}<div class="empty">Making your card&hellip;</div>`, { label: "My month card" });
  const blob = await monthCard(S(), ix(), ym, app.today), url = URL.createObjectURL(blob);
  updateSheet(`${sheetHead("My month card")}<img src="${url}" alt="Your month card" class="card-img"><div class="row-btns" style="justify-content:center;margin-top:1.2rem"><button type="button" class="btn" data-act="card-save">Save or share</button></div><p class="small muted" style="text-align:center;margin-top:.5rem">Made for Instagram and TikTok stories (1080 × 1920).</p>`);
  actions["card-save"] = async () => {
    const file = new File([blob], `my-month-${ym}.png`, { type: "image/png" });
    try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; } } catch (e) { if (e && e.name === "AbortError") return; }
    const a = document.createElement("a"); a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
  };
};

// ============ Unlock and setup ============
const CODE_HASH = "9c819491027839ea8b72da1abe3752dbad6f4e4fa6bb90d45b55ca430954eeb7";
async function codeOK(code) {
  try { const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, ""))); return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, "0")).join("") === CODE_HASH; }
  catch { return false; }
}
export function renderUnlock(msg = "") {
  document.getElementById("app").innerHTML = `<div class="center-screen"><div class="center-card">${brand()}
    <h1 class="fr">Welcome to your <em class="it">planner</em></h1>
    <p style="margin-bottom:1.2rem;color:var(--body)">Type the unlock code from your Etsy download (the PDF). You only do this once on each device.</p>
    <form data-form="unlock"><label class="field"><span>Unlock code</span><input class="input" name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="DEAR-DAYS-0000" autofocus></label>
    ${msg ? `<p style="color:var(--rose);font-weight:800;margin:-.3rem 0 .8rem">${esc(msg)}</p>` : ""}<button class="btn full" type="submit">Unlock</button></form>
    <p class="small muted" style="margin-top:1rem">Haven't bought it yet? <a href="?demo">Try the free demo</a>, or <a href="${ETSY_URL}" target="_blank" rel="noopener">find it on Etsy</a>.</p></div></div>`;
}
forms["unlock"] = async f => {
  if (!(await codeOK(val(f, "code")))) return renderUnlock("That code doesn't match. Check the PDF, or message the shop and we'll help.");
  app.S = blankState(); app.S.meta.unlocked = true; store.save(app.S); await store.flush(); wz = null; renderSetup();
};
let wz = null;
export function renderSetup() {
  if (!wz) wz = { step: 1, name: "", look: "strawberry", weekStart: 1, clock24: S().profile.clock24, checks: ["Water", "Walk", "Read"] };
  app.S.profile.look = wz.look; applyLook();
  const prog = `<div class="progress">${[1, 2, 3].map(i => `<i class="${i <= wz.step ? "on" : ""}"></i>`).join("")}</div>`;
  let body = "";
  if (wz.step === 1) body = `<h1 class="fr">Let's make your <em class="it">planner</em></h1><p style="margin:.2rem 0 1.2rem;color:var(--body)">Three quick steps. You can change everything later.</p>
    <label class="field"><span>What should I call you? <span class="muted">(optional)</span></span><input class="input" name="name" value="${esc(wz.name)}" autocomplete="given-name"></label>
    <div class="field"><span>Pick your look</span><div class="looks">${Object.entries(LOOKS).map(([k, [n, sw, mt]]) => `<button type="button" class="look" data-act="wz-look" data-v="${k}" aria-pressed="${wz.look === k}" style="--sw:${sw};--mt:${mt}"><i></i>${n}</button>`).join("")}</div><small>Each one has a dark mode too.</small></div>`;
  if (wz.step === 2) body = `<h1 class="fr">Your <em class="it">week</em></h1><p style="margin:.2rem 0 1.2rem;color:var(--body)">So the week and month pages look the way you think.</p>
    <div class="row2"><label class="field"><span>Weeks start on</span><select class="input" name="weekStart"><option value="1"${wz.weekStart === 1 ? " selected" : ""}>Monday</option><option value="0"${wz.weekStart === 0 ? " selected" : ""}>Sunday</option></select></label>
    <label class="field"><span>Clock</span><select class="input" name="clock24"><option value="1"${wz.clock24 ? " selected" : ""}>24 hour (14:30)</option><option value="0"${wz.clock24 ? "" : " selected"}>12 hour (2:30 pm)</option></select></label></div>`;
  if (wz.step === 3) body = `<h1 class="fr">Daily <em class="it">check-ins</em></h1><p style="margin:.2rem 0 1rem;color:var(--body)">Small things you'd like to tick every day. Pick a few, or none.</p>
    <div class="cpick">${CHECKIN_IDEAS.map(n => `<label><input type="checkbox" name="ci" value="${esc(n)}"${wz.checks.includes(n) ? " checked" : ""}><span>${esc(n)}</span></label>`).join("")}</div>
    <p class="small muted" style="margin-top:1rem">Your categories (Work, Self-care, Home, Social, Errand) and moods are ready. Rename them any time in Settings.</p>`;
  document.getElementById("app").innerHTML = `<div class="center-screen"><div class="center-card" style="max-width:34rem">${brand()}${prog}
    <form data-form="setup">${body}<div class="wz-nav" style="display:flex;gap:.6rem;margin-top:1.3rem">${wz.step > 1 ? `<button type="button" class="btn ghost" data-act="wz-back">Back</button>` : ""}<button class="btn" type="submit" style="flex:1">${wz.step < 3 ? "Next" : "Open my planner"}</button></div></form></div></div>`;
}
function syncWz() {
  const f = document.querySelector('form[data-form="setup"]'); if (!f) return;
  if (f.elements.name) wz.name = val(f, "name");
  if (f.elements.weekStart) { wz.weekStart = Number(val(f, "weekStart")); wz.clock24 = val(f, "clock24") === "1"; }
  if (f.querySelector('input[name="ci"]')) wz.checks = [...f.querySelectorAll('input[name="ci"]:checked')].map(i => i.value);
}
actions["wz-look"] = el => { syncWz(); wz.look = el.dataset.v; renderSetup(); };
actions["wz-back"] = () => { syncWz(); wz.step--; renderSetup(); };
forms["setup"] = () => { syncWz(); if (wz.step < 3) { wz.step++; renderSetup(); return; } finishSetup(); };
function finishSetup() {
  const s = S();
  Object.assign(s.profile, { name: cleanText(wz.name, 30), look: wz.look, weekStart: wz.weekStart, clock24: wz.clock24 });
  s.checkins = wz.checks.slice(0, 8).map(name => ({ id: uid(), name, on: true }));
  s.meta.setupDone = true; s.meta.createdAt = new Date().toISOString();
  commit(null, { render: false }); store.askToPersist(); wz = null; app.view = "today"; app.start();
  if (isIOS() && !isStandalone()) setTimeout(() => actions["install-help"](), 900);
}
export { ftime };
