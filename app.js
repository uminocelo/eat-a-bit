'use strict';
// Eat a Bit — read-only dashboard. Data comes from tracks.json + data.json,
// built from tagged git commits (log with the CLI: eat-a-bit done <habit>).
// localStorage only caches the last loaded data for offline use.
const CACHE_KEY = 'eat-a-bit-cache';
const $ = (s) => document.querySelector(s);

const pad = (n) => String(n).padStart(2, '0');
const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch (e) { return null; }
}
let model = readCache() || { tracks: [], data: { tracks: {} } };

function streak(log) {
  let d = new Date();
  if (!log[dayKey(d)]) d = addDays(d, -1); // today not logged yet: streak still alive
  let n = 0;
  while (log[dayKey(d)]) { n++; d = addDays(d, -1); }
  return n;
}
function bestStreak(log) {
  let best = 0, cur = 0, prev = null;
  for (const k of Object.keys(log).sort()) {
    cur = prev && dayKey(addDays(new Date(prev + 'T12:00:00'), 1)) === k ? cur + 1 : 1;
    best = Math.max(best, cur); prev = k;
  }
  return best;
}
const total = (log) => Object.values(log).reduce((a, b) => a + b, 0);

function render(statusMsg) {
  const today = dayKey();
  $('#today').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  $('#status').textContent = statusMsg || '';
  const tracks = model.tracks;
  const logOf = (t) => (model.data.tracks || {})[t.id] || {};
  const xp = tracks.reduce((a, t) => a + total(logOf(t)), 0);
  const best = tracks.reduce((a, t) => Math.max(a, bestStreak(logOf(t))), 0);
  const doneToday = tracks.filter((t) => (logOf(t)[today] || 0) >= t.goal).length;
  $('#summary').innerHTML =
    `<div class="stat"><b>${xp}</b><span>Total XP (min)</span></div>` +
    `<div class="stat"><b>🏆 ${best}</b><span>Best streak</span></div>` +
    `<div class="stat"><b>${doneToday}/${tracks.length}</b><span>Goals met today</span></div>`;

  $('#tracks').innerHTML = tracks.map((t) => {
    const log = logOf(t), s = streak(log), m = log[today] || 0;
    const pct = Math.min(100, Math.round((m / t.goal) * 100));
    let heat = '';
    for (let i = 29; i >= 0; i--) {
      const k = dayKey(addDays(new Date(), -i)), v = log[k] || 0;
      heat += `<i class="${v >= t.goal ? 'on' : v > 0 ? 'half' : ''}${i === 0 ? ' today' : ''}" title="${k}: ${v} min"></i>`;
    }
    const name = esc(t.name);
    return `<article class="card" style="--c:${esc(t.color)}" aria-label="${name}">
      <div class="head"><h2>${esc(t.emoji)} ${name}</h2>
        <span class="flame${s ? '' : ' off'}" aria-label="${s} day streak">🔥 ${s}</span></div>
      <div class="meta"><span>Goal ${t.goal} min/day</span><span>Best ${bestStreak(log)}</span><span>${total(log)} XP</span></div>
      <div class="bar" role="progressbar" aria-label="Today's progress toward goal" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
      <p class="today-line${m >= t.goal ? ' done' : ''}">${m >= t.goal ? '✅ ' : ''}Today: ${m} / ${t.goal} min</p>
      <div class="heat" role="img" aria-label="Last 30 days of ${name}">${heat}</div>
    </article>`;
  }).join('') || '<p class="muted">No habits yet. Create one with <code>eat-a-bit create</code>.</p>';
}

async function load() {
  try {
    const bust = '?t=' + Date.now();
    const [tracks, data] = await Promise.all(['tracks.json', 'data.json'].map(async (f) => {
      const r = await fetch(f + bust, { cache: 'no-store' });
      if (!r.ok) throw new Error(`${f}: HTTP ${r.status}`);
      return r.json();
    }));
    model = { tracks: Array.isArray(tracks) ? tracks : [], data: data || { tracks: {} } };
    localStorage.setItem(CACHE_KEY, JSON.stringify(model));
    render();
  } catch (e) {
    render(readCache() ? 'Offline: showing cached data.' : 'Could not load data.');
  }
}

$('#export').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(model, null, 2)], { type: 'application/json' }));
  a.download = `eat-a-bit-${dayKey()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
render();
load();
