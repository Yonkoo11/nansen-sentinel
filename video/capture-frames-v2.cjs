const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const url = 'https://yonkoo11.github.io/nansen-sentinel/';
  console.log('Loading', url);
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  // Frame 04: Drift chart + key findings (scroll so chart is prominent, findings visible)
  await page.evaluate(() => {
    document.querySelector('#case-study')?.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'video/frames/04-drift-forensics.png' });
  console.log('04-drift-forensics captured');

  // Frame 05: Methodology section (4 signal cards + scoring levels)
  await page.evaluate(() => {
    document.querySelector('#methodology')?.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'video/frames/05-methodology.png' });
  console.log('05-methodology captured');

  // Frame 06: API stats (scroll down within methodology to show stats)
  await page.evaluate(() => {
    const el = document.querySelector('.stats-card');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'video/frames/06-closer.png' });
  console.log('06-closer captured');

  await browser.close();
  console.log('Done — 3 new frames captured');
})();
