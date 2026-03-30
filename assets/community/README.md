# Community Platform Branding Package

Visual identity assets for PixelRealm across community platforms. All assets use the 32-color master palette from `docs/ART-STYLE-GUIDE.md`.

## Discord (`discord/`)

| Asset | File | Size |
|-------|------|------|
| Server icon | `icon_server_512x512.png` | 512x512 |
| Server banner | `banner_server_960x540.png` | 960x540 |
| Custom emoji (18) | `emoji/*.png` | 128x128 |
| Role badges (6) | `roles/*.png` | 128x128 |

### Custom Emoji

sword, shield, potion_hp, potion_mp, gold_coin, gem, heart, skull, crown, staff, bow, hammer, chest, star, fire, tree, fish, mount, thumbsup, scroll

### Role Badges

| Role | Icon | Color |
|------|------|-------|
| Developer | Code brackets `</>` | Cyan `#50a8e8` |
| Moderator | Shield + checkmark | Green `#4c9b4c` |
| Alpha Tester | Bug icon | Purple `#9050e0` |
| Guild Leader | Crown | Gold `#e8b800` |
| Champion | Trophy | Red/Orange `#d42020` |
| Contributor | Heart + wrench | Blue `#90d0f8` |

## Streaming Overlays (`streaming/`)

| Asset | File | Size | Usage |
|-------|------|------|-------|
| Webcam frame | `overlay_webcam_frame.png` | 400x400 | Pixel art border for webcam feed |
| Chat border | `overlay_chat_border.png` | 400x600 | Semi-transparent chat panel overlay |
| Now Playing banner | `banner_now_playing.png` | 600x80 | Bottom/top screen strip with game logo |
| Intermission screen | `screen_intermission.png` | 1920x1080 | Full BRB/intermission screen |

## Social Media Templates (`social-media/`)

| Template | File | Size | Usage |
|----------|------|------|-------|
| Patch Notes | `template_patch_notes.png` | 1080x1080 | Instagram/Twitter square card |
| Event | `template_event.png` | 1080x1080 | Event announcements |
| Community Highlight | `template_community_highlight.png` | 1080x1080 | Player/community spotlights |
| Screenshot Card | `template_screenshot_card.png` | 1200x675 | Twitter card / landscape format |

Templates include placeholder text marked with `[BRACKETS]` — replace in an image editor before posting.

## Integration Notes

- All assets provided as both SVG (editable) and PNG (ready to use)
- Pixel art style uses nearest-neighbor scaling — do not apply smoothing/anti-aliasing when resizing
- Color palette is consistent with in-game assets
- Discord emoji are 128x128 (Discord auto-scales to display size)
- Streaming overlays use transparent backgrounds where appropriate
