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

  console.log('Navigating to Auth Page...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  
  // Click "Continue as Guest"
  console.log('Clicking "Continue as Guest"...');
  const guestButton = page.locator('text="Continue as Guest"');
  if (await guestButton.count() > 0) {
    await guestButton.click();
    console.log('Clicked Continue as Guest.');
  }

  // Wait for home dashboard to load
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_home.png') });
  console.log('Saved screenshot_home.png');

  // Let's click the search input in the header
  console.log('Opening Search View...');
  const headerSearchInput = page.locator('input[placeholder="Search lessons"]');
  if (await headerSearchInput.count() > 0) {
    await headerSearchInput.focus();
    await page.waitForTimeout(1000);
    // Let's capture the empty search state
    await page.screenshot({ path: path.join(artifactDir, 'screenshot_search_empty.png') });
    console.log('Saved screenshot_search_empty.png');

    // Type "Physics" in the search input inside SearchView
    const searchInput = page.locator('input[placeholder*="Search playlists"]');
    if (await searchInput.count() > 0) {
      await searchInput.fill('Physics');
      await page.keyboard.press('Enter');
      // Wait for results
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(artifactDir, 'screenshot_search_physics.png') });
      console.log('Saved screenshot_search_physics.png');
    }

    // Close Search by clicking back or logo
    // Let's find logo or click escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1500);
  }

  // Click on "Batches" in the bottom navigation
  console.log('Navigating to Batches Tab via bottom nav...');
  const batchesNavButton = page.locator('button:has-text("Batches"), div[role="button"]:has-text("Batches")');
  let batchesClicked = false;
  if (await batchesNavButton.count() > 0) {
    console.log('Clicking Batches bottom nav button...');
    await batchesNavButton.first().click();
    batchesClicked = true;
  } else {
    // Try by text
    const textButton = page.locator('text="Batches"');
    if (await textButton.count() > 0) {
      await textButton.first().click();
      batchesClicked = true;
    }
  }

  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_batches.png') });
  console.log('Saved screenshot_batches.png');

  // Click on the first batch card to see batch details
  console.log('Opening a Batch details view...');
  // Batch cards have batch titles, let's look for a class or cursor pointer inside main
  const batchCards = page.locator('main .cursor-pointer');
  if (await batchCards.count() > 0) {
    console.log(`Found ${await batchCards.count()} clickable elements. Clicking the first one...`);
    await batchCards.first().click().catch(() => {});
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(artifactDir, 'screenshot_batch_detail.png') });
    console.log('Saved screenshot_batch_detail.png');
  } else {
    console.log('No batch cards found to click.');
  }

  await browser.close();
  console.log('Browser closed successfully.');
}

capture().catch(err => {
  console.error('Error during capture:', err);
});
