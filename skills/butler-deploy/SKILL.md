---
name: butler-deploy
description: >
  Deploy an HTML5 game to itch.io using the butler CLI. Handles build
  verification, butler installation check, and push to a target itch.io
  channel. Use when you need to publish or update a game on itch.io.
---

# Butler Deploy Skill

Use this skill to publish or update an HTML5 game on itch.io via the [butler CLI](https://itchio.itch.io/butler).

## Prerequisites

### 1. Install butler (one-time, per machine)

```bash
# macOS
brew install butler

# Linux
curl -L -o butler.zip https://broth.itch.ovh/butler/linux-amd64/LATEST/archive/default
unzip butler.zip
mv butler /usr/local/bin/butler

# Windows
scoop install butler
# or download from https://itchio.itch.io/butler
```

### 2. Log in (one-time, per machine)

```bash
butler login
# Opens your browser — authorize the app, then return to the terminal.
```

### 3. Set required environment variable

```bash
export ITCH_GAME=your-username/pixelrealm   # itch.io target (user/game)
```

---

## Usage

### Deploy existing build

```bash
npm run deploy
```

Runs: `butler push dist ${ITCH_GAME:-pixelforgestudios/pixelrealm}:html5 --userversion <version>`

### Fresh deploy (build + push)

```bash
npm run deploy:fresh
```

Runs: `npm run build && npm run deploy`

---

## How it works

- Butler pushes the contents of `dist/` to the `html5` channel on itch.io.
- `--userversion` stamps the upload with the version from `package.json`.
- Butler uses **delta uploads** — only changed files are sent after the first push, so subsequent deploys are fast.
- The game is live immediately after the push completes.

---

## First-time setup on itch.io (one-time, in browser)

Butler requires the itch.io game page to exist before the first push.

1. Go to [itch.io Dashboard](https://itch.io/dashboard) → **Create new project**
2. Set:
   - **Kind:** HTML
   - **Viewport size:** 1280 × 720
   - **"This file will be played in the browser":** checked
3. Fill in title, description, tags, and pricing — content is in `docs/DISTRIBUTION.md`.
4. Save as **Draft** (butler will create the upload; publish after verifying).

After the page exists, all future deploys are fully scripted.

---

## npm scripts reference

| Script | What it does |
|---|---|
| `npm run deploy` | Push existing `dist/` to itch.io via butler |
| `npm run deploy:fresh` | Build first, then push |

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `butler: command not found` | Install butler (see Prerequisites §1) |
| `ITCH_GAME not set` | `export ITCH_GAME=username/pixelrealm` |
| `404 Not found` on first push | Create the itch.io game page in browser first |
| `401 Unauthorized` | Run `butler login` |
| Build errors before push | Run `npm run build` independently to debug |
