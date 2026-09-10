import { test, expect } from '@playwright/test';
import { seedSession, mockApi } from './helpers';

const pages = ['/inbox', '/animals', '/settings'];

for (const path of pages) {
  test(`authenticated: ${path} renders the console shell`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await seedSession(page);
    await mockApi(page);

    await page.goto(path);

    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole('navigation').first()).toBeVisible();
    expect(errors, `uncaught errors on ${path}: ${errors.join('\n')}`).toEqual([]);
  });
}
