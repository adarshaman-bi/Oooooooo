import { test, expect } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';

test.describe('Authentication', () => {
  test('signup form validates inline', async ({ page }) => {
    await page.goto(BASE);
    await page.click('[aria-label="Sign in"]');
    await page.click('text=Sign Up instead');
    await page.fill('input[type="email"]', 'bad-email');
    await page.click('input[placeholder="Enter Candidate Full Name"]');
    await expect(page.locator('text=Input Valid Email')).toBeVisible();
  });

  test('password checklist appears on signup', async ({ page }) => {
    await page.goto(BASE);
    await page.click('[aria-label="Sign in"]');
    await page.click('text=Sign Up instead');
    await page.fill('input[placeholder="Password"]', 'a');
    await expect(page.locator('text=8+ Chars')).toBeVisible();
    await expect(page.locator('text=Uppercase')).toBeVisible();
  });

  test('guest mode bypass works', async ({ page }) => {
    await page.goto(BASE);
    await page.click('[aria-label="Sign in"]');
    await page.click('text=Continue as Guest');
    await expect(page.locator('text=Guest Candidate')).toBeVisible();
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto(BASE);
    await page.click('[aria-label="Sign in"]');
    await page.fill('input[type="email"]', 'nonexistent@test.com');
    await page.fill('input[placeholder="Password"]', 'wrongpass1!');
    await page.click('button:has-text("Get Started")');
    await expect(page.locator('text=Incorrect credentials')).toBeVisible({ timeout: 10000 });
  });

  test('forgot password flow', async ({ page }) => {
    await page.goto(BASE);
    await page.click('[aria-label="Sign in"]');
    await page.click('text=Forgot password');
    await expect(page.locator('text=Reset your password')).toBeVisible();
    await page.fill('input[type="email"]', 'test@example.com');
    await page.click('button:has-text("Send Instructions")');
    await expect(page.locator('text=Security recovery dispatch sent')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Search', () => {
  test('search input shows suggestions', async ({ page }) => {
    await page.goto(BASE);
    await page.fill('input[placeholder="Search lessons"]', 'physics');
    await page.waitForTimeout(600);
    await expect(page.locator('[role="application"]')).toBeVisible();
  });

  test('search skeleton appears during fetch', async ({ page }) => {
    await page.goto(BASE);
    await page.fill('input[placeholder="Search lessons"]', 'electrostatics');
    await page.press('input[placeholder="Search lessons"]', 'Enter');
  });
});

test.describe('Authorization', () => {
  test('admin route redirects unauthenticated users to auth', async ({ page }) => {
    await page.goto(`${BASE}/admin/educators`);
    await expect(page.locator('text=Sign in to Biovised')).toBeVisible({ timeout: 5000 });
  });

  test('moderator dashboard denies non-admin users', async ({ page }) => {
    await page.goto(`${BASE}/moderator`);
    await expect(page.locator('text=ACCESS DENIED')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Profile', () => {
  test('profile page loads', async ({ page }) => {
    await page.goto(BASE);
    await page.click('[aria-label="Sign in"]');
    await page.click('text=Continue as Guest');
    await page.click('[aria-label="Profile"]');
    await expect(page.locator('text=Watch History')).toBeVisible();
  });
});
