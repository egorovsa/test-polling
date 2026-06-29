const { chromium } = require('playwright');

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
  'Mozilla/5.0 (iPad; CPU OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 13; Redmi Note 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/122.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
];

// Own site only. Override via BASE_URL env var.
const BASE_URL = process.env.BASE_URL || 'https://your-site.example';
const VISITS = Number(process.env.VISITS || 100);
const VISIT_INTERVAL_MIN = Number(process.env.VISIT_INTERVAL_MIN ?? 2);
const VISIT_INTERVAL_MAX = Number(process.env.VISIT_INTERVAL_MAX ?? 3);
const HEADLESS = process.env.HEADLESS !== 'false';
const GOTO_OPTS = { waitUntil: 'domcontentloaded', timeout: 45_000 };

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randMinutes(min, max) {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return lo + Math.random() * (hi - lo);
}

function pickUserAgent() {
  return USER_AGENTS[rand(0, USER_AGENTS.length - 1)];
}

async function settlePage(page) {
  await page.waitForLoadState('load', { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(800);
}

async function scrollChunk(page, { larger = false } = {}) {
  const viewport = page.viewportSize() ?? { width: 1280, height: 720 };
  const factor = larger ? 0.55 + Math.random() * 0.55 : 0.4 + Math.random() * 0.5;
  const total = viewport.height * factor;
  const steps = 12;
  const delta = total / steps;

  await page.mouse.move(viewport.width / 2, viewport.height / 2);

  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, delta);
    await page.waitForTimeout(80);
  }

  // Fallback for pages that ignore wheel on window (custom scroll containers).
  await page.evaluate(async ({ larger }) => {
    const el = document.scrollingElement || document.documentElement;
    const chunk = window.innerHeight * (larger ? 0.55 + Math.random() * 0.55 : 0.4 + Math.random() * 0.5);
    const maxY = Math.max(0, el.scrollHeight - window.innerHeight);
    const target = Math.min(el.scrollTop + chunk, maxY);

    for (let y = el.scrollTop; y <= target; y += 150) {
      el.scrollTop = y;
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 50));
    }
  }, { larger }).catch(() => {});
}

async function browsePage(page, { minPasses = 3, maxPasses = 4, largerScroll = false } = {}) {
  const scrollPasses = rand(minPasses, maxPasses);

  for (let i = 0; i < scrollPasses; i++) {
    try {
      await scrollChunk(page, { larger: largerScroll });
    } catch (e) {
      console.warn(`  scroll pass ${i + 1} failed: ${e.message}`);
    }
    if (i < scrollPasses - 1) {
      await page.waitForTimeout(rand(3000, 5000));
    }
  }

  await page.waitForTimeout(rand(3000, 5000));
}

async function followRandomLink(page) {
  const links = await page.$$eval('a[href]', els =>
    els
      .map(e => e.getAttribute('href'))
      .filter(h => {
        if (!h || h.startsWith('#') || h.startsWith('javascript:')) return false;
        if (h.startsWith('mailto:') || h.startsWith('tel:')) return false;
        return h.startsWith('/') || h.includes(location.host);
      })
  );
  if (!links.length) return false;

  const currentUrl = page.url();
  const candidates = [...new Set(
    links
      .map(href => {
        try {
          return new URL(href, currentUrl).toString();
        } catch {
          return null;
        }
      })
      .filter(url => url && url !== currentUrl && !url.endsWith('#'))
  )];

  if (!candidates.length) return false;

  await page.goto(candidates[rand(0, candidates.length - 1)], GOTO_OPTS);
  await settlePage(page);
  return true;
}

async function simulateUser(browser, baseUrl) {
  const userAgent = pickUserAgent();
  const context = await browser.newContext({ userAgent });
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(45_000);
  page.setDefaultTimeout(30_000);
  const pageDepth = rand(3, 4);

  await page.goto(baseUrl, GOTO_OPTS);
  await settlePage(page);
  await page.waitForTimeout(rand(1000, 3000)); // "reading" the page

  await browsePage(page, { minPasses: 6, maxPasses: 8, largerScroll: true });

  for (let step = 1; step < pageDepth; step++) {
    let navigated = false;
    try {
      navigated = await followRandomLink(page);
    } catch (e) {
      console.warn(`  step ${step}: navigation failed — ${e.message}`);
      break;
    }

    if (!navigated) {
      console.warn(`  step ${step}: no internal links, stopping chain`);
      break;
    }

    console.log(`  step ${step}: ${page.url()}`);
    await page.waitForTimeout(rand(1000, 3000));
    await browsePage(page, { minPasses: 3, maxPasses: 4 });
  }

  await context.close();
  return userAgent;
}

(async () => {
  const browser = await chromium.launch({ headless: HEADLESS });

  for (let i = 0; i < VISITS; i++) {
    try {
      const userAgent = await simulateUser(browser, BASE_URL);
      console.log(`visit ${i + 1}/${VISITS} ok (UA: ${userAgent.slice(0, 50)}…)`);
    } catch (e) {
      console.error(`visit ${i + 1} failed:`, e.message);
    }
    if (i < VISITS - 1) {
      const pauseMin = randMinutes(VISIT_INTERVAL_MIN, VISIT_INTERVAL_MAX);
      console.log(`next visit in ${pauseMin.toFixed(1)} min`);
      await new Promise(r => setTimeout(r, pauseMin * 60 * 1000));
    }
  }

  await browser.close();
})();
