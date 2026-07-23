# PrepPilot — API Contracts

> **Status:** Documents the endpoints as implemented, verified against `backend/src/routes/` on 17 July 2026.

Base URL in development: `http://localhost:3000`.

## Conventions

**Authentication.** Protected endpoints require a JWT bearer token:

```
Authorization: Bearer <token>
```

Tokens are issued by `/auth/signup` and `/auth/login`, signed with `JWT_SECRET`, carry `{ userId }`, and **expire after 24h**. The `verifyToken` middleware (`middleware/auth.ts`) returns:

| Condition | Status | Body |
|---|---|---|
| Header missing or not `Bearer …` | 401 | `{ "error": "Missing or malformed authorization header" }` |
| Token expired | 401 | `{ "error": "Token expired" }` |
| Token otherwise invalid | 401 | `{ "error": "Invalid token" }` |

**Errors.** Always `{ "error": "<human-readable message>" }`. There are no machine-readable error codes.

**Ownership.** Every roadmap/day/answer query joins through `roadmaps.user_id`, so one user can never read or mutate another's rows. A row belonging to someone else returns **404**, not 403 — existence is not leaked.

**CORS.** Allowed origins are `FRONTEND_ORIGIN` (default `http://localhost:5173`) and `http://localhost:5174`.

**Unmatched routes.** 404 `{ "error": "Route not found" }`.

---

## Endpoint Index

| Method | Path | Auth |
|---|---|---|
| GET | `/health` | — |
| POST | `/auth/request-signup-otp` | — |
| POST | `/auth/verify-signup-otp` | — |
| POST | `/auth/signup` | — |
| POST | `/auth/login` | — |
| POST | `/auth/verify-otp` | — |
| POST | `/auth/resend-otp` | — |
| POST | `/auth/forgot-password` | — |
| POST | `/auth/verify-reset-otp` | — |
| POST | `/auth/reset-password` | — |
| GET | `/profile/me` | ✓ |
| PUT | `/profile` | ✓ |
| PATCH | `/profile/password` | ✓ |
| DELETE | `/profile` | ✓ |
| PATCH | `/profile/whatsapp` | ✓ |
| DELETE | `/profile/whatsapp` | ✓ |
| POST | `/api/upload` | ✓ |
| GET | `/api/upload` | ✓ |
| GET | `/api/roadmap` | ✓ |
| POST | `/api/roadmap/generate` | ✓ |
| GET | `/api/roadmap/:dayId/practice` | ✓ |
| POST | `/api/roadmap/:dayId/complete` | ✓ |
| POST | `/api/roadmap/:dayId/questions/:questionId/answers` | ✓ |
| GET | `/api/roadmap/:dayId/answers` | ✓ |
| GET | `/api/dashboard` | ✓ |
| POST | `/api/dashboard/practice-answer` | ✓ |
| GET | `/api/notifications` | ✓ |
| POST | `/api/notifications/read-all` | ✓ |
| POST | `/api/notifications/:id/read` | ✓ |
| GET | `/api/whatsapp/sandbox-info` | — |

> **No inbound WhatsApp webhook exists.** WhatsApp is outbound-only; user replies are not received.

---

## Health

### `GET /health`
```json
{ "status": "ok", "timestamp": "2026-07-17T09:00:00.000Z" }
```

---

## Auth

### `POST /auth/signup`

```json
{ "email": "you@email.com", "password": "at-least-8-chars", "name": "Ada" }
```

`name` is optional. Email is lowercased and trimmed; password is bcrypt-hashed (cost 12).

**201**
```json
{
  "token": "eyJhbGci…",
  "user": { "id": "uuid", "email": "you@email.com", "name": "Ada", "createdAt": "2026-07-17T09:00:00.000Z" }
}
```

| Status | When |
|---|---|
| 400 | Missing email/password · invalid email format · password < 8 chars |
| 409 | `{ "error": "An account with this email already exists" }` (Postgres `23505`) |
| 500 | Internal error |

### `POST /auth/login`

```json
{ "email": "you@email.com", "password": "…" }
```

**200**
```json
{ "token": "eyJhbGci…", "user": { "id": "uuid", "email": "you@email.com", "name": "Ada" } }
```

| Status | When |
|---|---|
| 400 | Missing email or password |
| 401 | `{ "error": "Invalid email or password" }` — same message for unknown email and wrong password, so accounts can't be enumerated |

### Signup email verification

Signup is a three-step wizard: `request-signup-otp` → `verify-signup-otp` → `signup`. Codes live in the `email_verifications` table, are six digits, and expire after 15 minutes.

- **`POST /auth/request-signup-otp`** `{ email }` → **200** `{ "message": "OTP sent to email." }`. **400** invalid/over-length email · **409** an account already exists.
- **`POST /auth/verify-signup-otp`** `{ email, otp }` → **200** on success. **401** wrong/expired code · **404** no pending verification.
- **`POST /auth/signup`** additionally returns **403** `{ "error": "Email is not verified." }` if the email wasn't verified first.
- **`POST /auth/verify-otp`** / **`POST /auth/resend-otp`** — verify/resend for a legacy unverified `users` row (login returns **403** with `verificationRequired: true` for those accounts).

Email validation (shared by signup and reset): valid format, **≤ 254 chars** total, local part **≤ 64 chars**. Passwords are **8–128 chars**.

### Password reset

Three steps mirror signup: `forgot-password` → `verify-reset-otp` → `reset-password`. Codes are stored **hashed** (SHA-256) in the `password_resets` table, expire after **15 minutes**, and lock after **5** wrong guesses.

#### `POST /auth/forgot-password`
```json
{ "email": "you@email.com" }
```
Always **200** `{ "message": "If an account exists for that email, a password reset code has been sent." }` — the response is identical whether or not the account exists, so it can't be used to enumerate registered emails. A real account receives an emailed code; repeat sends within 30s are silently throttled. **400** only for a missing/malformed email.

#### `POST /auth/verify-reset-otp`
```json
{ "email": "you@email.com", "otp": "123456" }
```
**200** on success (marks the code verified). 

| Status | When |
|---|---|
| 400 | Missing fields · no pending/expired code |
| 401 | `{ "error": "Invalid verification code. N attempts remaining." }` |
| 429 | `{ "error": "Too many incorrect attempts. Please request a new code." }` |

#### `POST /auth/reset-password`
```json
{ "email": "you@email.com", "otp": "123456", "new_password": "at-least-8-chars" }
```
Re-checks the code (so a verified row still can't be used without the OTP), updates the password and consumes the reset row in one transaction.

**200** → `{ "success": true, "message": "Your password has been reset. You can now sign in." }`

| Status | When |
|---|---|
| 400 | Missing fields · `new_password` outside 8–128 · no pending/expired code |
| 401 | Wrong code |
| 403 | Code not verified yet |
| 429 | Too many incorrect attempts |

---

## Profile

### `GET /profile/me`

**200**
```json
{
  "id": "uuid",
  "email": "you@email.com",
  "name": "Ada",
  "roleTitle": "Senior Backend Engineer",
  "whatsappNumber": "+919876543210",
  "createdAt": "2026-07-17T09:00:00.000Z"
}
```

`roleTitle` is read from the latest analysis report's `jd.role_title`; `null` when no analysis exists. **404** if the user row is gone.

### `PUT /profile`
Update display name.

```json
{ "name": "Ada Lovelace" }
```

**200** → `{ "id": "uuid", "email": "…", "name": "Ada Lovelace" }` · **400** if name missing/blank · **404** if user not found.

### `PATCH /profile/password`

```json
{ "current_password": "…", "new_password": "at-least-8-chars" }
```

**200** → `{ "success": true }`

| Status | When |
|---|---|
| 400 | Either field missing · `new_password` < 8 chars |
| 401 | `{ "error": "Current password is incorrect" }` |
| 404 | User not found |

### `DELETE /profile`
Delete the account. Requires password confirmation in the body.

```json
{ "password": "…" }
```

**200** → `{ "success": true }` · **400** if password missing · **401** if incorrect.

Executes a single `DELETE FROM users`; every other table cascades.

### `PATCH /profile/whatsapp`
Save the user's WhatsApp number.

```json
{ "whatsapp_number": "+919876543210" }
```

Must be **E.164** — `^\+[1-9]\d{6,14}$`. Stored bare; the `whatsapp:` prefix is added at send time.

**200** → `{ "success": true, "whatsappNumber": "+919876543210" }`

**400** → `{ "error": "Invalid phone number. Use E.164 format, e.g. +919876543210" }`

> Saving a number does **not** verify the Twilio sandbox opt-in. If the user hasn't sent the `join` code from their phone, sends silently fail and the user gets a failure notification.

### `DELETE /profile/whatsapp`
Sets `whatsapp_number = NULL`. **200** → `{ "success": true }`

---

## Upload & Analysis

### `POST /api/upload`
The heaviest endpoint in the product: parses the resume, runs the full 12-agent analysis, and generates + persists a roadmap.

**Request:** `multipart/form-data`

| Field | Type | Notes |
|---|---|---|
| `resume` | file | **Required.** PDF or DOCX. Max 10 MB. |
| `jdText` | text | **Required.** Raw job description. |
| `days` | text | Optional. Roadmap length, 1–60. Invalid/missing → **15**. |

Allowed MIME types: `application/pdf`, `…wordprocessingml.document`, `application/msword`.

**Behaviour:** forwards to `POST :8001/parse` with a **6-minute timeout** (the pipeline makes 10+ Gemini calls; free-tier latency is the constraint) → upserts `user_documents` → generates the roadmap via Gemini → upserts `roadmaps` + inserts one `questions` row per day → fires Day 1 to WhatsApp asynchronously.

**200**
```json
{
  "success": true,
  "roadmap_error": null,
  "resume": { "…": "…" },
  "jd": { "role_title": "…" },
  "narrative_summary": "…",
  "skills": { "score": 72, "requirement_matches": [] },
  "experience": { "score": 80, "reasoning": "…" },
  "education": { "score": 65, "reasoning": "…", "meets_requirement": true },
  "culture": { "overall_score": 70, "reasoning": "…" },
  "weighted_score": 73.5,
  "decision": { "recommendation": "…", "overall_score": 73.5, "confidence": 82 },
  "interview_questions": { "technical": [], "behavioral": [], "cultural": [] }
}
```

The report is spread at the top level alongside `success`. Full shape: [SCHEMA.md → analysis_report](./SCHEMA.md#user_documentsanalysis_report).

**`roadmap_error`** is non-null when the analysis saved but the roadmap did not. This is **not** an error status — the analysis is still returned with **200**. Any roadmap still in the DB belongs to a previous analysis, and `GET /api/roadmap` will report it as `is_stale: true`.

| Status | When |
|---|---|
| 400 | Missing file · missing/blank `jdText` · non-PDF/DOCX |
| 500 | `{ "error": "Failed to save documents to database." }` |
| 502 | Parse service errored. Gemini quota → *"Gemini API daily quota reached…"* |
| 503 | `{ "error": "Parse service is offline. Please start the Python API server on port 8001." }` (`ECONNREFUSED`) |

### `GET /api/upload`
Returns the stored analysis.

**200**
```json
{
  "resume": { "…": "…" },
  "jd": { "…": "…" },
  "weighted_score": 73.5,
  "decision": { "…": "…" },
  "uploadedAt": "2026-07-17T09:00:00.000Z"
}
```

`analysis_report` is spread at the top level. **404** → `{ "error": "No documents uploaded yet" }`

---

## Roadmap

### `GET /api/roadmap`

**200**
```json
{
  "roadmap_id": "uuid",
  "interview_date": "2026-08-01",
  "created_at": "2026-07-17T09:00:00.000Z",
  "is_stale": false,
  "completed_count": 3,
  "days": [
    {
      "id": "uuid",
      "day_number": 1,
      "topic": "Kubernetes Fundamentals",
      "question_text": "Explain the difference between a Deployment and a StatefulSet.",
      "learning_goal": "Explain pods, deployments, and services",
      "difficulty": "medium",
      "focus_skill": "Kubernetes",
      "status": "completed",
      "completed_at": "2026-07-17T10:00:00.000Z",
      "sent_at": "2026-07-17T09:00:05.000Z",
      "has_practice_content": true
    }
  ]
}
```

| Field | Meaning |
|---|---|
| `is_stale` | `true` when `roadmaps.analysis_uploaded_at` ≠ the current `user_documents.uploaded_at` — the plan was **not** built from the analysis on file. The UI should offer a rebuild. |
| `completed_count` | Days with `status = 'completed'`. |
| `status` | `'locked' \| 'today' \| 'completed'`. Exactly one day is `'today'`. |
| `has_practice_content` | `true` once resources **and** practice questions are generated and stored, so the UI only shows a loading state when generation is actually needed. |
| `sent_at` | When this day was pushed to WhatsApp; `null` if never sent. |

**404** → `{ "error": "No roadmap found. Upload your resume and JD to generate one." }`

### `POST /api/roadmap/generate`
Build a fresh plan from the analysis on file, **replacing** any existing roadmap and all its days.

```json
{ "days": 15 }
```

`days` must be an integer **1–60** (`MIN_DAYS`/`MAX_DAYS` in `services/roadmapGeneration.ts`).

**201** — same shape as `GET /api/roadmap`, with `is_stale: false`, `completed_count: 0`, and every day's `has_practice_content: false`.

| Status | When |
|---|---|
| 400 | `{ "error": "days must be an integer between 1 and 60" }` |
| 409 | No usable analysis on file (`NoAnalysisError`) — upload first |
| 500 | Failed to load analysis · failed to persist |
| 502 | `{ "error": "Couldn't generate your roadmap. Please try again." }` (Gemini failed) |

**Destructive:** deletes all `questions` for the roadmap, cascading away every `response` and `practice_answer` attached to them. Progress is lost.

Generation happens **outside** the transaction (it's the slow, failure-prone part); only persistence is transactional. Day 1 is fired to WhatsApp after commit, without `await`.

**409 rather than a generic plan:** silently generating a stale or irrelevant syllabus is what made bad roadmaps indistinguishable from correct ones. A missing analysis is a hard error.

### `GET /api/roadmap/:dayId/practice`
Practice content for one day. **Generates and persists on first access**, so this call can be slow the first time and instant thereafter.

**200**
```json
{
  "id": "uuid",
  "topic": "Kubernetes Fundamentals",
  "description": "Explain pods, deployments, and services",
  "resources": [{ "title": "Kubernetes Docs — Deployments", "url": "https://…" }],
  "questions": [{ "id": "b1f2…", "text": "Walk through a rolling update.", "difficulty": "medium" }]
}
```

`description` is the day's `learning_goal`. Each question's `id` is what you pass to the answer endpoint below.

| Status | When |
|---|---|
| 403 | `{ "error": "This day is locked. Complete earlier days first." }` — gating is enforced server-side, not just in the UI |
| 404 | Day not found or not yours |
| 500 | Generation failed |

### `POST /api/roadmap/:dayId/complete`
Mark the day complete and unlock the next one.

**200**
```json
{
  "day": { "id": "uuid", "day_number": 1, "topic": "…", "status": "completed", "completed_at": "…" },
  "next_day": { "id": "uuid", "day_number": 2, "topic": "…", "status": "today" },
  "completed_count": 1
}
```

`next_day` is `null` on the final day.

| Status | When |
|---|---|
| 403 | `{ "error": "This day is locked and cannot be completed." }` |
| 404 | Day not found or not yours |
| 409 | `{ "error": "This day is already completed." }` |

Both status updates run in one transaction under `SELECT … FOR UPDATE`, so they cannot half-apply. After commit, the unlocked day triggers a `day_unlocked` notification and an async WhatsApp send.

### `POST /api/roadmap/:dayId/questions/:questionId/answers`
Submit an answer to one practice question. Scored by Gemini before the response returns.

`:questionId` is the `id` from the day's `practice_questions` — not a table row id.

```json
{ "answer_text": "A Deployment manages stateless replicas, whereas…" }
```

**201**
```json
{
  "id": "uuid",
  "day_id": "uuid",
  "question_id": "b1f2…",
  "answer_text": "…",
  "source": "web",
  "ai_score": 7,
  "ai_feedback": "Solid on the stateless/stateful distinction. You didn't mention…",
  "created_at": "2026-07-17T10:00:00.000Z"
}
```

`ai_score` is **0–10** (not 0–100) and may be `null` if scoring failed.

| Status | When |
|---|---|
| 400 | `{ "error": "answer_text is required" }` (also when blank after trim) |
| 403 | Day is locked |
| 404 | Day not yours · `{ "error": "Practice question not found for this day" }` |
| 500 | Scoring or insert failed |

Answers are **append-only** — resubmitting creates another row rather than replacing.

⚠️ **This does not affect the readiness score.** Only `POST /api/dashboard/practice-answer` does.

### `GET /api/roadmap/:dayId/answers`
Every answer the user has submitted for a day, newest first, so the modal can prefill scores in one call.

**200**
```json
{
  "answers": [
    {
      "id": "uuid", "day_id": "uuid", "question_id": "b1f2…",
      "answer_text": "…", "source": "web",
      "ai_score": 7, "ai_feedback": "…", "created_at": "2026-07-17T10:00:00.000Z"
    }
  ]
}
```

**404** if the day isn't yours. Returns `{ "answers": [] }` when there are none.

---

## Dashboard

### `GET /api/dashboard`
Aggregates everything the dashboard renders.

**200**
```json
{
  "name": "Ada",
  "role_title": "Senior Backend Engineer",
  "readiness_score": 79,
  "readiness_delta_week": 6,
  "sessions_this_week": 3,
  "sessions_goal": 5,
  "days_until_interview": 12,
  "today_question": {
    "id": "uuid", "day_number": 4, "topic": "…", "question_text": "…",
    "learning_goal": "…", "difficulty": "medium", "focus_skill": "…",
    "already_answered": false
  },
  "whatsapp_connected": true,
  "readiness_trend": [{ "day": "Mon", "score": 71 }],
  "topic_confidence": [{ "topic": "Kubernetes", "percent": 25 }],
  "streak_days": 3,
  "weekly_review_summary": "You practiced 3 times this week and gained 6 readiness points…"
}
```

**How each field is computed:**

| Field | Derivation |
|---|---|
| `name` | `users.name`, falling back to the local part of the email |
| `readiness_score` | `min(100, weighted_score + 2 × response_count)`. **Counts `responses` rows only** — roadmap-modal answers don't move it. |
| `readiness_delta_week` | Current score minus the score using only responses older than 7 days |
| `sessions_this_week` | Distinct calendar days with ≥1 response, Mon–Sun, **capped at 5** |
| `days_until_interview` | `roadmaps.interview_date − today`, floored at 0; `null` if unset |
| `today_question` | Lowest-numbered day **without a response**. If all are answered, the last day with `already_answered: true`. Driven by `responses`, so it does **not** track `questions.status`. |
| `readiness_trend` | 7 points, oldest→newest, each the score as of end of that day. `day` is a short name (`"Mon"`) — a 7-day window can repeat the same label. |
| `topic_confidence` | Up to 6 entries from the analysis's `requirement_matches`, mapping `strength` → percent (strong 90 / partial 55 / weak 25 / none 10). Falls back to legacy flat arrays, then to roadmap topics at a flat 20%. **Not derived from answers** — it does not move as the user practises. |
| `streak_days` | Consecutive days with ≥1 response ending today or yesterday; otherwise 0 |

Date maths is done in the **server's local timezone**, not the user's.

**404** if the user row is gone.

### `POST /api/dashboard/practice-answer`
Submit the day's answer from the dashboard. **This is the only endpoint that moves the readiness score.**

```json
{ "question_id": "uuid", "answer_text": "…" }
```

`question_id` is a `questions` row id (a day).

**200**
```json
{
  "success": true,
  "readiness_score": 81,
  "sessions_this_week": 3,
  "today_question": { "id": "uuid", "day_number": 5, "…": "…", "already_answered": false }
}
```

| Status | When |
|---|---|
| 400 | `{ "error": "question_id and answer_text are required" }` |
| 404 | Question not found or not on your roadmap |
| 500 | Insert failed |

**The answer is stored but never scored** — `responses.score` stays NULL. Readiness moves because the answer *count* rose, not because the answer was good. Submitting twice for the same day inserts two rows and adds 4 points.

---

## Notifications

### `GET /api/notifications`
Newest-first feed, capped at **30** rows (`FEED_LIMIT`) — this backs a header dropdown, not a history view.

**200**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "day_unlocked",
      "message": "Day 2 unlocked: System Design Basics",
      "related_id": "uuid",
      "is_read": false,
      "created_at": "2026-07-17T10:00:00.000Z"
    }
  ],
  "unread_count": 2
}
```

`type` in use: `'answer_scored'`, `'day_unlocked'`, `'whatsapp'`. `related_id` is an untyped pointer (usually a day id) with no FK.

### `POST /api/notifications/read-all`
**200** → `{ "success": true, "unread_count": 0 }`

### `POST /api/notifications/:id/read`
**200** → `{ "success": true }` · **404** if the notification isn't yours.

Declared after `read-all` in the router so `"read-all"` isn't captured as an `:id`.

---

## WhatsApp

### `GET /api/whatsapp/sandbox-info`
**Public** — the connect page needs it before the user is meaningfully set up.

**200**
```json
{
  "sandboxNumber": "+14155238886",
  "joinKeyword": "join grew-worry",
  "waLink": "https://wa.me/14155238886?text=join%20grew-worry"
}
```

`joinKeyword` comes from `TWILIO_SANDBOX_KEYWORD`. The sandbox number is **hardcoded** in `index.ts` and is not read from env.

---

## Python AI Service

Internal — called by the backend, not the browser. Base URL: `PARSE_API_URL` (default `http://localhost:8001`).

### `GET /health`
```json
{ "status": "ok", "service": "preppilot-analysis-api", "version": "1.0.0" }
```

### `POST /parse`
`multipart/form-data`: `resume_file` (PDF/DOCX, ≤10 MB) + `jd_text`. Runs the 3-wave, 12-agent LangGraph pipeline and returns the full analysis report.

| Status | When |
|---|---|
| 400 | Unsupported extension · empty `jd_text` |
| 413 | File > 10 MB |
| 422 | No text extractable from the resume |

Quota errors surface as a 500 whose `detail` contains `RESOURCE_EXHAUSTED`; the backend translates that into its own 502 with a friendly message. The service retries a quota-limited agent up to 2 times, honouring Gemini's `retryDelay`.
