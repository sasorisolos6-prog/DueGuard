# DueGuard Privacy & Data Flow Guarantee

DueGuard is built on zero-knowledge, data-minimalist principles. Here is an exact map of how personal data is handled:

## 1. Data Collection & Processing
* **Local Demo Mode:** All trackers and settings remain strictly in your browser (`localStorage`). Zero network requests are sent to any server.
* **Account Creation (Optional):**
  * **Email & Name:** Used solely to identify your account and send requested expiry alerts.
  * **Password:** Salted with a unique 16-byte cryptographically secure random salt and hashed using **PBKDF2-HMAC-SHA256 (100,000 iterations)**. Plaintext passwords are never stored, logged, or returned.
* **Trackers & Invoice Attachments:**
  * Stored in your private Cloudflare D1 vault database.
  * Invoices are compressed locally to WebP before upload and stored as base64 in private tables.
  * Served only over authenticated HTTPS sessions after validating your account owns that tracker. No public URLs exist.
* **Data Not Collected:** DueGuard does not collect phone numbers, addresses, dates of birth, payment cards, bank details, device advertising IDs, or hardware identifiers.

## 2. Third-Party Integrations
* **Email Alerts (Resend):** Only invoked if you enable Email Alerts. Transmits recipient email, alert subject, and reminder details. No user passwords or attachments are shared.
* **Telegram Bot Alerts:** Only invoked if you connect your chat via `/start <CODE>`. Stores your numeric Telegram chat ID solely to dispatch deadline notifications. Unlinking deletes this ID immediately.
* **Android Native Alarms:** Scheduled 100% offline on your device using native Android alarms (`LocalNotifications`). No cloud relay needed.
* **Zero Tracking & Analytics:** No Google Analytics, no Facebook Pixel, no session recording, and no ad SDKs are loaded.

## 3. Storage & Cookies
* No tracking cookies or session cookies are used.
* The frontend stores only your ephemeral JWT authorization token and UI theme preference (`dark`/`light`) in client storage. User PII is held in memory during the active session.

## 4. Logs & Error Handling
* Application logs and error handlers automatically scrub and redact emails, Telegram bot tokens, API keys, and authorization headers (`[REDACTED]`).
* Database error traces redact any user identifiers before output.

## 5. Right to Portability & Permanent Deletion
* **Data Export:** Export your complete data anytime via **1-Click JSON Backup** or **1-Click Calendar (.ics)**.
* **Permanent Deletion:** Use **Delete Account & Wipe Vault** in the Alerts & Settings modal to instantly and permanently erase your user row, all trackers, invoice attachments, and notification delivery logs from the database. In Local Demo mode, use **Reset Local Demo Vault** to clear all browser storage.
