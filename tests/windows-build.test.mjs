import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {createRequire} from 'node:module';
import {mkdtempSync,rmSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';import os from 'node:os';
import {createPackage,extractAll} from '@electron/asar';
import {publicKeyHash} from '../desktop/prepare-public-key.mjs';
import {auditDirectory} from '../desktop/audit-package.mjs';
const require=createRequire(import.meta.url);
test('unsigned Windows opt-in skips signing while preserving resources and signed default',()=>{
 const file=require.resolve('../desktop/electron-builder.cjs');const old=process.env.IRONPULSE_UNSIGNED_WINDOWS;
 try{
  delete process.env.IRONPULSE_UNSIGNED_WINDOWS;delete require.cache[file];const signed=require(file);assert.equal(signed.forceCodeSigning,true);assert.equal(signed.win.signExecutable,true);
  process.env.IRONPULSE_UNSIGNED_WINDOWS='1';delete require.cache[file];const unsigned=require(file);assert.equal(unsigned.forceCodeSigning,false);assert.equal(unsigned.win.signExecutable,false);assert.notEqual(unsigned.win.signAndEditExecutable,false);assert.equal(unsigned.win.artifactName,'Ironpulse-Setup-${arch}.${ext}');
 }finally{if(old===undefined)delete process.env.IRONPULSE_UNSIGNED_WINDOWS;else process.env.IRONPULSE_UNSIGNED_WINDOWS=old;delete require.cache[file]}
});
test('public-key pin accepts canonical public Ed25519 keys and rejects private and wrong algorithms',()=>{
 const keys=generateKeyPairSync('ed25519');const pem=keys.publicKey.export({format:'pem',type:'spki'});assert.match(publicKeyHash(pem),/^[a-f0-9]{64}$/);assert.equal(publicKeyHash(pem),publicKeyHash(pem.replaceAll('\n','\r\n')));assert.throws(()=>publicKeyHash(keys.privateKey.export({format:'pem',type:'pkcs8'})));assert.throws(()=>publicKeyHash(undefined));const rsa=generateKeyPairSync('rsa',{modulusLength:2048});assert.throws(()=>publicKeyHash(rsa.publicKey.export({format:'pem',type:'spki'})));
});
test('real ASAR extraction is audited and rejects nested env and database files',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'ironpulse-asar-test-'));
 try{
  const source=path.join(dir,'source');mkdirSync(path.join(source,'renderer'),{recursive:true});
  for(const [name,value] of Object.entries({'main.cjs':"require('bytenode');require('./main.jsc');\n",'main.jsc':Buffer.alloc(2048),'preload.cjs':'bridge','license-public.pem':'fixture','renderer/index.html':'<html></html>'}))writeFileSync(path.join(source,name),value);
  for(const bad of ['renderer/.env.production','renderer/gym.db','renderer/gym.sqlite3']){
   writeFileSync(path.join(source,bad),'fixture');const archive=path.join(dir,'app.asar');await createPackage(source,archive);const out=path.join(dir,'extracted');extractAll(archive,out);assert.throws(()=>auditDirectory(out));rmSync(out,{recursive:true});rmSync(path.join(source,bad));
  }
 }finally{rmSync(dir,{recursive:true,force:true})}
});
