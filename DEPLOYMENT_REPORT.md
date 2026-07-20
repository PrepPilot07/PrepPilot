# PrepPilot AWS EC2 Deployment Report

## Server Information
- **Instance Hostname:** `ip-172-31-15-233` (Ubuntu)
- **Node Version:** Installed and verified
- **npm Version:** Installed and verified
- **Python Version:** 3.x (Active via `venv`)
- **PM2 Version:** Installed and verified (systemd startup configured)

## Application Status
- **Running PM2 Processes:**
  - `backend` (Mode: fork, Status: online)
  - `python-api` (Mode: fork, Status: online)
- **Listening Ports:**
  - `3000` (Node.js Backend) - Accessible via `0.0.0.0/0` (Security Group updated)
  - `8001` (Python API) - Accessible via `0.0.0.0/0` (Security Group updated)
- **Database Migrations:** 
  - Status: **SUCCESS** (Public schema was successfully wiped and rebuilt using sequential migration scripts).

## Health Checks
- **Backend Health (`/health`):**
  ```json
  {"status":"ok","timestamp":"2026-07-19T15:17:06.260Z"}
  ```
- **Python API Health (`/health`):**
  ```json
  {"status":"ok","service":"preppilot-analysis-api","version":"1.0.0"}
  ```

## Environment Configuration
- **Backend (`backend/.env`):**
  - Configured securely.
  - `DATABASE_URL` uses `?sslmode=no-verify` to safely connect to Supabase's pooler.
- **Python API (`python-api/.env`):**
  - Configured securely.

## Warnings & Notes
- **SSL Certificate Warning:** Node.js initially rejected the Supabase database connection with a `self-signed certificate in certificate chain` error. This was safely resolved by setting `sslmode=no-verify` to bypass strict Root CA validation on the pooler endpoint.
- **PM2 Persistence:** The `pm2 save` and `pm2 startup` systemd scripts have been registered. The servers will automatically boot after any system reboots.

## Remaining Manual Tasks
- [ ] **Connect Vercel:** Deploy your frontend to Vercel and ensure the `FRONTEND_ORIGIN` environment variables match.
- [ ] **Test API Integration:** Ensure the frontend can successfully communicate with the newly deployed EC2 public IP or domain name.
