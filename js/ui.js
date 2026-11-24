// Dear Days — small drawing helpers shared by the screens and sheets.
import { app, esc } from "./core.js";

const P = {
  today: '<rect x="4" y="5.5" width="16" height="15"/><path d="M4 10h16M8.5 3v4.5M15.5 3v4.5"/><rect x="10" y="13" width="4" height="4"/>',
  week: '<rect x="3.5" y="5.5" width="17" height="14"/><path d="M3.5 9.5h17M8 9.5v10M12 9.5v10M16 9.5v10"/>',
  month: '<rect x="4" y="5" width="16" height="15"/><path d="M4 9.5h16M9.3 9.5V20M14.7 9.5V20M4 14.8h16"/>',
  year: '<rect x="3.5" y="4" width="7" height="7"/><rect x="13.5" y="4" width="7" height="7"/><rect x="3.5" y="13" width="7" height="7"/><rect x="13.5" y="13" width="7" height="7"/>',
  goals: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.2"/>',
  sliders: '<path d="M4 7.5h9M17 7.5h3M4 16.5h3M11 16.5h9"/><rect x="13" y="5.5" width="4" height="4"/><rect x="7" y="14.5" width="4" height="4"/>',
  check: '<path d="M5 12.5l4.2 4.2L19 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  repeat: '<path d="M5 9.5h12.5l-3-3M19 14.5H6.5l3 3"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  left: '<path d="M15 5l-7 7 7 7"/>',
  right: '<path d="M9 5l7 7-7 7"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
  pencil: '<path d="M4 20l1-4.5L16 4.5l3.5 3.5L8.5 19z"/><path d="M14 7l3 3"/>',
  star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19"/><path d="M11 18.5h2"/>',
  move: '<path d="M4 12h12M12 7l5 5-5 5M20 5v14"/>',
  bin: '<path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13"/>',
  note: '<path d="M5 4h14v16H5z"/><path d="M8.5 9h7M8.5 13h7M8.5 17h4"/>',
};
export const ic = (name, cls = "ic") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" aria-hidden="true">${P[name] || ""}</svg>`;

export const brand = () => `<div class="brand"><span class="mk">${ic("today")}</span><div><small>DEAR</small><b>Days</b></div></div>`;

export const pctTxt = p => (p == null ? "" : `${Math.round(p * 100)}%`);
export const bar = (p, cls = "bar") => `<span class="${cls}"><i style="width:${Math.round((p || 0) * 100)}%"></i></span>`;
export const tick = (done, act, data = "", label = "Done") => `<button type="button" class="tk" data-act="${act}" ${data} aria-pressed="${!!done}" aria-label="${esc(label)}">${done ? ic("check") : ""}</button>`;

export const catOf = id => app.S.categories.find(c => c.id === id);
export const catColor = id => `var(--${catOf(id)?.color || "p5"})`;
export const chip = id => { const c = catOf(id); return c ? `<span class="chip"><i style="background:var(--${c.color})"></i>${esc(c.name)}</span>` : ""; };
export const moodOf = id => app.S.moods.find(m => m.id === id);
export const moodColor = id => `var(--${id})`;
export const pl = (n, one, many) => `${n} ${n === 1 ? one : many}`;
