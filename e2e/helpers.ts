import type { Page, Route } from '@playwright/test';

export const SESSION = {
  user: { id: 'u1', email: 'owner@smartpet.local', name: 'Owner', role: 'owner', kennelId: 'home' },
  accessToken: 'test-access',
  refreshToken: 'test-refresh',
};

/** Pretend the user is logged in before the app boots. */
export async function seedSession(page: Page, session: unknown = SESSION): Promise<void> {
  await page.addInitScript(
    (s) => window.localStorage.setItem('smartpet.auth', JSON.stringify(s)),
    session,
  );
}

const json = (body: unknown) => (route: Route) => route.fulfill({ status: 200, json: body });

/**
 * Stub the API. A catch-all `{}` is registered first, then correctly-shaped
 * empty responses for the endpoints the console hits on load, then any
 * per-test `overrides` (glob → body). Playwright matches the most recently
 * registered route first, so overrides win.
 */
export async function mockApi(page: Page, overrides: Record<string, unknown> = {}): Promise<void> {
  await page.route('**/api/**', json({}));

  const defaults: Record<string, unknown> = {
    '**/api/config': { env: 'test', mode: 'cloud', version: 'test', flags: {} },
    '**/api/breeder/inbox**': { items: [], counts: { open: 0, critical: 0, snoozed: 0 } },
    '**/api/breeder/vaccinations**': { records: [] },
    '**/api/breeder/animals': { animals: [] },
    '**/api/breeder/medications/due**': { due: [] },
    '**/api/breeder/fleet/devices': { devices: [] },
    '**/api/breeder/fleet/control': { safeMode: false, reason: null, updatedAt: null },
    '**/api/breeder/fleet/health': { versions: [], rollouts: [], crashes: { windowDays: 30, totalDevices: 0, crashFreeDevices: 0, byVersion: [] } },
    '**/api/breeder/breeding/calendar': { heats: [], litters: [], goHome: [] },
    '**/api/breeder/litters': { litters: [] },
    '**/api/users': { users: [] },
    '**/api/users/invites': { invites: [] },
    '**/api/setup/status': {
      setupComplete: true,
      canAdminister: true,
      kennel: { slug: 'home', name: 'Home Kennel', breedFocus: null, timezone: 'UTC' },
      steps: { kennel: true, pens: true, animals: true, rules: true, devices: true },
      counts: { pens: 0, animals: 0, rules: 0, devices: 0 },
    },
  };

  for (const [glob, body] of Object.entries(defaults)) await page.route(glob, json(body));
  for (const [glob, body] of Object.entries(overrides)) await page.route(glob, json(body));
}
