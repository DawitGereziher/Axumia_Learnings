# 🎓 Axumia Learnings (Ethio Learn)

> **Next-Generation Two-Sided EdTech & Live Tutoring Ecosystem for Ethiopia and Emerging Markets**  
> *Empowering learners with low-bandwidth-optimized video courses, 1-on-1 verified mentorship, escrow-protected peer tutoring, and native Ethiopian payment rails.*

---

[![Platform Status](https://img.shields.io/badge/Platform_Status-Production_Ready-brightgreen.svg)](#-release-gateway--regression-test-suite)
[![Release Gateway](https://img.shields.io/badge/Gateway_Tests-194%2F194_Passed-success.svg)](backend/test/regression/run-all.mjs)
[![Backend](https://img.shields.io/badge/Backend-NestJS_11-E0234E?logo=nestjs&logoColor=white)](backend/)
[![Web](https://img.shields.io/badge/Web-Next.js_15_App_Router-black?logo=next.js&logoColor=white)](web/)
[![Mobile](https://img.shields.io/badge/Mobile-Flutter_3.12-02569B?logo=flutter&logoColor=white)](mobile/)
[![Auth Engine](https://img.shields.io/badge/Auth-D--Auth_SSO-blueviolet)](D-auth/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL_15_+_Prisma-336791?logo=postgresql&logoColor=white)](backend/prisma/)
[![Cache & Queue](https://img.shields.io/badge/Cache-Redis_7_+_BullMQ-DC382D?logo=redis&logoColor=white)](backend/src/queue/)
[![Payments](https://img.shields.io/badge/Payments-Chapa_API_ETB-008080)](backend/src/payments/)
[![Storage](https://img.shields.io/badge/Storage-Cloudflare_R2_%2F_S3-F38020?logo=cloudflare&logoColor=white)](backend/src/storage/)
[![Orchestration](https://img.shields.io/badge/Containers-Docker_%2B_Kubernetes-326CE5?logo=kubernetes&logoColor=white)](k8s/)

---

## 📑 Table of Contents

1. [Executive Overview](#-executive-overview)
2. [Key Product Pillars](#-key-product-pillars)
3. [System Architecture](#-system-architecture)
4. [Platform Core Flows](#-platform-core-flows)
   - [A. Asynchronous Course Purchase & Video Access Flow](#a-asynchronous-course-purchase--video-access-flow)
   - [B. Synchronous 1-on-1 Tutoring & Escrow Release Flow](#b-synchronous-1-on-1-tutoring--escrow-release-flow)
   - [C. Peer-to-Peer Help Request & Bidding Flow](#c-peer-to-peer-help-request--bidding-flow)
   - [D. Gamification, Quizzes & Verified Certificates](#d-gamification-quizzes--verified-certificates)
5. [Security, Anti-Tamper & Zero-Leakage Architecture](#-security-anti-tamper--zero-leakage-architecture)
6. [Monorepo Codebase Layout](#-monorepo-codebase-layout)
7. [Release Gateway & Regression Test Suite](#-release-gateway--regression-test-suite)
8. [Local Development & Quickstart](#-local-development--quickstart)
   - [Using Docker Compose (Recommended)](#1-docker-compose-all-in-one-recommended)
   - [Running the Flutter Mobile Application](#2-running-the-flutter-mobile-app)
   - [Bare-Metal Local Setup](#3-bare-metal-manual-setup)
9. [Environment Variables Reference](#-environment-variables-reference)
10. [Kubernetes Production Deployment](#-kubernetes-production-deployment)
11. [License & Acknowledgments](#-license--acknowledgments)

---

## 🌟 Executive Overview

**Axumia Learnings** is an enterprise-grade, localized EdTech marketplace engineered to solve educational access, technical bottlenecks, and trust barriers in Ethiopia and across East Africa.

Historically, learners and educators face four critical friction points:
1. **Financial Inclusion:** International payment rails (Stripe/PayPal) are inaccessible in Ethiopia; platforms must natively support local mobile money rails (**Telebirr**, **CBE Birr**, **Awash Birr**, **HelloCash**, and local bank debit cards).
2. **Bandwidth Limitations:** High data costs and intermittent connections require adaptive bitrate HLS transcoding, aggressive asset optimization, and client-side caching.
3. **Trust & Marketplace Integrity:** Two-sided marketplaces fail without strict instructor identity verification (KYC), escrow-backed tutoring sessions, and authentic review gating.
4. **Content Security & IP Protection:** Unprotected video streams lead to immediate pirating; courses require short-lived, cryptographically signed video tokens and obfuscated playback endpoints.

Axumia Learnings unites **asynchronous on-demand learning** and **synchronous live 1-on-1 mentorship** into a unified, high-performance ecosystem with end-to-end escrow protection.

---

## 🎯 Key Product Pillars

| Pillar | Capability & Description | Local Optimization |
|---|---|---|
| **Asynchronous Courses** | Multi-tier curriculum authoring (Sections, Lessons, Quizzes, Supplemental PDFs), free preview lessons, video progress heartbeat tracking. | Adaptive HLS streams, Cloudflare R2 signed token delivery, zero-leakage media protection. |
| **1-on-1 Live Tutoring** | Instructor availability calendar, timezone-safe booking slots, atomic concurrency locks preventing double bookings, automated Zoom/Google Meet link exchange. | Escrow-backed booking; fees held until session completion or disputed in no-show events. |
| **P2P Help Requests** | Students post specific homework or project challenges with reward budgets; verified tutors submit bids; funds held in escrow until mutual resolution. | Micro-escrow mechanics with automated dispute windows and instant ledger settlement. |
| **Assessment & Certification** | Timed anti-cheat quiz engine with client-side answer scrubbing, pass threshold gating, and tamper-proof SVG/PDF certificate generation. | Globally verifiable certificate URLs with unique cryptographic lookup hashes. |
| **Gamification Engine** | Experience points (XP), streak tracking, multi-tier badges (*First Step*, *Perfect Score*, *Knowledge Seeker*), dynamic level progression, public leaderboards. | Anti-tamper server verification: XP cannot be claimed for uncompleted lessons or fabricated streak bonuses. |
| **Community Resources** | Free and premium study guides, past exams, and cheat sheets with strict MIME-type whitelisting and rate-limited CDN downloads. | Strict path traversal defenses and executable binary filtering (`.exe`, `.msi` blocked). |

---

## 🏗 System Architecture

Axumia Learnings adopts a **hardened modular monolith** pattern fronted by an Nginx reverse proxy gateway, decoupled micro-authentication engine, and distributed storage/caching subsystems:

```mermaid
graph TD
    subgraph Client Layer
        Web[Next.js 15 Web App<br/>SSR + React 19 + Tailwind]
        Mobile[Flutter Cross-Platform App<br/>iOS + Android + Web]
    end

    subgraph Entry & Routing Layer
        Nginx[Nginx Reverse Proxy & Gateway<br/>Port 80 / 443]
    end

    subgraph Authentication Engine
        DAuth[D-Auth Micro-Engine<br/>OAuth + JWT + Session Revocation]
    end

    subgraph Application Core [NestJS 11 Modular Monolith]
        UsersMod[Users & KYC Module]
        CoursesMod[Courses & Curriculum Module]
        BookingsMod[1-on-1 Tutoring Module]
        HelpMod[Help Requests & Escrow Module]
        QuizMod[Anti-Cheat Quiz Module]
        GamifyMod[Gamification & XP Module]
        PaymentsMod[Payments & Ledger Module]
        CertMod[Certificates Module]
        StorageMod[Storage & R2 Upload Gate]
        MonitoringMod[Session Health & Admin Surveillance]
    end

    subgraph Persistence & Infrastructure
        Postgres[(PostgreSQL 15<br/>Relational Ledger & DB)]
        Redis[(Redis 7<br/>Cache, Rate Limiting & BullMQ)]
        R2[Cloudflare R2 / AWS S3<br/>Encrypted Media & PDFs]
        Chapa[Chapa Payment Gateway<br/>Telebirr / CBE Birr / Cards]
    end

    Web -->|HTTP / HTTPS| Nginx
    Mobile -->|REST API Requests| Nginx

    Nginx -->|/auth/*| DAuth
    Nginx -->|/api/*| ApplicationCore
    Nginx -->|/health| ApplicationCore
    Nginx -->|/* Frontend Pages| Web

    DAuth -->|Direct User Auth| Postgres
    DAuth -->|Token Invalidation| Redis

    ApplicationCore -->|Prisma ORM| Postgres
    ApplicationCore -->|Distributed Caching & Queues| Redis
    ApplicationCore -->|Presigned Direct Uploads / CDN| R2
    ApplicationCore -->|Checkout & Webhooks| Chapa
```

### Architectural Highlights

1. **Decoupled Identity (`D-Auth`)**: Isolated SSO and token lifecycle management mounted seamlessly into the NestJS pipeline at `/auth`. Handles RSA/HMAC-signed access tokens, rotating sliding refresh tokens, and real-time Redis token blacklisting.
2. **Transactional Financial Ledger**: All monetary movements (course purchases, booking deposits, escrow commitments, refunds, platform commissions, and instructor payout requests) are recorded in an append-only transaction ledger in PostgreSQL.
3. **Atomic Slot Concurrency Locking**: 1-on-1 tutoring slots utilize PostgreSQL transaction locks and status checks to completely eliminate double-booking race conditions during simultaneous student checkouts.
4. **Stateless Scale & Worker Queues**: Heavy jobs (HLS video transcoding, transactional email receipts, SMS push notifications via AfroMessage/Geez SMS) are offloaded to Redis-backed **BullMQ** job workers.

---

## 🔄 Platform Core Flows

### A. Asynchronous Course Purchase & Video Access Flow

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant Web as Web / Mobile Client
    participant API as NestJS Payments API
    participant Chapa as Chapa Gateway (Telebirr/CBE)
    participant Ledger as Postgres Ledger
    participant Media as Content Security Service

    Student->>Web: Selects Course & Clicks Enroll
    Web->>API: POST /api/payments/initialize (courseId)
    API->>Chapa: Initialize Transaction (Amount, Email, ReturnURL)
    Chapa-->>API: Return Checkout URL & Ref ID
    API-->>Web: Redirect Student to Chapa Checkout
    Student->>Chapa: Authorizes Telebirr / CBE Birr PIN
    Chapa-->>API: POST /api/payments/webhook (HMAC SHA-256 Signed)
    API->>API: Verify X-Chapa-Signature against Secret
    API->>Ledger: Atomic Transaction (Mark Paid, Credit Instructor, Deduct Commission)
    API->>Ledger: Create Course Enrollment Record
    API-->>Chapa: 200 OK Response
    Student->>Web: Navigates to Course Player
    Web->>API: GET /api/courses/:id/lessons/:lessonId/video
    API->>Media: Check Enrollment Status
    Media-->>Web: Return Short-Lived Signed Video URL (1-Hour TTL)
```

---

### B. Synchronous 1-on-1 Tutoring & Escrow Release Flow

```mermaid
sequenceDiagram
    autonumber
    actor Student
    actor Tutor
    participant API as Bookings & Escrow API
    participant DB as Postgres Database
    participant Reminder as BullMQ Scheduler

    Tutor->>API: Opens Availability Slots (e.g. 14:00 - 15:00 UTC)
    Student->>API: POST /api/bookings (slotId, instructorId)
    API->>DB: Acquire Slot with Status = PENDING_PAYMENT
    Student->>API: Completes Escrow Payment
    API->>DB: Status -> CONFIRMED; Funds Held in Escrow
    API->>Tutor: Notify Booking Created
    Tutor->>API: PATCH /api/bookings/:id (Input Zoom/Google Meet Link)
    API->>Reminder: Schedule Reminders (24h & 1h Before Session)
    Note over Student,Tutor: Live Off-Platform Mentorship Session Takes Place
    API->>API: Cron Check: Scheduled Time + Duration Elapsed
    API->>Student: Prompt: "Did your session complete successfully?"
    Student->>API: POST /api/bookings/:id/confirm-completion
    API->>DB: Status -> COMPLETED; Release Escrow Funds to Tutor Balance
    API->>Student: Prompt Verified Review (1 to 5 Stars)
```

---

### C. Peer-to-Peer Help Request & Bidding Flow

```mermaid
sequenceDiagram
    autonumber
    actor Student
    actor Tutor as Verified Tutor
    participant Help as Help Requests Module
    participant Escrow as Escrow Engine

    Student->>Help: POST /api/help-requests (Title, Subject, Bounty: 350 ETB)
    Help->>Help: Publish to Live Marketplace Board
    Tutor->>Help: POST /api/help-requests/:id/bids (Offer: 300 ETB, Proposal)
    Student->>Help: Accepts Tutor's Bid
    Student->>Escrow: Deposit Bounty into Help Escrow Account
    Escrow->>Help: Lock Bounty; Set Status = IN_PROGRESS
    Tutor->>Student: Delivers Solution / Tutoring Guidance
    Student->>Help: POST /api/help-requests/:id/resolve
    Help->>Escrow: Release 300 ETB to Tutor (Minus 10% Platform Fee)
    Help-->>Student: Issue Completion Badge & Gamification XP
```

---

### D. Gamification, Quizzes & Verified Certificates

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant Quiz as Anti-Cheat Quiz API
    participant Gamify as Gamification Engine
    participant Cert as Certificate Service

    Student->>Quiz: GET /api/courses/:id/quizzes/:quizId
    Quiz-->>Student: Return Questions (Correct Answers Stripped from Payload)
    Student->>Quiz: POST /api/courses/:id/quizzes/:quizId/submit (Answers)
    Quiz->>Quiz: Score Submission (Verify against Pass Threshold, e.g. 80%)
    alt Passed with 100% Score
        Quiz->>Gamify: POST /api/gamification/award (reason: quiz_perfect, 100 XP)
        Gamify-->>Student: Award 100 XP + "Perfect Score" Badge
    else Standard Passing Score
        Quiz->>Gamify: Award Standard Completion XP (50 XP)
    end
    Quiz->>Cert: Check 100% Course Curriculum Completion
    Cert->>Cert: Generate Immutable Verification Hash
    Cert-->>Student: Return Downloadable Certificate + Public Verification URL
```

---

## 🛡 Security, Anti-Tamper & Zero-Leakage Architecture

Axumia Learnings adheres to an uncompromising, multi-tier zero-trust security model:

### 1. Zero-Leakage Media Protection
* Course videos and proprietary PDF files are **never exposed via public URLs**.
* The server issues dynamic, short-lived (1-hour TTL) HMAC-signed URLs generated strictly after confirming active database enrollment.
* Embedded players utilize tokenized playback sessions with strict `Referer` and `Origin` validation.

### 2. Anti-Tamper Gamification Validation
* Client applications cannot arbitrarily claim XP or fabricate achievements.
* `POST /api/gamification/award` enforces strict server-side validation rules:
  - Lessons must be marked `100% completed` with logged video heartbeat records before XP is awarded.
  - Quizzes must have an authentic passing score saved in the database.
  - Streak bonuses and internal badges cannot be spoofed by client payloads.
  - Duplicate XP claims for the same entity are rejected atomically.

### 3. Cloudflare R2 Upload Hardening & Path Traversal Defense
* Direct client-to-storage presigned upload URLs strictly enforce a **MIME Whitelist** (JPEG, PNG, WebP, PDF, MP4, WebM).
* Dangerous executables (`application/x-msdownload`, `.exe`, `.bat`, `.sh`, `.msi`) return `400 Bad Request`.
* Filenames undergo comprehensive sanitization: any path traversal sequences (`../../etc/passwd`) have `..` stripped to anchor all uploads strictly within their tenant directory.

### 4. Financial Idempotency & Webhook Verification
* Chapa payment webhooks require valid `x-chapa-signature` verification calculated using SHA-256 against the raw request body.
* Webhook event IDs are tracked in an idempotency table to defend against network replay attacks.
* Tutor payout requests enforce atomic checks against available balances, preventing overdraft or double-spend conditions.

### 5. Role-Based Access Control (RBAC)
* Fine-grained role hierarchy: `student`, `instructor`, and `admin`.
* Instructors cannot publish paid courses or open booking slots until passing administrative **KYC Document Verification**.
* Administrative queues (`/api/admin/*`) are fortified against privilege escalation; non-admin tokens are met with immediate `403 Forbidden` responses.

---

## 📂 Monorepo Codebase Layout

```
Axumia_Learnings/
├── backend/                         # NestJS 11 Modular Monolith
│   ├── src/
│   │   ├── admin/                   # KYC queues, platform metrics, user moderation
│   │   ├── bookings/                # 1-on-1 tutoring, slot locking, meeting links
│   │   ├── certificates/            # SVG/PDF generator & cryptographic verification
│   │   ├── common/                  # Guards (JwtAuth, Roles), interceptors, decorators
│   │   ├── content/                 # Anti-piracy signed streaming & video gating
│   │   ├── courses/                 # Curriculum CRUD, sections, lessons, enrollment
│   │   ├── gamification/            # XP, streaks, badges, leaderboard engine
│   │   ├── health/                  # K8s liveness & readiness health probes
│   │   ├── help-requests/           # Peer-to-peer help marketplace & escrow
│   │   ├── notifications/           # In-app, Nodemailer SMTP & local SMS triggers
│   │   ├── payments/                # Chapa integration, webhook HMAC, payout ledger
│   │   ├── prisma/                  # Prisma schema, migrations & seed data
│   │   ├── queue/                   # Redis BullMQ worker configurations
│   │   ├── quiz/                    # Anti-cheat quizzes, answer scrubbing & scoring
│   │   ├── resources/               # Community study materials library & downloads
│   │   ├── reviews/                 # Verified buyer/attendee course & tutor reviews
│   │   ├── session-monitoring/      # Live session health & admin surveillance
│   │   ├── storage/                 # Cloudflare R2 presigned URLs & traversal defense
│   │   ├── transcoding/             # HLS video conversion pipelines
│   │   └── users/                   # Profiles, roles & KYC document uploads
│   └── test/
│       └── regression/              # The 12 Master Release Gateway suites (194 tests)
│           ├── 01-auth-regression.mjs
│           ├── 02-kyc-regression.mjs
│           ├── 03-course-regression.mjs
│           ├── 04-learning-regression.mjs
│           ├── 05-quiz-regression.mjs
│           ├── 06-tutoring-regression.mjs
│           ├── 07-help-escrow-regression.mjs
│           ├── 08-payments-regression.mjs
│           ├── 09-resources-regression.mjs
│           ├── 10-reviews-regression.mjs
│           ├── 11-gamification-regression.mjs
│           ├── 12-storage-monitoring-regression.mjs
│           └── run-all.mjs          # Sequential master runner orchestrator
│
├── mobile/                          # Flutter Cross-Platform Mobile Client
│   ├── lib/
│   │   ├── core/                    # Network client, theme, tokens, constants
│   │   ├── models/                  # Strong models (Course, Booking, HelpRequest, XP)
│   │   ├── providers/               # State management via ChangeNotifier (Provider)
│   │   └── screens/
│   │       ├── auth/                # Login & Registration screens
│   │       ├── course/              # Marketplace catalog & Course Detail
│   │       ├── gamification/        # Live Student Leaderboard & Badges
│   │       ├── help/                # Help Marketplace & Post Request screens
│   │       ├── instructor/          # Tutor Earnings & Payout Requests
│   │       ├── learning/            # Video Player, Lesson List & Quiz Sheet
│   │       ├── payment/             # Chapa WebView Checkout & Result handlers
│   │       └── sessions/            # 1-on-1 Tutor Booking & Availability Picker
│   └── pubspec.yaml                 # Flutter 3.12 dependencies
│
├── web/                             # Next.js 15 Web Application
│   ├── src/
│   │   ├── app/                     # Next.js App Router (SSR & Client views)
│   │   ├── components/              # Reusable UI component library (Tailwind CSS)
│   │   └── lib/                     # API client, auth session hooks, utilities
│   ├── Dockerfile                   # Multi-stage production container build
│   └── package.json
│
├── D-auth/                          # Custom Decentralized SSO & Auth Micro-Engine
│   ├── adapters/                    # PostgreSQL direct user adapter
│   ├── core/                        # Token signing, sliding refresh, blacklist
│   ├── middleware/                  # Express/NestJS auth validation hooks
│   └── plugins/                     # OAuth providers (Google, Facebook, Apple)
│
├── k8s/                             # Production Kubernetes Manifests
│   ├── namespace.yaml               # axumia-learnings namespace
│   ├── configmap-secrets.yaml       # Environment configs and secrets
│   ├── postgres.yaml                # StatefulSet + PersistentVolumeClaim
│   ├── redis.yaml                   # Redis deployment & service
│   ├── backend.yaml                 # Backend API Deployment with health probes
│   ├── web.yaml                     # Next.js Web Deployment
│   └── ingress.yaml                 # Ingress routing & TLS certificates
│
├── docker-compose.yml               # Local 5-service dev/test orchestration
├── nginx.conf                       # Reverse proxy entry configuration
└── README.md                        # Master Project Documentation
```

---

## 🚦 Release Gateway & Regression Test Suite

Before any build or branch can be approved for production release, it must successfully pass the **Master 12-Domain Release Gateway**.

This custom-engineered regression suite runs natively across **Windows, Linux, and macOS** with zero external test runner dependencies. It executes real end-to-end HTTP/HTTPS calls against live endpoints with no mocked tokens.

### Verification Matrix (194 / 194 Tests Passing)

| Gateway Phase | Test Suite Script | Scope & Threat Model Defended | Assertions | Result |
| :---: | :--- | :--- | :---: | :---: |
| **01** | `01-auth-regression.mjs` | Token lifecycle, rotation, replaying protection, RBAC isolation. | 18 | `✔ PASS` |
| **02** | `02-kyc-regression.mjs` | Instructor document upload, admin audit queue, rejection/approval. | 14 | `✔ PASS` |
| **03** | `03-course-regression.mjs` | Curriculum authoring, preview lessons, zero-leakage media gating. | 17 | `✔ PASS` |
| **04** | `04-learning-regression.mjs` | Video heartbeat persistence, sequential completion, certificate gates. | 17 | `✔ PASS` |
| **05** | `05-quiz-regression.mjs` | Anti-cheat answer scrubbing, time limits, cooldowns, pass thresholds. | 21 | `✔ PASS` |
| **06** | `06-tutoring-regression.mjs` | 1-on-1 slot booking, concurrency double-booking locks, reschedule limits. | 22 | `✔ PASS` |
| **07** | `07-help-escrow-regression.mjs` | Help requests, tutor bidding, multi-step escrow funding and release. | 21 | `✔ PASS` |
| **08** | `08-payments-regression.mjs` | Chapa transactions, webhook HMAC SHA-256, instructor ledger & payouts. | 18 | `✔ PASS` |
| **09** | `09-resources-regression.mjs` | Community uploads, file extension whitelisting, rate-limited downloads. | 13 | `✔ PASS` |
| **10** | `10-reviews-regression.mjs` | Verified buyer & attendee gating, 1-5 star bounds, rating stats. | 12 | `✔ PASS` |
| **11** | `11-gamification-regression.mjs` | Uncompleted lesson XP rejection, streak anti-tamper, leaderboard ranking. | 11 | `✔ PASS` |
| **12** | `12-storage-monitoring-regression.mjs` | R2 presigned URLs, MIME whitelist, path traversal defense, session health. | 10 | `✔ PASS` |
| **TOTAL** | **run-all.mjs** | **Complete Full-Platform End-to-End Release Gate** | **194 / 194** | **`✔ 100% PASS`** |

### Executing the Regression Gateway

```bash
# Run all 12 gateway suites sequentially
node backend/test/regression/run-all.mjs

# Or test against a specific remote/staging host
node backend/test/regression/run-all.mjs --url https://staging.axumia.com

# Target any individual domain on demand
node backend/test/regression/10-reviews-regression.mjs
node backend/test/regression/11-gamification-regression.mjs
node backend/test/regression/12-storage-monitoring-regression.mjs
```

---

## ⚡ Local Development & Quickstart

### Prerequisites
* **Docker & Docker Compose** (v24.0+)
* **Node.js** (v20.x LTS or higher) & `npm`
* **Flutter SDK** (v3.12+ for mobile development)

---

### 1. Docker Compose All-in-One (Recommended)

The fastest way to spin up the entire multi-service ecosystem (Nginx Gateway, NestJS API, D-Auth, Next.js Web, PostgreSQL, and Redis) is via Docker Compose:

```bash
# 1. Clone the repository
git clone git@github.com:DawitGereziher/Axumia_Learnings.git
cd Axumia_Learnings

# 2. Build and start all 5 containers in the background
docker compose up -d --build

# 3. Inspect health status
docker compose ps
```

Once running, access the services:
* **Web Application:** [http://localhost](http://localhost) (routed via Nginx on port 80)
* **Backend API & Swagger Docs:** [http://localhost/api/docs](http://localhost/api/docs)
* **Health Check Probe:** [http://localhost/health](http://localhost/health)
* **PostgreSQL Database:** `localhost:5433` (DB: `ethiolearn`, User: `postgres`, Pass: `password`)
* **Redis Instance:** `localhost:6379`

---

### 2. Running the Flutter Mobile App

```bash
cd mobile

# 1. Fetch Flutter dependencies
flutter pub get

# 2. Inspect connected physical devices or emulators
flutter devices

# 3. Launch on Android Emulator, iOS Simulator, or Chrome
flutter run
```

> **Note on Mobile API Base URL:**  
> When testing on an Android Emulator, `localhost` points to the emulator itself. Configure `api_constants.dart` to use `http://10.0.2.2/api` or your local machine's LAN IP address.

---

### 3. Bare-Metal Manual Setup

If developing without Docker:

```bash
# ── Terminal 1: Database & Cache ──
# Ensure local PostgreSQL is running on port 5433 and Redis on 6379

# ── Terminal 2: NestJS Backend ──
cd backend
cp .env.example .env
npm install
npx prisma db push
npm run start:dev

# ── Terminal 3: Next.js Frontend ──
cd web
npm install
npm run dev
```

---

## 🔐 Environment Variables Reference

Key configuration keys for `backend/.env`:

| Key | Description | Example / Default |
|---|---|---|
| `PORT` | HTTP port the NestJS service binds to | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:password@localhost:5433/ethiolearn?schema=public` |
| `REDIS_HOST` | Redis cache & queue host | `localhost` (or `redis` in Docker) |
| `REDIS_PORT` | Redis port | `6379` |
| `JWT_SECRET` | Primary secret for user session tokens | `your-secure-jwt-secret-string` |
| `JWT_EXPIRES_IN` | Access token time-to-live | `15m` |
| `ENCRYPTION_KEY` | 32-byte hex key for OAuth token ciphering | Generated via `crypto.randomBytes(32)` |
| `CONTENT_SIGNATURE_SECRET` | Secret for generating signed video streaming URLs | `your-content-signature-secret` |
| `SIGNED_URL_TTL_MS` | Video token expiration in milliseconds | `3600000` (1 hour) |
| `CHAPA_SECRET_KEY` | Secret key provided by Chapa payment gateway | `CHASECK_TEST-xxxxxxxxxxxx` |
| `CHAPA_WEBHOOK_SECRET` | Secret for validating Chapa webhook HMAC signatures | `your-webhook-secret-key` |
| `AWS_S3_BUCKET` / `R2_BUCKET` | Cloudflare R2 / S3 storage bucket name | `axumia-content` |
| `AWS_ACCESS_KEY_ID` | Storage access key | Cloudflare R2 Access Key ID |
| `AWS_SECRET_ACCESS_KEY` | Storage secret key | Cloudflare R2 Secret Access Key |
| `AWS_ENDPOINT` | R2 endpoint URL | `https://<accountid>.r2.cloudflarestorage.com` |

---

## ☸️ Kubernetes Production Deployment

Production-ready declarative manifests are provided in `k8s/`:

```bash
# 1. Create the dedicated namespace
kubectl apply -f k8s/namespace.yaml

# 2. Apply ConfigMaps and Secrets
kubectl apply -f k8s/configmap-secrets.yaml

# 3. Deploy Stateful Services (PostgreSQL & Redis with PVCs)
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml

# 4. Deploy Application Workloads (NestJS Backend & Next.js Web)
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/web.yaml

# 5. Apply Ingress Controller Routing & TLS Certificates
kubectl apply -f k8s/ingress.yaml
```

The Kubernetes setup features:
* **Automated Self-Healing:** Backend pods configured with HTTP `livenessProbe` and `readinessProbe` checking `/health`.
* **Zero-Downtime Rolling Updates:** Managed deployments with configurable surge limits.
* **Persistent Data Safety:** Dedicated `PersistentVolumeClaims` for PostgreSQL data directories.

---

## 📜 License & Acknowledgments

Distributed under the **MIT License**. See `LICENSE` for more information.

* **Architect & Lead Developer:** [Dawit Gereziher](https://github.com/DawitGereziher)
* **Special Thanks:** The Ethiopian developer community, the Chapa engineering team for local payment infrastructure, and all early tutor and student contributors.

---

<div align="center">
  <sub>Built with passion for the future of education in Ethiopia and beyond.</sub>
</div>
