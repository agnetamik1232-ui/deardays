// Dear Days — shared app state and small helpers used by every screen.
import { todayISO, parts } from "./calc.js";
import * as store from "./store.js";

export const app = { S: null, today: todayISO(), view: "today", day: null, week: null, month: null, year: null, demo: false, photo: false, renderFn: null };
export const actions = {};
export const forms = {};
export const live = {};

export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const dtf = {};
const fmtDate = (s, opts) => {
  const k = app.S.profile.locale + JSON.stringify(opts);
  if (!dtf[k]) { try { dtf[k] = new Intl.DateTimeFormat(app.S.profile.locale, { ...opts, timeZone: "UTC" }); } catch { dtf[k] = new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: "UTC" }); } }
  const [y, m, d] = parts(s);
  return dtf[k].format(new Date(Date.UTC(y, m - 1, d)));
};
export const fd = s => fmtDate(s, { weekday: "short", day: "numeric", month: "short" });        // Fri 20 Nov
export const fdLong = s => fmtDate(s, { weekday: "long", day: "numeric", month: "long" });      // Thursday 19 November
export const fdShort = s => fmtDate(s, { day: "numeric", month: "short" });                     // 20 Nov
export const fWeekday = s => fmtDate(s, { weekday: "short" });
export const fMonth = ym => fmtDate(ym + "-01", { month: "long", year: "numeric" });
export const fMonthShort = ym => fmtDate(ym + "-01", { month: "short" });
export const fMonthYear = s => fmtDate(s, { month: "long", year: "numeric" });

// "09:30" as 09:30 or 9:30 am, as the buyer likes it.
export const ftime = t => {
  if (!t) return "";
  if (app.S.profile.clock24) return t;
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}${m ? ":" + String(m).padStart(2, "0") : ""} ${h < 12 ? "am" : "pm"}`;
};
export const fDayNum = s => fmtDate(s, { day: "numeric" });
export const fDayMonth = s => fmtDate(s, { day: "numeric", month: "long" });          // 24 November
export const fWeekdayLong = s => fmtDate(s, { weekday: "long" });
export const fMonthName = ym => fmtDate(String(ym).slice(0, 7) + "-01", { month: "long" });                  // November

export function render() { app.renderFn && app.renderFn(); }

export function commit(mutate, opts = {}) {
  mutate && mutate(app.S);
  store.save(app.S);
  if (opts.render !== false) render();
}

// ---------- Toast ----------
let toastTimer = null;
export function toast(msg, undo) {
  const el = document.getElementById("toast");
  el.innerHTML = `<span>${esc(msg)}</span>${undo ? `<button type="button" data-act="toast-undo">Undo</button>` : ""}`;
  actions["toast-undo"] = () => { undo && undo(); hideToast(); };
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, undo ? 6000 : 3200);
}
function hideToast() { document.getElementById("toast").classList.remove("show"); }

// ---------- Sheets (modals) ----------
let lastFocus = null;
export function openSheet(html, { wide = false, label = "Dialog", onClose } = {}) {
  closeSheet(true);
  lastFocus = document.activeElement;
  const root = document.getElementById("sheet-root");
  root.innerHTML = `<div class="scrim" data-scrim><div class="sheet${wide ? " wide" : ""}" role="dialog" aria-modal="true" aria-label="${esc(label)}">${html}</div></div>`;
  root._onClose = onClose;
  const first = root.querySelector("[autofocus]") || root.querySelector("input,select,textarea") || root.querySelector("button");
  if (!app.photo) setTimeout(() => first && first.focus({ preventScroll: true }), 30);
}
export function updateSheet(html) {
  const sh = document.querySelector("#sheet-root .sheet");
  if (sh) sh.innerHTML = html;
}
export function closeSheet(silent) {
  const root = document.getElementById("sheet-root");
  if (!root || !root.innerHTML) return;
  const cb = root._onClose; root._onClose = null;
  root.innerHTML = "";
  if (!silent && cb) cb();
  if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
}
export const isSheetOpen = () => !!document.getElementById("sheet-root")?.innerHTML;
export const sheetHead = (title, close = "Close") => `<div class="sheet-head"><h2 class="fr">${title}</h2><button type="button" class="x" data-act="close-sheet">${close}</button></div>`;

// ---------- Files ----------
export async function shareOrDownload(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  try {
    const file = new File([blob], filename, { type: mime });
    if (navigator.canShare && navigator.canShare({ files: [file] }) && /iPhone|iPad|Android/i.test(navigator.userAgent)) {
      await navigator.share({ files: [file], title: filename });
      return "shared";
    }
  } catch (e) { if (e && e.name === "AbortError") return "cancelled"; }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return "downloaded";
}

export function pickFile(accept) {
  return new Promise(resolve => {
    const i = document.createElement("input");
    i.type = "file"; i.accept = accept; i.style.display = "none";
    i.onchange = () => { const f = i.files && i.files[0]; i.remove(); if (!f) return resolve(null); const r = new FileReader(); r.onload = () => resolve({ name: f.name, text: String(r.result) }); r.onerror = () => resolve(null); r.readAsText(f); };
    document.body.appendChild(i); i.click();
  });
}

export const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
