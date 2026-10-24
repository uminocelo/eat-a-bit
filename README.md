# Eat a Bit

A tiny, mobile-first, Duolingo-style daily study tracker where **git commits are the database**.
Default tracks: English 🇬🇧, Japanese 🇯🇵 and Coding 💻. The website is **read-only**: logging and track management happen from your computer with the `eat-a-bit` CLI (or plain git commits).

Plain HTML/CSS/vanilla JS, no build step, hosted on GitHub Pages.

## How it works
- `tracks.json`: track definitions (`id`, `name`, `emoji`, `goal` in minutes, `color`).
- Every study session is a **commit tagged with the track id**: `[english] 20min`.
- A GitHub Action (`.github/workflows/build-data.yml`) runs `scripts/build-data.js` on every push to `main`. It reads the git log and writes `data.json` (minutes per track, per local day in America/Sao_Paulo), then commits it with `[skip ci]`.
- The site loads `tracks.json` + `data.json` and computes 🔥 streaks, best streak, XP (1 min = 1 XP) and a 30-day heatmap.
- `localStorage` only caches the last loaded data for offline use. **Export JSON** downloads it as a backup.

## Commit tag format
```
[trackid] 20min     # 20 minutes   (also: 20, 20m, 20 mins, 20 minutes)
[trackid]           # no minutes = the track's daily goal
[trackid] undo      # clears that track for that day
```
Several tags can go in one message: `[coding] 30min [english] 10min`. Tags for ids that aren't in `tracks.json` are ignored, so add a track before you use its tag.

From a terminal, in any clone of this repo:
```bash
git commit --allow-empty -m "[rust] 30min"
git push
```
Days follow America/Sao_Paulo time, based on the commit's author date.

## Deploy on GitHub Pages
1. Create the repo `uminocelo/eat-a-bit` and push this folder to `main`.
2. **Settings → Pages → Build and deployment**: Source "Deploy from a branch", branch `main`, folder `/ (root)`.
3. **Settings → Actions → General → Workflow permissions**: make sure Actions are allowed. The workflow asks for `contents: write` itself.
4. Open `https://uminocelo.github.io/eat-a-bit/`.

## Run locally
```bash
python3 -m http.server   # then open http://localhost:8000
node scripts/build-data.js   # rebuild data.json from your local git log
```

## Terminal CLI

`bin/eat-a-bit` logs habits as commits and pushes them. It needs git and node.

```sh
ln -s "$PWD/bin/eat-a-bit" /usr/local/bin/eat-a-bit   # or add bin/ to PATH
export EAT_A_BIT_DIR="$HOME/eat-a-bit"                 # where you cloned this repo

eat-a-bit done english        # logs the goal minutes
eat-a-bit done coding 40      # logs 40 minutes
eat-a-bit undo english        # clears today
eat-a-bit create Rust 30 🦀 "#dea584"
eat-a-bit delete rust
eat-a-bit list
```

Set `EAT_A_BIT_PUSH=0` to commit without pushing.
