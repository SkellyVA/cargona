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

## Still pending — not a complete API security boundary

Operational package/customer/trip APIs, the aggregate `/all` response, per-branch permissions, MiniApp authentication and Telegram webhook verification still require the next implementation stages. Existing personal-data access through those routes is not yet closed. Financial endpoint role checks do not yet replace transaction/idempotency or branch isolation.

PostgreSQL migration, off-server backups, restore drills, monitoring, the production Compose bundle and the remaining business protections are also pending.
