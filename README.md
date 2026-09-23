# Windows unsigned build update

For the current Windows-only unsigned workflow, read [WINDOWS-UNSIGNED-BUILD.md](docs/WINDOWS-UNSIGNED-BUILD.md) and [WINDOWS-ACCEPTANCE.md](docs/WINDOWS-ACCEPTANCE.md). No GitHub run or installer is included in this owner handoff. The signed-build requirements below apply only to the older signed release route.

# Ironpulse 2.0 — OWNER PROJECT, NOT A CLIENT INSTALLER

**Keep this entire ZIP private. Do not send this source project to clients.**

This handoff contains the updated application source, automated tests, owner-only
license issuer, and native Windows/macOS installer build workflow. **It does not
contain a built, signed, notarized or platform-tested `.exe`/`.dmg`.** Those release
steps need your signing credentials and native Windows/macOS runners. See
[release status](docs/RELEASE-STATUS.md) before distributing anything.

## Implemented

- Cash / UPI / Card / Bank Transfer / All filters in Payments, Dashboard recent
  payments and Revenue Reports. Selected collections use integer-cent arithmetic.
  Revenue chart, report table, Excel export and printed report use the selection.
- Editable membership plans; current member fees/history remain unchanged when a
  plan is edited. Member editing, renewals, partial payments, receipts, attendance,
  reminders, reporting, roles and backups retain the shared validation rules.
- Desktop React application with embedded SQLite. Database and account tables are
  created on first launch. **No seed members, plans, payments or login account.**
  Client activates and creates their own administrator account.
- Hardware-bound Ed25519 licenses, checked in the privileged backend for every
  operation, including photos and backups. Windows binds to MachineGuid and system
  UUID; Mac binds to platform UUID. No Linux or fallback activation identity.
- Owner-only encrypted private key generation and signing tool; installers contain
  only the public verification key. No issued customer license or private key is supplied here.
- Main-process V8 bytecode; obfuscated renderer; no source maps; sandboxed renderer,
  restricted IPC, ASAR integrity and disabled Node/inspector environment switches.
- Native, signed installer configuration: Windows per-user NSIS; Intel and Apple
  Silicon Mac DMG. Signing is required; Mac notarization is enabled.

## Start here (owner / release developer)

1. Read [OWNER-SETUP.md](docs/OWNER-SETUP.md) to install development prerequisites,
   run checks and configure native signed builds.
2. Read [OWNER-LICENSING.md](docs/OWNER-LICENSING.md) to generate and protect your
   license key pair and issue a machine-bound license.
3. Complete [RELEASE-STATUS.md](docs/RELEASE-STATUS.md), including clean-machine
   installation/activation and backup tests on every supported OS/architecture.
4. Send clients **only** their finished signed installer, the
   [client instructions](client-handoff/INSTALLATION.md), and their issued license.

## Project layout and separation

| Path | Audience / purpose |
|---|---|
| `app/`, `components/`, `lib/`, `standalone/` | OWNER: UI and business source |
| `desktop/` | OWNER: SQLite, license verification, desktop bridge and build tools |
| `owner-only/` | OWNER ONLY: license issuer — never include in client package |
| `owner-secrets/` | OWNER ONLY: generated key files; ignored, absent from this ZIP |
| `tests/`, `server/domain.test.mjs` | OWNER: automated tests |
| `.github/workflows/desktop-release.yml` | OWNER: native signed candidate builds |
| `client-handoff/` | Client-safe instructions; **no executable is included** |
| `desktop-stage/` | Generated protected client payload; absent until native build |
| `client-installers/` | Generated signed installer candidates; absent in this ZIP |
| `server/`, `worker/`, hosted config | Legacy owner-only web edition; not bundled |

The legacy Express/MongoDB web edition is retained for owner reference. It does
not have the desktop license gate and must never be delivered as the licensed
client product. Its old setup notes are archived under `docs/LEGACY-MONGODB-OWNER.md`.
This desktop edition deliberately uses SQLite and private IPC sessions instead of
MongoDB/JWT/HTTP, so clients require no database service, terminal or Docker.

## Verification in this handoff

Run `pnpm test:all`, `pnpm typecheck`, and `pnpm build:standalone` after dependency
installation. Recorded results and precise limits are in `docs/TEST-RESULTS.md`.
Passing these tests does not certify a native installer. Desktop bytecode must be
compiled and tested with the exact bundled Electron version and architecture.

## Important limitations

Local software cannot be made impossible to reverse-engineer or patch. Bytecode
and obfuscation remove original readable application source from the intended
client payload and deter casual copying; they are not encryption or DRM guarantees.
Generic runtime/bridge code remains readable. See [SECURITY.md](docs/SECURITY.md).

SMS/WhatsApp/email reminders remain explicitly labeled previews; no message is
sent. PDF output uses the OS print dialog's Save as PDF. Excel output is SpreadsheetML
`.xls`, not `.xlsx`. Backups contain business records and referenced photos, not
login accounts or activation. Dates and reporting boundaries use UTC as shown in
UI. No payment processing or cloud backup service is included.
