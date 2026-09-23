> Current unsigned Windows route: see WINDOWS-UNSIGNED-BUILD.md. Signed-release requirements below do not apply to the explicit Windows unsigned opt-in; native acceptance still applies.

# Owner setup and native release build

These technical steps are **for you or your release developer, never your client**.
The source ZIP is not an installer. Native release builds are intentionally refused
on Linux and unsigned installer generation fails closed.

## Development checks

Install Node.js 24 LTS and pnpm 11.25.0 on your build computer, then open a terminal
in the extracted project folder:

```sh
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm test:all
pnpm typecheck
pnpm build:standalone
```

The lockfile and dependency review policy are included. Do not disable the review
policy to force an install. Optional donation/Squirrel build scripts are disabled;
NSIS, not Squirrel, is used for Windows. Electron 44 downloads its binary explicitly:

```sh
node node_modules/electron/install.js
```

The database is built into Electron; there is no MongoDB/SQLite installer for clients.
Node SQLite tests run under Node 24. The actual desktop runtime must also be tested.

## Generate the license key pair

Follow OWNER-LICENSING.md. By default the build reads
`owner-secrets/license-public.pem`. The encrypted private key and its passphrase
never enter the build stage. To keep keys outside the project, set
`IRONPULSE_PUBLIC_KEY` to the absolute path of the **public** PEM file.

## Native signed builds

Build Windows x64 on Windows x64, Mac x64 on an Intel Mac runner, and Mac arm64 on an
Apple Silicon runner. Do not cross-build bytecode or make a universal Mac binary
from a single architecture's bytecode.

The build requires your Windows signing certificate or macOS Developer ID Application
certificate. Set `CSC_LINK` and `CSC_KEY_PASSWORD` securely in the build environment.
`CSC_LINK` can reference the signing certificate file supported by electron-builder.
These are **OS code-signing keys**, separate from your offline license-signing key.
For notarization also provide `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and
`APPLE_TEAM_ID`. Never put real values in the source ZIP or shell command history.

Run on each native computer:

```sh
pnpm desktop:prepare
# Windows x64:
pnpm exec electron-builder --config desktop/electron-builder.cjs --win --x64 --publish never
# Intel Mac:
pnpm exec electron-builder --config desktop/electron-builder.cjs --mac --x64 --publish never
# Apple Silicon Mac:
pnpm exec electron-builder --config desktop/electron-builder.cjs --mac --arm64 --publish never
```

`desktop:prepare` builds/obfuscates the renderer, bundles the privileged backend,
compiles bytecode inside an actual Electron main process, deletes transient readable
compiler input, and audits the staged files. electron-builder packages ASAR, applies
security fuses, signs and (on Mac) notarizes the app. Pinning Electron in both package
and builder configuration keeps the compiler/runtime version identical. Never change
one without the other and rerun all native smoke checks after any version change.

Do not send `desktop-stage`, `standalone-dist`, or unpacked build directories to a
client. Only tested final `.exe` / `.dmg` installers qualify for the client handoff.

## Optional GitHub native builds

Use a **private** repository. The included workflow has manual `workflow_dispatch`
only and never publishes a release. Configure the `desktop-release` environment and
its required reviewers. Repository/environment variable:

- `IRONPULSE_LICENSE_PUBLIC_KEY`: complete public PEM, not the private key.

Environment secrets:

- `WINDOWS_CSC_LINK`, `WINDOWS_CSC_KEY_PASSWORD`
- `MAC_CSC_LINK`, `MAC_CSC_KEY_PASSWORD`
- `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`

Use protected branches and restrict who can change this workflow. It builds separate
Windows x64, macOS Intel, and macOS Apple Silicon **candidates**. Download artifacts,
complete the acceptance checklist, and distribute only approved installers. No
GitHub repository, certificate purchase, CI run, or signing identity was created as
part of this handoff.

## Local data and backup

Data lives in Electron's per-user application-data folder (`app.getPath('userData')`):
normally `%APPDATA%/Ironpulse Gym Management/` on Windows and
`~/Library/Application Support/Ironpulse Gym Management/` on Mac. The exact installed
app name determines the folder. `ironpulse.sqlite` contains records, account hashes,
photos and metadata; `activation.ironlicense` contains the signed activation file.
Data remains when the app is upgraded or uninstalled normally. Use a separate OS user
account if multiple people need separate database access.

Use Settings → Download backup for business records and referenced photos. Keep
backups outside the computer. Restore replaces business data after validation and
requires Admin access; it preserves login accounts/license. JSON backup is limited
to 64 MB of photo bytes and 100 MB total input. For a full recovery snapshot, quit the
app and copy its complete app-data folder (including any SQLite WAL/SHM files) to a
secure backup; never copy only a live `.sqlite` file while the app is running.
Restoring a full folder to another machine still requires a new hardware license.

Legacy web JSON backups can be imported after activation. Legacy photo URLs refer to
another web database and need the original photos reuploaded; no automatic MongoDB
migration or account migration is claimed. Retain original backups before migrating.
