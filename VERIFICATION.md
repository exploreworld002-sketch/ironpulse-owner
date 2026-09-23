> Historical verification from the previous MongoDB release. Not evidence for this desktop release. Current results: docs/TEST-RESULTS.md.

# Verification for the local ZIP

Checked on 16 September 2026 with Node.js 24.19.0 and an isolated MongoDB 8.0.12 process.

- 14 domain regression tests passed.
- 37 real HTTP/MongoDB checks passed.
- TypeScript check passed.
- Standalone React production build passed.

## What was exercised

Empty database startup; no sample plans/members/payments/attendance; initial administrator provisioning; login; unauthenticated request rejection; create/edit plans; preservation of member fees and dates after plan edits; create/edit members; full/partial payment rules; overpayment prevention; integer-paise balance calculations; date and calendar-month handling; active membership renewal with payment history preservation; duplicate and expired attendance prevention; optimistic concurrency rejection; cross-origin write rejection; photo upload and authenticated retrieval; staff account creation and enforced restrictions; valid/invalid backup restore; dependent-record deletion; logout token revocation.

## Review fixes

- Removed automatic sample data and demo account creation from local startup.
- Added membership-plan editing, stable plan IDs and duplicate-name validation.
- Added a first-plan empty state and prevented add-member crashes with no plans.
- Added member renewal with additional fees and preserved payment history; active members stay active when renewed.
- Fixed calendar-month end-date calculation, including leap years.
- Used integer paise for balance comparisons and payment sums.
- Strengthened restore validation for overpayment, duplicate records and invalid references.
- Kept failed destructive/restore dialogs open so errors can be corrected.
- Disabled automatic HTTPS asset upgrades on local HTTP while retaining production security headers.
- Removed assumed fourth-plan “best value” labelling for user-defined plans.
- Used the configured gym name on receipts and signed-in user initials in the account UI.
- Added local environment setup and Docker Compose configuration.

## Not verified here

Browser interaction and visual responsiveness were not exercised with an automated browser. Excel/PDF downloads were reviewed in source but not opened in desktop applications. Docker Desktop/container execution was not run here. Native Express/MongoDB endpoints were tested directly. Messaging delivery remains intentionally preview-only and no external provider was contacted. Optional QR attendance is not implemented.

## Repeat API integration tests

Use a new EMPTY disposable MongoDB database with a name ending in `_test`. The runner refuses a non-empty database and deletes only its own test database on completion. It starts/stops a temporary Express test server. Do not point it at your real gym database.

Windows PowerShell:

```powershell
$env:TEST_MONGODB_URI='mongodb://127.0.0.1:27017/ironpulse_integration_test'
node --experimental-strip-types server/integration.test.mjs
Remove-Item Env:TEST_MONGODB_URI
```

macOS/Linux:

```sh
TEST_MONGODB_URI=mongodb://127.0.0.1:27017/ironpulse_integration_test node --experimental-strip-types server/integration.test.mjs
```

These test fixtures are never loaded by normal application startup.
