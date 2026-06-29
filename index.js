const { chromium } = require('playwright');

// Помечаем тестовый трафик, чтобы отфильтровать его в аналитике.
// Маркер ставится на КАЖДЫЙ запрос (в User-Agent и в заголовке X-Test-Traffic),
// иначе аналитика не сможет отделить тест от реальных посетителей.
const TEST_MARKER = 'qa-playwright-test';

// Только свой сайт. Можно переопределить через переменную окружения BASE_URL.
const BASE_URL = process.env.BASE_URL || 'https://твой-сайт.example';
const VISITS = Number(process.env.VISITS || 100);

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function simulateUser(browser, baseUrl) {
  const context = await browser.newContext({
    userAgent: `Mozilla/5.0 (test) ${TEST_MARKER}`,
    extraHTTPHeaders: { 'X-Test-Traffic': TEST_MARKER },
  });
  const page = await context.newPage();

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(rand(1000, 3000)); // "читает" страницу

  // Плавный скролл вниз.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 200) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 100));
    }
  });

  // Кликаем по случайной внутренней ссылке.
  const links = await page.$$eval('a[href]', els =>
    els
      .map(e => e.getAttribute('href'))
      .filter(h => h && (h.startsWith('/') || h.includes(location.host)))
  );
  if (links.length) {
    const href = links[rand(0, links.length - 1)];
    try {
      await page.goto(new URL(href, baseUrl).toString(), {
        waitUntil: 'networkidle',
      });
      await page.waitForTimeout(rand(1500, 4000));
    } catch (e) {
      /* битая ссылка — фиксируем */
    }
  }

  await context.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (let i = 0; i < VISITS; i++) {
    try {
      await simulateUser(browser, BASE_URL);
      console.log(`визит ${i + 1}/${VISITS} ок`);
    } catch (e) {
      console.error(`визит ${i + 1} упал:`, e.message);
    }
    await new Promise(r => setTimeout(r, rand(2000, 8000))); // пауза между сессиями
  }

  await browser.close();
})();
