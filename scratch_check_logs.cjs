const { chromium } = require('@playwright/test');

async function checkLogs() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => {
    console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.error(`[Browser PageError] ${err.message}`);
  });

  console.log('Navigating to app...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Click continue as guest
  const guestButton = page.locator('text="Continue as Guest"');
  if (await guestButton.count() > 0) {
    await guestButton.click();
  }

  // Wait 4 seconds for all startup queries to resolve
  await page.waitForTimeout(4000);

  // Check what is in localStorage
  const cached = await page.evaluate(() => {
    return {
      teachers: localStorage.getItem('biovised_cached_teachers'),
      playlists: localStorage.getItem('biovised_cached_playlists'),
      batches: localStorage.getItem('biovised_cached_batches'),
    };
  });

  console.log('--- LOCALSTORAGE CHECK ---');
  console.log('Teachers Cached Length:', cached.teachers ? JSON.parse(cached.teachers).length : 'null');
  console.log('Playlists Cached Length:', cached.playlists ? JSON.parse(cached.playlists).length : 'null');
  console.log('Batches Cached Length:', cached.batches ? JSON.parse(cached.batches).length : 'null');
  console.log('Batches JSON:', cached.batches);

  await browser.close();
}

checkLogs().catch(console.error);
