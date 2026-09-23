// OWNER ONLY. Never copy this tool or the private signing key into a client installer.
import {generateKeyPairSync,createPrivateKey,createPublicKey,sign,randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {PRODUCT} from '../desktop/license.mjs';
const [command,...args]=process.argv.slice(2);const passphrase=process.env.IRONPULSE_SIGNING_PASSPHRASE;
if(!passphrase||passphrase.length<16)throw Error('Set IRONPULSE_SIGNING_PASSPHRASE to a strong secret of at least 16 characters. Keep it private.');
if(command==='init'){
 const dir=path.resolve(args[0]||'owner-secrets');mkdirSync(dir,{recursive:true,mode:0o700});
 const privatePath=path.join(dir,'license-private.pem'),publicPath=path.join(dir,'license-public.pem');if(existsSync(privatePath)||existsSync(publicPath))throw Error('Key files already exist. Refusing to replace them.');
 const keys=generateKeyPairSync('ed25519',{privateKeyEncoding:{type:'pkcs8',format:'pem',cipher:'aes-256-cbc',passphrase},publicKeyEncoding:{type:'spki',format:'pem'}});
 writeFileSync(privatePath,keys.privateKey,{flag:'wx',mode:0o600});writeFileSync(publicPath,keys.publicKey,{flag:'wx',mode:0o644});console.log('Created encrypted OWNER-ONLY private key and public verification key. Back them up securely.');
}else if(command==='issue'){
 const [keyFile,requestFile,customer,expiry,output]=args;if(!output||!customer?.trim()||customer.length>200)throw Error('Usage: issue PRIVATE.pem activation-request.json "Customer" YYYY-MM-DD|perpetual output.ironlicense');
 const request=JSON.parse(readFileSync(requestFile,'utf8'));if(request.version!==1||request.product!==PRODUCT||!/^[a-f0-9]{64}$/.test(request.machine))throw Error('Invalid activation request');
 const now=Date.now();let expiresAt=null;if(expiry!=='perpetual'){if(!/^\d{4}-\d{2}-\d{2}$/.test(expiry))throw Error('Use YYYY-MM-DD or perpetual');const d=new Date(expiry+'T23:59:59.999Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==expiry||d.getTime()<=now)throw Error('Expiry must be a valid future date');expiresAt=d.getTime();}
 const key=createPrivateKey({key:readFileSync(keyFile),passphrase});if(key.asymmetricKeyType!=='ed25519')throw Error('Expected an Ed25519 private key');
 const claims={product:PRODUCT,licenseId:randomUUID(),customer:customer.trim(),machine:request.machine,issuedAt:now,notBefore:now,expiresAt};
 const bytes=Buffer.from(JSON.stringify(claims));const license={version:1,payload:bytes.toString('base64url'),signature:sign(null,bytes,key).toString('base64url')};
 writeFileSync(output,JSON.stringify(license,null,2),{flag:'wx'});console.log('License created: '+output);
}else throw Error('Commands: init [private-directory] | issue PRIVATE.pem REQUEST.json "Customer" EXPIRY|perpetual OUTPUT.ironlicense');
