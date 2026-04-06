const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const url = 'https://yonkoo11.github.io/nansen-sentinel/';
  console.log('Loading', url);
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  // Frame 01: Hero — header + perp sentiment top
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'video/frames/01-hero.png' });
  console.log('01-hero captured');

  // Frame 02: Expand BTC row
  const firstRow = await page.$('.perp-row.perp-major');
  if (firstRow) {
    await firstRow.click();
    await new Promise(r => setTimeout(r, 800));
  }
  await page.screenshot({ path: 'video/frames/02-expand.png' });
  console.log('02-expand captured');

  // Close the expand, scroll to alerts
  if (firstRow) await firstRow.click();
  await new Promise(r => setTimeout(r, 300));

  // Frame 03: Alerts section
  await page.evaluate(() => {
    document.querySelector('#alerts')?.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'video/frames/03-alerts.png' });
  console.log('03-alerts captured');

  // Frame 04: Drift case study chart
  await page.evaluate(() => {
    document.querySelector('#case-study')?.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'video/frames/04-drift.png' });
  console.log('04-drift captured');

  // Frame 05: Key findings + honest assessment
  await page.evaluate(() => {
    const el = document.querySelector('.assessment-card');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'video/frames/05-findings.png' });
  console.log('05-findings captured');

  // Frame 06: Methodology + API stats
  await page.evaluate(() => {
    document.querySelector('#methodology')?.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'video/frames/06-methodology.png' });
  console.log('06-methodology captured');

  await browser.close();
  console.log('Done — 6 frames captured');
})();
