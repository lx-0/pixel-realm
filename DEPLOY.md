# PixelRealm — Deployment Guide

Deployment to [itch.io](https://itch.io) is handled via [butler](https://itchio.itch.io/butler), itch.io's official CLI push tool. Butler performs delta uploads — only changed files are sent after the first push, so subsequent deploys are fast.

---

## Prerequisites

### 1. Install butler (one-time, per machine)

```bash
# macOS
brew install butler

# Linux
curl -L -o butler.zip https://broth.itch.ovh/butler/linux-amd64/LATEST/archive/default
unzip butler.zip && mv butler /usr/local/bin/butler

# Windows — download from https://itchio.itch.io/butler or:
scoop install butler
```

### 2. Authenticate (one-time, per machine)

```bash
butler login
# Opens your browser — authorize, then return to terminal.
```

### 3. Create the itch.io game page (one-time, in browser)

Butler requires the game page to exist before the first push.

1. Go to [itch.io Dashboard](https://itch.io/dashboard) → **Create new project**
2. Set **Kind** to **HTML**, viewport **1280 × 720**, tick **"This file will be played in the browser"**
3. Fill in title, description, tags — content reference: `docs/DISTRIBUTION.md`
4. Save as **Draft** (publish after verifying the first push looks correct)

---

## Deploy

### Quick deploy (push existing build)

```bash
npm run deploy
```

Pushes `dist/` to `pixelforgestudios/pixelrealm:html5` tagged with the version in `package.json`.

### Full deploy (build + push)

```bash
npm run deploy:fresh
```

Runs `npm run build` then `npm run deploy`.

### Using the deploy script directly

```bash
./scripts/deploy-itch.sh          # full deploy
./scripts/deploy-itch.sh --dry-run  # validate only, no upload
```

The script validates the build before pushing and emits clear errors if anything is wrong.

### Override the itch.io target

```bash
export ITCH_GAME=yourusername/pixelrealm
npm run deploy
```

Default target is `pixelforgestudios/pixelrealm`. The target is also stored in `.butler.toml`.

---

## Configuration

| File | Purpose |
|---|---|
| `.butler.toml` | itch.io target and channel config |
| `scripts/deploy-itch.sh` | Standalone deploy + validation script |
| `package.json` `scripts.deploy` | npm shorthand |

---

## Dist structure

Butler pushes the **`dist/` directory** directly — not the zip file. The `dist/` layout after `npm run build`:

```
dist/
├── index.html          ← entry point (required at root)
└── assets/
    ├── index-*.js      ← main bundle
    ├── phaser-*.js     ← Phaser engine chunk
    └── *.png / *.webp  ← sprites and textures
```

> **Note on asset paths:** The current build uses `base: '/'` in `vite.config.ts`, which produces absolute asset paths (e.g. `/assets/index-xxx.js`). If assets fail to load on itch.io, change `base` to `'./'` in `vite.config.ts` and rebuild before deploying.

### Dist zip files

The `pixelrealm-v*.zip` files in the project root are **backup/distribution artifacts** — they contain the `dist/` folder with a `dist/` prefix inside the archive. Do **not** upload these zips directly to itch.io as a playable upload; use `butler push` instead, which handles the correct root structure automatically.

---

## Versioning

Butler stamps each push with `--userversion` taken from `package.json → version`. To deploy a new version:

1. Bump `package.json` version (e.g. `0.8.0` → `0.9.0`)
2. Run `npm run deploy:fresh`

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `butler: command not found` | Install butler (see Prerequisites §1) |
| `ITCH_GAME not set warning` | `export ITCH_GAME=username/pixelrealm` or relies on default |
| `404 Not found` on first push | Create the itch.io game page in browser first |
| `401 Unauthorized` | Run `butler login` |
| Game loads blank / assets 404 | Change `base: '/'` → `base: './'` in `vite.config.ts` and rebuild |
| Build errors | Run `npm run build` independently to debug TypeScript errors |

---

## CI / Automation

For automated deploys (GitHub Actions, etc.), set `BUTLER_API_KEY` as a secret:

```yaml
env:
  BUTLER_API_KEY: ${{ secrets.BUTLER_API_KEY }}
  ITCH_GAME: pixelforgestudios/pixelrealm
run: ./scripts/deploy-itch.sh
```

Obtain `BUTLER_API_KEY` from [itch.io → Settings → API keys](https://itch.io/user/settings/api-keys).
