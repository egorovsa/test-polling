# monopolling

QA crawl of your own site with [Playwright](https://playwright.dev): simulates
visitor behavior (land → scroll → follow 3–4 internal pages in a chain)
for functional/load testing.

> **Own site only.** Each session picks a random real User-Agent from a pool of
> 15 browsers (Chrome, Firefox, Safari, Edge, Samsung, mobile).

## Install

```bash
npm install            # installs playwright and downloads chromium (postinstall)
```

If the browser was not downloaded automatically:

```bash
npx playwright install chromium
```

## Run

**macOS / Linux (bash):**

```bash
BASE_URL="https://example.com" VISITS=100 VISIT_INTERVAL_MIN=2 VISIT_INTERVAL_MAX=3 npm start
```

Show the browser window (debug):

```bash
HEADLESS=false BASE_URL="https://example.com" VISITS=5 npm start
```

**Windows (PowerShell):**

```powershell
$env:BASE_URL="https://example.com"
$env:VISITS="100"
$env:VISIT_INTERVAL_MIN="2"
$env:VISIT_INTERVAL_MAX="3"
npm start
```

Show the browser window (debug):

```powershell
$env:HEADLESS="false"
$env:BASE_URL="https://example.com"
$env:VISITS="5"
npm start
```

Or one line:

```powershell
$env:BASE_URL="https://example.com"; $env:VISITS="100"; $env:VISIT_INTERVAL_MIN="2"; $env:VISIT_INTERVAL_MAX="3"; npm start
```

**Windows (CMD):**

```cmd
set BASE_URL=https://example.com
set VISITS=100
set VISIT_INTERVAL_MIN=2
set VISIT_INTERVAL_MAX=3
npm start
```

Show the browser window (debug):

```cmd
set HEADLESS=false
set BASE_URL=https://example.com
set VISITS=5
npm start
```

| Variable              | Default | Purpose                                        |
| --------------------- | ------- | ---------------------------------------------- |
| `BASE_URL`            | `https://your-site.example` | Target site URL                    |
| `VISITS`              | `100`   | Number of sessions                             |
| `VISIT_INTERVAL_MIN`  | `2`     | Min minutes between visits (random range)      |
| `VISIT_INTERVAL_MAX`  | `3`     | Max minutes between visits (random range)      |
| `HEADLESS`            | `true`  | `false` — show the browser window (debug)      |

By default the browser runs headless (no window). Set `HEADLESS=false` to watch
visits live — useful for debugging; use a small `VISITS` value (e.g. `5`).

Set `VISIT_INTERVAL_MIN` and `VISIT_INTERVAL_MAX` to the same value for a fixed
interval. Each pause picks a random duration in that range (e.g. 2.4 min, 2.8 min).

Replace the default `BASE_URL` placeholder with your own address.

## What one "visit" does

1. Opens `BASE_URL`, waits for `networkidle`.
2. Pause 1–3 s ("reading" the page).
3. Scrolls the home page in 6–8 chunks (larger steps), 3–5 s pause between chunks.
4. Follows random internal links in a chain — **3 or 4 pages total** per visit.
5. On each inner page: pause 1–3 s, then scroll in 3–4 chunks with 3–5 s pauses.
6. Stops when depth is reached or no more links; close session.
7. Wait a random 2–3 min (or your configured range) before the next session.
