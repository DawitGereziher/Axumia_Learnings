# Online Learning Platform (Ethiopia) — System Architecture & Detailed Design

**Context this design assumes:** solo/small dev team, instructors share their own Zoom/Meet links manually (no custom video build), moderate cloud budget, Ethiopian payment methods (Telebirr, CBE Birr, Chapa) as the primary rail, web + mobile.

---

## 1. Product model recap

Two revenue paths on one platform:

1. **Live tutoring (sync)** — student browses instructors, books a paid session, instructor shares a Zoom/Meet link at/after booking confirmation, session happens off-platform, platform handles discovery, scheduling, payment, and reviews.
2. **Pre-recorded courses (async)** — instructor uploads a course once, it's sold repeatedly, platform hosts video, handles access control, progress tracking, payment, and reviews.

Both share: identity, search/discovery, payments, reviews, and notifications. That shared core is why a **modular monolith** (not microservices) is the right call for a solo/small team — one codebase, one deploy pipeline, clear internal module boundaries so you can peel services out later if you ever need to.

---

## 2. Recommended tech stack

| Layer | Recommendation | Why |
|---|---|---|
| Backend | **Node.js + NestJS** (TypeScript) | Structured modules out of the box (mirrors the architecture below 1:1), huge ecosystem, one language across backend + web + mobile if you go React Native — big win for a small team |
| Web frontend | **Next.js (React)** | SSR for SEO on course/instructor pages (important for organic discovery in Ethiopia where paid ads are expensive), same React skillset as mobile |
| Mobile | **React Native (Expo)** | One codebase for iOS + Android, fastest path for a small team; switch to bare RN later if you need custom native modules |
| Database | **PostgreSQL** (managed) | Relational integrity matters a lot here — bookings, payments, payouts, refunds all need transactions and foreign keys, not eventual consistency |
| Cache/queue | **Redis** | Session cache, rate limiting, job queue (via BullMQ) for emails/SMS/video processing |
| Object storage | **S3-compatible** (AWS S3, or DigitalOcean Spaces / Backblaze B2 for lower egress cost) | Course videos, thumbnails, certificates, instructor documents |
| Video delivery | **Signed URLs + HLS transcoding** (AWS MediaConvert or self-hosted ffmpeg worker) | Prevents direct download/sharing of paid course videos, adaptive bitrate for Ethiopian mobile networks |
| Search | **PostgreSQL full-text search** initially → **Meilisearch/Typesense** if catalog grows past a few thousand courses | Don't reach for Elasticsearch on day one — it's operational overhead you don't need yet |
| Payments | **Chapa** as primary aggregator (covers Telebirr, CBE Birr, HelloCash, cards) | One integration instead of separate deals with each bank/telco — this is the standard approach Ethiopian platforms use |
| Notifications | Email (SendGrid/Postmark) + SMS (AfroMessage or Geez SMS for local delivery reliability) | International SMS providers often have poor Ethiopian delivery rates |
| Infra | **Docker containers on a managed platform** — Railway/Render to start, migrate to AWS ECS or a small Kubernetes cluster (DigitalOcean Kubernetes) once traffic justifies it | Don't over-engineer infra before you have users |
| CI/CD | GitHub Actions | Free tier is generous, integrates cleanly with the above |

You said "moderate budget, cloud-ready" — this stack lets you start cheap (~$50-150/mo for MVP-scale managed Postgres + small compute + S3) and scale the same codebase without a rewrite.

---

## 3. High-level architecture

*(see the diagram above)*

- **Clients**: Next.js web app + React Native mobile app, both talk to the same REST/GraphQL API.
- **API gateway**: handles auth token validation, rate limiting, request routing. At this scale this can just be your NestJS app's own middleware layer — no need for a separate gateway product (like Kong) until you have multiple independent services.
- **Backend modules** (each a NestJS module with its own controllers/services/repository, sharing one Postgres instance):
  - **Auth & users** — registration, login, roles (student/instructor/admin), profile, KYC docs for instructors
  - **Courses & marketplace** — course CRUD, content upload, categories, search, pricing
  - **Bookings & sessions** — instructor availability calendar, booking requests, confirmation, reminders, manual meeting-link exchange
  - **Payments & payouts** — checkout, escrow-style holding, instructor payout requests, refunds, transaction ledger
- **Data layer**: PostgreSQL (source of truth), Redis (cache + queues), object storage (video/files).

---

## 4. Core data model

The relationships below are the backbone — get these right early since bookings/payments/refunds all hinge on them.

```
erDiagram
  USERS ||--o{ INSTRUCTOR_PROFILES : has
  USERS ||--o{ BOOKINGS : "books as student"
  USERS ||--o{ COURSE_PURCHASES : buys
  INSTRUCTOR_PROFILES ||--o{ COURSES : creates
  INSTRUCTOR_PROFILES ||--o{ AVAILABILITY_SLOTS : defines
  INSTRUCTOR_PROFILES ||--o{ BOOKINGS : teaches
  COURSES ||--o{ COURSE_LESSONS : contains
  COURSES ||--o{ COURSE_PURCHASES : "sold via"
  BOOKINGS ||--o| TRANSACTIONS : "paid via"
  COURSE_PURCHASES ||--o| TRANSACTIONS : "paid via"
  TRANSACTIONS ||--o{ PAYOUTS : "settles into"
  USERS ||--o{ REVIEWS : writes
  USERS {
    uuid id PK
    string email
    string phone
    string role
    timestamp created_at
  }
  INSTRUCTOR_PROFILES {
    uuid id PK
    uuid user_id FK
    string bio
    string kyc_status
    decimal hourly_rate
  }
  COURSES {
    uuid id PK
    uuid instructor_id FK
    string title
    decimal price
    string status
  }
  BOOKINGS {
    uuid id PK
    uuid student_id FK
    uuid instructor_id FK
    timestamp scheduled_at
    string meeting_link
    string status
  }
  TRANSACTIONS {
    uuid id PK
    uuid user_id FK
    decimal amount
    string provider
    string status
    string reference
  }
  PAYOUTS {
    uuid id PK
    uuid instructor_id FK
    decimal amount
    string status
  }
```

Key design decisions embedded here:
- **`meeting_link` lives on the booking row**, entered by the instructor once confirmed — no video infra needed, but you should validate it's a plausible Zoom/Meet URL and remind the instructor via notification if it's missing 1 hour before the session.
- **`transactions` is a single append-only ledger** for both booking payments and course purchases — this makes reconciliation with Chapa's settlement reports much easier than having two separate payment tables.
- **`payouts` is separate from `transactions`** — instructors accumulate earnings, then request or automatically receive a payout on a schedule (e.g. weekly), which lets you hold funds briefly for dispute/refund windows (important for trust on a two-sided marketplace).

---

## 5. Live tutoring flow (manual link model)

1. Student finds instructor → views availability calendar → requests a slot.
2. Student pays upfront (held in escrow state, not yet released to instructor).
3. Instructor gets notified, confirms, and **pastes their Zoom/Meet link** into the booking (a text field, validated for a proper meeting URL pattern).
4. Both parties get the link + reminder notifications (24h, 1h before).
5. After the session time passes, the platform auto-prompts both sides: "did this session happen?" A simple confirmation (or a no-show report) triggers either **payout release** to the instructor or a **refund flow** if the instructor no-shows.
6. Review prompt sent to the student post-session.

This keeps you out of the video infrastructure business entirely while still giving you a trust/dispute layer, which is the actual hard part of a marketplace — not the video call itself.

---

## 6. Course marketplace flow

1. Instructor uploads video files + course structure (sections/lessons) through an upload UI.
2. Backend queues a **transcoding job** (ffmpeg worker, or AWS MediaConvert) → produces HLS renditions (multiple bitrates) for smooth playback on Ethiopian mobile data.
3. Videos stored in object storage, **never served with a public URL** — only short-lived signed URLs generated per authenticated, entitled request, which blocks casual link-sharing/piracy.
4. Student purchases course → `course_purchases` row created → grants access.
5. Progress tracked per lesson (for completion %, "continue watching," and eventually certificates).

---

## 7. Payments (Ethiopia-specific)

- **Chapa** as the primary integration point — it already brokers Telebirr, CBE Birr, HelloCash, and cards under one API, so you avoid negotiating separately with each provider on day one.
- Flow: platform initiates a Chapa checkout → user pays via their preferred method → webhook confirms payment → `transactions` row marked `paid` → triggers either booking confirmation or course access grant.
- **Always verify webhooks server-side** against Chapa's signature, and also poll/reconcile periodically — mobile money webhooks in the region can be delayed or occasionally missed.
- Keep a **platform commission field** on each transaction (e.g. 15-20%) so payout calculations are transparent and auditable.
- Plan for **manual payout fallback** (bank transfer) in addition to automated payouts early on — full payout automation via API isn't always available for every local rail, and you don't want that to block instructors from getting paid.

---

## 8. Mobile app notes

- React Native (Expo) for one codebase; use Expo's managed workflow until you need something like background video download, then eject if necessary.
- Push notifications (Expo push / Firebase Cloud Messaging) for booking reminders and course updates — critical for a market where email open rates are lower than app engagement.
- Design for **low-bandwidth conditions**: aggressive image compression, adaptive video bitrate, and offline-friendly caching of course lesson lists.

---

## 9. Infrastructure design

- **Compute**: containerized NestJS app + Next.js app, deployed on a managed container platform (Railway/Render) or AWS ECS / a managed Kubernetes cluster (DigitalOcean Kubernetes or EKS). Video transcoding workers run as a separate, independently scalable worker pool since that's the spikiest workload — it should scale on queue depth, not alongside the main API.
- **Database**: managed PostgreSQL (RDS, Neon, or equivalent) with automated backups and a read replica once read traffic on course/instructor browsing grows enough to warrant it.
- **Cache/queue**: managed Redis for session cache, rate limiting, and the BullMQ job queue driving transcoding, notifications, and payout reconciliation.
- **Storage/CDN**: S3-compatible object storage for video/files, fronted by Cloudflare (or AWS CloudFront) for CDN caching of static assets and thumbnails.
- **CI/CD**: GitHub Actions → build → test → deploy, with staging and production kept at environment parity so config drift never becomes a surprise.
- **Observability**: Sentry for error tracking, structured logging from day one, plus a metrics/dashboard layer (Grafana/Prometheus or a hosted equivalent) over the API, queue depth, and payment webhook success rate — these three are the signals that actually predict problems on a marketplace like this.

---

## 10. Security essentials

- JWT-based auth with short-lived access tokens + refresh tokens; separate scopes for student/instructor/admin.
- Instructor KYC (ID verification) before they can list paid courses or accept bookings — this matters a lot for trust and for payout compliance.
- Rate limiting on auth and payment endpoints (Redis-backed).
- All video access via short-lived signed URLs, never permanent public links.
- PCI scope stays minimal since Chapa hosts the actual payment page — you never touch raw card numbers.
- Encrypt sensitive fields (KYC documents, bank account numbers) at rest.

---
