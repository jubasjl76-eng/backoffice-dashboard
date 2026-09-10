import { test, expect } from '@playwright/test';
import { SESSION, mockApi } from './helpers';

test('unauthenticated visit to a guarded route redirects to /login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('form input[type="email"]')).toBeVisible();
  await expect(page.locator('form button[type="submit"]')).toBeVisible();
});

test('logging in lands on the console', async ({ page }) => {
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({ status: 200, json: { ...SESSION } }),
  );
  await mockApi(page);

  await page.goto('/login');
  await page.locator('form input[type="email"]').fill(SESSION.user.email);
  await page.locator('form input[type="password"]').fill('correct horse');
  await page.locator('form button[type="submit"]').click();

  await expect(page).toHaveURL(/localhost:5173\/$/);
  await expect(page.getByRole('navigation').first()).toBeVisible();
});

test('bad credentials show an inline error and stay on /login', async ({ page }) => {
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({ status: 400, json: { error: 'Invalid email or password' } }),
  );

  await page.goto('/login');
  await page.locator('form input[type="email"]').fill('owner@smartpet.local');
  await page.locator('form input[type="password"]').fill('wrong');
  await page.locator('form button[type="submit"]').click();

  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});
