# DueGuard — Trials, Returns, Recharges & Warranty Guard

DueGuard is an open-source, full-stack **Website + PWA + Android App** that stops you from losing money to forgotten auto-renewals, missed Amazon/Flipkart return windows, expired mobile recharges, and lost warranty bills.

## Features
* **Smart Dashboard:** Tracks Monthly Burn (`₹/mo`), Annual Projected Spend (`₹/yr`), Urgent Deadlines (`≤7 days`), and Money Saved from cancelled trials/subscriptions.
* **1-Tap Indian Presets:** Free Trial Trap, 7-Day Return Window, Monthly OTT/App, 84-Day Mobile Recharge, 1-Yr Warranty + Bill, and Insurance/PUC/Docs.
* **Private Invoice Screenshot Vault:** Automatically resizes and compresses receipts to WebP in your browser before storing them in your private Cloudflare D1 vault (verified per-user on every download, with zero credit card required to host).
* **Multi-Channel Alerts (₹0 Cost):**
  * **Daily Cron Email Alerts** (via Resend free tier)
  * **Telegram Bot Alerts** (`₹0` forever via `/start <code>` linking)
  * **Offline Android Local Alarms** (inside the Capacitor Android app)
  * **1-Click `.ics` Calendar Export**
* **Trust & Portability:** Try locally before signing up, 1-click JSON export, and 1-click permanent account + vault deletion.

---

## Tech Stack
* **Web + PWA + Android:** React 19, Vite, TypeScript, Tailwind CSS v4, `vite-plugin-pwa`, Capacitor 7 (`@capacitor/android`, `@capacitor/local-notifications`)
* **Backend API + Cron:** Cloudflare Workers, Hono, Cloudflare D1 (SQLite), Web Crypto PBKDF2 + JWT (`jose`)

---

## Local Development (Runs 100% Free Without Cloud Accounts)

1. **Install dependencies** (requires Node.js 20+):
   ```bash
   npm install
   ```

2. **Configure local API secrets:**
   Copy `.dev.vars.example` to `apps/api/.dev.vars` and set a random `JWT_SECRET` (at least 16 chars).

3. **Initialize local D1 SQLite database:**
   ```bash
   npm run db:migrate:local
   ```

4. **Start API & Web in two terminals:**
   ```bash
   npm run dev:api
   npm run dev:web
   ```
   * Web app runs at `http://localhost:5173`
   * API runs at `http://127.0.0.1:8787` (with `/api` proxied automatically by Vite)

5. **Test Daily Cron Reminders locally:**
   Visit or curl `http://127.0.0.1:8787/__scheduled` while `npm run dev:api` is running.

---

## Deploying to Production (₹0 Cloudflare Free Tier — No Card Required)

1. Create D1 database:
   ```bash
   cd apps/api
   npx wrangler d1 create dueguard-db
   ```
2. Paste your real `database_id` into `apps/api/wrangler.toml`, then apply remote migrations:
   ```bash
   npm run db:migrate:remote
   ```
3. Set production secrets cleanly in Cloudflare (never commit secrets!):
   ```bash
   npx wrangler secret put JWT_SECRET
   npx wrangler secret put RESEND_API_KEY
   npx wrangler secret put TELEGRAM_BOT_TOKEN
   ```
4. Deploy Worker API (`npm --workspace=apps/api run deploy`) and deploy `apps/web/dist` to **Cloudflare Pages** with `VITE_API_URL` pointing to your deployed Worker URL.

---

## Building the Android `.apk`

### Option A: Automatic Cloud Build via GitHub Actions (No Android Studio Needed)
1. Push this repository to GitHub (set repository variable `VITE_API_URL` in GitHub Settings → Actions → Variables to your live Worker API URL if building a connected APK).
2. Open the **Actions** tab → **Build DueGuard Web & Android APK** → download the generated `dueguard-android-debug-apk` artifact!

### Option B: Local Android Studio Build
```bash
npm run cap:sync
cd apps/web
npx cap open android
```
Build/sign your `.apk` or `.aab` inside Android Studio when ready for Google Play Store.
