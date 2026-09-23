import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createPrivateKey} from 'node:crypto';
import os from 'node:os';import path from 'node:path';
import {PRODUCT,fingerprint,validateLicense} from '../desktop/license.mjs';
import {auditDirectory} from '../desktop/audit-package.mjs';
const root=path.resolve(import.meta.dirname,'..');
test('owner tool encrypts keys, signs requests, refuses replacement and invalid expiry',()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'ironpulse-owner-'));const env={...process.env,IRONPULSE_SIGNING_PASSPHRASE:'test-only-passphrase-not-shipped-in-any-installer'};
 const run=(...args)=>spawnSync(process.execPath,[path.join(root,'owner-only/license-tool.mjs'),...args],{env,encoding:'utf8'});
 try{assert.equal(run('init',dir).status,0);assert.notEqual(run('init',dir).status,0);const privatePem=readFileSync(path.join(dir,'license-private.pem'),'utf8');assert.match(privatePem,/ENCRYPTED PRIVATE KEY/);assert.throws(()=>createPrivateKey({key:privatePem,passphrase:'wrong-password'}));
 const machine=fingerprint(['windows','12345678-hardware']);const request=path.join(dir,'request.json');writeFileSync(request,JSON.stringify({version:1,product:PRODUCT,machine}));const out=path.join(dir,'test.ironlicense');
 assert.equal(run('issue',path.join(dir,'license-private.pem'),request,'Test customer','perpetual',out).status,0);const claims=validateLicense(readFileSync(out,'utf8'),readFileSync(path.join(dir,'license-public.pem'),'utf8'),machine);assert.equal(claims.customer,'Test customer');assert.equal(claims.expiresAt,null);
 assert.notEqual(run('issue',path.join(dir,'license-private.pem'),request,'   ','perpetual',path.join(dir,'blank.ironlicense')).status,0);
 assert.notEqual(run('issue',path.join(dir,'license-private.pem'),request,'Customer','2027-02-31',path.join(dir,'bad.ironlicense')).status,0);
 assert.notEqual(run('issue',path.join(dir,'license-private.pem'),request,'Customer','perpetual',out).status,0);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
test('client staging audit rejects owner files, maps, private keys and source loaders',()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'ironpulse-audit-'));try{
 mkdirSync(path.join(dir,'renderer'));const loader="require('bytenode');require('./main.jsc');\n";
 for(const [file,content] of Object.entries({'main.cjs':loader,'main.jsc':Buffer.alloc(2048),'preload.cjs':'// audited bridge','license-public.pem':'PUBLIC KEY TEST FIXTURE','renderer/index.html':'<html></html>'}))writeFileSync(path.join(dir,file),content);
 assert.equal(auditDirectory(dir),5);
 for(const file of ['renderer/leak.ts','renderer/leak.map','private-key.pem']){writeFileSync(path.join(dir,file),'test');assert.throws(()=>auditDirectory(dir));rmSync(path.join(dir,file));}
 writeFileSync(path.join(dir,'renderer/leak.js'),'-----BEGIN ENCRYPTED PRIVATE KEY-----');assert.throws(()=>auditDirectory(dir));rmSync(path.join(dir,'renderer/leak.js'));
 writeFileSync(path.join(dir,'main.cjs'),'readableBusinessLogic();');assert.throws(()=>auditDirectory(dir));
 }finally{rmSync(dir,{recursive:true,force:true})}
});
