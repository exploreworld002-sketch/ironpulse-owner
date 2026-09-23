> Current unsigned Windows route: see WINDOWS-UNSIGNED-BUILD.md. Signed-release requirements below do not apply to the explicit Windows unsigned opt-in; native acceptance still applies.

# Security design and limits

## Release boundary

The owner ZIP is readable source and must remain private. The intended client stage
contains only main-process V8 bytecode, its tiny loader, a small context bridge,
obfuscated frontend assets, a public verification key, third-party runtime and license
notices. It does not contain the owner issuer, private key, original TS/TSX, source
maps, tests, Mongo server, `.env`, database records or CI credentials. Staging uses an
allowlist and rejects owner paths, key material and source maps. The release still
needs inspection of the **actual installed ASAR** and signed executables on native OSes.

## License and session enforcement

Ed25519 verifies the exact serialized payload against the embedded public key. Product,
machine, signature, dates and local rollback state are checked in the privileged
process before data access. No activation-secret environment variable or demo bypass
is provided. Initial setup requires a valid license and zero existing users. The
renderer does not receive password hashes or session tokens. Passwords use per-user
random salts and scrypt; login attempts have persistent local throttling. Staff role
checks run in the backend. Mutations use SQLite transactions and version checks.

Renderer sandbox/context isolation are enabled, Node integration is off, navigation
and IPC origins are checked, new windows/permissions are denied, and CSP disallows
remote scripts/eval. No desktop HTTP server or externally reachable port is opened.
Electron fuses disable RunAsNode, NODE_OPTIONS and inspector CLI switches; ASAR integrity
and ASAR-only loading are enabled. Code signing is mandatory in release config.

## What this does not promise

- Bytecode/obfuscation are not encryption. An expert controlling the machine can
  reverse-engineer or patch a desktop app. Readable generic runtime/bridge code must
  remain in the package. Absolute source secrecy or prevention of resale is impossible.
- Offline licenses cannot be immediately revoked; cloned virtual hardware, privileged
  ID spoofing and full disk/clock snapshots can defeat local binding/time checks.
- SQLite/business backups are not encrypted by this app. Use full-disk encryption,
  restricted OS accounts and secure backup storage. Anyone controlling the OS account
  can access its data or alter application files.
- No online licensing server, remote attestation, license-seat service, remote kill
  switch, telemetry, automated updates or external reminder delivery is included.
- Staging tests are not a penetration test, native release test or security certification.

Keep the public key stable across updates. If the private key is compromised, build a
new signed app with a new public key and arrange reactivation. Existing offline apps
will not automatically learn that the old key has been revoked. Obtain an independent
security review and maintain signed Electron updates before broad commercial deployment.
