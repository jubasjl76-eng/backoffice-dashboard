// k6 load test for the dashboard's critical paths (hardening Phase 21, A12
// #24's dashboard follow-up) — run via smart-pet-ci's reusable
// k6-load-test.yml, or locally:
//
//   TARGET_URL=https://api-staging.example.com \
//   LOAD_TEST_EMAIL=... LOAD_TEST_PASSWORD=... \
//   k6 run k6/dashboard-session-load-test.js
//
// Not a browser/UI load test (k6's http module doesn't drive a real
// browser) — it replays the exact API calls each screen fires on mount, in
// the order a staff member actually navigates: Dashboard home (6 parallel
// GETs — src/pages/Dashboard.tsx), then Care Inbox, then Devices, then
// Fleet. That's the dashboard's real "critical path" load: what a
// concurrent handful of staff sessions actually does to the API, not a
// synthetic single-endpoint hammer.
//
// Same rate-limit-aware design as smart-pet-backend's k6/api-load-test.js:
// one shared login token (breederLimiter caps a single authenticated user
// at 600/min — Phase 20), so the iteration rate here is deliberately modest
// (a "session" is ~14 requests; a handful of sessions/minute stays well
// under that ceiling). Testing capacity *beyond* one tenant's ceiling needs
// multiple seeded test accounts — same scoping call as the backend script,
// not repeated here.
//
// The dashboard also holds one persistent SSE connection per open session
// (useStream, /breeder/stream) — deliberately not exercised here. k6's http
// module has no first-class EventSource/SSE support, and SSE fan-out
// capacity is really testing Phase 20's Redis pub/sub work, a different
// concern from this script's request/response critical-path latency.
import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BASE = __ENV.TARGET_URL;
if (!BASE) throw new Error('TARGET_URL is required');

export const options = {
  scenarios: {
    dashboard_session: {
      executor: 'constant-arrival-rate',
      rate: 5, // sessions/minute — ~70 req/min at ~14 req/session, well under breederLimiter's 600/min/user
      timeUnit: '1m',
      duration: '2m',
      preAllocatedVUs: 10,
      maxVUs: 20,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{group:::dashboard_home}': ['p(95)<600', 'p(99)<1500'],
    'http_req_duration{group:::care_inbox}': ['p(95)<500', 'p(99)<1200'],
    'http_req_duration{group:::devices}': ['p(95)<500', 'p(99)<1200'],
    'http_req_duration{group:::fleet}': ['p(95)<500', 'p(99)<1200'],
  },
};

export function setup() {
  const email = __ENV.LOAD_TEST_EMAIL;
  const password = __ENV.LOAD_TEST_PASSWORD;
  if (!email || !password) {
    console.warn('LOAD_TEST_EMAIL/PASSWORD unset — every screen will fail auth (401s expected)');
    return { token: null };
  }
  const res = http.post(
    `${BASE}/api/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  check(res, { 'login succeeded': (r) => r.status === 200 });
  return { token: res.status === 200 ? res.json('accessToken') : null };
}

function authGet(path, headers) {
  const res = http.get(`${BASE}/api${path}`, { headers });
  check(res, { [`${path} → 200`]: (r) => r.status === 200 });
  return res;
}

export default function (data) {
  const headers = data.token ? { Authorization: `Bearer ${data.token}` } : {};

  // Dashboard.tsx fires all six on mount — a real page load, not sequential.
  group('dashboard_home', () => {
    authGet('/breeder/inbox?status=active', headers);
    authGet('/breeder/ops/devices', headers);
    authGet('/breeder/litters', headers);
    authGet('/breeder/medications/due?hours=24', headers);
    authGet('/breeder/ops/consumables', headers);
    authGet('/breeder/breeding/calendar', headers);
  });
  sleep(0.5); // time a staff member spends looking at the home screen

  group('care_inbox', () => {
    authGet('/breeder/inbox?status=active', headers);
    authGet('/breeder/vaccinations?status=overdue', headers);
  });
  sleep(0.5);

  group('devices', () => {
    authGet('/breeder/ops/devices', headers);
    authGet('/breeder/ops/devices/pairing', headers);
  });
  sleep(0.5);

  group('fleet', () => {
    authGet('/breeder/fleet/health', headers);
    authGet('/breeder/fleet/firmware', headers);
    authGet('/breeder/fleet/devices', headers);
    authGet('/breeder/fleet/rollouts', headers);
  });
}
