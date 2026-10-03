# Security rollout

## Implemented

- Password verification for staff and owners; legacy plain passwords are converted to scrypt hashes when the store loads and persisted on the next successful write.
- Random 12-hour server sessions stored as token hashes. Cookies are HttpOnly and Secure in production. Password changes, disabling an account and logout invalidate sessions.
- CSRF tokens on authenticated writes; rate limiting login attempts; no local/offline password fallback.
- Platform administration requires a platform administrator session. Company settings, staff, bot settings, broadcasts and imports require the company owner; finance requires an owner, administrator, manager or cashier of that company.
- Passwords and session records are removed from JSON API responses. Bot tokens are returned only to the company owner or platform administrator.

## Deployment requirements

This change does not execute server commands. Deploy backend and frontend together over HTTPS. The existing installer sets `NODE_ENV=production` in the image.

Platform login uses only `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD` from the server environment. There is no automatic `admin` or `admin123` alias, and no fallback platform password if the environment password is absent. Existing owner/staff passwords remain valid. New owners and staff must receive an explicit password.

Old locally cached login data is not a server session: sign in again after updating. Save a verified backup before updating. Rolling back to an older build will not restore plaintext passwords; password verification changes must remain in any rollback build.

## Telegram and operational access

Operational company APIs now require a staff session or a specifically permitted, signed MiniApp operation. Staff are bound to their company. Operators, cashiers and warehouse staff are limited to their assigned location; unassigned staff are denied access. Branch employees use the working sections; company-wide dashboard/finance summaries and deletion require management access. Customer registration/editing and package receipt are allowed to the relevant operational roles; cashier issuance uses WMS. Bulk administrative intake remains a management operation.

MiniApp sends Telegram `initData` with requests; HMAC verification follows https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app. Data older than 24 hours is rejected: reopen the MiniApp. A separate public bootstrap contains company information and locations; personal records are added only for the verified Telegram user. Client bulk intake cannot overwrite existing shipment statuses, weights or ownership. Arbitrary cargo codes and Telegram IDs no longer authenticate a customer.

Customers without a linked Telegram user ID need a verified administrative link before using their existing client account. The old cargo-code/last-four-phone-digit lookup is no longer a way to access another account. Opening the MiniApp outside Telegram shows public information but does not allow registration or personal operations.

Deploy frontend/backend together and restart the backend. Startup configures a per-bot webhook secret and keeps pending Telegram updates. Webhook requests without that secret are rejected; check that startup webhook registration succeeds. This document does not run any server commands.

## Still pending

Financial transactions/idempotency, comprehensive server-authoritative tariffs/status transitions, and verified administrative linking of legacy customers need further implementation and integration checks. This is not a completed resilience rollout.

PostgreSQL migration, off-server backups, restore drills, monitoring, the production Compose bundle and the remaining business protections are also pending.
