#!/usr/bin/env node
// Parses the git log for tagged study commits and writes data.json.
// Tag format: "[trackid] 20min" (minutes optional -> track goal), "[trackid] undo" clears that day.
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = process.argv[2] || process.cwd();
const TZ = process.env.STUDY_TZ || 'America/Sao_Paulo';
const tracks = JSON.parse(fs.readFileSync(path.join(ROOT, 'tracks.json'), 'utf8'));
const goals = Object.fromEntries(tracks.map((t) => [t.id, t.goal]));

const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const localDay = (iso) => fmt.format(new Date(iso)); // YYYY-MM-DD

function parseMessage(msg) {
  const out = [];
  const re = /\[([a-z0-9_-]+)\](?:[ \t]+(undo|(\d{1,4})\s*(?:min|mins|minutes|m)?\b))?/gi;
  let m;
  while ((m = re.exec(msg))) {
    const id = m[1].toLowerCase();
    if (!(id in goals)) continue; // ignore [skip ci]-like or unknown tags
    if (m[2] && m[2].toLowerCase() === 'undo') out.push({ id, undo: true });
    else out.push({ id, minutes: m[3] ? Math.min(parseInt(m[3], 10), 1440) : goals[id] });
  }
  return out;
}

function build() {
  let log = '';
  try {
    log = execFileSync('git', ['-C', ROOT, 'log', '--reverse', '--format=%H%x1f%aI%x1f%B%x1e'], { encoding: 'utf8', maxBuffer: 64 << 20 });
  } catch (e) { /* no commits yet */ }
  const data = {};
  for (const id of Object.keys(goals)) data[id] = {};
  let sessions = 0, lastCommitAt = null;
  for (const rec of log.split('\x1e')) {
    const [sha, date, msg] = rec.replace(/^\n/, '').split('\x1f');
    if (!sha || !msg) continue;
    const day = localDay(date);
    lastCommitAt = date;
    for (const s of parseMessage(msg)) {
      if (s.undo) { delete data[s.id][day]; continue; }
      data[s.id][day] = (data[s.id][day] || 0) + s.minutes;
      sessions++;
    }
  }
  // deterministic output (no wall-clock time) so unchanged data => no commit
  return { lastCommitAt, timezone: TZ, sessions, tracks: data };
}

if (require.main === module) {
  const out = build();
  fs.writeFileSync(path.join(ROOT, 'data.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(`data.json: ${out.sessions} sessions across ${Object.keys(out.tracks).length} tracks`);
}
module.exports = { parseMessage, build };
