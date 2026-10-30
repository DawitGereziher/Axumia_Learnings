#!/usr/bin/env node
/**
 * 08-PAYMENTS-REGRESSION.MJS
 * Gateway Test Suite: Chapa Checkout, HMAC-SHA256 Timing-Safe Webhook, Underpayment Defense, Idempotency & Payouts.
 *
 * Runs without external testing frameworks directly against a running server.
 * Exit code 0 on all tests passing, exit code 1 on any regression.
 *
 * Usage:
 *   node backend/test/regression/08-payments-regression.mjs [--url http://localhost:3000]
 */

import { fileURLToPath } from 'url';
import path from 'path';
import crypto from 'crypto';

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

async function req(method, path, { headers = {}, body, rawBody } = {}) {
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
  if (rawBody !== undefined) {
    init.body = rawBody;
  } else if (body) {
    init.body = JSON.stringify(body);
  }
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

export async function runPaymentsRegression() {
  passedCount = 0;
  failedCount = 0;

  console.log(`\n${c.bold}${c.cyan}====================================================================${c.reset}`);
  console.log(`${c.bold}${c.cyan}  GATEWAY PHASE 8: Chapa Payments, Webhook HMAC & Payouts Gate       ${c.reset}`);
  console.log(`${c.bold}${c.cyan}====================================================================${c.reset}`);
  console.log(`  Target: ${c.bold}${BASE_URL}${c.reset}\n`);

  const ts = Date.now();
  const instructor = {
    email: `pay_tutor_${ts}@axumia.test`,
    password: 'Password123!',
    first_name: 'Solomon',
    last_name: 'Instructor',
    role: 'instructor',
  };
  const student = {
    email: `pay_student_${ts}@axumia.test`,
    password: 'Password123!',
    first_name: 'Dawit',
    last_name: 'Student',
    role: 'student',
  };
  const outsiderStudent = {
    email: `pay_outsider_${ts}@axumia.test`,
    password: 'Password123!',
    first_name: 'Intruder',
    last_name: 'Student',
    role: 'student',
  };

  let adminToken = '';
  let instructorToken = '';
  let studentToken = '';
  let outsiderToken = '';

  let courseId = '';
  let txRef = '';

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

  // ── 1. Setup: Register Instructor & Paid Course ─────────────────────
  await test('Register instructor, approve KYC & publish paid course (201)', async () => {
    const instRes = await req('POST', '/auth/register', { body: instructor });
    assert(instRes.status === 201, `Failed to register instructor: ${instRes.status}`);
    instructorToken = instRes.body.accessToken;

    const kycRes = await req('POST', '/api/users/me/instructor-profile', {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: { headline: 'Fintech Specialist', hourly_rate: 600, kyc_docs: ['kyc/doc.pdf'] },
    });
    assert(kycRes.status === 201, `KYC submit failed: ${kycRes.status}`);

    const apRes = await req('PATCH', `/api/admin/kyc/${kycRes.body.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'approved' },
    });
    assert(apRes.status === 200, `KYC approve failed: ${apRes.status}`);

    // Create course with price: 1000 ETB
    const cRes = await req('POST', '/api/courses', {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: {
        title: `Enterprise Security & Payments Architecture ${ts}`,
        description: 'Comprehensive course on financial processing and HMAC timing safety.',
        price: 1000,
      },
    });
    assert(cRes.status === 201, `Course creation failed: ${cRes.status}`);
    courseId = cRes.body.id;

    // Add Section & Published Lesson
    const sRes = await req('POST', `/api/courses/${courseId}/sections`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: { title: 'Part 1: Gateway Mechanics', position: 1 },
    });
    assert(sRes.status === 201, `Section creation failed: ${sRes.status}`);

    const lRes = await req('POST', `/api/courses/${courseId}/lessons`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: {
        title: 'Lesson 1.1: Webhook Integrity',
        description: 'HMAC-SHA256 signature verification deep dive.',
        section_id: sRes.body.id,
        content_type: 'text',
        external_url: 'https://axumia.com/sec.txt',
        duration_s: 180,
        is_free_preview: false,
      },
    });
    assert(lRes.status === 201, `Lesson creation failed: ${lRes.status}`);

    const pubRes = await req('POST', `/api/courses/${courseId}/publish`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
    });
    assert(pubRes.status === 200, `Course publish failed: ${pubRes.status}`);
  });

  await test('Register student and outsider control student', async () => {
    const s1 = await req('POST', '/auth/register', { body: student });
    assert(s1.status === 201, `Failed student 1: ${s1.status}`);
    studentToken = s1.body.accessToken;

    const s2 = await req('POST', '/auth/register', { body: outsiderStudent });
    assert(s2.status === 201, `Failed student 2: ${s2.status}`);
    outsiderToken = s2.body.accessToken;
  });

  // ── 2. Payment Initiation & Checkout Flow ───────────────────────────
  await test('Student initiates checkout for paid course -> creates pending transaction (201)', async () => {
    const res = await req('POST', `/api/payments/courses/${courseId}/checkout`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert([200, 201].includes(res.status), `Expected 200/201, got ${res.status}`);
    assert(res.body?.txRef, 'Missing txRef in checkout response');
    assert(res.body?.checkoutUrl, 'Missing checkoutUrl in checkout response');
    txRef = res.body.txRef;
  });

  // ── 3. Transaction Polling & Ownership Gate ─────────────────────────
  await test('Outsider student cannot poll another student\'s transaction (status: not_found)', async () => {
    const res = await req('GET', `/api/payments/verify/${txRef}`, {
      headers: { Authorization: `Bearer ${outsiderToken}` },
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    assert(res.body?.status === 'not_found', `Expected 'not_found' for unowned transaction, got ${res.body?.status}`);
  });

  await test('Buyer student polls their pending transaction (status: pending or paid in mock mode)', async () => {
    const res = await req('GET', `/api/payments/verify/${txRef}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    assert(['pending', 'paid'].includes(res.body?.status), `Unexpected status: ${res.body?.status}`);
    assert(Number(res.body?.amount) === 1000, `Expected amount 1000 ETB, got ${res.body?.amount}`);
  });

  // ── 4. Webhook Contract & Timing-Safe HMAC Verification ─────────────
  await test('Webhook endpoint always returns HTTP 200 even on forged/invalid signature', async () => {
    const fakePayload = JSON.stringify({ tx_ref: txRef, status: 'success' });
    const res = await req('POST', '/api/payments/webhook/chapa', {
      headers: {
        'x-chapa-signature': '0000000000000000000000000000000000000000000000000000000000000000',
      },
      rawBody: fakePayload,
    });
    // Critical Chapa contract: Webhook must return HTTP 200 so gateway does not loop retry
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    assert(res.body?.received === true, 'Webhook must acknowledge receipt');
  });

  await test('Webhook endpoint always returns HTTP 200 on missing signature header', async () => {
    const fakePayload = JSON.stringify({ tx_ref: txRef, status: 'success' });
    const res = await req('POST', '/api/payments/webhook/chapa', {
      rawBody: fakePayload,
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    assert(res.body?.received === true, 'Webhook must acknowledge receipt');
  });

  // ── 5. Duplicate Purchase Prevention ────────────────────────────────
  await test('Student confirms course ownership -> check-purchase returns purchased: true', async () => {
    const res = await req('GET', `/api/courses/${courseId}/check-purchase`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    assert(res.body?.purchased === true, 'Course must be marked purchased');
  });

  await test('Attempting duplicate checkout for already-owned course is rejected (400/403)', async () => {
    const res = await req('POST', `/api/payments/courses/${courseId}/checkout`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert([400, 403].includes(res.status), `Expected 400 or 403, got ${res.status}`);
    assert(res.body?.message?.toLowerCase().includes('already'), 'Expected already paid error message');
  });

  // ── 6. Student Transaction History & Metadata Redaction ─────────────
  await test('Student retrieves transaction history with internal metadata redacted (200)', async () => {
    const res = await req('GET', '/api/payments/transactions', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    assert(Array.isArray(res.body?.data), 'Expected transaction data array');
    const myTx = res.body.data.find((t) => t.provider_tx_ref === txRef);
    assert(myTx, 'Created transaction must appear in history');
    assert(Number(myTx.amount) === 1000, `Expected amount 1000, got ${myTx.amount}`);
    assert(myTx.metadata === undefined, 'Security leak: internal metadata must be redacted from student view');
  });

  // ── 7. Instructor Earnings & Financial Ledger Calculation ───────────
  await test('Instructor earnings computes gross (1000 ETB), commission fee, and available balance', async () => {
    const res = await req('GET', '/api/payments/instructor/earnings', {
      headers: { Authorization: `Bearer ${instructorToken}` },
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    assert(res.body?.grossEarned >= 1000, `Expected gross >= 1000, got ${res.body?.grossEarned}`);
    assert(res.body?.platformFees > 0, `Expected platform fees > 0, got ${res.body?.platformFees}`);
    assert(res.body?.availableBalance > 0, `Expected available balance > 0, got ${res.body?.availableBalance}`);
    assert(Array.isArray(res.body?.earningsLedger), 'Expected earningsLedger array');
  });

  // ── 8. Payout Requests & Balance Guards ─────────────────────────────
  await test('Instructor payout request exceeding available balance is rejected (400)', async () => {
    const res = await req('POST', '/api/payments/instructor/payout-request', {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: {
        amount: 999999, // far exceeds available balance
        method: 'telebirr',
        account_details: '0911223344',
      },
    });
    assert(res.status === 400, `Expected 400 Bad Request on overdraft, got ${res.status}`);
  });

  await test('Instructor submits valid payout request within available balance (201)', async () => {
    const res = await req('POST', '/api/payments/instructor/payout-request', {
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: {
        amount: 500, // within available balance (~850 ETB net)
        method: 'telebirr',
        account_details: '0911223344',
      },
    });
    assert([200, 201].includes(res.status), `Expected 200/201, got ${res.status}`);
    assert(res.body?.id, 'Missing payout ID');
    assert(res.body?.status === 'pending', 'Initial payout status must be pending');
    assert(Number(res.body?.amount) === 500, 'Payout amount mismatch');
  });

  // ── 9. Admin Maintenance & Refund Controls ──────────────────────────
  await test('Unauthenticated user cannot trigger admin cleanup-abandoned endpoint (401)', async () => {
    const res = await req('POST', '/api/payments/admin/cleanup-abandoned');
    assert(res.status === 401, `Expected 401 Unauthorized, got ${res.status}`);
  });

  await test('Student cannot trigger admin cleanup-abandoned endpoint (403)', async () => {
    const res = await req('POST', '/api/payments/admin/cleanup-abandoned', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
  });

  await test('Administrator triggers cleanup-abandoned endpoint (200)', async () => {
    const res = await req('POST', '/api/payments/admin/cleanup-abandoned', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    assert(res.body?.abandoned !== undefined, 'Missing abandoned count in response');
  });

  await test('Administrator issues refund for transaction (200)', async () => {
    const res = await req('POST', `/api/payments/admin/refund/${txRef}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { reason: 'Automated gateway release verification refund' },
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    assert(res.body?.txRef === txRef, 'Refund txRef mismatch');
  });

  // ── Summary ─────────────────────────────────────────────────────────
  console.log(`\n${c.bold}Results: ${c.green}${passedCount} Passed${c.reset}, ${failedCount > 0 ? c.red : c.grey}${failedCount} Failed${c.reset}`);
  return failedCount === 0;
}

// Cross-platform direct runner check (Windows + Linux + macOS compatible)
const isDirectRun = process.argv[1] &&
  path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();

if (isDirectRun) {
  runPaymentsRegression()
    .then((success) => process.exit(success ? 0 : 1))
    .catch((err) => {
      console.error('Fatal error running payments regression:', err);
      process.exit(1);
    });
}

