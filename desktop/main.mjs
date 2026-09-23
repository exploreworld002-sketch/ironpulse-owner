import {app,BrowserWindow,ipcMain,protocol,dialog,session} from 'electron';
import {readFileSync,writeFileSync,existsSync,renameSync} from 'node:fs';
import path from 'node:path';
import {createApi} from './api.mjs';
import {openStore} from './store.mjs';
import {createLicenseGuard,machineIdentity} from './license.mjs';
protocol.registerSchemesAsPrivileged([{scheme:'ironpulse',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}}]);
const owner=app.requestSingleInstanceLock();if(!owner)app.quit();
let window,api,token='',license,store;
const isAppURL=value=>{try{const u=new URL(value);return u.protocol==='ironpulse:'&&u.hostname==='app'&&!u.username&&!u.password&&!u.port}catch{return false}};
const validSender=e=>window&&!window.isDestroyed()&&e.sender===window.webContents&&e.senderFrame===window.webContents.mainFrame&&isAppURL(e.senderFrame.url);
function guard(e){if(!validSender(e))throw Error('Invalid IPC sender');}
if(owner){app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.focus()}});
app.whenReady().then(async()=>{
 try{
 const appRoot=app.getAppPath(),dataDir=app.getPath('userData');store=openStore(path.join(dataDir,'ironpulse.sqlite'));
 const licensePath=path.join(dataDir,'activation.ironlicense');const deviceId=machineIdentity();
 const publicKey=readFileSync(path.join(appRoot,'license-public.pem'),'utf8');
 license=createLicenseGuard({publicKey,deviceId,readLicense:()=>existsSync(licensePath)?readFileSync(licensePath,'utf8'):'',writeLicense:text=>{writeFileSync(licensePath+'.tmp',text,{mode:0o600});renameSync(licensePath+'.tmp',licensePath)},readLastSeen:()=>store.getMeta('license-last-seen'),writeLastSeen:v=>store.setMeta('license-last-seen',v)});
 api=createApi(store,license);
 const assets=path.join(appRoot,'renderer');const csp="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-src 'none'";
 protocol.handle('ironpulse',async request=>{
  const url=new URL(request.url);if(url.host!=='app')return new Response('Forbidden',{status:403});
  if(url.pathname.startsWith('/api/photo')){const r=api.dispatch(url.pathname+url.search,'GET',{},token);return r.status===200?new Response(Buffer.from(r.data.base64,'base64'),{headers:{'Content-Type':r.data.type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}}):new Response('Unavailable',{status:r.status});}
  let decoded;try{decoded=decodeURIComponent(url.pathname)}catch{return new Response('Invalid path',{status:400})}const rel=decoded==='/'?'index.html':decoded.slice(1);const file=path.resolve(assets,rel);if(!file.startsWith(assets+path.sep)||!existsSync(file))return new Response('Not found',{status:404});
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'}[path.extname(file)];if(!mime)return new Response('Forbidden',{status:403});
  return new Response(readFileSync(file),{headers:{'Content-Type':mime,'Content-Security-Policy':csp,'X-Content-Type-Options':'nosniff'}});
 });
 session.defaultSession.setPermissionRequestHandler((_webContents,_permission,callback)=>callback(false));session.defaultSession.setPermissionCheckHandler(()=>false);
 ipcMain.handle('ironpulse:api',(e,request)=>{guard(e);if(!request||typeof request.path!=='string'||!request.path.startsWith('/api/'))throw Error('Invalid request');if(JSON.stringify(request).length>100000000)throw Error('Request too large');const r=api.dispatch(request.path,request.method,request.body,token);if(Object.hasOwn(r,'session'))token=r.session;return {status:r.status,data:r.data};});
 ipcMain.handle('ironpulse:request-file',async e=>{guard(e);const result=await dialog.showSaveDialog(window,{defaultPath:'Ironpulse-Activation-Request.json',filters:[{name:'Activation request',extensions:['json']}]});if(!result.canceled){writeFileSync(result.filePath,JSON.stringify(license.request(),null,2));return {ok:true}}return {ok:false};});
 ipcMain.handle('ironpulse:import-license',async e=>{guard(e);const r=await dialog.showOpenDialog(window,{properties:['openFile'],filters:[{name:'Ironpulse license',extensions:['ironlicense']}]});if(r.canceled)return {ok:false};try{license.activate(readFileSync(r.filePaths[0],'utf8'));return {ok:true}}catch(err){return {ok:false,error:err.message}}});
 ipcMain.handle('ironpulse:print',e=>{guard(e);license.assertValid();window.webContents.print({silent:false,printBackground:true});});
 session.defaultSession.on('will-download',(_event,item)=>{const file=dialog.showSaveDialogSync(window,{defaultPath:item.getFilename()});if(!file)item.cancel();else item.setSavePath(file)});
 function createWindow(){window=new BrowserWindow({width:1440,height:950,minWidth:850,minHeight:600,show:false,title:'Ironpulse Gym Management',webPreferences:{preload:path.join(appRoot,'preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false,webSecurity:true,devTools:!app.isPackaged}});window.removeMenu();window.webContents.setWindowOpenHandler(()=>({action:'deny'}));window.webContents.on('will-navigate',(e,url)=>{if(!isAppURL(url))e.preventDefault()});window.once('ready-to-show',()=>window.show());window.on('closed',()=>{window=null;token=''});window.loadURL('ironpulse://app/');}
 createWindow();app.on('activate',()=>{if(!window)createWindow()});
 }catch(e){dialog.showErrorBox('Ironpulse could not start',e.message);app.quit()}
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});app.on('before-quit',()=>api?.close());}
