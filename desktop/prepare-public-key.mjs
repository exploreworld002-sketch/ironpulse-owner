// Owner build helper: accepts only a supplied, fingerprint-pinned public key.
import {createPublicKey,createHash} from 'node:crypto';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import path from 'node:path';
export function publicKeyHash(pem){
 if(typeof pem!=='string'||!/^-----BEGIN PUBLIC KEY-----\s/.test(pem.trim())||pem.includes('PRIVATE KEY'))throw Error('Supply an Ed25519 public PEM only');
 const key=createPublicKey(pem);if(key.asymmetricKeyType!=='ed25519')throw Error('Expected Ed25519 public key');
 return createHash('sha256').update(key.export({format:'der',type:'spki'})).digest('hex');
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(import.meta.filename)){
 if(process.argv[2]==='fingerprint'){console.log(publicKeyHash(readFileSync(process.argv[3],'utf8')))}else{
  const pem=process.env.IRONPULSE_LICENSE_PUBLIC_KEY;
  const expected=process.env.IRONPULSE_LICENSE_PUBLIC_KEY_SHA256;
  if(!expected||!/^[a-f0-9]{64}$/i.test(expected))throw Error('Set IRONPULSE_LICENSE_PUBLIC_KEY_SHA256 to the owner-confirmed SPKI SHA-256');
  const actual=publicKeyHash(pem);if(actual!==expected.toLowerCase())throw Error('License public key fingerprint mismatch');
  const output=path.resolve('owner-secrets/license-public.pem');mkdirSync(path.dirname(output),{recursive:true});writeFileSync(output,pem.trim()+'\n');
  console.log('Supplied license public key verified: '+actual);
 }
}
