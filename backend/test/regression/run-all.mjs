#!/usr/bin/env node
/**
 * RUN-ALL.MJS
 * Master Living Regression Test Runner for AXumia Learnings.
 *
 * Runs all Phase test suites sequentially and exits with 0 on total success,
 * or 1 if any regression is detected.
 *
 * Usage:
 *   node backend/test/regression/run-all.mjs [--url http://localhost:3000]
 */

import { runAuthRegression } from './01-auth-regression.mjs';
import { runKycRegression } from './02-kyc-regression.mjs';
import { runCourseRegression } from './03-course-regression.mjs';
import { runBookingRegression } from './04-booking-regression.mjs';
import { runPaymentRegression } from './05-payment-regression.mjs';
import { runLearningRegression } from './06-learning-regression.mjs';

const c = {
  reset:  '\x1b[0m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  bold:   '\x1b[1m',
};

async function main() {
  console.log(`\n${c.bold}${c.cyan}╔══════════════════════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.bold}${c.cyan}║   AXumia Learnings — Master Regression Test Runner          ║${c.reset}`);
  console.log(`${c.bold}${c.cyan}╚══════════════════════════════════════════════════════════════╝${c.reset}`);

  const suites = [
    { name: 'Phase 1: Auth & Role Security', runner: runAuthRegression },
    { name: 'Phase 2: Instructor KYC & Approval Gate', runner: runKycRegression },
    { name: 'Phase 3: Courses, YouTube Streaming & R2 Materials', runner: runCourseRegression },
    { name: 'Phase 4: 1-on-1 Tutoring, Slot Locking & Escrow', runner: runBookingRegression },
    { name: 'Phase 5: Payments, Idempotency & Payout Settlement', runner: runPaymentRegression },
    { name: 'Phase 6: Student Post-Enrollment Learning & Progress', runner: runLearningRegression },
  ];

  let allPassed = true;

  for (const suite of suites) {
    const success = await suite.runner();
    if (!success) {
      allPassed = false;
    }
  }

  console.log(`\n${c.bold}════════════════════════════════════════════════════════════════${c.reset}`);
  if (allPassed) {
    console.log(`  ${c.green}${c.bold}ALL REGRESSION SUITES PASSED. V1 INTEGRITY MAINTAINED.${c.reset}\n`);
    process.exit(0);
  } else {
    console.log(`  ${c.red}${c.bold}REGRESSION DETECTED! Merges/releases must be blocked.${c.reset}\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal runner failure:', err);
  process.exit(1);
});
