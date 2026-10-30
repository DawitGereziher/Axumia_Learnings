#!/usr/bin/env node
/**
 * 07-HELP-ESCROW-REGRESSION.MJS
 * Gateway Test Suite: Help Requests, Helper Proposal Bidding, Upfront Escrow Hold & Two-Step Completion.
 *
 * Runs without external testing frameworks directly against a running server.
 * Exit code 0 on all tests passing, exit code 1 on any regression.
 *
 * Usage:
 *   node backend/test/regression/07-help-escrow-regression.mjs [--url http://localhost:3000]
 */

import { fileURLToPath } from 'url';
import path from 'path';

const args = process.argv.slice(2);
const getArg = (flag, def) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : def;
};
const BASE_URL = (getArg('--url', 'http://localhost:3000')).replace(/\/$/, '');

const c = {
  reset:   '\x1b[0m',
  green:   '\x1b[32m',
  red:     '\x1b[31m',
  yellow:  '\x1b[33m',
  cyan:    '\x1b[36m',
  grey:    '\x1b[90m',
  bold:    '\x1b[1m',
};

const TEST_BYPASS_KEY = 'axumia-internal-regression-key-2026';

async function req(method, path, { headers = {}, body } = {}) {
  const url = `${BASE_URL}${path}`;
  const init = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-internal-test-key': TEST_BYPASS_KEY,
      ...headers,
    },
  };
  if (body) init.body = JSON.stringify(body);
  const res = await fetch(url, init);
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, ok: res.ok, body: json };
}

let passedCount = 0;
let failedCount = 0;

async function test(name, fn) {
  process.stdout.write(`  • ${name.padEnd(68)} `);
  try {
    await fn();
    console.log(`${c.green}✔ PASS${c.reset}`);
    passedCount++;
  } catch (err) {
    console.log(`${c.red}✖ FAIL: ${err.message}${c.reset}`);
    failedCount++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export async function runHelpEscrowRegression() {
  passedCount = 0;
  failedCount = 0;

  console.log(`\n${c.bold}${c.cyan}====================================================================${c.reset}`);
  console.log(`${c.bold}${c.cyan}  GATEWAY PHASE 7: Help Requests, Bidding & Escrow Release Gate      ${c.reset}`);
  console.log(`${c.bold}${c.cyan}====================================================================${c.reset}`);
  console.log(`  Target: ${c.bold}${BASE_URL}${c.reset}\n`);

  const ts = Date.now();
  const student = {
    email: `help_stud_${ts}@axumia.test`,
    password: 'Password123!',
    first_name: 'Dawit',
    last_name: 'Student',
    role: 'student',
  };
  const helper1 = {
    email: `help_expert1_${ts}@axumia.test`,
    password: 'Password123!',
    first_name: 'Solomon',
    last_name: 'Tutor',
    role: 'instructor',
  };
  const helper2 = {
    email: `help_expert2_${ts}@axumia.test`,
    password: 'Password123!',
    first_name: 'Bethlehem',
    last_name: 'Helper',
    role: 'instructor',
  };
  const unapprovedHelper = {
    email: `help_unapproved_${ts}@axumia.test`,
    password: 'Password123!',
    first_name: 'Unverified',
    last_name: 'Tutor',
    role: 'instructor',
  };

  let adminToken = '';
  let studentToken = '';
  let helper1Token = '';
  let helper2Token = '';
  let unapprovedToken = '';

  let requestId = '';
  let bid1Id = '';
  let bid2Id = '';
  let sessionId = '';

  // ── 0. Setup: Dynamic Admin Login ───────────────────────────────────
  await test('Authenticate administrator via /auth/login', async () => {
    const res = await req('POST', '/auth/login', {
      body: {
        email: 'dawitgebreegziabiher@outlook.com',
        password: '12345678',
      },
    });
    assert(res.status === 200, `Admin login failed: ${res.status}`);
    adminToken = res.body.accessToken;
  });

  // ── 1. Setup: Register Student, Approved Helpers & Unapproved Helper ─
  await test('Register student seeking technical homework help (201)', async () => {
    const res = await req('POST', '/auth/register', { body: student });
    assert(res.status === 201, `Failed to register student: ${res.status}`);
    studentToken = res.body.accessToken;
  });

  await test('Register and approve two KYC verified instructors (helpers)', async () => {
    // Helper 1
    const h1 = await req('POST', '/auth/register', { body: helper1 });
    assert(h1.status === 201, `Failed helper 1: ${h1.status}`);
    helper1Token = h1.body.accessToken;

    const kyc1 = await req('POST', '/api/users/me/instructor-profile', {
      headers: { Authorization: `Bearer ${helper1Token}` },
      body: { headline: 'Distributed Systems & Database Expert', hourly_rate: 450, kyc_docs: ['kyc/h1.pdf'] },
    });
    assert(kyc1.status === 201, `KYC 1 submit failed: ${kyc1.status}`);

    const ap1 = await req('PATCH', `/api/admin/kyc/${kyc1.body.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'approved' },
    });
    assert(ap1.status === 200, `KYC 1 approve failed: ${ap1.status}`);

    // Helper 2
    const h2 = await req('POST', '/auth/register', { body: helper2 });
    assert(h2.status === 201, `Failed helper 2: ${h2.status}`);
    helper2Token = h2.body.accessToken;

    const kyc2 = await req('POST', '/api/users/me/instructor-profile', {
      headers: { Authorization: `Bearer ${helper2Token}` },
      body: { headline: 'Algorithm Design & Optimization Tutor', hourly_rate: 400, kyc_docs: ['kyc/h2.pdf'] },
    });
    assert(kyc2.status === 201, `KYC 2 submit failed: ${kyc2.status}`);

    const ap2 = await req('PATCH', `/api/admin/kyc/${kyc2.body.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'approved' },
    });
    assert(ap2.status === 200, `KYC 2 approve failed: ${ap2.status}`);
  });

  await test('Register unapproved instructor for capability gating', async () => {
    const res = await req('POST', '/auth/register', { body: unapprovedHelper });
    assert(res.status === 201, `Failed unapproved helper: ${res.status}`);
    unapprovedToken = res.body.accessToken;
  });

  // ── 2. Help Request Creation & Constraints ──────────────────────────
  await test('Student creates open help request with budget and deadline (201)', async () => {
    const res = await req('POST', '/api/help-requests', {
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        title: 'Need 1-on-1 assistance debugging PostgreSQL transaction deadlocks',
        description: 'Facing concurrent update collisions in database schema. Need an expert to review locking strategies.',
        subject_area: 'Computer Science',
        budget_max_per_hour: 500,
        estimated_hours: 2,
        deadline: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
      },
    });
    assert(res.status === 201, `Expected 201 Created, got ${res.status}`);
    assert(res.body?.id, 'Missing request ID');
    assert(res.body?.status === 'open', `Expected status 'open', got ${res.body?.status}`);
    requestId = res.body.id;
  });

  await test('Public browse discovers open request in Computer Science category (200)', async () => {
    const res = await req('GET', '/api/help-requests?subject=Computer%20Science');
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    assert(Array.isArray(res.body), 'Expected list of requests');
    const found = res.body.find((r) => r.id === requestId);
    assert(found, 'Created request must appear in public category browse');
  });

  // ── 3. Helper Proposal Bidding & Anti-Tampering Gates ────────────────
  await test('Unapproved instructor cannot submit bid on help request (403)', async () => {
    const res = await req('POST', `/api/help-requests/${requestId}/bids`, {
      headers: { Authorization: `Bearer ${unapprovedToken}` },
      body: {
        quoted_rate: 450,
        estimated_hours: 2,
        message: 'Unapproved bid attempt',
      },
    });
    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
  });

  await test('Student cannot bid on their own help request (400/403)', async () => {
    const res = await req('POST', `/api/help-requests/${requestId}/bids`, {
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        quoted_rate: 300,
        estimated_hours: 2,
        message: 'Self bidding attempt',
      },
    });
    assert([400, 403].includes(res.status), `Expected 400 or 403, got ${res.status}`);
  });

  await test('Helper bid exceeding student maximum budget is rejected (400)', async () => {
    const res = await req('POST', `/api/help-requests/${requestId}/bids`, {
      headers: { Authorization: `Bearer ${helper1Token}` },
      body: {
        quoted_rate: 750, // exceeds max budget 500
        estimated_hours: 2,
        message: 'Exceeding budget rate proposal',
      },
    });
    assert(res.status === 400, `Expected 400 Bad Request, got ${res.status}`);
    assert(res.body?.message?.includes('budget'), 'Expected budget violation message');
  });

  await test('Approved Helper 1 submits valid proposal bid (201)', async () => {
    const res = await req('POST', `/api/help-requests/${requestId}/bids`, {
      headers: { Authorization: `Bearer ${helper1Token}` },
      body: {
        quoted_rate: 450,
        estimated_hours: 2,
        message: 'I have 8+ years resolving distributed database race locks. Can solve today.',
      },
    });
    assert(res.status === 201, `Expected 201 Created, got ${res.status}`);
    assert(res.body?.id, 'Missing bid ID');
    assert(res.body?.status === 'pending', 'Bid status must be pending');
    bid1Id = res.body.id;
  });

  await test('Duplicate bid by same helper on same request is rejected with 409 Conflict', async () => {
    const res = await req('POST', `/api/help-requests/${requestId}/bids`, {
      headers: { Authorization: `Bearer ${helper1Token}` },
      body: {
        quoted_rate: 420,
        estimated_hours: 2,
        message: 'Attempting second bid',
      },
    });
    assert(res.status === 409, `Expected 409 Conflict, got ${res.status}`);
  });

  await test('Approved Helper 2 submits competing proposal bid (201)', async () => {
    const res = await req('POST', `/api/help-requests/${requestId}/bids`, {
      headers: { Authorization: `Bearer ${helper2Token}` },
      body: {
        quoted_rate: 380,
        estimated_hours: 2,
        message: 'Competitive rate and immediate availability with live code review.',
      },
    });
    assert(res.status === 201, `Expected 201 Created, got ${res.status}`);
    assert(res.body?.id, 'Missing bid ID');
    bid2Id = res.body.id;
  });

  // ── 4. Student Inspects Bids & Accepts Winner ────────────────────────
  await test('Student inspects request and sees both competing bids (200)', async () => {
    const res = await req('GET', `/api/help-requests/${requestId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    assert(res.body?.bids?.length === 2, `Expected 2 bids, got ${res.body?.bids?.length}`);
  });

  await test('Student accepts Helper 2 bid -> creates session & rejects competitor (200/201)', async () => {
    const res = await req('PATCH', `/api/help-requests/bids/${bid2Id}/accept`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert([200, 201].includes(res.status), `Expected 200/201, got ${res.status}`);
    assert(res.body?.session?.id, 'Missing session ID in response');
    assert(res.body?.session?.status === 'awaiting_payment', 'Session must be in awaiting_payment status');
    assert(res.body?.checkoutUrl, 'Missing checkoutUrl for upfront escrow hold');
    sessionId = res.body.session.id;
  });

  await test('Accepted request is no longer open and competitor bid is rejected', async () => {
    const res = await req('GET', `/api/help-requests/${requestId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    assert(res.body?.status === 'in_progress', `Request status must be 'in_progress', got ${res.body?.status}`);

    const acceptedBid = res.body.bids.find((b) => b.id === bid2Id);
    assert(acceptedBid?.status === 'accepted', 'Winning bid must be accepted');

    const competingBid = res.body.bids.find((b) => b.id === bid1Id);
    assert(competingBid?.status === 'rejected', 'Losing bid must be marked rejected');
  });

  // ── 5. Helper Meeting Link & Session Progression ─────────────────────
  await test('Unauthorized user cannot set meeting link for the session (403)', async () => {
    const res = await req('PATCH', `/api/help-requests/sessions/${sessionId}/link`, {
      headers: { Authorization: `Bearer ${helper1Token}` }, // Helper 1 did not win
      body: { meetingLink: 'https://meet.google.com/xyz-uvwx-rst' },
    });
    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
  });

  await test('Assigned Helper 2 sets Google Meet link for live session (200)', async () => {
    const res = await req('PATCH', `/api/help-requests/sessions/${sessionId}/link`, {
      headers: { Authorization: `Bearer ${helper2Token}` },
      body: { meetingLink: 'https://meet.google.com/abc-mnop-xyz' },
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    assert(res.body?.meeting_link === 'https://meet.google.com/abc-mnop-xyz', 'Meeting link mismatch');
    assert(res.body?.status === 'in_progress', 'Session status must be in_progress');
  });

  // ── 6. Two-Step Completion & Escrow Payout Gating ────────────────────
  await test('Student cannot prematurely confirm session before helper reports complete (400)', async () => {
    const res = await req('PATCH', `/api/help-requests/sessions/${sessionId}/confirm`, {
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { confirmed: true },
    });
    assert(res.status === 400, `Expected 400 Bad Request, got ${res.status}`);
    assert(res.body?.message?.includes('helper_completed'), 'Must require helper_completed status first');
  });

  await test('Step 1: Helper reports session finished with 2.0 actual hours (200)', async () => {
    const res = await req('PATCH', `/api/help-requests/sessions/${sessionId}/complete`, {
      headers: { Authorization: `Bearer ${helper2Token}` },
      body: { actualHours: 2.0 },
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    assert(res.body?.status === 'helper_completed', `Expected status 'helper_completed', got ${res.body?.status}`);
    assert(Number(res.body?.actual_hours) === 2.0, `Actual hours mismatch: expected 2.0, got ${res.body?.actual_hours}`);
  });

  await test('Step 2: Student confirms satisfactory delivery -> unlocks escrow completion (200)', async () => {
    const res = await req('PATCH', `/api/help-requests/sessions/${sessionId}/confirm`, {
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { confirmed: true },
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    assert(res.body?.status === 'completed', `Expected completed status, got ${res.body?.status}`);
    assert(res.body?.completed_at, 'Missing completion timestamp');
  });

  await test('Help request is marked completed and archived in student history', async () => {
    const res = await req('GET', '/api/help-requests/mine', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    const completedReq = res.body.find((r) => r.id === requestId);
    assert(completedReq, 'Completed request must be in student requests list');
    assert(completedReq.status === 'completed', 'Request status must be completed');
  });

  // ── Summary ─────────────────────────────────────────────────────────
  console.log(`\n${c.bold}Results: ${c.green}${passedCount} Passed${c.reset}, ${failedCount > 0 ? c.red : c.grey}${failedCount} Failed${c.reset}`);
  return failedCount === 0;
}

// Cross-platform direct runner check (Windows + Linux + macOS compatible)
const isDirectRun = process.argv[1] &&
  path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();

if (isDirectRun) {
  runHelpEscrowRegression()
    .then((success) => process.exit(success ? 0 : 1))
    .catch((err) => {
      console.error('Fatal error running help escrow regression:', err);
      process.exit(1);
    });
}
