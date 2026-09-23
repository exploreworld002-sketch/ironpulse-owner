import {createHash,createPublicKey,verify} from 'node:crypto';
import {execFileSync} from 'node:child_process';
export const PRODUCT='ironpulse-desktop-v2';
export function fingerprint(parts){if(!parts.length||parts.some(p=>typeof p!=='string'||p.trim().length<1))throw Error('Hardware identity unavailable. Activation cannot continue.');return createHash('sha256').update(PRODUCT+'|'+parts.map(s=>s.trim().toLowerCase()).join('|')).digest('hex');}
export function machineIdentity(){
 if(process.platform==='win32'){
  const guid=execFileSync('reg.exe',['query','HKLM\\SOFTWARE\\Microsoft\\Cryptography','/v','MachineGuid','/reg:64'],{encoding:'utf8',timeout:10000,windowsHide:true}).match(/MachineGuid\s+REG_SZ\s+([^\r\n]+)/i)?.[1];
  const uuid=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','(Get-CimInstance -ClassName Win32_ComputerSystemProduct).UUID'],{encoding:'utf8',timeout:15000,windowsHide:true}).trim();
  if(!guid||guid.trim().length<8||uuid.length<8||/^0{8}-|^f{8}-/i.test(uuid))throw Error('Unable to obtain a reliable hardware ID. Contact the vendor.');return fingerprint(['windows',guid,uuid]);
 }
 if(process.platform==='darwin'){
  const id=execFileSync('/usr/sbin/ioreg',['-rd1','-c','IOPlatformExpertDevice'],{encoding:'utf8',timeout:10000}).match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/)?.[1];
  if(!id||id.length<8)throw Error('Unable to obtain the Mac hardware ID. Contact the vendor.');return fingerprint(['macintosh',id]);
 }
 throw Error('This release supports Windows and macOS only.');
}
export function validateLicense(envelope,publicKey,deviceId,now=Date.now()){
 if(typeof envelope!=='string'||envelope.length>24000)throw Error('Invalid license file');
 const outer=JSON.parse(envelope);if(outer.version!==1||typeof outer.payload!=='string'||typeof outer.signature!=='string')throw Error('Invalid license format');
 const payload=Buffer.from(outer.payload,'base64url'),signature=Buffer.from(outer.signature,'base64url');
 const key=createPublicKey(publicKey);if(key.asymmetricKeyType!=='ed25519'||signature.length!==64||!verify(null,payload,key,signature))throw Error('License signature is invalid');
 const claims=JSON.parse(payload.toString('utf8'));
 if(claims.product!==PRODUCT||claims.machine!==deviceId||!/^[a-f0-9]{64}$/.test(claims.machine))throw Error('This license belongs to a different machine or product');
 if(typeof claims.licenseId!=='string'||!claims.licenseId||typeof claims.customer!=='string'||!claims.customer.trim())throw Error('Invalid license identity');
 if(!Number.isSafeInteger(claims.issuedAt)||!Number.isSafeInteger(claims.notBefore)||claims.issuedAt>now+300000||claims.notBefore>now)throw Error('License is not yet valid. Check the computer clock');
 if(claims.expiresAt!==null&&(!Number.isSafeInteger(claims.expiresAt)||claims.expiresAt<=now||claims.expiresAt<=claims.notBefore))throw Error('License has expired or has an invalid expiry');
 return claims;
}
export function createLicenseGuard({publicKey,deviceId,readLicense,writeLicense,readLastSeen,writeLastSeen,now=()=>Date.now()}){
 function assertValid(){const clock=now();const highest=Number(readLastSeen()||0);if(clock+300000<highest)throw Error('Computer clock moved backwards. Correct the clock before continuing.');const claims=validateLicense(readLicense(),publicKey,deviceId,clock);writeLastSeen(Math.max(highest,clock));return claims;}
 function activate(text){const clock=now();if(clock+300000<Number(readLastSeen()||0))throw Error('Correct the computer clock before activation');validateLicense(text,publicKey,deviceId,clock);writeLicense(text);return assertValid();}
 return {assertValid,activate,request:()=>({version:1,product:PRODUCT,machine:deviceId})};
}
