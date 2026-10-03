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

Comprehensive server-authoritative tariffs/status transitions need further implementation and integration checks. This is not a completed resilience rollout.

## WMS issuance and payment retries

WMS waits for the API before showing success or changing local parcel/cash state. Errors preserve the selected parcels and form. The request uses a persisted operation key; if the response is lost, retrying the same request returns its saved result without creating another payment, audit entry or cash increase. Reusing a key with another payload is rejected. A different key cannot reissue a released parcel. Exact client lookup replaces the fallback to the first customer.

The API validates company, client, location, ready status, unique parcel IDs (including tracking aliases), weighing and stored costs. Payment is the server's rounded USD sum; parcels already marked as paid online are excluded from the amount collected. Existing panel `package.cost` and branch cash values are USD, so new WMS payments explicitly record USD and the authenticated cashier. Transfer payments do not increase cash. Photos are persisted with the issuance.

Issuance, cash update, payment, audit and retry receipt are saved in the same atomic JSON snapshot. A failed write returns an error and the existing storage-failure guard blocks subsequent API operations. This is supported for the current single API process; concurrent processes sharing JSON are not supported. PostgreSQL transactions remain pending. Deploy backend/frontend together; the new WMS endpoint requires the operation key provided by the updated interface.

## Finance, collections, refunds and reconciliation

Financial writes use persisted operation keys. Errors keep the forms open; the panel waits for API confirmation, then refreshes the actual accounts, transactions, collections and balances. Account IDs come from the API; the panel no longer invents accounts. Positive finite amounts with at most two decimal places are required. Transfers require two distinct active accounts in the same company; outgoing operations cannot exceed the available balance. Explicit foreign currency amounts are converted by the API using the supplied positive exchange rate and the rate is stored in the transaction. This is a recorded staff-supplied rate, not a live market rate service.

Account and branch cash values continue to use the existing panel's USD convention. Old balances and old currency labels are not automatically converted. New WMS payments update the actual cash or bank account, with a per-package payment allocation. A difference between a PVZ branch's cash and its account blocks monetary operations until the owner performs a documented reconciliation. The owner can record the actual counted balance and reason through «Сверка кассы»; both representations then update in one write.

Collections have a one-way state machine: REQUESTED -> CONFIRMED or REJECTED. Requesting reserves/debits the exact PVZ cash; confirming credits the selected safe once; rejecting returns it to the source PVZ once. Cash in transit is displayed separately and remains included in total assets until confirmation or rejection. Repeating the same terminal action returns success without another money movement, even with a new key. Attempting the opposite terminal action is rejected. Confirmation and rejection require the owner. The old direct branch-cash-zeroing endpoint is removed: the branch action creates a normal collection pending acceptance.

Refunds require an original company payment or a new verified customer-payment transaction. The sum of refunds, including parcel-linked refunds, cannot exceed that payment's remaining USD amount. Old ambiguous payment/currency records require manual audit and cannot be automatically refunded. A refund of a customer balance payment reverses the corresponding balance increase. Physical parcel returns are separate: the parcel-return forms default to zero money and direct the owner to «Возврат оплаты» in Finance. A parcel refund through the API also requires a verified per-parcel payment allocation. Direct PUT balance/cash/refund fields are rejected.

Income, expenses, transfers, collection transitions, customer balance movements, trip costs, refunds and reconciliation are recorded with the authenticated actor. Monetary audit records retain balances before/after; the journal shows the source balance change. Customer debt payments increase the customer's balance toward zero. A separate owner-only charge can increase debt without pretending to receive cash. The weekly revenue chart now uses actual dated records instead of fabricated percentages.

Existing money and historical transactions are preserved. Deploy API and web together. Retry receipts, ledger records and balance changes use the same atomic JSON write and survive restart; only one API process may write this JSON store. No server commands or real payment transfers are performed by these changes.

The PostgreSQL trial-transfer CLI is available; see [the migration runbook](postgres-migration.md). It preserves and verifies the full legacy document without changing the running API. PostgreSQL runtime switching, off-server backups, restore drills, monitoring, the production Compose bundle and the remaining business protections are still pending.

## Link an existing customer to Telegram

The owner opens the customer card and selects «Привязать Telegram». Verify the recipient's identity, then copy and personally deliver the link. Do not post it publicly: possession of this link grants the right to claim that customer account. An administrator/manager cannot issue these links.

The bot must have an active configuration and a Main Mini App configured in BotFather for `https://t.me/<bot>?startapp=...` links to open the app, as described in https://core.telegram.org/bots/webapps#launching-mini-apps. The MiniApp previews the name and cargo code and requires an explicit confirmation from a verified Telegram user. No message is sent automatically.

Links expire after 30 minutes, are single-use and are stored only as hashes. Reissuing invalidates the previous link. Already linked or blocked customers cannot be claimed; an existing Telegram customer cannot claim a second account in the same company. Existing IDs, parcels, weights and balances remain unchanged. Issuance and confirmation are audited. Deploy backend and frontend together; no server commands are executed by this change.
