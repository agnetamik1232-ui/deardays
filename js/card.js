// Dear Days — "My month" card: a 1080 × 1920 picture of a month for Instagram and TikTok stories.
import * as C from "./calc.js";
import { fMonthName, fWeekday } from "./core.js";

function spaced(g, text, x, y, gap, align = "left") {
  const chars = [...text], widths = chars.map(c => g.measureText(c).width), total = widths.reduce((a, b) => a + b, 0) + gap * (chars.length - 1);
  let cx = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
  const keep = g.textAlign; g.textAlign = "left";
  chars.forEach((c, i) => { g.fillText(c, cx, y); cx += widths[i] + gap; });
  g.textAlign = keep;
}
function wrap(g, text, maxW) {
  const words = String(text).split(/\s+/), lines = []; let line = "";
  for (const w of words) { const t = line ? line + " " + w : w; if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line); return lines;
}

export async function monthCard(S, X, ym, today) {
  await Promise.all(["500 80px Fraunces", "italic 400 80px Fraunces", "italic 500 80px Fraunces", "800 30px Nunito", "700 30px Nunito"].map(f => document.fonts.load(f).catch(() => null)));
  const W = 1080, H = 1920, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const g = cv.getContext("2d"), css = getComputedStyle(document.documentElement), v = n => css.getPropertyValue("--" + n).trim();
  const rv = C.monthReview(X, ym, today), y = ym.slice(0, 4), ws = S.profile.weekStart;

  g.fillStyle = v("page"); g.fillRect(0, 0, W, H);
  // dot-grid paper
  g.fillStyle = v("dot") || "rgba(0,0,0,.08)";
  for (let yy = 300; yy < H; yy += 36) for (let xx = 18; xx < W; xx += 36) { g.beginPath(); g.arc(xx, yy, 1.6, 0, Math.PI * 2); g.fill(); }
  // leather band with stitching and the ribbon
  g.fillStyle = v("leather"); g.fillRect(0, 0, W, 250);
  g.strokeStyle = v("stitch"); g.lineWidth = 3; g.setLineDash([14, 10]); g.strokeRect(24, 24, W - 48, 202); g.setLineDash([]);
  const rg = g.createLinearGradient(W - 160, 0, W - 120, 0); rg.addColorStop(0, v("ribbon2")); rg.addColorStop(.5, v("ribbon1")); rg.addColorStop(1, v("ribbon2"));
  g.fillStyle = rg; g.beginPath(); g.moveTo(W - 160, 0); g.lineTo(W - 120, 0); g.lineTo(W - 120, 330); g.lineTo(W - 140, 306); g.lineTo(W - 160, 330); g.closePath(); g.fill();
  g.fillStyle = v("coverink"); g.font = "800 24px Nunito"; spaced(g, "DEAR", 84, 112, 9);
  g.font = "italic 500 74px Fraunces"; g.fillText("Days", 80, 186);
  g.font = "700 30px Nunito"; g.fillText(`My month · ${y}`, 360, 160);

  // month name and score
  g.fillStyle = v("ink"); g.font = "500 112px Fraunces"; g.fillText(fMonthName(ym), 80, 450);
  if (rv.score != null) {
    g.fillStyle = v("plum"); g.font = "500 190px Fraunces"; g.fillText(String(rv.score), 76, 650);
    const sw = g.measureText(String(rv.score)).width;
    g.fillStyle = v("rose"); g.font = "italic 400 64px Fraunces"; g.fillText(C.scoreWord(rv.score), 100 + sw, 590);
    g.fillStyle = v("body"); g.font = "700 30px Nunito"; g.fillText("month score", 104 + sw, 640);
  }

  // mood calendar
  const cells = C.monthGrid(ym, ws), cw = 122, gap = 10, x0 = 80, y0 = 760;
  g.font = "800 22px Nunito"; g.fillStyle = v("mute");
  for (let i = 0; i < 7; i++) spaced(g, fWeekday(C.addDays("2026-11-22", (i + ws) % 7)).slice(0, 2).toUpperCase(), x0 + i * (cw + gap) + cw / 2, y0 - 18, 3, "center");
  cells.forEach((d, i) => {
    if (!d) return;
    const x = x0 + (i % 7) * (cw + gap), yy = y0 + Math.floor(i / 7) * (cw * 0.78 + gap), h = cw * 0.78;
    const st = C.dayStats(X, d), fut = d > today;
    g.fillStyle = st.mood && !fut ? v(st.mood) : v("hair"); g.fillRect(x, yy, cw, h);
    g.fillStyle = st.mood && !fut ? "#ffffff" : v("mute"); g.font = "800 26px Nunito"; g.fillText(String(Number(d.slice(8))), x + 14, yy + 36);
    if (!fut && st.pct != null) { g.fillStyle = "rgba(255,255,255,.45)"; g.fillRect(x + 14, yy + h - 18, cw - 28, 6); g.fillStyle = "#ffffff"; g.fillRect(x + 14, yy + h - 18, (cw - 28) * st.pct, 6); }
  });
  const rows = Math.ceil(cells.length / 7), ky = y0 + rows * (cw * 0.78 + gap) + 44;
  let kx = 80; g.font = "700 26px Nunito";
  for (const m of S.moods) { const n = rv.moods[m.id] || 0; if (!n) continue; g.fillStyle = v(m.id); g.fillRect(kx, ky - 20, 22, 22); g.fillStyle = v("body"); const t = `${m.name} ${n}`; g.fillText(t, kx + 32, ky); kx += g.measureText(t).width + 70; }

  // numbers and wins
  const sy = ky + 90, stats = [[rv.done, "tasks done"], [`${rv.topDone}/${rv.topTotal}`, "top 3 done"], [`${rv.goalsDone}/${rv.goals.length}`, "month goals"]];
  stats.forEach(([n, l], i) => { const x = 80 + i * 320; g.fillStyle = v("ink"); g.fillRect(x, sy - 54, 280, 3); g.fillStyle = v("plum"); g.font = "500 64px Fraunces"; g.fillText(String(n), x, sy + 20); g.fillStyle = v("mute"); g.font = "700 26px Nunito"; g.fillText(l, x, sy + 58); });
  const wins = String(S.months[ym]?.wins || "").split(/\n+/).map(s => s.trim()).filter(Boolean).slice(0, 3);
  if (wins.length) {
    let wy = sy + 132; g.fillStyle = v("rose"); g.font = "italic 400 46px Fraunces"; g.fillText("Wins", 80, wy); wy += 52;
    g.font = "700 32px Nunito";
    for (const w of wins) for (const [i, line] of wrap(g, w, 860).slice(0, 2).entries()) { if (wy > H - 100) break; g.fillStyle = v("gold"); if (i === 0) g.fillRect(84, wy - 20, 14, 14); g.fillStyle = v("ink"); g.fillText(line, 120, wy); wy += 44; }
  }
  g.fillStyle = v("mute"); g.font = "700 26px Nunito"; g.textAlign = "center"; g.fillText("made with Dear Days", W / 2, H - 60); g.textAlign = "left";
  return new Promise(r => cv.toBlob(r, "image/png"));
}
