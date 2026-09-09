const { chromium } = require('playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\Users\GLORY MUKAMI\AppData\Local\ms-playwright\chromium-1228\chrome-win64\chrome.exe',
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage({ viewport: { width: 1400, height: 3400 } });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.click('text=Open journal');
  await page.waitForTimeout(500);
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => {
      document.querySelectorAll('.contents-group-trigger').forEach(t => {
        if (t.getAttribute('aria-expanded') === 'false') t.click();
      });
    });
    await page.waitForTimeout(300);
  }
  await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('b'));
    const target = nodes.find(n => n.textContent.trim() === 'Reflections');
    if (target) (target.closest('button') || target).click();
  });
  await page.waitForTimeout(1000);
  const OUT = path.resolve('C:\\Users\\GLORYM~1\\AppData\\Local\\Temp\\claude\\c--Users-GLORY-MUKAMI-Pictures-Screenshots-glory-mukami-personal-tracker-offline-vscode-latest\\c644f423-0cec-4e0d-a83b-540fcf622ab3\\scratchpad\\');
  await page.screenshot({ path: OUT + 'reflections-threshold.png' });
  
  await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('b'));
    const target = nodes.find(n => n.textContent.trim() === 'Portraits');
    if (target) (target.closest('button') || target).click();
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: OUT + 'portraits-threshold.png' });
  
  await browser.close();
})();
