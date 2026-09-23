# Unsigned Windows workflow verification

Current local checks: **25 automated tests passed**, TypeScript passed, frontend
production build passed (large-chunk warning), workflow YAML parsed. New checks
cover the unsigned configuration, canonical public-key hashing and private-key
rejection, plus real synthetic ASAR extraction rejecting nested environment and
database files. These are Linux source/tool checks, not a Windows release build.

No production public key, GitHub repository or Windows artifact was available.
The workflow has not run; actual packaged ASAR/fuse inspection and all Windows
acceptance results remain pending. No installer SHA-256 is available yet.

The prior baseline results below remain historical context.

# Verification — 23 September 2026

Environment: Linux x64, Node.js 24.19.0. These results verify source and local
business logic, not Windows/macOS installers.

| Check | Result |
|---|---|
| `pnpm test:all` | 22 tests passed; 0 failed or skipped |
| `pnpm typecheck` | Passed |
| `pnpm build:standalone` | Passed; Vite reports a large frontend chunk warning |
| Privileged backend esbuild bundle with release options | Passed |

The 22 tests comprise 14 business-rule regression tests, six desktop/payment/license
tests, and two owner-tool/package-audit tests. Desktop API tests use an actual
empty temporary SQLite database. They cover initial administrator setup, login,
license enforcement, plan edits, four payment methods, overpayment rejection,
attendance, optimistic concurrency, staff restrictions, photos, backup/restore,
expired-license session invalidation and logout. Persistence is checked by closing
and reopening SQLite.

Licensing checks reject another machine, another issuer, modified payloads, expired
and future licenses, the wrong product, and clock rollback. Owner-tool checks
verify encrypted private keys, wrong-passphrase failure, valid issuance, invalid
dates, blank customer names and overwrite prevention. Test-only generated keys,
licenses and databases are temporary and removed; none is included in the ZIP.

Package-audit tests use deliberately synthetic staging fixtures. They verify
rejection of source maps, TypeScript, private keys and unexpected main-loader code.
They do NOT establish that a real signed installer passed an archive inspection.

## Not executed

Native Electron bytecode compilation/loading, Windows/macOS GUI interactions,
hardware identifier collection, installer creation, code signing, notarization,
ASAR/fuse behavior, clean-machine installation, OS print dialogs and Excel opening
were not tested here. No Windows or Mac executable is included. The legacy MongoDB
integration suite was not rerun for this desktop release. Previous results in
VERIFICATION.md are historical only.

Complete docs/RELEASE-STATUS.md on every supported OS/architecture before client
release. Original readable source is included only in this OWNER project ZIP;
never distribute it to clients.
