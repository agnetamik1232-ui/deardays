// Dear Days — start-up, and one listener for every click, form and input.
import { app, actions, forms, live, render, closeSheet, isSheetOpen, openSheet } from "./core.js";
import { todayISO, toMin, addDays } from "./calc.js";
import { shell, ix } from "./views.js";
import { applyLook, renderUnlock, renderSetup, taskSheet, goalSheet } from "./flows.js";
import { blankState } from "./model.js";
import { demoState } from "./demo.js";
import * as store from "./store.js";

const params = new URLSearchParams(location.search);
app.demo = params.has("demo");
app.photo = app.demo && params.has("photo");
app.view = "today";

function renderApp() {
  const y = scrollY, a = document.activeElement, keep = a && a.dataset?.live ? { live: a.dataset.live, i: a.dataset.i, id: a.dataset.id, k: a.dataset.k, pos: a.selectionStart } : null;
  document.getElementById("app").innerHTML = shell();
  if (y) scrollTo(0, y);
  if (keep) { const sel = `[data-live="${keep.live}"]${keep.i != null ? `[data-i="${keep.i}"]` : ""}${keep.id ? `[data-id="${keep.id}"]` : ""}${keep.k ? `[data-k="${keep.k}"]` : ""}`; const el = document.querySelector(sel); if (el) { el.focus({ preventScroll: true }); try { el.setSelectionRange(keep.pos, keep.pos); } catch { /* not a text box */ } } }
}
app.start = () => { app.renderFn = renderApp; applyLook(); renderApp(); if (app.demo) demoExtras(); };

// Demo only, for listing photos and videos:
//   ?demo&photo  &look=matcha  &dark=on  &big  &view=week|month|year|goals|settings  &day=+1|-3|2026-11-20  &month=-1  &now=14:20
//   &open=task:<text> | rep:<text> | block:<text> | goal:<name> | goal-new | card | cardonly | carry
function demoExtras() {
  const look = params.get("look"), view = params.get("view"), open = params.get("open") || "";
  if (look) app.S.profile.look = look;
  if (params.get("dark") === "on") app.S.profile.dark = true;
  if (params.has("big")) app.S.profile.bigText = true;
  if (params.get("now")) app.nowMin = toMin(params.get("now"));
  if (view) app.view = view;
  const day = params.get("day"); if (day) app.day = /^[+-]\d+$/.test(day) ? addDays(app.today, Number(day)) : day;
  const fire = (act, data = {}) => { const el = document.createElement("button"); Object.assign(el.dataset, data); actions[act]?.(el); };
  if (params.get("month")) fire("month-step", { n: params.get("month") });
  applyLook(); render();
  const S = app.S, low = s => String(s).toLowerCase();
  if (open.startsWith("task:")) { const t = S.tasks.find(x => low(x.text) === low(open.slice(5))); if (t) openSheet(taskSheet(t.id), { label: "Task" }); }
  if (open.startsWith("block:")) { const b = S.blocks.find(x => x.date === app.today && low(x.text) === low(open.slice(6))); if (b) fire("block-edit", { id: b.id }); }
  if (open.startsWith("rep:")) { const r = S.repeats.find(x => low(x.text) === low(open.slice(4))); if (r) openSheet(taskSheet(`r:${r.id}:${app.today}`), { label: "Repeating task" }); }
  if (open.startsWith("goal:")) { const g = S.goals.find(x => low(x.name) === low(open.slice(5))); if (g) openSheet(goalSheet(g.id), { label: "Goal" }); }
  if (open === "goal-new") fire("goal-new");
  if (open === "carry") fire("carry-pick");
  if (open === "card") fire("month-card", { ym: app.today.slice(0, 7) });
  if (open === "cardonly") import("./card.js").then(async ({ monthCard }) => { const blob = await monthCard(S, ix(), app.month || app.today.slice(0, 7), app.today); document.body.style.margin = "0"; document.body.innerHTML = `<img src="${URL.createObjectURL(blob)}" alt="" style="display:block;width:1080px;height:1920px">`; });
  const to = params.get("scrollto");
  if (to) setTimeout(() => { const el = document.querySelector(to); if (el) scrollTo(0, el.getBoundingClientRect().top + scrollY - 70); }, 80);
}

document.addEventListener("click", e => {
  const scrim = e.target.closest("[data-scrim]");
  if (scrim && e.target === scrim) { closeSheet(); return; }
  const el = e.target.closest("[data-act]");
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el, e); }
});
document.addEventListener("submit", e => { const f = e.target.closest("form[data-form]"); if (!f) return; e.preventDefault(); forms[f.dataset.form]?.(f, e); });
const isChoice = el => el.type === "checkbox" || el.type === "radio" || el.tagName === "SELECT";
document.addEventListener("input", e => { const el = e.target.closest("[data-live]"); if (el && !isChoice(el)) live[el.dataset.live]?.(el, e); });
document.addEventListener("change", e => { const el = e.target.closest("[data-live]"); if (el && isChoice(el)) live[el.dataset.live]?.(el, e); });
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && isSheetOpen()) closeSheet();
  // Enter in a top 3 or priority line moves to the next line, like a paper list
  if (e.key === "Enter" && e.target.matches?.('input[data-live="top"],input[data-live="wpri"]')) { e.preventDefault(); const all = [...document.querySelectorAll(`input[data-live="${e.target.dataset.live}"]`)]; (all[all.indexOf(e.target) + 1] || e.target).focus(); }
});
// re-render when a typed line loses focus, so the counts catch up
document.addEventListener("focusout", e => { if (e.target.matches?.('input[data-live="top"],input[data-live="wpri"],input[data-live="mgoal"]') && !isSheetOpen()) setTimeout(() => { if (!document.activeElement?.dataset?.live) render(); }, 120); });
function checkDay() { const t = todayISO(); if (t !== app.today) { app.today = t; if (app.renderFn && !isSheetOpen() && !document.activeElement?.dataset?.live) render(); } }
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") checkDay(); });
setInterval(() => { checkDay(); if (app.renderFn && app.view === "today" && !isSheetOpen() && !document.activeElement?.matches?.("input,textarea,select")) render(); }, 60000);

async function boot() {
  app.today = todayISO();
  if (params.get("today") && app.demo) app.today = params.get("today");
  if (app.demo) { app.S = demoState(app.today); app.start(); return; }
  const s = await store.load();
  app.S = s || blankState();
  applyLook();
  if (!s || !s.meta.unlocked) return renderUnlock();
  if (!s.meta.setupDone) return renderSetup();
  app.start();
}
boot().catch(err => {
  console.error(err);
  document.getElementById("app").innerHTML = `<div class="center-screen"><div class="center-card"><h1 class="fr">Something went wrong</h1><p style="margin:.6rem 0 1rem">Your planner is safe on this device. Try reloading. If it keeps happening, message the shop with this: ${String(err && err.message || err).replace(/[<>&]/g, "")}</p><button class="btn" onclick="location.reload()">Reload</button></div></div>`;
});
if ("serviceWorker" in navigator && location.protocol !== "file:" && !params.has("nosw")) addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
