const { chromium } = require('@playwright/test');
const path = require('path');

async function capture() {
  console.log('Launching headless browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
  });

  const page = await context.newPage();
  const artifactDir = 'C:\\Users\\abhii\\.gemini\\antigravity\\brain\\66996ee4-1983-440f-b0f1-915d6c6046ec';

  console.log('Navigating to Home Dashboard...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  // Wait a bit for any animations
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_home.png') });
  console.log('Saved screenshot_home.png');

  // Let's try searching for "Physics"
  console.log('Navigating to Search page...');
  const searchInput = page.locator('input[placeholder*="Search"]');
  if (await searchInput.count() > 0) {
    await searchInput.fill('Physics');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(artifactDir, 'screenshot_search_physics.png') });
    console.log('Saved screenshot_search_physics.png');

    // Clear search
    await searchInput.fill('');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
  }

  // Click the Batches tab in explore or home dashboard
  console.log('Clicking Batches/explore tabs...');
  const buttons = page.locator('button, a, div[role="button"]');
  const count = await buttons.count();
  for (let i = 0; i < count; i++) {
    const text = await buttons.nth(i).innerText().catch(() => '');
    if (text && text.toLowerCase().includes('batches')) {
      console.log(`Clicking button with text: ${text}`);
      await buttons.nth(i).click().catch(() => {});
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(artifactDir, 'screenshot_batches.png') });
      console.log('Saved screenshot_batches.png');
      break;
    }
  }

  // Let's grab the HTML of the main page for diagnostic purposes
  const html = await page.content();
  const fs = require('fs');
  fs.writeFileSync(path.join(artifactDir, 'page_content.html'), html);
  console.log('Saved page_content.html');

  await browser.close();
  console.log('Browser closed successfully.');
}

capture().catch(err => {
  console.error('Error during capture:', err);
});
