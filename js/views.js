// Dear Days — the screens: Today, Week, Month, Year, Goals, Settings.
import * as C from "./calc.js";
import { app, esc, fd, fdShort, fMonthShort, fMonthName, fWeekday, fWeekdayLong, fDayMonth, ftime } from "./core.js";
import { ic, brand, pctTxt, bar, tick, catOf, chip, moodOf, pl } from "./ui.js";
import { WEEK_HOW, PALETTE, CHECKIN_IDEAS } from "./model.js";

export const ETSY_URL = "https://dearagneta.etsy.com";
export const APP_VERSION = "1.0.0";
export const LOOKS = { strawberry: ["Strawberry", "#E7B3C1", "#C9A462"], blueberry: ["Blueberry", "#9CB4DD", "#BCC2CF"], matcha: ["Matcha", "#B5C79A", "#C9A462"], academia: ["Academia", "#7C2F38", "#B68C45"] };
const S = () => app.S;
const ws = () => S().profile.weekStart;
let X = null;
export const ix = () => X || (X = C.index(S()));
export const nowMin = () => app.nowMin ?? (new Date().getHours() * 60 + new Date().getMinutes());
const relDay = d => { const n = C.diffDays(app.today, d); return n === 0 ? "Today" : n === 1 ? "Tomorrow" : n === -1 ? "Yesterday" : n > 0 ? `In ${n} days` : `${-n} days ago`; };

export function shell() {
  X = C.index(S());
  const v = app.view, P = S().profile, t = app.today, yr = Number(t.slice(0, 4));
  const next = C.blocksFor(X, t).find(b => C.toMin(b.start) > nowMin());
  const nav = [["today", "Today", "today"], ["week", "Week", "week"], ["month", "Month", "month"], ["year", "Year", "year"], ["goals", "Goals", "goals"], ["settings", "Settings", "sliders"]];
  const cur = k => (v === k ? ' aria-current="page"' : "");
  return `${app.demo && !app.photo ? `<div class="demo-bar"><span class="long">Free demo with ${esc(P.name)}'s planner. Try anything, nothing is saved.</span><span class="short">Free demo · nothing is saved</span><a href="${ETSY_URL}" target="_blank" rel="noopener">Get Dear Days</a></div>` : ""}
  <header class="ptop">${brand()}<button type="button" data-act="nav" data-view="settings">${ic("sliders")}Settings</button></header>
  <div class="app">
    <aside class="cover"><span class="ribbon" aria-hidden="true"></span>${brand()}
      <nav aria-label="Main">${nav.map(([k, l, i]) => `<button type="button" data-act="nav" data-view="${k}"${cur(k)}>${ic(i)}${l}</button>`).join("")}</nav>
      <div class="cfoot">Week <b>${C.isoWeek(t)}</b> · day <b>${C.dayOfYear(t)}</b><br><b>${C.daysInYear(yr) - C.dayOfYear(t)}</b> days left in ${yr}${next ? `<br>Next: <b>${esc(next.text)}</b> ${esc(ftime(next.start))}` : ""}${app.demo ? `<div class="ex">Example planner: ${esc(P.name)}</div>` : ""}</div>
    </aside>
    <main class="page" id="main">${(views[v] || views.today)()}</main>
  </div>
  <nav class="tabbar" aria-label="Main">${nav.slice(0, 5).map(([k, l, i]) => `<button type="button" data-act="nav" data-view="${k}"${cur(k)}>${ic(i)}${l}</button>`).join("")}</nav>`;
}

const doneBox = (p, small) => `<div class="donebox"><div class="dn"><span class="n fr">${p == null ? "–" : pctTxt(p)}</span><small>${small}</small></div>${bar(p)}</div>`;
const card = (title, right, body, cls = "") => `<section class="card ${cls}"><div class="ch"><h2>${title}</h2>${right ? `<span>${right}</span>` : ""}</div>${body}</section>`;

// ---------------- TODAY ----------------
function itemRow(it, compact = false) {
  const meta = [];
  if (it.time) meta.push(`${ic("clock", "mi")}${esc(ftime(it.time))}`);
  if (it.repeat) meta.push(`${ic("repeat", "mi")}${esc(C.REPEATS[S().repeats.find(r => r.id === it.rid)?.rule] || "Repeats")}`);
  if (it.carried) meta.push(`<span class="carry">Moved from ${esc(relDay(it.carried).toLowerCase() === "yesterday" ? "yesterday" : fd(it.carried))}</span>`);
  if (it.goal) { const g = S().goals.find(x => x.id === it.goal.g); if (g) meta.push(`${ic("goals", "mi")}${esc(g.name)}`); }
  return `<li class="${it.done ? "x" : ""}">${tick(it.done, "tick", `data-id="${esc(it.id)}"`, it.text)}<button type="button" class="t" data-act="task-edit" data-id="${esc(it.id)}">${esc(it.text)}${meta.length && !compact ? `<small>${meta.join("")}</small>` : ""}</button>${compact ? "" : chip(it.cat)}</li>`;
}
const addRow = (d, ph = "Add a task") => `<form data-form="task-add" data-d="${d}" class="addrow"><input class="tin" name="text" placeholder="${ph}" maxlength="100" autocomplete="off" aria-label="${ph}"><button class="addb" type="submit" aria-label="Add">${ic("plus")}</button></form>`;

function schedule(D) {
  const P = S().profile, a = P.dayStart, b = Math.max(P.dayEnd, a + 4), blocks = C.blocksFor(X, D);
  const hrs = Array.from({ length: b - a }, (_, i) => a + i).map(h => `<button type="button" class="hr" data-act="block-new" data-d="${D}" data-t="${C.pad(h)}:00" style="top:calc(var(--hh) * ${h - a})" aria-label="Add something at ${ftime(C.pad(h) + ":00")}"><span>${esc(ftime(C.pad(h) + ":00"))}</span></button>`).join("");
  const bl = blocks.map(x => {
    const s = Math.max(C.toMin(x.start), a * 60), e = Math.min(C.toMin(x.end), b * 60); if (e <= s) return "";
    const c = catOf(x.cat)?.color || "p5", short = e - s < 50;
    return `<button type="button" class="blk${short ? " short" : ""}" data-act="block-edit" data-id="${x.id}" style="top:calc(var(--hh) * ${(s - a * 60) / 60});height:calc(var(--hh) * ${(e - s) / 60} - 3px);--c:var(--${c})"><b>${esc(x.text)}</b>${short ? "" : `<small>${esc(ftime(x.start))}–${esc(ftime(x.end))}</small>`}</button>`;
  }).join("");
  const n = nowMin(), now = D === app.today && n >= a * 60 && n <= b * 60 ? `<div class="now" style="top:calc(var(--hh) * ${(n - a * 60) / 60})"></div>` : "";
  return `<div class="sched" style="height:calc(var(--hh) * ${b - a})">${hrs}${bl}${now}</div>`;
}

export function miniMonth(D, big = false) {
  const ym = C.ymOf(D), names = Array.from({ length: 7 }, (_, i) => fWeekday(C.addDays("2026-11-22", (i + ws()) % 7)).slice(0, big ? 3 : 1));
  const cells = C.monthGrid(ym, ws()).map(d => {
    if (!d) return `<i class="blank"></i>`;
    const st = C.dayStats(X, d), fut = d > app.today, sel = d === D && app.view === "today";
    const style = !fut && st.pct != null ? `--p:${(0.14 + st.pct * 0.76).toFixed(2)}` : "";
    const mood = st.mood ? `<u style="background:var(--${st.mood})"></u>` : "";
    return big
      ? `<button type="button" class="mc${fut ? " fut" : ""}${d === app.today ? " tdy" : ""}" data-act="go-day" data-d="${d}" aria-label="${esc(fd(d))}"><span>${Number(d.slice(8))}</span>${mood}${!fut && st.pct != null ? `<s><em style="width:${Math.round(st.pct * 100)}%"></em></s>` : ""}</button>`
      : `<button type="button" class="${fut ? "fut" : st.pct != null ? "f" : ""}${d === app.today ? " tdy" : ""}${sel ? " sel" : ""}" style="${style}" data-act="go-day" data-d="${d}" aria-label="${esc(fd(d))}">${Number(d.slice(8))}</button>`;
  }).join("");
  return `<div class="${big ? "cal" : "mini"}">${names.map(n => `<b>${esc(n)}</b>`).join("")}${cells}</div>`;
}

function today() {
  const D = app.day || app.today, isToday = D === app.today, st = C.dayStats(X, D), day = S().days[D] || {};
  const wk = S().weeks[C.weekStart(D, ws())] || {}, carried = st.items.filter(i => i.carried && !i.done).length;
  const left = isToday ? C.leftovers(S(), app.today) : [];
  const strip = C.weekDays(D, ws()).map(d => {
    const s = C.dayStats(X, d), past = d < app.today;
    const right = s.total ? (past || d === app.today ? pctTxt(s.pct) : `${s.total - s.done} to do`) : "";
    return `<button type="button" class="${d === D ? "on" : ""}${past ? " past" : ""}${d === app.today ? " tdy" : ""}" data-act="go-day" data-d="${d}"><span><small>${esc(fWeekday(d))}</small><b class="d">${Number(d.slice(8))}</b></span><span class="p">${right}</span>${s.total && (past || d === app.today) ? `<i class="sb" style="width:${Math.round((s.pct || 0) * 100)}%"></i>` : ""}</button>`;
  }).join("");
  const moods = S().moods.map(m => `<button type="button" data-act="mood" data-m="${m.id}" aria-pressed="${day.mood === m.id}"><i style="background:var(--${m.id})"></i>${esc(m.name)}</button>`).join("");
  const top = [0, 1, 2].map(i => {
    const t = (day.top || [])[i] || { text: "", done: false };
    return `<li class="${t.done ? "x" : ""}"><span class="num">${i + 1}</span><input class="tin" data-live="top" data-d="${D}" data-i="${i}" value="${esc(t.text)}" placeholder="${["The one that matters most", "Next most important", "And one more"][i]}" maxlength="80" aria-label="Top ${i + 1}">${tick(t.done, "top-tick", `data-d="${D}" data-i="${i}"`, `Top ${i + 1} done`)}</li>`;
  }).join("");
  const own = st.items;
  const checks = S().checkins.filter(c => c.on !== false);
  const pri = (wk.pri || []).filter(p => p && p.text);
  return `<div class="head"><div><h1 class="title">${esc(fWeekdayLong(D))}, <em class="it">${esc(fDayMonth(D))}</em></h1>
      <div class="sub">${isToday ? "" : `<b>${esc(relDay(D))}</b> · <button type="button" class="act" data-act="go-day" data-d="${app.today}">Back to today</button> · `}Week ${C.isoWeek(D)} · <b>${st.topDone} of ${st.topTotal || 3}</b> top things done${carried ? ` · <b>${carried}</b> moved from before` : ""}</div></div>
    ${doneBox(st.pct, st.total ? `${st.done} of ${st.total} done${isToday ? " today" : ""}` : "Nothing planned yet")}</div>
  ${left.length ? `<div class="banner"><div><b class="fr">${pl(left.length, "thing", "things")} left from before</b><p>${esc(left.slice(0, 3).map(t => t.text).join(", "))}${left.length > 3 ? ` and ${left.length - 3} more` : ""}</p></div>
    <div class="btns"><button type="button" class="btn small" data-act="carry-all">Move all to today</button><button type="button" class="btn ghost small" data-act="carry-pick">Pick</button><button type="button" class="btn text small" data-act="carry-drop">Let go</button></div></div>` : ""}
  <div class="strip"><button type="button" class="sarr" data-act="day-step" data-n="-7" aria-label="Week before">${ic("left")}</button>${strip}<button type="button" class="sarr" data-act="day-step" data-n="7" aria-label="Week after">${ic("right")}</button></div>
  <div class="moodrow"><span>${isToday ? "How are you today?" : "How was this day?"}</span><div class="moods">${moods}</div></div>
  <div class="tcols">
    <div class="tcol">
      ${card("Top 3", `${st.topDone} of ${st.topTotal || 3}`, `<ul class="top">${top}</ul>`, "o1")}
      ${card("To do", own.length ? `${own.filter(i => i.done).length} of ${own.length}` : "", `<ul class="todo">${own.map(i => itemRow(i)).join("") || `<li class="none">Nothing yet. Add your first task.</li>`}</ul>${addRow(D)}`, "o2")}
    </div>
    <div class="tcol">${card("Schedule", isToday ? `${ic("clock", "mi")}now ${esc(ftime(C.toTime(nowMin())))}` : "tap an hour to add", schedule(D), "o4")}</div>
    <div class="tcol">
      ${card("This week", `<button type="button" class="act" data-act="nav" data-view="week">Open week</button>`, wk.focus || pri.length ? `${wk.focus ? `<p class="focus">“${esc(wk.focus)}”</p>` : ""}<ul class="wk">${pri.map((p, i) => `<li class="${p.done ? "x" : ""}">${tick(p.done, "pri-tick", `data-w="${C.weekStart(D, ws())}" data-i="${(wk.pri || []).indexOf(p)}"`, p.text)}<span class="t">${esc(p.text)}</span></li>`).join("")}</ul>` : `<p class="small muted">No focus yet. <button type="button" class="act" data-act="nav" data-view="week">Plan this week</button></p>`, "o5")}
      ${checks.length ? card("Check-ins", `${st.checkDone} of ${checks.length}`, `<div class="checks">${checks.map(c => `<button type="button" class="ck" data-act="check" data-d="${D}" data-c="${c.id}" aria-pressed="${!!day.checks?.[c.id]}"><span class="box">${day.checks?.[c.id] ? ic("check") : ""}</span>${esc(c.name)}</button>`).join("")}</div>`, "o3") : ""}
      ${card("Notes", "", `<textarea class="notes" data-live="notes" data-d="${D}" placeholder="Anything to remember" aria-label="Notes">${esc(day.notes || "")}</textarea>`, "o6")}
      ${card(esc(fMonthName(D)), `<button type="button" class="act" data-act="go-month" data-ym="${C.ymOf(D)}">Open month</button>`, `${miniMonth(D)}${(() => { const sc = C.monthScore(X, C.ymOf(D), app.today); return sc == null ? "" : `<div class="score">Month score${C.ymOf(D) === C.ymOf(app.today) ? " so far" : ""} <b class="fr">${sc}</b></div>`; })()}`, "o7")}
    </div>
  </div>`;
}

// ---------------- WEEK ----------------
function week() {
  const days = C.weekDays(app.week || app.day || app.today, ws()), k = days[0], w = S().weeks[k] || {}, r = C.rangeStats(X, days, app.today);
  const isNow = days.includes(app.today), pri = [0, 1, 2].map(i => (w.pri || [])[i] || { text: "", done: false });
  const cols = days.map(d => {
    const st = C.dayStats(X, d), past = d < app.today, mood = st.mood ? `<u style="background:var(--${st.mood})" title="${esc(moodOf(st.mood)?.name || "")}"></u>` : "";
    return `<section class="wday${d === app.today ? " tdy" : ""}"><button type="button" class="wh" data-act="go-day" data-d="${d}"><span><small>${esc(fWeekday(d))}</small><b class="fr">${Number(d.slice(8))}</b></span>${mood}<span class="p">${st.total ? (past || d === app.today ? pctTxt(st.pct) : `${st.total - st.done} to do`) : ""}</span></button>${bar(st.pct, "bar thin")}
      <ul class="todo">${st.top.map((t, i) => `<li class="tp${t.done ? " x" : ""}"><span class="num s">${i + 1}</span><span class="t">${esc(t.text)}</span></li>`).join("")}${st.items.map(i => itemRow(i, true)).join("")}</ul>${addRow(d, "Add")}</section>`;
  }).join("");
  const rng = `${fdShort(days[0])} – ${fdShort(days[6])}`;
  return `<div class="head"><div><h1 class="title">Week <em class="it">${C.isoWeek(days[3])}</em></h1><div class="sub">${esc(rng)} · <button type="button" class="act" data-act="week-step" data-n="-1">${ic("left", "mi")}Week ${C.isoWeek(C.addDays(days[3], -7))}</button> · <button type="button" class="act" data-act="week-step" data-n="1">Week ${C.isoWeek(C.addDays(days[3], 7))}${ic("right", "mi")}</button>${isNow ? "" : ` · <button type="button" class="act" data-act="week-step" data-n="0">This week</button>`}</div></div>
    ${doneBox(r.pct, r.total ? `${r.done} of ${r.total} done this week` : "Nothing planned yet")}</div>
  <div class="weekplan card">
    <div><label class="lab" for="wf">Focus for the week</label><input id="wf" class="tin focus" data-live="wfocus" data-w="${k}" value="${esc(w.focus || "")}" placeholder="What would make this week a good one?" maxlength="90">
      <div class="lab" style="margin-top:1rem">3 priorities</div><ul class="top">${pri.map((p, i) => `<li class="${p.done ? "x" : ""}"><span class="num">${i + 1}</span><input class="tin" data-live="wpri" data-w="${k}" data-i="${i}" value="${esc(p.text)}" placeholder="Priority ${i + 1}" maxlength="70">${tick(p.done, "pri-tick", `data-w="${k}" data-i="${i}"`, `Priority ${i + 1} done`)}</li>`).join("")}</ul></div>
    <div><div class="lab">How did it go?</div><div class="how">${Object.entries(WEEK_HOW).map(([v, l]) => `<button type="button" class="chipbtn" data-act="whow" data-w="${k}" data-v="${v}" aria-pressed="${w.how === v}">${l}</button>`).join("")}</div>
      <input class="tin" data-live="wline" data-w="${k}" value="${esc(w.line || "")}" placeholder="One line about the week" maxlength="100" style="margin-top:.8rem">
      <div class="wstats"><span><b class="fr">${r.done}</b> done</span><span><b class="fr">${r.topDone}<small>/${r.topTotal}</small></b> top 3</span>${r.checkTotal ? `<span><b class="fr">${pctTxt(r.checkDone / r.checkTotal)}</b> check-ins</span>` : ""}</div></div>
  </div>
  <div class="wgrid">${cols}</div>`;
}

// ---------------- MONTH ----------------
function month() {
  const ym = app.month || C.ymOf(app.day || app.today), rv = C.monthReview(X, ym, app.today), m = S().months[ym] || {}, isNow = ym === C.ymOf(app.today);
  const [y] = C.parts(ym + "-01"), name = fMonthName(ym);
  const mc = S().moods.map(md => `<span><i style="background:var(--${md.id})"></i>${esc(md.name)} <b>${rv.moods[md.id] || 0}</b></span>`).join("");
  const goals = (m.goals || []);
  const future = ym > C.ymOf(app.today);
  return `<div class="head"><div><h1 class="title">${esc(name)} <em class="it">${y}</em></h1><div class="sub"><button type="button" class="act" data-act="month-step" data-n="-1">${ic("left", "mi")}${esc(fMonthName(C.addMonths(ym, -1)))}</button> · <button type="button" class="act" data-act="month-step" data-n="1">${esc(fMonthName(C.addMonths(ym, 1)))}${ic("right", "mi")}</button>${isNow ? "" : ` · <button type="button" class="act" data-act="month-step" data-n="0">This month</button>`}</div></div>
    <div class="scorebox">${rv.score == null ? `<span class="n fr">–</span><span class="w">${future ? "Not started yet" : "No score yet"}</span>` : `<span class="n fr">${rv.score}</span><span class="w"><b>${esc(C.scoreWord(rv.score))}</b>month score${isNow ? " so far" : ""}</span>`}</div></div>
  <div class="mwrap">
    <div>${card("Every day", `${rv.elapsed && !future ? `${rv.used} of ${rv.elapsed} days used` : ""}`, `${miniMonth(ym + "-01", true)}<div class="moodkey">${mc}</div>`, "calcard")}
      <div class="tiles"><div><b class="fr">${rv.done}</b><small>tasks done${rv.total ? ` of ${rv.total}` : ""}</small></div><div><b class="fr">${rv.topDone}<small>/${rv.topTotal}</small></b><small>top 3 done</small></div><div><b class="fr">${rv.goalsDone}<small>/${rv.goals.length}</small></b><small>month goals</small></div><div><b class="fr">${rv.checkTotal ? pctTxt(rv.checkDone / rv.checkTotal) : "–"}</b><small>check-ins</small></div></div>
      ${rv.best ? `<p class="small muted" style="margin-top:.8rem">Best day: <button type="button" class="act" data-act="go-day" data-d="${rv.best.date}">${esc(fd(rv.best.date))}</button>, ${rv.best.done} of ${rv.best.total} done.</p>` : ""}</div>
    <div>${card("Month goals", goals.length ? `${goals.filter(g => g.done).length} of ${goals.length}` : "", `<ul class="top">${goals.map(g => `<li class="${g.done ? "x" : ""}">${tick(g.done, "mgoal-tick", `data-ym="${ym}" data-id="${g.id}"`, g.text)}<input class="tin" data-live="mgoal" data-ym="${ym}" data-id="${g.id}" value="${esc(g.text)}" maxlength="80" aria-label="Month goal"><button type="button" class="del" data-act="mgoal-del" data-ym="${ym}" data-id="${g.id}" aria-label="Delete">${ic("bin")}</button></li>`).join("")}</ul>
        <form data-form="mgoal-add" data-ym="${ym}" class="addrow"><input class="tin" name="text" placeholder="Add a goal for this month" maxlength="80"><button class="addb" type="submit" aria-label="Add">${ic("plus")}</button></form>`)}
      ${card("Month review", `<button type="button" class="act" data-act="month-card" data-ym="${ym}">${ic("star", "mi")}My month card</button>`, [["wins", "Wins"], ["better", "What got better"], ["change", "What to change next month"]].map(([k, l]) => `<label class="lab">${l}</label><textarea class="notes small" data-live="mref" data-ym="${ym}" data-k="${k}" rows="3" placeholder="${k === "wins" ? "Big or small, write them down" : ""}">${esc(m[k] || "")}</textarea>`).join(""))}</div>
  </div>`;
}

// ---------------- YEAR ----------------
function year() {
  const y = app.year || Number(app.today.slice(0, 4)), names = Array.from({ length: 12 }, (_, i) => `${y}-${C.pad(i + 1)}`);
  const upto = names.flatMap(ym => C.monthDays(ym)).filter(d => d <= app.today), r = C.rangeStats(X, upto);
  const scores = names.map(ym => C.monthScore(X, ym, app.today)), best = scores.reduce((b, s, i) => (s != null && (b < 0 || s > scores[b]) ? i : b), -1);
  const months = names.map((ym, i) => {
    const cells = C.monthGrid(ym, ws()).map(d => { if (!d) return "<i></i>"; if (d > app.today) return `<i class="fut"></i>`; const st = C.dayStats(X, d); return st.pct == null ? `<i class="nil"></i>` : `<i style="--p:${(0.12 + st.pct * 0.78).toFixed(2)}"></i>`; }).join("");
    return `<button type="button" class="ym" data-act="go-month" data-ym="${ym}"><small>${esc(fMonthShort(ym).toUpperCase())}<b class="fr">${scores[i] ?? "–"}</b></small><span class="yg">${cells}</span></button>`;
  }).join("");
  const tm = C.topMood(r.moods), goals = C.goalsForYear(S(), y);
  const moodTotal = C.sum(Object.values(r.moods));
  return `<div class="head"><div><h1 class="title">Your <em class="it">${y}</em></h1><div class="sub">${tm ? `Most days: <b>${esc(moodOf(tm)?.name || "")}</b>` : "Pick a mood each day to see your year"}${best >= 0 ? ` · best month <b>${esc(fMonthName(`${y}-${C.pad(best + 1)}`))}</b>` : ""} · <button type="button" class="act" data-act="year-step" data-n="-1">${ic("left", "mi")}${y - 1}</button> · <button type="button" class="act" data-act="year-step" data-n="1">${y + 1}${ic("right", "mi")}</button></div></div>
    ${doneBox(r.pct, r.total ? `${r.done.toLocaleString()} things done this year` : "Nothing yet")}</div>
  <div class="ywrap"><div class="card"><div class="yr">${months}</div></div>
    <div>${card("Year goals", goals.length ? `${goals.filter(g => C.goalProgress(g).pct >= 1).length} of ${goals.length} done` : "", goals.length ? goals.map(g => { const p = C.goalProgress(g); return `<button type="button" class="goalrow" data-act="goal-open" data-id="${g.id}"><span class="gt"><span>${esc(g.name)}</span><small>${p.total ? `${p.done} of ${p.total} steps` : g.done ? "Done" : ""}</small></span>${bar(p.pct)}</button>`; }).join("") : `<p class="small muted">No goals yet. <button type="button" class="act" data-act="goal-new">Add your first goal</button></p>`)}
      ${card("Moods this year", "", moodTotal ? S().moods.map(md => { const n = r.moods[md.id] || 0; return `<div class="mbar"><span><i style="background:var(--${md.id})"></i>${esc(md.name)}</span><span class="track"><em style="width:${(n / moodTotal * 100).toFixed(1)}%;background:var(--${md.id})"></em></span><b>${n}</b></div>`; }).join("") : `<p class="small muted">Your moods show here as you pick them.</p>`)}</div>
  </div>`;
}

// ---------------- GOALS ----------------
function goals() {
  const list = S().goals.slice().sort((a, b) => (a.done - b.done) || String(a.end || "9").localeCompare(String(b.end || "9")));
  const cards = list.map(g => {
    const p = C.goalProgress(g), left = C.goalDaysLeft(g, app.today), next = (g.steps || []).find(s => !s.done);
    const when = g.done || p.pct >= 1 ? "Done" : left == null ? "" : left < 0 ? "Date passed" : left === 0 ? "Due today" : `${left} days left`;
    return `<button type="button" class="gcard${g.done || p.pct >= 1 ? " gdone" : ""}" data-act="goal-open" data-id="${g.id}">${chip(g.cat) || "<span></span>"}<b class="fr">${esc(g.name)}</b>${g.why ? `<span class="why">${esc(g.why)}</span>` : ""}
      ${bar(p.pct)}<span class="gm"><span>${p.total ? `${p.done} of ${p.total} steps` : "No steps yet"}</span><span>${esc(when)}</span></span>${next && !g.done ? `<span class="next">Next: ${esc(next.text)}</span>` : ""}</button>`;
  }).join("");
  return `<div class="head"><div><h1 class="title">Your <em class="it">goals</em></h1><div class="sub">${S().goals.length ? `${pl(S().goals.length, "goal", "goals")} · <b>${S().goals.filter(g => C.goalProgress(g).pct >= 1).length}</b> done` : "Big things, broken into small steps"}</div></div>
    <div class="btns"><button type="button" class="btn" data-act="goal-new">${ic("plus")}New goal</button></div></div>
  ${list.length ? `<div class="gcards">${cards}</div>` : `<div class="empty" style="margin-top:1.6rem"><b class="fr" style="font-size:1.3rem;display:block;margin-bottom:.4rem">What do you want this year to hold?</b>Give a goal a reason and a date, then break it into steps. Drop a step onto any day as a task.<div class="row-btns" style="justify-content:center"><button type="button" class="btn" data-act="goal-new">${ic("plus")}New goal</button></div></div>`}
  <div class="row-btns phone-only"><button type="button" class="btn soft small" data-act="goal-new">${ic("plus")}New goal</button></div>`;
}

// ---------------- SETTINGS ----------------
function settings() {
  const P = S().profile, tg = (act, on, label, sub = "") => `<button type="button" class="toggle" data-act="${act}" aria-pressed="${!!on}"><span>${label}${sub ? `<small>${sub}</small>` : ""}</span><i></i></button>`;
  const hours = (n, sel) => Array.from({ length: 24 }, (_, h) => `<option value="${h}"${h === sel ? " selected" : ""}>${esc(ftime(C.pad(h) + ":00"))}</option>`).join("");
  const checks = S().checkins;
  return `<div class="head"><div><h1 class="title">Settings</h1><div class="sub">Everything stays on this device. Nobody else sees your planner.</div></div></div>
  <div class="set">
  <section><h2>Your look</h2><div class="looks">${Object.entries(LOOKS).map(([k, [n, sw, mt]]) => `<button type="button" class="look" data-act="set-look" data-v="${k}" aria-pressed="${P.look === k}" style="--sw:${sw};--mt:${mt}"><i></i>${n}</button>`).join("")}</div>
    <div style="margin-top:1rem">${tg("set-dark", P.dark, "Dark mode", "The same planner for night")}${tg("set-big", P.bigText, "Bigger text")}${tg("set-easy", P.easyFont, "Easy-reading font")}</div></section>
  <section><h2>You</h2><form data-form="profile"><label class="field"><span>Your name</span><input class="input" name="name" value="${esc(P.name)}" autocomplete="given-name"></label>
    <div class="row2"><label class="field"><span>Weeks start on</span><select class="input" name="weekStart"><option value="1"${P.weekStart === 1 ? " selected" : ""}>Monday</option><option value="0"${P.weekStart === 0 ? " selected" : ""}>Sunday</option></select></label>
    <label class="field"><span>Clock</span><select class="input" name="clock24"><option value="1"${P.clock24 ? " selected" : ""}>24 hour (14:30)</option><option value="0"${P.clock24 ? "" : " selected"}>12 hour (2:30 pm)</option></select></label></div>
    <div class="row2"><label class="field"><span>Schedule starts</span><select class="input" name="dayStart">${hours(24, P.dayStart)}</select></label><label class="field"><span>Schedule ends</span><select class="input" name="dayEnd">${hours(24, P.dayEnd)}</select></label></div>
    <button class="btn small" type="submit">Save</button></form></section>
  <section><h2>Categories</h2><p class="small muted" style="margin-bottom:.6rem">Tap a colour to change it.</p><div class="list">${S().categories.map(c => `<div class="li"><span class="t"><button type="button" class="sw" data-act="cat-color" data-id="${c.id}" style="background:var(--${c.color})" aria-label="Change colour"></button><input class="tin" data-live="cat-name" data-id="${c.id}" value="${esc(c.name)}" maxlength="20" aria-label="Category name"></span><button type="button" class="del" data-act="cat-del" data-id="${c.id}" aria-label="Delete">${ic("bin")}</button></div>`).join("")}</div>
    ${S().categories.length < 10 ? `<div class="row-btns"><button type="button" class="btn soft small" data-act="cat-add">${ic("plus")}New category</button></div>` : ""}</section>
  <section><h2>Moods</h2><div class="list">${S().moods.map(m => `<div class="li"><span class="t"><span class="sw" style="background:var(--${m.id})"></span><input class="tin" data-live="mood-name" data-id="${m.id}" value="${esc(m.name)}" maxlength="14" aria-label="Mood name"></span></div>`).join("")}</div></section>
  <section><h2>Daily check-ins</h2><p class="small muted" style="margin-bottom:.6rem">Small things to tick every day, like water or a walk. Up to 8.</p>
    <div class="list">${checks.map(c => `<div class="li"><span class="t"><input class="tin" data-live="ci-name" data-id="${c.id}" value="${esc(c.name)}" maxlength="20" aria-label="Check-in"></span><span class="t">${tg("ci-on", c.on !== false, "").replace('data-act="ci-on"', `data-act="ci-on" data-id="${c.id}"`)}<button type="button" class="del" data-act="ci-del" data-id="${c.id}" aria-label="Delete">${ic("bin")}</button></span></div>`).join("") || `<p class="small muted">None yet.</p>`}</div>
    ${checks.length < 8 ? `<div class="quick" style="margin-top:.8rem">${CHECKIN_IDEAS.filter(n => !checks.some(c => c.name === n)).map(n => `<button type="button" class="chipbtn" data-act="ci-add" data-n="${esc(n)}">${ic("plus", "mi")}${esc(n)}</button>`).join("")}<button type="button" class="chipbtn" data-act="ci-add">${ic("plus", "mi")}Your own</button></div>` : ""}</section>
  <section><h2>Repeating tasks</h2>${S().repeats.length ? `<div class="list">${S().repeats.map(r => `<button type="button" class="li" data-act="task-edit" data-id="r:${r.id}:${r.end && r.end < app.today ? r.end : app.today}"><span class="t">${ic("repeat")}<span>${esc(r.text)}<small>${esc(C.REPEATS[r.rule])}${r.rule === "days" ? `: ${(r.days || []).map(d => fWeekday(C.addDays("2026-11-22", d))).join(", ")}` : ""}${r.time ? ` · ${esc(ftime(r.time))}` : ""}${r.end && r.end < app.today ? " · stopped" : ""}</small></span></span>${ic("pencil")}</button>`).join("")}</div>` : `<p class="small muted">None yet. Open any task and pick how often it repeats.</p>`}</section>
  <section><h2>Your data</h2><p class="small muted" style="margin-bottom:.8rem">${S().meta.lastBackup ? `Last backup ${esc(fd(S().meta.lastBackup.slice(0, 10)))}.` : "No backup yet. Make one now and then, and keep it in Files, Drive or email."}</p>
    <div class="row-btns"><button type="button" class="btn small" data-act="backup">Back up</button><button type="button" class="btn ghost small" data-act="restore">Restore from a backup</button><button type="button" class="btn ghost small" data-act="move-phone">${ic("phone")}Move to another device</button><button type="button" class="btn ghost small" data-act="export-csv">Export (CSV)</button><button type="button" class="btn ghost small" data-act="install-help">Put it on my home screen</button></div></section>
  <section><h2>About</h2><p class="small muted">Dear Days ${APP_VERSION} by Dear Agneta. Questions or ideas? Message the shop on Etsy. <a href="${ETSY_URL}" target="_blank" rel="noopener">Visit the shop</a></p>
    <div class="row-btns"><button type="button" class="btn text small" data-act="wipe">Delete everything on this device</button></div></section>
  </div>`;
}

export const views = { today, week, month, year, goals, settings };
export { PALETTE };
