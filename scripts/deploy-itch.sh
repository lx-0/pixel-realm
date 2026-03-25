#!/usr/bin/env bash
# scripts/deploy-itch.sh
# Deploy PixelRealm to itch.io via butler.
# Usage: ./scripts/deploy-itch.sh [--dry-run]
#
# Requires:
#   - butler installed and authenticated (run `butler login` once)
#   - ITCH_GAME env var set, or defaults to pixelforgestudios/pixelrealm

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DRY_RUN=false

for arg in "$@"; do
  [[ "$arg" == "--dry-run" ]] && DRY_RUN=true
done

# ── Config ──────────────────────────────────────────────────────────────────
ITCH_GAME="${ITCH_GAME:-pixelforgestudios/pixelrealm}"
ITCH_CHANNEL="html5"
DIST_DIR="$PROJECT_ROOT/dist"
PACKAGE_JSON="$PROJECT_ROOT/package.json"

# ── Helpers ──────────────────────────────────────────────────────────────────
info()  { echo "  [info]  $*"; }
warn()  { echo "  [warn]  $*" >&2; }
error() { echo "  [error] $*" >&2; exit 1; }
ok()    { echo "  [ok]    $*"; }

# ── Step 1: butler installed? ────────────────────────────────────────────────
echo ""
echo "▶ Checking butler..."
if ! command -v butler &>/dev/null; then
  error "butler not found. Install it: https://itchio.itch.io/butler"
fi
BUTLER_VERSION="$(butler --version 2>&1 | head -1)" || true
if [[ -z "$BUTLER_VERSION" ]]; then
  warn "butler found but --version failed (possible architecture mismatch)."
  warn "Ensure you have the correct butler binary for this platform."
  if ! $DRY_RUN; then
    error "Cannot run butler — please reinstall for your platform: https://itchio.itch.io/butler"
  fi
  info "Continuing in dry-run mode..."
  DRY_RUN=true
else
  ok "butler found: $BUTLER_VERSION"
fi

# ── Step 2: Read version from package.json ───────────────────────────────────
echo ""
echo "▶ Reading version..."
if [[ ! -f "$PACKAGE_JSON" ]]; then
  error "package.json not found at $PACKAGE_JSON"
fi
VERSION="$(node -p "require('$PACKAGE_JSON').version" 2>/dev/null || python3 -c "import json; print(json.load(open('$PACKAGE_JSON'))['version'])")"
if [[ -z "$VERSION" ]]; then
  error "Could not read version from package.json"
fi
ok "version: $VERSION"

# ── Step 3: Validate dist directory ─────────────────────────────────────────
echo ""
echo "▶ Validating dist/..."
if [[ ! -d "$DIST_DIR" ]]; then
  error "dist/ directory not found. Run 'npm run build' first."
fi

if [[ ! -f "$DIST_DIR/index.html" ]]; then
  error "dist/index.html not found. Build may be incomplete."
fi
ok "dist/index.html present"

# Check asset paths — warn if absolute paths found (can break on itch.io)
ABSOLUTE_PATHS=$(grep -oE 'src="\/[^"]*"|href="\/[^"]*"' "$DIST_DIR/index.html" | head -5 || true)
if [[ -n "$ABSOLUTE_PATHS" ]]; then
  warn "Absolute asset paths detected in dist/index.html:"
  echo "$ABSOLUTE_PATHS" | while IFS= read -r line; do echo "           $line"; done
  warn "If the game fails to load on itch.io, set 'base: \"./\"' in vite.config.ts and rebuild."
else
  ok "asset paths look relative"
fi

# Verify no server-side marker (basic check: no node_modules in dist)
if [[ -d "$DIST_DIR/node_modules" ]]; then
  error "dist/node_modules found — dist contains server-side code, not a browser build."
fi
ok "no server-side dependencies in dist/"

# ── Step 4: Validate dist zip (optional, if present) ────────────────────────
ZIP_FILE="$PROJECT_ROOT/pixelrealm-v${VERSION}.zip"
echo ""
echo "▶ Checking dist zip..."
if [[ -f "$ZIP_FILE" ]]; then
  ok "zip found: pixelrealm-v${VERSION}.zip"
  # Verify zip has index.html (may be under dist/ prefix)
  ZIP_LISTING="$(unzip -l "$ZIP_FILE" 2>/dev/null || true)"
  if echo "$ZIP_LISTING" | grep -q "index\.html"; then
    INDEX_PATH="$(echo "$ZIP_LISTING" | grep "index\.html" | awk '{print $NF}')"
    if [[ "$INDEX_PATH" == "dist/index.html" ]]; then
      warn "zip contains dist/index.html (not at root) — use butler push dist/ instead of uploading this zip directly to itch.io."
    else
      ok "zip contains index.html at root"
    fi
  else
    warn "index.html not found in $ZIP_FILE"
  fi
else
  info "no zip at $ZIP_FILE — will push dist/ directory directly (recommended)"
fi

# ── Step 5: Butler validate ──────────────────────────────────────────────────
echo ""
echo "▶ Running butler validate on dist/..."
if butler validate "$DIST_DIR" 2>&1; then
  ok "butler validate passed"
else
  warn "butler validate reported issues (non-fatal — check output above)"
fi || true

# ── Step 6: Deploy ───────────────────────────────────────────────────────────
TARGET="${ITCH_GAME}:${ITCH_CHANNEL}"
echo ""
echo "▶ Deploying..."
info "target:  $TARGET"
info "version: $VERSION"
info "source:  $DIST_DIR"

if $DRY_RUN; then
  echo ""
  echo "  [dry-run] Would run:"
  echo "  butler push \"$DIST_DIR\" \"$TARGET\" --userversion \"$VERSION\""
  echo ""
  ok "dry-run complete — no files uploaded"
else
  echo ""
  butler push "$DIST_DIR" "$TARGET" --userversion "$VERSION"
  echo ""
  ok "deploy complete → https://pixelforgestudios.itch.io/pixelrealm"
fi
