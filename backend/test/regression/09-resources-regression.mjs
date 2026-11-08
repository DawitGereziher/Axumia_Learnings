#!/usr/bin/env node
/**
 * 09-RESOURCES-REGRESSION.MJS
 * Gateway Test Suite: Public Resources Discovery, Role-Gated Admin Authoring & Download Tracking.
 *
 * Runs without external testing frameworks directly against a running server.
 * Exit code 0 on all tests passing, exit code 1 on any regression.
 *
 * Usage:
 *   node backend/test/regression/09-resources-regression.mjs [--url http://localhost:3000]
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

async function req(method, path, { headers = {}, body, redirect = 'manual' } = {}) {
  const url = `${BASE_URL}${path}`;
  const init = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-internal-test-key': TEST_BYPASS_KEY,
      ...headers,
    },
    redirect,
  };
  if (body) init.body = JSON.stringify(body);
  const res = await fetch(url, init);
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, ok: res.ok, body: json, headers: res.headers };
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

export async function runResourcesRegression() {
  passedCount = 0;
  failedCount = 0;

  console.log(`\n${c.bold}${c.cyan}====================================================================${c.reset}`);
  console.log(`${c.bold}${c.cyan}  GATEWAY PHASE 9: Shared Resources, RBAC Authoring & Downloads Gate ${c.reset}`);
  console.log(`${c.bold}${c.cyan}====================================================================${c.reset}`);
  console.log(`  Target: ${c.bold}${BASE_URL}${c.reset}\n`);

  const ts = Date.now();
  const student = {
    email: `res_student_${ts}@axumia.test`,
    password: 'Password123!',
    first_name: 'Sara',
    last_name: 'Student',
    role: 'student',
  };

  let adminToken = '';
  let studentToken = '';
  let resourceId = '';

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

  // ── 1. Setup: Register Student ──────────────────────────────────────
  await test('Register student user for download access testing', async () => {
    const res = await req('POST', '/auth/register', { body: student });
    assert(res.status === 201, `Failed to register student: ${res.status}`);
    studentToken = res.body.accessToken;
  });

  // ── 2. RBAC Authoring Gates ─────────────────────────────────────────
  await test('Anonymous unauthenticated user cannot publish resources (401)', async () => {
    const res = await req('POST', '/api/resources', {
      body: {
        title: 'Unauthorized Document',
        category: 'general',
        file_url: 'https://r2.cdn.axumia.com/pdf/unauth.pdf',
      },
    });
    assert(res.status === 401, `Expected 401 Unauthorized, got ${res.status}`);
  });

  await test('Student user is forbidden from publishing resources (403)', async () => {
    const res = await req('POST', '/api/resources', {
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        title: 'Student Upload Attempt',
        category: 'general',
        file_url: 'https://r2.cdn.axumia.com/pdf/student.pdf',
      },
    });
    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
  });

  await test('Administrator publishes official learning resource (201)', async () => {
    const res = await req('POST', '/api/resources', {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        title: `Ethiopian Heritage & Modern Computing Workbook ${ts}`,
        description: 'Bilingual engineering guide with practical exercises in Amharic and English.',
        category: 'engineering',
        language: 'am',
        file_url: 'https://r2.cdn.axumia.com/resources/heritage_computing.pdf',
        file_size: 4500000,
        file_type: 'pdf',
      },
    });
    assert(res.status === 201, `Expected 201 Created, got ${res.status}`);
    assert(res.body?.id, 'Missing resource ID');
    assert(res.body?.title.includes('Ethiopian Heritage'), 'Title mismatch');
    resourceId = res.body.id;
  });

  // ── 3. Public Search & Category Discovery ───────────────────────────
  await test('Public unauthenticated search locates resource by title keyword (200)', async () => {
    const res = await req('GET', `/api/resources?search=${encodeURIComponent('Ethiopian Heritage')}`);
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    assert(Array.isArray(res.body?.data), 'Expected resources array');
    const found = res.body.data.find((r) => r.id === resourceId);
    assert(found, 'Created resource must appear in public search results');
    assert(found.category === 'engineering', 'Category mismatch');
  });

  await test('Filter resources by language (language=am) returns target resource', async () => {
    const res = await req('GET', '/api/resources?language=am');
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    const found = res.body.data.find((r) => r.id === resourceId);
    assert(found, 'Resource must be returned under language filter');
  });

  // ── 4. Authenticated Download & Metric Tracking ──────────────────────
  await test('Unauthenticated download request is blocked with 401', async () => {
    const res = await req('GET', `/api/resources/${resourceId}/download`);
    assert(res.status === 401, `Expected 401 Unauthorized, got ${res.status}`);
  });

  await test('Authenticated student downloads resource -> redirects to file_url (302/200)', async () => {
    const res = await req('GET', `/api/resources/${resourceId}/download`, {
      headers: { Authorization: `Bearer ${studentToken}` },
      redirect: 'manual',
    });
    // Controller redirects to file_url (302) or returns 200 with recorded message
    assert([200, 302].includes(res.status), `Expected 200 or 302, got ${res.status}`);
    if (res.status === 302) {
      assert(res.headers.get('location')?.includes('heritage_computing.pdf'), 'Redirect URL mismatch');
    }
  });

  await test('Download counter increments on successive downloads', async () => {
    // 2nd download
    await req('GET', `/api/resources/${resourceId}/download`, {
      headers: { Authorization: `Bearer ${studentToken}` },
      redirect: 'manual',
    });

    // Inspect resource count via public search
    const searchRes = await req('GET', `/api/resources?search=${encodeURIComponent('Heritage')}`);
    assert(searchRes.status === 200, `Expected 200 OK, got ${searchRes.status}`);
    const found = searchRes.body.data.find((r) => r.id === resourceId);
    assert(found, 'Resource not found in search');
    assert(found.downloads >= 2, `Expected downloads >= 2, got ${found.downloads}`);
  });

  // ── 5. Admin Soft Delete & Deactivation ─────────────────────────────
  await test('Student cannot delete resource entry (403)', async () => {
    const res = await req('DELETE', `/api/resources/${resourceId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
  });

  await test('Administrator soft-deletes resource entry (200)', async () => {
    const res = await req('DELETE', `/api/resources/${resourceId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
  });

  await test('Soft-deleted resource is excluded from public search results', async () => {
    const res = await req('GET', `/api/resources?search=${encodeURIComponent('Heritage')}`);
    assert(res.status === 200, `Expected 200 OK, got ${res.status}`);
    const found = res.body?.data?.find((r) => r.id === resourceId);
    assert(!found, 'Soft-deleted resource must not appear in public active listings');
  });

  // ── Summary ─────────────────────────────────────────────────────────
  console.log(`\n${c.bold}Results: ${c.green}${passedCount} Passed${c.reset}, ${failedCount > 0 ? c.red : c.grey}${failedCount} Failed${c.reset}`);
  return failedCount === 0;
}

// Cross-platform direct runner check (Windows + Linux + macOS compatible)
const isDirectRun = process.argv[1] &&
  path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();

if (isDirectRun) {
  runResourcesRegression()
    .then((success) => process.exit(success ? 0 : 1))
    .catch((err) => {
      console.error('Fatal error running resources regression:', err);
      process.exit(1);
    });
}

