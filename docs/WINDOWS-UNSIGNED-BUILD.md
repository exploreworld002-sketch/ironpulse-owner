# Owner: unsigned Windows build

This pass produces only Windows x64. No signing identity or private key is needed
in CI. The new workflow is independent of the older signed multi-platform workflow.
Use only **Build unsigned Windows installer** for this release.

## Required owner configuration

1. Put this complete source project in your private GitHub repository, including
   `.github/workflows/build-windows.yml`. No repository was connected during this
   handoff, and no workflow run or EXE is claimed.
2. Use the existing production public key paired with the private key you already
   use with `owner-only/license-tool.mjs`. Do not generate a replacement pair if you
   already have one. If you have never generated a pair, follow OWNER-LICENSING.md
   on your trusted owner computer first. Keep the encrypted private key offline.
3. On that computer, run:

   ```sh
   node desktop/prepare-public-key.mjs fingerprint owner-secrets/license-public.pem
   ```

4. In GitHub Settings → Environments, create `windows-unsigned`. Add environment
   **variables** (these contain only public information):

   - `IRONPULSE_LICENSE_PUBLIC_KEY`: entire production public PEM including headers.
   - `IRONPULSE_LICENSE_PUBLIC_KEY_SHA256`: output of the fingerprint command.

   The fingerprint hashes canonical SPKI DER, not the PEM file bytes. The workflow
   refuses a missing, non-Ed25519, private, or mismatched key. It cannot determine
   whether an owner-supplied pair is production or testing; that is your choice.
   Protect environment/repository writes so nobody can substitute both variables.
5. Optionally replace the generic vendor support line in
   `client-handoff/INSTALLATION.md` with your actual support email/phone.
6. Commit the workflow to the default branch. Open Actions → Build unsigned Windows
   installer → Run workflow → select your release branch → Run workflow.

## Download the installer

After the entire job succeeds, open its run page and scroll to **Artifacts**.
Download **ironpulse-windows-x64-unsigned** and extract the downloaded ZIP. It contains:

- `Ironpulse-Setup-x64.exe`
- `INSTALLATION.md` (Windows only)
- `SHA256SUMS.txt`

Download **ironpulse-windows-owner-evidence** separately for the package audit,
build commit/run URL, build-host Windows version and manual acceptance checklist.
The build-host version is NOT a tested client Windows version. No artifact exists
until a real run finishes successfully. Login to GitHub may be required to download.

## Automated package audit

After electron-builder, `desktop/audit-windows.mjs` extracts the actual
`client-installers/win-unpacked/resources/app.asar` to a temporary directory and
runs the allowlist/secret/source audit. It rejects archive links and unpacked
application payloads, validates the embedded public-key fingerprint, and checks
five Electron fuses in the actual packaged EXE. The temporary extraction is removed.
The report lists all archive entries. The job also checks that the application
and installer report `NotSigned` and hashes the final installer.

To repeat the audit after building locally on Windows, set the same public-key
fingerprint environment variable and run `node desktop/audit-windows.mjs`.
For an installed app use `node desktop/audit-windows.mjs "PATH TO INSTALLED APP"`
on a separate developer/testing machine with this owner project's dependencies.
Do not install these owner tools on the client's computer.

A passing static audit does not prove runtime tamper rejection or native UI behavior.
Complete WINDOWS-ACCEPTANCE.md with the exact EXE you will distribute. An unsigned
executable can itself be modified; ASAR checks are not a promise of tamper-proof DRM.

## Configuration

`IRONPULSE_UNSIGNED_WINDOWS=1` explicitly disables `forceCodeSigning` and sets
`win.signExecutable=false` for the pinned electron-builder v26. Resource editing,
ASAR integrity and security fuses remain enabled. The default signed build behavior
is retained when this opt-in is absent. The workflow sets
`CSC_IDENTITY_AUTO_DISCOVERY=false`, supplies no signing credentials and calls:

```sh
pnpm desktop:prepare
pnpm desktop:dist --win --x64
```

The unsigned flag is rejected for non-Windows targets. Windows standard-user
installation and SmartScreen behavior require manual testing. No promise of
warning-free installation is made.
