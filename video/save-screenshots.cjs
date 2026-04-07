const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const url = 'https://yonkoo11.github.io/nansen-sentinel/';
  const dir = 'video/screenshots';
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  // SS1: Hero + perp sentiment
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: `${dir}/01-perp-sentiment.png` });
  console.log('01 saved');

  // SS2: BTC expanded
  const firstRow = await page.$('.perp-row.perp-major');
  if (firstRow) await firstRow.click();
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: `${dir}/02-btc-expanded.png` });
  console.log('02 saved');
  if (firstRow) await firstRow.click();
  await new Promise(r => setTimeout(r, 300));

  // SS3: Drift case study chart
  await page.evaluate(() => {
    document.querySelector('#case-study')?.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: `${dir}/03-drift-chart.png` });
  console.log('03 saved');

  // SS4: Honest assessment + holders
  await page.evaluate(() => {
    document.querySelector('.assessment-card')?.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: `${dir}/04-honest-assessment.png` });
  console.log('04 saved');

  await browser.close();
  console.log('4 screenshots saved to video/screenshots/');
})();
