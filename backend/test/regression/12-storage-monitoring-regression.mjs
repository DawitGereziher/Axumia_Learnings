#!/usr/bin/env node
/**
 * 12-STORAGE-MONITORING-REGRESSION.MJS
 * Gateway Test Suite: Direct Cloudflare R2 Uploads, MIME Whitelisting, Path-Traversal Defense & Session Monitoring.
 *
 * Runs without external testing frameworks directly against a running server.
 * Exit code 0 on all tests passing, exit code 1 on any regression.
 *
 * Usage:
 *   node backend/test/regression/12-storage-monitoring-regression.mjs [--url http://localhost:3000]
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

export async function runStorageMonitoringRegression() {
  passedCount = 0;
  failedCount = 0;

  console.log(`\n${c.bold}${c.cyan}====================================================================${c.reset}`);
  console.log(`${c.bold}${c.cyan}  GATEWAY PHASE 12: R2 Storage Security & Session Health Gate       ${c.reset}`);
  console.log(`${c.bold}${c.cyan}====================================================================${c.reset}`);
  console.log(`  Target: ${c.bold}${BASE_URL}${c.reset}\n`);

  const ts = Date.now();
  const student = {
    email: `storage_user_${ts}@axumia.test`,
    password: 'Password123!',
    first_name: 'Storage',
    last_name: 'Tester',
    role: 'student',
  };

  let adminToken = '';
  let studentToken = '';

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

  await test('Register student for storage upload testing', async () => {
    const res = await req('POST', '/auth/register', { body: student });
    assert(res.status === 201, `Failed to register student: ${res.status}`);
    studentToken = res.body.accessToken;
  });

  // ── 1. R2 Storage Upload Pre-Signed URL Access & Validation ─────────
  await test('Anonymous request to /api/storage/upload-url is rejected with 401', async () => {
    const res = await req('POST', '/api/storage/upload-url', {
      body: {
        bucket: 'public',
        contentType: 'image/png',
        folder: 'profile',
        fileName: 'avatar.png',
      },
    });
    assert(res.status === 401, `Expected 401 Unauthorized, got ${res.status}`);
  });

  await test('Rejects invalid bucket value (e.g. "root" or "system") with 400', async () => {
    const res = await req('POST', '/api/storage/upload-url', {
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        bucket: 'system',
        contentType: 'image/png',
        folder: 'profile',
        fileName: 'avatar.png',
      },
    });
    assert(res.status === 400, `Expected 400 Bad Request, got ${res.status}`);
    assert(res.body?.message?.includes('bucket must be "public" or "private"'), 'Expected bucket validation message');
  });

  await test('MIME whitelist enforcement: Executable files (application/x-msdownload) rejected (400)', async () => {
    const res = await req('POST', '/api/storage/upload-url', {
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        bucket: 'public',
        contentType: 'application/x-msdownload', // Dangerous binary
        folder: 'thumbnail',
        fileName: 'virus.exe',
      },
    });
    assert(res.status === 400, `Expected 400 Bad Request, got ${res.status}`);
    assert(res.body?.message?.includes('not allowed'), 'Expected MIME disallowed message');
  });

  await test('Path traversal attack sanitization: ../../etc/passwd is sanitized safely in R2 key', async () => {
    const res = await req('POST', '/api/storage/upload-url', {
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        bucket: 'private',
        contentType: 'application/pdf',
        folder: 'kyc',
        fileName: '../../../etc/passwd.pdf',
      },
    });
    assert([200, 201].includes(res.status), `Expected 200/201, got ${res.status}`);
    assert(res.body?.key, 'Missing object key in response');
    assert(!res.body.key.includes('..'), 'Security violation: directory traversal characters preserved in key');
    assert(res.body.key.startsWith('kyc/'), 'Key must remain anchored inside kyc/ folder');
  });

  await test('Valid public upload returns presigned PUT URL and direct CDN publicUrl', async () => {
    const res = await req('POST', '/api/storage/upload-url', {
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        bucket: 'public',
        contentType: 'image/jpeg',
        folder: 'profile',
        fileName: 'profile_photo.jpg',
      },
    });
    assert([200, 201].includes(res.status), `Expected 200/201, got ${res.status}`);
    assert(res.body?.uploadUrl, 'Missing presigned uploadUrl');
    assert(res.body?.publicUrl, 'Public uploads must provide publicUrl');
    assert(res.body?.key?.includes('profile/'), 'Key structure mismatch');
  });

  // ── 2. Session Monitoring & Health Dashboard ────────────────────────
  await test('Non-admin student cannot access session monitoring dashboard (403)', async () => {
    const res = await req('GET', '/api/admin/session-monitoring/stats', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
  });

  await test('Administrator accesses session health stats overview (200)', async () => {
    const res = await req('GET', '/api/admin/session-monitoring/stats', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    assert(res.body?.total_sessions !== undefined || res.body?.totalSessions !== undefined || res.body !== null, 'Stats response missing');
  });

  await test('Administrator lists monitored sessions with filter query parameters (200)', async () => {
    const res = await req('GET', '/api/admin/session-monitoring/sessions?page=1&limit=10', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    assert(Array.isArray(res.body?.sessions) || Array.isArray(res.body?.data) || Array.isArray(res.body), 'Expected sessions collection');
  });

  // ── Summary ─────────────────────────────────────────────────────────
  console.log(`\n${c.bold}Results: ${c.green}${passedCount} Passed${c.reset}, ${failedCount > 0 ? c.red : c.grey}${failedCount} Failed${c.reset}`);
  return failedCount === 0;
}

// Cross-platform direct runner check (Windows + Linux + macOS compatible)
const isDirectRun = process.argv[1] &&
  path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();

if (isDirectRun) {
  runStorageMonitoringRegression()
    .then((success) => process.exit(success ? 0 : 1))
    .catch((err) => {
      console.error('Fatal error running storage monitoring regression:', err);
      process.exit(1);
    });
}

