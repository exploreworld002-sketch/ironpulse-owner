# OWNER ONLY — license issuance

Never give clients this project, `owner-only/license-tool.mjs`, your private PEM,
your signing passphrase, code-signing certificates, or CI secrets. No real signing
keys or licenses were generated for delivery. Generate your key pair on your own
trusted computer and keep encrypted offline backups. Losing the private key prevents
issuing more licenses for installers built with its public key.

## Set a secret passphrase without putting it in shell history

Choose a unique random passphrase of at least 16 characters and save it in your
password manager. The tool uses the `IRONPULSE_SIGNING_PASSPHRASE` environment variable.
Do not include it in screenshots, logs, source control or support ZIPs.

PowerShell:

```powershell
$secret = Read-Host 'License signing passphrase' -AsSecureString
$env:IRONPULSE_SIGNING_PASSPHRASE = [System.Net.NetworkCredential]::new('', $secret).Password
node owner-only/license-tool.mjs init owner-secrets
Remove-Item Env:IRONPULSE_SIGNING_PASSPHRASE
```

Mac Terminal (zsh):

```sh
read -s 'IRONPULSE_SIGNING_PASSPHRASE?License signing passphrase: '
export IRONPULSE_SIGNING_PASSPHRASE
node owner-only/license-tool.mjs init owner-secrets
unset IRONPULSE_SIGNING_PASSPHRASE
```

This creates encrypted PKCS8 `license-private.pem` (OWNER ONLY) and
`license-public.pem` (embedded in client builds). Existing keys are never overwritten.
Windows permissions depend on your account ACLs: keep the folder in your private
user profile, not a shared/network folder.

## Issue an activation

1. Client opens the installer/app, clicks **Save activation request**, and sends you
   `Ironpulse-Activation-Request.json` using your normal support channel.
2. Verify the customer's purchase and machine allowance in your own sales records.
3. Set your signing passphrase again using the prompt above. Run:

```sh
node owner-only/license-tool.mjs issue owner-secrets/license-private.pem Ironpulse-Activation-Request.json "Client Gym Name" 2027-12-31 Client-Gym.ironlicense
```

Replace the expiry with a future UTC date or the literal `perpetual`. A dated license
expires at the end of the specified day in UTC. Clear the passphrase environment
variable afterwards. Keep an owner issuance record (customer, machine hash, expiry,
license ID). The tool refuses overwriting an existing output license.

4. Send only `Client-Gym.ironlicense` to that customer. They click **Import license
   file**. First activation then offers account creation; all gym records start empty.

The request reveals a one-way machine fingerprint, not raw hardware identifiers.
Copying the license or SQLite database to another normally configured machine fails
verification. A hardware replacement or Windows reinstall can change the identity:
verify the transfer and issue a new license. A new license does not remotely disable
the old offline installation. Use short dated licenses when renewal enforcement is
important; immediate revocation requires a future online licensing service.

Clock rollback detection compares with the highest time seen on that installation.
A full disk rollback or sufficiently privileged attacker can bypass local state.
VM identity cloning and OS-level identifier spoofing are outside this offline model.
Never promise customers or resellers that copying/patching is technically impossible.
