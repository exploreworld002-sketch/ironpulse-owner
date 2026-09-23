# Windows unsigned pass

Unsigned Windows is now explicitly supported by `.github/workflows/build-windows.yml`. Actual native build and manual acceptance remain pending. Follow WINDOWS-UNSIGNED-BUILD.md and WINDOWS-ACCEPTANCE.md. The older signing gate below is superseded only for this opted-in unsigned Windows route; the native acceptance requirements remain.

# Release status — 2026-09-23

**Status: owner implementation handoff; NOT approved for client distribution.**

| Requirement | Delivered here | Remaining release work |
|---|---|---|
| Payment-method filters | Payments, Dashboard, Revenue Reports, totals/export; logic tests pass | Native UI acceptance |
| Nontechnical local install | Embedded DB, initial account setup, Windows/Mac installer config | Generate signed installers and test installation on native OSes |
| Hardware licensing | Signed machine licenses, gate, owner tool, negative tests | Real hardware-ID validation and clone/reinstall tests |
| Protected client package | Bytecode/obfuscation pipeline, allowlist audit, signing/fuses config | Native bytecode runtime test, signed ASAR inspection, accepted installer artifacts |

No `.exe` or `.dmg` exists in this handoff. The build/test environment was Linux x64;
Windows, Mac, Apple notarization and your signing identities were unavailable. The
project therefore does **not** meet the requested final client-ready release state
yet. Native builds are explicitly gated rather than shipping unsigned substitutes.

## Native acceptance gate (perform on each target)

Supported candidates: Windows x64, macOS Intel x64, macOS Apple Silicon arm64. Start
with current Windows 11 and supported macOS releases compatible with the pinned
Electron runtime; advertise exact minimum versions only after testing them.

- [ ] Build on the matching OS/architecture with the owner's public license key.
- [ ] Signing succeeds; verify expected publisher/Developer ID and timestamp.
- [ ] Mac notarization and stapling verified with Apple tools; Windows signature
      verified with SignTool or PowerShell Get-AuthenticodeSignature.
- [ ] Inspect actual `app.asar`: no private key, TS/TSX, source maps, owner tool,
      `.env`, server source, database, readable bundled main source or tests.
- [ ] Verify Electron fuses in the installed executable and ASAR tamper rejection.
- [ ] Clean standard-user install: no Node, database, terminal or Docker installed.
- [ ] Correct architecture installer launches without bytecode/SQLite errors.
- [ ] Unlicensed launch shows only activation; no member/payment/photo access.
- [ ] Activation request contains a stable fingerprint after restart.
- [ ] Vendor-issued correct license activates; invalid, expired, modified,
      wrong-machine and wrong-public-key licenses fail.
- [ ] Copy installer/license/database to a different machine: activation required.
- [ ] Clock rollback rejected; recovery after correct clock confirmed.
- [ ] First run has zero records; account setup completes; login/logout/incorrect
      password throttling work. Create both Staff and Admin accounts.
- [ ] Create/edit plans and members; photo upload; full/partial payment and due lists.
- [ ] All four method filters show correct rows/totals on Payments/Dashboard/Reports.
- [ ] Report range, filtered Excel, print/PDF and receipt save dialogs work.
- [ ] Staff cannot change plans/settings, delete members, create users or restore.
- [ ] Attendance, renewal, reminder preview and activity log work.
- [ ] Backup including photos; restore and invalid-restore rejection; restart persists.
- [ ] Offline normal use and license-expiry behavior verified.
- [ ] Upgrade/reinstall retains existing database; restore onto replacement computer
      with a new license verified. Uninstall preserves data as documented.
- [ ] OS security prompt behavior tested using an actually downloaded installer.
- [ ] Record app version, OS/version/architecture, signing identity, tester, date,
      installer SHA-256 and test results. Only then label the installer client-ready.

## Final client delivery contents

Only: tested signed `.exe` or `.dmg`, `client-handoff/INSTALLATION.md` (or your branded
copy), support contact details, installer checksum, and the customer's issued
`.ironlicense` after receiving their request. Never include this owner ZIP, signing
tools, keys, certificates, staging folders or your repository.
