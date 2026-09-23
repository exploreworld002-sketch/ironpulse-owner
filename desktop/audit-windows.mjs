// Inspect the actual packaged archive and executable; no private key is needed.
import {extractAll,listPackage,statFile} from '@electron/asar';
import {getCurrentFuseWire,FuseV1Options} from '@electron/fuses';
import {mkdtempSync,rmSync,readFileSync,existsSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import os from 'node:os';import path from 'node:path';
import {auditDirectory} from './audit-package.mjs';
import {publicKeyHash} from './prepare-public-key.mjs';
const folder=path.resolve(process.argv[2]||'client-installers/win-unpacked');
const archive=path.join(folder,'resources/app.asar');
const exe=path.join(folder,'Ironpulse Gym Management.exe');
const expected=process.env.IRONPULSE_LICENSE_PUBLIC_KEY_SHA256;
if(!expected)throw Error('Missing owner-confirmed public key fingerprint');
if(existsSync(archive+'.unpacked'))throw Error('Unexpected unpacked application payload; audit required');
const entries=listPackage(archive);
for(const name of entries){const entry=statFile(archive,name.replace(/^[/\\]/,''),false);if(entry.link||entry.unpacked)throw Error('Archive links/unpacked entries are not allowed: '+name)}
const temporary=mkdtempSync(path.join(os.tmpdir(),'ironpulse-asar-audit-'));
try{
 extractAll(archive,temporary);const count=auditDirectory(temporary);
 const keyHash=publicKeyHash(readFileSync(path.join(temporary,'license-public.pem'),'utf8'));
 if(keyHash!==expected.toLowerCase())throw Error('Packaged public key does not match owner fingerprint');
 const fuses=await getCurrentFuseWire(exe);
 const disabled=['RunAsNode','EnableNodeOptionsEnvironmentVariable','EnableNodeCliInspectArguments'];
 const enabled=['EnableEmbeddedAsarIntegrityValidation','OnlyLoadAppFromAsar'];
 for(const name of disabled)if(fuses[FuseV1Options[name]]!==48)throw Error('Fuse not disabled: '+name);
 for(const name of enabled)if(fuses[FuseV1Options[name]]!==49)throw Error('Fuse not enabled: '+name);
 const report={status:'passed',fileCount:count,licensePublicKeySHA256:keyHash,asarSHA256:createHash('sha256').update(readFileSync(archive)).digest('hex'),disabledFuses:disabled,enabledFuses:enabled,files:entries,limitations:'Static package inspection only. Native launch, tamper rejection and acceptance tests remain manual. Unsigned binaries can be patched by a privileged attacker.'};
 mkdirSync('windows-release-evidence',{recursive:true});writeFileSync('windows-release-evidence/package-audit.json',JSON.stringify(report,null,2));console.log('Actual Windows package audit passed');
}finally{rmSync(temporary,{recursive:true,force:true})}
