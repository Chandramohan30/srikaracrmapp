# Srikara Training & Placement CRM

A production-ready, full-stack CRM built specifically for **Srikara Training & Placement Academy**, adhering strictly to the institute's branding (derived from the official Srikara logo: crimson `#B91C1C`, deep charcoal `#1E242B`, golden amber `#D97706`) and relational business architecture.

---

## 1. Key Business Rules Implemented

- **Rule 1 & 2**: Course information and tuition pricing dynamically loaded from **Course Master** (never hardcoded in frontend).
- **Rule 4 & 5**: Automated **3-installment generation** dividing total course fee with exact decimal rounding:
  - Full Stack (₹30,000) &rarr; ₹10,000.00 / ₹10,000.00 / ₹10,000.00
  - AI/ML (₹35,000) &rarr; ₹11,666.67 / ₹11,666.67 / ₹11,666.66
  - **No money created or lost** due to floating point inaccuracies (`SUM = course base price`).
- **Rule 6**: Installment months start from the student's joining month.
- **Rule 7 & 8 (CRITICAL DUE ISOLATION)**: Unpaid balance **NEVER** carries forward into future installments.
  - E.g., Arun Kumar: January (₹10,000, Paid: ₹6,000 &rarr; Due: ₹4,000 in RED `PARTIALLY PAID`). February remains ₹10,000 (Paid: ₹0, Due: ₹10,000 `PENDING`).
- **Rule 9 & 12**: Students can pay **any installment** (future installments are not disabled). Students cannot edit amounts.
- **Rule 11 & 14**: Only **Admin** can edit installment amounts and add **Manual Installments**.
- **Rule 13 & 14**: Partial payments supported; every individual transaction is retained in the payment ledger.
- **Rule 17 & 27**: Leave approval/rejection with remarks is strictly restricted to Admin. Trainers and students have view-only access to relevant records.
- **Rule 18 & 23**: Trainers configure class timings for assigned students, creating Google Calendar events and Google Meet links with instant 1-click web sync and `.ics` iCalendar export.
- **Rule 20**: Fees are collected by **UPI** (`chankannan30-2@okhdfcbank`). The student pays in any UPI app, uploads the payment screenshot and presses **Verify**; without a screenshot nothing is submitted. Only **Admin** can open receipts (PDF download, WhatsApp, Gmail).

---

## 2. User Roles & Access Control

- **Admin (Rajesh Kumar - Director)**: Full control over admissions, financial ledger, manual adjustments, trainer assignments, leave approvals, course catalog, and audit logs.
- **Trainer (Chandramohan V / Dr. Priya Sharma)**: Access restricted to assigned students, class timetable configuration, Google Calendar sync, and student leave visibility. Cannot modify financial amounts or approve leaves.
- **Student (Arun Kumar, Deepa Sharma, etc.)**: Access restricted to own course, trainer profile, installment schedule, UPI payment with screenshot upload (no receipt access), and leave application. Cannot modify course pricing or installment amounts.

> **Logins**: The database starts empty with one Admin sample login (`admin@srikaraacademy.com` / `Admin@123`).
> When you onboard a **student** or **trainer**, they sign in with the **email you entered** and their **Student ID (e.g. `SRK-2026-001`) / Trainer ID (e.g. `TRN-001`) as the password**.

### Authentication (access + refresh tokens)

| Token | Lifetime | Where it lives |
|---|---|---|
| Access token | 15 minutes | sent as `Authorization: Bearer ...` |
| Refresh token | 7 days, **rotated on every use** | browser storage; only its SHA-256 hash is stored in MongoDB (`refreshtokens`) |

- `POST /api/auth/login` returns `accessToken` + `refreshToken`.
- `POST /api/auth/refresh` swaps a refresh token for a new pair. Re-using an already-rotated refresh token revokes every session of that user.
- `POST /api/auth/logout` revokes this device; `POST /api/auth/logout-all` revokes all devices.
- The browser refreshes silently on any `401` and retries the request once; if the refresh token is dead the user is sent to the login page.

### Receipts (admin only)

- `GET /api/payments/:id/receipt` - PDF download (admin).
- `POST /api/payments/:id/receipt-link` - creates a signed link (30 days) that is put inside the WhatsApp / e-mail text.
- `GET /api/receipts/shared/:token` - opens the PDF from that link (no login; the signature is the protection).
- `GET /api/payments/:id/proof` - the student's payment screenshot (admin).

---

## 3. Database Schema

- `users` (id, name, email, phone, role, status, student_id, trainer_id, created_at)
- `courses` (id, course_code, course_name, description, duration, base_price, status, created_at, updated_at)
- `trainers` (id, user_id, trainer_code, name, email, phone, specialization, experience, joining_date, status, skills)
- `students` (id, student_code, user_id, first_name, last_name, full_name, email, phone, qualification, course_id, trainer_id, joining_date, total_course_amount, total_paid, total_outstanding, payment_status, status)
- `installments` (id, student_id, installment_number, month, installment_amount, paid_amount, due_amount, due_date, status, is_manual, notes)
- `payments` (id, student_id, installment_id, transaction_id, amount, payment_date, payment_method, gateway, receipt_number, recorded_by)
- `leaves` (id, student_id, from_date, to_date, days, reason, status, admin_remarks, approved_by, approved_at)
- `class_schedules` (id, student_id, trainer_id, title, topic, class_date, start_time, end_time, meeting_url, google_event_id, google_calendar_synced)
- `audit_logs` (id, user_id, user_name, user_role, action, entity, entity_id, old_value, new_value, created_at)

---

## 4. Setup & Running Locally

Set `MONGODB_URI` in `.env` (see `.env.example`). All data is stored in MongoDB Atlas and served through the Express API (`/api/...`). No demo data is seeded.

```bash
# 1. Install dependencies
npm install

# 2. Run development server (port 3000)
npm run dev

# 3. Production build
npm run build
npm start
```
