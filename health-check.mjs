#!/usr/bin/env node
/**
 * AXumia Learning Platform — API Health Check Script
 * Run:  node health-check.mjs [--url http://localhost:3000] [--token YOUR_JWT]
 *
 * Outputs a colour-coded report of every API endpoint with:
 *  - HTTP status code
 *  - Response time (ms)
 *  - Pass / Fail / Skip (auth required)
 */

import http from 'http';
import https from 'https';
import { performance } from 'perf_hooks';

// ── Config ───────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};

const BASE_URL = getArg('--url') || 'http://localhost:3000';
const TOKEN    = getArg('--token') || null;
const VERBOSE  = args.includes('--verbose');

// ── Colours ──────────────────────────────────────────────────────────────────
const c = {
  reset:  '\x1b[0m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  grey:   '\x1b[90m',
  bold:   '\x1b[1m',
  white:  '\x1b[97m',
  blue:   '\x1b[34m',
  magenta:'\x1b[35m',
};

// ── Routes to Test ───────────────────────────────────────────────────────────
// auth: false  → no token needed
// auth: true   → requires Bearer token
// auth: 'skip' → skip (writes/deletes that would mutate data)
// expect: [array of acceptable status codes]
const ROUTES = [
  // ── Health & Root ──────────────────────────────────────────────────
  { group:'Health',    method:'GET',   path:'/health',                  auth:false, expect:[200] },
  { group:'Health',    method:'GET',   path:'/',                        auth:false, expect:[200,404] },

  // ── Auth ───────────────────────────────────────────────────────────
  { group:'Auth',      method:'POST',  path:'/auth/login',              auth:false, expect:[200,400,401,422], body:{email:'bad@test.com',password:'wrongpass'} },
  { group:'Auth',      method:'POST',  path:'/auth/register',           auth:false, expect:[200,201,400,409,422], body:{email:`test${Date.now()}@axumia.test`,password:'Test@12345',first_name:'Test',last_name:'User',role:'student'} },

  // ── Users ──────────────────────────────────────────────────────────
  { group:'Users',     method:'GET',   path:'/api/users/me',            auth:true,  expect:[200,401] },
  { group:'Users',     method:'GET',   path:'/api/users/me/purchases',  auth:true,  expect:[200,401] },
  { group:'Users',     method:'GET',   path:'/api/users/instructors',   auth:false, expect:[200] },

  // ── Courses ────────────────────────────────────────────────────────
  { group:'Courses',   method:'GET',   path:'/api/courses',             auth:false, expect:[200] },
  { group:'Courses',   method:'GET',   path:'/api/courses/categories',  auth:false, expect:[200] },
  { group:'Courses',   method:'GET',   path:'/api/courses/instructor/mine', auth:true, expect:[200,401,403] },
  { group:'Courses',   method:'GET',   path:'/api/courses/wishlist/mine',   auth:true, expect:[200,401] },

  // ── Bookings ───────────────────────────────────────────────────────
  { group:'Bookings',  method:'GET',   path:'/api/bookings/mine',       auth:true,  expect:[200,401] },
  { group:'Bookings',  method:'GET',   path:'/api/bookings/instructor/mine', auth:true, expect:[200,401,403] },

  // ── Payments ───────────────────────────────────────────────────────
  { group:'Payments',  method:'GET',   path:'/api/payments/transactions', auth:true, expect:[200,401] },
  { group:'Payments',  method:'GET',   path:'/api/payments/instructor/earnings', auth:true, expect:[200,401,403] },

  // ── Help Requests ──────────────────────────────────────────────────
  { group:'HelpReqs',  method:'GET',   path:'/api/help-requests',       auth:true,  expect:[200,401] },

  // ── Reviews ────────────────────────────────────────────────────────
  { group:'Reviews',   method:'GET',   path:'/api/reviews/course/non-existent-id', auth:true, expect:[200,400,401,404] },

  // ── Certificates ───────────────────────────────────────────────────
  { group:'Certs',     method:'GET',   path:'/api/certificates/verify/TEST-CERT-0000', auth:false, expect:[200,400,404] },

  // ── Admin (protected — expect 401/403 without admin token) ─────────
  { group:'Admin',     method:'GET',   path:'/api/admin/stats',         auth:true,  expect:[200,401,403] },
  { group:'Admin',     method:'GET',   path:'/api/admin/users',         auth:true,  expect:[200,401,403] },
  { group:'Admin',     method:'GET',   path:'/api/admin/courses',       auth:true,  expect:[200,401,403] },
  { group:'Admin',     method:'GET',   path:'/api/admin/kyc/pending',   auth:true,  expect:[200,401,403] },
  { group:'Admin',     method:'GET',   path:'/api/admin/payouts/all',   auth:true,  expect:[200,401,403] },
  { group:'Admin',     method:'GET',   path:'/api/admin/transactions',  auth:true,  expect:[200,401,403] },

  // ── Swagger Docs ───────────────────────────────────────────────────
  { group:'Swagger',   method:'GET',   path:'/api/docs',                auth:false, expect:[200,301,302] },
  { group:'Swagger',   method:'GET',   path:'/api/docs-json',           auth:false, expect:[200,301,302,404] },
];

// ── HTTP Fetch (no dependencies) ─────────────────────────────────────────────
function request(method, url, { headers = {}, body } = {}) {
  return new Promise((resolve) => {
    const parsed   = new URL(url);
    const lib      = parsed.protocol === 'https:' ? https : http;
    const bodyStr  = body ? JSON.stringify(body) : undefined;
    const reqHeaders = {
      'Content-Type': 'application/json',
      'Accept':       'application/json',
      ...headers,
    };
    if (bodyStr) reqHeaders['Content-Length'] = Buffer.byteLength(bodyStr);

    const req = lib.request(
      { hostname: parsed.hostname, port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80), path: parsed.pathname + parsed.search, method, headers: reqHeaders },
      (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body: data.slice(0, 200) }));
      }
    );
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ── Runner ───────────────────────────────────────────────────────────────────
async function run() {
  console.log(`\n${c.bold}${c.cyan}╔══════════════════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.bold}${c.cyan}║   AXumia Learning Platform — API Health Check            ║${c.reset}`);
  console.log(`${c.bold}${c.cyan}╚══════════════════════════════════════════════════════════╝${c.reset}`);
  console.log(`${c.grey}  Base URL : ${BASE_URL}`);
  console.log(`  Token    : ${TOKEN ? '✓ provided' : '✗ not provided (auth-required routes will be unauthenticated)'}`);
  console.log(`  Routes   : ${ROUTES.length} endpoints to test\n${c.reset}`);

  const results = [];
  let currentGroup = '';

  for (const route of ROUTES) {
    if (route.auth === 'skip') {
      results.push({ ...route, skipped: true });
      continue;
    }

    const needsToken = route.auth === true;
    const headers = {};
    if (needsToken && TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;

    const url = `${BASE_URL}${route.path}`;
    const t0  = performance.now();
    const res = await request(route.method, url, { headers, body: route.body });
    const ms  = Math.round(performance.now() - t0);

    const passed   = res.error ? false : route.expect.includes(res.status);
    const timedOut = res.error?.includes('ECONNREFUSED') || res.error?.includes('ETIMEDOUT');

    results.push({ ...route, status: res.status, ms, passed, error: res.error, timedOut });

    // Print group header
    if (route.group !== currentGroup) {
      currentGroup = route.group;
      console.log(`\n${c.bold}${c.blue}── ${route.group.padEnd(20)}──────────────────────────────────────${c.reset}`);
    }

    const statusColor = passed ? c.green : (timedOut ? c.red : c.yellow);
    const icon  = res.error ? (timedOut ? '💥' : '⚠️') : passed ? '✅' : '❌';
    const badge = res.error ? (timedOut ? 'DOWN' : 'ERR ') : String(res.status).padStart(3);
    const msStr = `${ms}ms`.padStart(7);
    const needsAuth = needsToken && !TOKEN ? `${c.grey}[no token]${c.reset}` : '';

    console.log(
      `  ${icon}  ${statusColor}${badge}${c.reset}  ${msStr}  ${c.white}${route.method.padEnd(6)}${c.reset} ${c.grey}${route.path}${c.reset} ${needsAuth}`
    );

    if (VERBOSE && res.body) {
      console.log(`${c.grey}         ${res.body.replace(/\n/g,' ').slice(0,120)}${c.reset}`);
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────
  const passed   = results.filter(r => r.passed).length;
  const failed   = results.filter(r => !r.passed && !r.skipped && !r.timedOut).length;
  const down     = results.filter(r => r.timedOut).length;
  const skipped  = results.filter(r => r.skipped).length;
  const total    = results.filter(r => !r.skipped).length;
  const avgMs    = Math.round(results.filter(r => r.ms).reduce((a, b) => a + b.ms, 0) / results.filter(r => r.ms).length);
  const slowest  = results.filter(r => r.ms).sort((a, b) => b.ms - a.ms).slice(0, 3);

  console.log(`\n${c.bold}${c.cyan}╔══════════════════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.bold}${c.cyan}║   SUMMARY                                                ║${c.reset}`);
  console.log(`${c.bold}${c.cyan}╚══════════════════════════════════════════════════════════╝${c.reset}`);
  console.log(`  ${c.green}✅ Passed:   ${passed}/${total}${c.reset}`);
  console.log(`  ${c.yellow}❌ Unexpected: ${failed}${c.reset}`);
  console.log(`  ${c.red}💥 Unreachable: ${down}${c.reset}`);
  console.log(`  ${c.grey}⏭  Skipped:  ${skipped}${c.reset}`);
  console.log(`  ${c.cyan}⚡ Avg response: ${avgMs}ms${c.reset}`);

  if (slowest.length) {
    console.log(`\n  ${c.yellow}Slowest routes:${c.reset}`);
    slowest.forEach(r => console.log(`    ${r.ms}ms  ${r.method} ${r.path}`));
  }

  const unhealthy = results.filter(r => !r.passed && !r.skipped);
  if (unhealthy.length) {
    console.log(`\n  ${c.red}${c.bold}Failed / Unexpected:${c.reset}`);
    unhealthy.forEach(r => {
      console.log(`    ${r.error ? '💥' : '❌'}  ${r.method} ${r.path}  → got ${r.status ?? 'ERROR'}, expected [${r.expect?.join(',')}]${r.error ? '  ERR:'+r.error : ''}`);
    });
  }

  const score = Math.round((passed / total) * 100);
  const scoreColor = score >= 90 ? c.green : score >= 70 ? c.yellow : c.red;
  console.log(`\n  ${scoreColor}${c.bold}Health Score: ${score}%${c.reset}\n`);

  if (down > 0) {
    console.log(`  ${c.red}⚠  Backend appears to be unreachable. Make sure it is running: npm run start:dev${c.reset}\n`);
  }
}

run().catch(err => {
  console.error('\x1b[31mFatal error:\x1b[0m', err.message);
  process.exit(1);
});
