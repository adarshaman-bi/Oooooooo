process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Bypass local system SSL/certificate verification errors

const { chromium } = require('@playwright/test');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

async function capture() {
  console.log('Launching headless browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
  });

  const page = await context.newPage();
  page.on('console', msg => console.log('[Browser Console]', msg.type(), msg.text()));
  const artifactDir = 'C:\\Users\\abhii\\.gemini\\antigravity\\brain\\66996ee4-1983-440f-b0f1-915d6c6046ec';

  // Setup reverse proxy for Supabase calls to bypass client-side DNS resolution issues on Windows sandbox
  await page.route('https://jicyzdfzcffhjqehvcpk.supabase.co/rest/v1/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    console.log(`[Proxy] Intercepting: ${method} ${url}`);
    
    const requestHeaders = route.request().headers();
    const headers = {
      'apikey': requestHeaders['apikey'],
      'Authorization': requestHeaders['authorization'],
      'Content-Type': 'application/json'
    };

    try {
      const response = await axios({
        method: method,
        url: url,
        headers: headers,
        data: route.request().postData() || undefined
      });

      console.log(`[Proxy] Fulfilled: ${url} with ${response.status}. Data:`, JSON.stringify(response.data).substring(0, 300));
      const dataStr = JSON.stringify(response.data);
      await route.fulfill({
        status: response.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: dataStr
      });
    } catch (err) {
      console.error(`[Proxy] Failed for ${url}:`, err.message);
      await route.abort();
    }
  });

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

  // Wait for batches to populate in localStorage (indicates hydration complete)
  console.log('Waiting for batches to populate in localStorage (up to 40 seconds)...');
  try {
    await page.waitForFunction(() => {
      try {
        const b = localStorage.getItem('biovised_cached_batches');
        return b && JSON.parse(b).length > 0;
      } catch (e) {
        return false;
      }
    }, { timeout: 40000 });
    console.log('Batches loaded in localStorage successfully!');
  } catch (err) {
    console.warn('Timed out waiting for batches in localStorage. Proceeding anyway...');
  }

  // Save Home screenshot
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_home.png') });
  console.log('Saved screenshot_home.png');

  // Let's click the search input in the header
  console.log('Opening Search View...');
  const headerSearchInput = page.locator('input[placeholder="Search lessons"]');
  if (await headerSearchInput.count() > 0) {
    await headerSearchInput.focus();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(artifactDir, 'screenshot_search_empty.png') });
    console.log('Saved screenshot_search_empty.png');

    // Type "Physics"
    const searchInput = page.locator('input[placeholder*="Search playlists"]');
    if (await searchInput.count() > 0) {
      await searchInput.fill('Physics');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(artifactDir, 'screenshot_search_physics.png') });
      console.log('Saved screenshot_search_physics.png');
    }

    // Go back to home
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
  }

  // Click on "Batches" in the bottom navigation
  console.log('Navigating to Batches Tab...');
  const textButton = page.locator('text="Batches"');
  if (await textButton.count() > 0) {
    await textButton.first().click();
    console.log('Clicked Batches button.');
  }
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_batches.png') });
  console.log('Saved screenshot_batches.png');

  // Click on the first batch card to see batch details
  console.log('Opening a Batch details view...');
  // Locator for batch cards
  const batchCard = page.locator('div.grid h3, div.grid h4');
  if (await batchCard.count() > 0) {
    console.log(`Found ${await batchCard.count()} batch cards. Clicking the first one...`);
    await batchCard.first().click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(artifactDir, 'screenshot_batch_detail.png') });
    console.log('Saved screenshot_batch_detail.png');
  } else {
    console.warn('No batch cards found in grid.');
  }

  await browser.close();
  console.log('Browser closed successfully.');
}

capture().catch(err => {
  console.error('Error during capture:', err);
});
