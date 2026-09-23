# Windows x64 acceptance record — unsigned release

Status: NOT RUN. Complete every row using the exact downloaded installer.
Keep this record with the owner; do not label a build client-tested just because CI passes.

## Record before testing

- Tester / date:
- Git commit and GitHub Actions run URL:
- Installer filename: Ironpulse-Setup-x64.exe
- Expected SHA-256 (from SHA256SUMS.txt):
- Actual SHA-256:
- Windows edition/version/build (run `winver` or use Settings → System → About):
- CPU architecture (must be x64):
- VM/PC A and distinct VM/PC B identifiers (use labels, not raw hardware IDs):
- Public license key fingerprint (from owner audit):
- Signature: expected **NotSigned**, not a signing failure.

On an owner/test PC, built-in PowerShell can record the hash:

```powershell
Get-FileHash .\Ironpulse-Setup-x64.exe -Algorithm SHA256
Get-AuthenticodeSignature .\Ironpulse-Setup-x64.exe
```

No terminal use or developer software should be required for the client's normal
installation. Use a clean standard-user test account with no Node/database/Docker.
Download the artifact through a browser to exercise downloaded-file warnings.
Snapshot disposable VMs before time-change and tampering tests; back up all records.

| # | Test and expected result | Pass/Fail/Blocked | Evidence / actual result |
|---|---|---|---|
| 1 | Hash matches the supplied checksum. Record Windows version and EXE hash above. | NOT RUN | |
| 2 | Standard-user install needs no developer tools or administrator elevation. If SmartScreen prompts, expected unsigned publisher warning and More info → Run anyway work where policy permits. Never disable security policy. | NOT RUN | |
| 3 | Launch shows only activation. No gym records, setup or login access before activation. | NOT RUN | |
| 4 | Save activation request; restart app and Windows; save another. Compare machine hashes: identical. | NOT RUN | |
| 5 | On owner PC, issue a short-lived license for A using the production private key and OWNER-LICENSING.md. Import on A: accepted. This is a test customer license, not a test verification key in the app. | NOT RUN | |
| 6 | Create admin credentials. Plans, members, payments and attendance start empty. Incorrect login fails, correct login succeeds; logout removes access. | NOT RUN | |
| 7 | Create a Staff account. Staff can record payments/attendance but cannot edit plans/settings, delete members, restore backup or create accounts. | NOT RUN | |
| 8 | Alter one character of a copy of the signed license payload/signature; import: rejected. Existing valid activation must not be replaced by invalid input. | NOT RUN | |
| 9 | Generate a separate throwaway owner keypair outside the project, issue for A and import: rejected (wrong issuer). Never change the production public-key variables. | NOT RUN | |
| 10 | Install on distinct B and import A's license: rejected. With both apps closed, copy A's application-data folder to B; restart B: fresh activation still required. B must have a distinct Windows/hardware identity. | NOT RUN | |
| 11 | In a disposable VM snapshot, advance the clock past the test license's expiry; app rejects data access and requests activation. Restore the VM snapshot afterwards. Record expiry and observed result. | NOT RUN | |
| 12 | In a separate snapshot with valid activation, use app at correct time, set clock back over 5 minutes, attempt access: rejected. Restore clock to at least previous highest valid time: recovery succeeds (sign in again if needed). | NOT RUN | |
| 13 | Create a plan and member with sufficient outstanding fee. Record today: Cash ₹100, UPI ₹200, Card ₹300, Bank Transfer ₹400. Payments, Dashboard recent payments and Reports Revenue filters each show only matching rows and those totals; All totals ₹1,000. Ensure report date range includes today. | NOT RUN | |
| 14 | Edit plan; existing member fee/history unchanged. Renew member; prior payments remain. Test partial payment, overpayment rejection, check-in and duplicate check-in rejection. | NOT RUN | |
| 15 | Upload member photo, download backup, change a record, restore: original records/photo return. Malformed backup rejected without partial changes. Restart app: records persist. | NOT RUN | |
| 16 | Open payment receipt, print to Microsoft Print to PDF; verify member, amount, method, gym and dates. Print each filtered Revenue report and verify totals. | NOT RUN | |
| 17 | Export Revenue for each method and All; open in Excel/compatible spreadsheet app. Confirm rows/totals and record any format warning (.xls is SpreadsheetML). | NOT RUN | |
| 18 | Offline launch/login/normal work succeeds with valid license. Reinstall/upgrade preserves records. | NOT RUN | |
| 19 | On an isolated copy of the installed app, change an equal-length byte in a readable renderer asset inside app.asar without regenerating integrity metadata. Launch must reject the tampered archive before normal UI use. Restore original archive and confirm launch. Record result; a fuse report alone is insufficient. | NOT RUN | |

For test licenses: save A's real request and run on your owner computer after
securely setting the signing passphrase:

```sh
node owner-only/license-tool.mjs issue owner-secrets/license-private.pem A-request.json "Acceptance test A" YYYY-MM-DD A-test.ironlicense
```

Replace YYYY-MM-DD with a future date suitable for testing. To test another issuer,
use a separate temporary directory/keypair and the same request. Do not send private
keys to CI or clients. Time changes require permission on the disposable test host;
restore snapshots to avoid contaminating later tests with clock-rollback state.

## Final disposition

- Overall: NOT RUN / FAIL / PASS
- Failures, exceptions, screenshots and logs:
- Re-tested installer hash (if fixes changed it):
- Approved by / date:
- Actual client support contact added to INSTALLATION.md:

Release only after required checks pass. Send only the installer, Windows client
instructions/support details and checksum. Supply the customer's license separately.
Keep source, owner tools, test licenses/records and all private keys with the owner.
Unsigned is the agreed distribution mode, not a claim of verified publisher identity.
