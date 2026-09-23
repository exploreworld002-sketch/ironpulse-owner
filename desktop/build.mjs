// OWNER BUILD TOOL. Never distributed to clients.
import {build as bundle} from 'esbuild';
import {existsSync,readFileSync,writeFileSync,mkdirSync,rmSync,cpSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {createPublicKey} from 'node:crypto';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import JavaScriptObfuscator from 'javascript-obfuscator';
const require=createRequire(import.meta.url),root=path.resolve(import.meta.dirname,'..'),stage=path.join(root,'desktop-stage'),work=path.join(root,'.desktop-work');
if(!['win32','darwin'].includes(process.platform))throw Error('Client releases must be built and tested on native Windows or macOS. This Linux machine cannot produce a verified client release.');
const keyFile=process.env.IRONPULSE_PUBLIC_KEY||path.join(root,'owner-secrets','license-public.pem');if(!existsSync(keyFile))throw Error('Generate your owner signing key first and set IRONPULSE_PUBLIC_KEY to the public PEM file.');const publicPem=readFileSync(keyFile,'utf8');if(publicPem.includes('PRIVATE KEY')||createPublicKey(publicPem).asymmetricKeyType!=='ed25519')throw Error('Only an Ed25519 PUBLIC key can be bundled.');
for(const dir of [stage,work]){rmSync(dir,{recursive:true,force:true});mkdirSync(dir,{recursive:true})}
const vite=path.join(root,'node_modules/vite/bin/vite.js');let r=spawnSync(process.execPath,[vite,'build','--config','standalone/vite.config.ts'],{cwd:root,stdio:'inherit'});if(r.status!==0)throw Error('Frontend build failed');
cpSync(path.join(root,'standalone-dist'),path.join(stage,'renderer'),{recursive:true});
function protect(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())protect(f);else if(f.endsWith('.map'))rmSync(f);else if(f.endsWith('.js')){const output=JavaScriptObfuscator.obfuscate(readFileSync(f,'utf8'),{compact:true,controlFlowFlattening:false,deadCodeInjection:false,renameGlobals:false,stringArray:true,stringArrayEncoding:['base64'],stringArrayThreshold:0.65,sourceMap:false,disableConsoleOutput:true,target:'browser-no-eval'}).getObfuscatedCode();writeFileSync(f,output);}}}protect(path.join(stage,'renderer'));
const mainFile=path.join(work,'main.cjs');await bundle({entryPoints:[path.join(root,'desktop/main.mjs')],outfile:mainFile,bundle:true,platform:'node',format:'cjs',target:'es2016',supported:{'arrow':false},external:['electron','node:*'],sourcemap:false,minify:true,legalComments:'none'});
const bytenodeRoot=path.dirname(require.resolve('bytenode/package.json'));const compiler=path.join(work,'compile.cjs');writeFileSync(compiler,`const {app}=require('electron');app.whenReady().then(async function(){try{const byte=require(${JSON.stringify(bytenodeRoot)});await byte.compileFile({filename:${JSON.stringify(mainFile)},output:${JSON.stringify(path.join(stage,'main.jsc'))},compileAsModule:true});app.exit(0)}catch(e){console.error(e);app.exit(1)}});`);
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;delete env.NODE_OPTIONS;r=spawnSync(require('electron'),[compiler],{cwd:root,env,stdio:'inherit',timeout:120000});if(r.status!==0||!existsSync(path.join(stage,'main.jsc')))throw Error('Native Electron main-process bytecode compilation failed; no client release was generated');
const runtime=path.join(stage,'node_modules/bytenode');mkdirSync(path.join(runtime,'lib'),{recursive:true});for(const name of ['package.json','LICENSE','lib/index.js'])cpSync(path.join(bytenodeRoot,name),path.join(runtime,name));writeFileSync(path.join(stage,'main.cjs'),"require('bytenode');require('./main.jsc');\n");cpSync(path.join(root,'desktop/preload.cjs'),path.join(stage,'preload.cjs'));writeFileSync(path.join(stage,'license-public.pem'),publicPem);
writeFileSync(path.join(stage,'package.json'),JSON.stringify({name:'ironpulse-desktop',version:'2.0.0',productName:'Ironpulse Gym Management',description:'Licensed local gym management',author:'Ironpulse',main:'main.cjs',ironpulseBuild:{platform:process.platform,arch:process.arch,electron:'44.1.0'},dependencies:{bytenode:require('bytenode/package.json').version}},null,2));
const notices=['Electron and Chromium license notices are included with the installed runtime.'];
// Preserve license text from installed dependencies, including transitive renderer packages.
for(const entry of readdirSync(path.join(root,'node_modules/.pnpm'),{withFileTypes:true})){if(!entry.isDirectory())continue;const nm=path.join(root,'node_modules/.pnpm',entry.name,'node_modules');if(!existsSync(nm))continue;const collect=dir=>{for(const f of readdirSync(dir,{withFileTypes:true})){if(f.isDirectory()&&f.name.startsWith('@'))collect(path.join(dir,f.name));else if(f.isDirectory()){const pkg=path.join(dir,f.name);for(const name of readdirSync(pkg)){if(/^(licen[sc]e|copying|notice)(\.|$)/i.test(name)){try{notices.push('\n--- '+entry.name+' / '+name+' ---\n'+readFileSync(path.join(pkg,name),'utf8'))}catch{}}}}}};collect(nm);}
writeFileSync(path.join(stage,'THIRD_PARTY_NOTICES.txt'),notices.join('\n'));
// Compiler input is readable source and must never leave owner build workspaces.
rmSync(work,{recursive:true,force:true});
const audit=spawnSync(process.execPath,['desktop/audit-package.mjs',stage],{cwd:root,stdio:'inherit'});if(audit.status!==0)throw Error('Client staging audit failed');
console.log('Protected client stage prepared for '+process.platform+'-'+process.arch+'. Next: signed installer build.');
