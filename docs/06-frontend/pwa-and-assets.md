# PWA and assets

Lift Tracker is a **Progressive Web App (PWA)**: it can be added to a phone's home screen, where it opens full screen with its own icon, like a native app. It has **no service worker**, so it needs a connection to the server (offline mode is out of scope).

---

## index.html

**File:** [`frontend/index.html`](../../frontend/index.html)

The HTML shell. Vite injects the built script and CSS into it at build time.

| Tag | Purpose |
| --- | --- |
| `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">` | Phone-width layout. `viewport-fit=cover` draws under the notch, and `index.css` adds `env(safe-area-inset-*)` padding to compensate. |
| `<title>Lift Tracker</title>` | Browser tab title |
| `<link rel="manifest" href="/manifest.webmanifest">` | Makes the app installable (name, icons, display mode) |
| `<link rel="icon" type="image/svg+xml" href="/icon.svg">` | Favicon |
| `<link rel="apple-touch-icon" href="/apple-touch-icon.png">` | iOS home-screen icon |
| `<meta name="theme-color" content="#f6f7f9" media="(prefers-color-scheme: light)">` | Browser/status bar colour, light mode (= `--bg`) |
| `<meta name="theme-color" content="#111215" media="(prefers-color-scheme: dark)">` | Same, dark mode |
| `<meta name="apple-mobile-web-app-capable" content="yes">` | iOS: open full screen from the home screen |
| `<meta name="apple-mobile-web-app-title" content="Lifts">` | iOS: name under the icon |
| `<meta name="apple-mobile-web-app-status-bar-style" content="default">` | iOS status bar style |
| `<div id="root">` | React mounts here |
| `<script type="module" src="/src/main.tsx">` | Entry point (rewritten to the hashed bundle at build) |

---

## public/

**Folder:** [`frontend/public/`](../../frontend/public/)

Files here are served **as-is at the site root** (`/icon.svg`, `/manifest.webmanifest`) and copied unchanged into `dist/` at build time.

| File | Size | Purpose |
| --- | --- | --- |
| `manifest.webmanifest` | — | Web app manifest (below) |
| `icon.svg` | vector | Source artwork; favicon; "any size" manifest icon |
| `icon-192.png` | 192×192 | Manifest icon (Android home screen, launcher) |
| `icon-512.png` | 512×512 | Manifest icon; also the **maskable** icon (Android crops it to a circle or squircle) |
| `apple-touch-icon.png` | 180×180 | iOS home-screen icon |

### The icon
`icon.svg` is a white dumbbell on a full-bleed `#1f6feb` square, viewBox `0 0 512 512`:
- **Full bleed:** the background fills the whole square, because phones crop icons to their own shape.
- **Safe zone:** the dumbbell (a bar plus inner and outer plates) stays within the central safe zone, so it survives the maskable crop.

### Regenerating the PNGs
The PNGs were rendered from the SVG with **no extra dependencies**:
1. **Render the 512px PNG** with headless Chrome, screenshotting a page that shows `icon.svg` at 512×512:
   ```bash
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
     --window-size=512,512 --hide-scrollbars --screenshot=icon-512.png icon.html
   ```
   where `icon.html` is a page with `<img src="icon.svg">` filling the viewport.
2. **Downscale with macOS's `sips`**. Headless Chrome won't render windows narrower than about 500px, so smaller sizes come from the 512 version:
   ```bash
   sips -z 192 192 icon-512.png --out icon-192.png
   sips -z 180 180 icon-512.png --out apple-touch-icon.png
   ```

---

## manifest.webmanifest

**File:** [`frontend/public/manifest.webmanifest`](../../frontend/public/manifest.webmanifest)

| Field | Value | Meaning |
| --- | --- | --- |
| `name` | `Lift Tracker` | Full name (install prompts, app switcher) |
| `short_name` | `Lifts` | Name under the home-screen icon |
| `description` | `Personal records for every lift on every machine.` | |
| `start_url` | `/` | Opens on Home |
| `scope` | `/` | Every path belongs to the app |
| `display` | `standalone` | No browser UI, like a native app |
| `orientation` | `portrait` | |
| `background_color` | `#f6f7f9` | Splash screen background |
| `theme_color` | `#1f6feb` | System UI tint |
| `icons` | 192 any, 512 any, 512 maskable, SVG any | See above |

nginx serves this file with `Content-Type: application/manifest+json` (it doesn't know the extension by default; see [nginx config](../07-operations/docker-and-deployment.md#nginxconf)).

---

## Installing on a phone

| Platform | Steps | Notes |
| --- | --- | --- |
| **iPhone (Safari)** | Open the app's URL → Share → **Add to Home Screen** | Works over plain HTTP on your network |
| **Android (Chrome)** | Menu → **Add to Home screen** | The full "Install app" experience requires **HTTPS**. Over plain HTTP you get a shortcut. Once the app is behind Tailscale, `tailscale serve` can provide HTTPS. |

When installed (standalone):
- There's **no browser back button**. Every non-tab page has an in-app back link or Cancel.
- The page draws under the status bar/notch. Safe-area padding keeps content clear.
- Pull-to-refresh isn't available. New data loads as you navigate, and set changes refresh automatically.

---

## Why there's no service worker

A service worker would enable offline use and caching, but offline sync (logging sets without a connection and syncing later) is a substantial feature and was explicitly out of scope. Without a service worker:
- the app always loads fresh from the server (nginx sends `index.html` with `no-cache`, so new builds appear on the next load),
- the app can't open with no connection to the server.
