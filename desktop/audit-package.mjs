import {readdirSync,readFileSync,statSync} from 'node:fs';import path from 'node:path';
export function auditDirectory(dir){
 const files=[];function visit(base){for(const entry of readdirSync(base,{withFileTypes:true})){const file=path.join(base,entry.name);if(entry.isSymbolicLink())throw Error('Client stage cannot contain symlinks');if(entry.isDirectory())visit(file);else files.push(file)}}visit(dir);
 const required=['main.cjs','main.jsc','preload.cjs','license-public.pem','renderer/index.html'];for(const name of required)if(!files.includes(path.join(dir,name)))throw Error('Missing client file: '+name);
 for(const file of files){const rel=path.relative(dir,file).replaceAll('\\','/');if(/(^|\/)\.env(?:[.\/]|$)/i.test(rel)||/(?:\.db|\.sqlite3?|\.sqlite-wal|\.sqlite-shm)$/i.test(rel)||/(^|\/)(owner-only|owner-secrets|server|tests|\.github|\.env|src)(\/|$)/i.test(rel)||/\.(ts|tsx|map|sqlite|pfx|p12|key)$/i.test(rel)||/private.*\.pem$/i.test(rel))throw Error('Owner or source material in client stage: '+rel);
  if(rel.startsWith('node_modules/')&&!['node_modules/bytenode/package.json','node_modules/bytenode/LICENSE','node_modules/bytenode/lib/index.js'].includes(rel))throw Error('Unapproved runtime file: '+rel);
  const text=readFileSync(file).toString('utf8');if(/-----BEGIN (?:ENCRYPTED |RSA |EC )?PRIVATE KEY-----/.test(text))throw Error('Private key leaked: '+rel);if(/sourceMappingURL=/.test(text)&&!rel.startsWith('node_modules/'))throw Error('Source map reference leaked: '+rel);
  if(rel==='main.cjs'&&text!=="require('bytenode');require('./main.jsc');\n")throw Error('Main loader contains unexpected application source');
  if(!rel.startsWith('node_modules/')&&!['main.cjs','main.jsc','preload.cjs','license-public.pem','renderer/index.html','THIRD_PARTY_NOTICES.txt','package.json'].includes(rel)&&!rel.startsWith('renderer/'))throw Error('Unexpected file in client stage: '+rel);
 }
 if(statSync(path.join(dir,'main.jsc')).size<1000)throw Error('Missing or incomplete bytecode');return files.length;
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(import.meta.filename)){console.log('Client package audit passed: '+auditDirectory(path.resolve(process.argv[2]))+' allowlisted files; no private keys, source maps or owner tools.');}
