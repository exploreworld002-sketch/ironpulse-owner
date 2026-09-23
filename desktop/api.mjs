import {randomBytes,randomUUID} from 'node:crypto';
import {applyMutation} from '../lib/gym-operations.ts';
import {createUser,passwordMatches} from './store.mjs';
export function createApi(store,license){
 const {db}=store,sessions=new Map();
 const result=(status,data,extra={})=>({status,data,...extra});
 function userFor(token){const session=sessions.get(token);if(!session||session.expires<Date.now()){sessions.delete(token);return null}const user=db.prepare('SELECT * FROM users WHERE id=?').get(session.userId);return user&&user.token_version===session.version?user:null;}
 function photograph(value){if(!value||!['image/png','image/jpeg','image/webp'].includes(value.type)||typeof value.base64!=='string'||value.base64.length>2800000)throw Error('Choose a JPG, PNG or WebP under 2 MB');const bytes=Buffer.from(value.base64,'base64');if(bytes.length>2097152)throw Error('Photo is too large');const valid=value.type==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):value.type==='image/jpeg'?bytes[0]===255&&bytes[1]===216:bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';if(!valid)throw Error('Invalid image file');return bytes;}
 function dispatch(path,method='GET',body={},token=''){
  try{
   if(typeof path!=='string'||path.length>500||!['GET','POST'].includes(method))return result(400,{error:'Invalid request'});
   if(path==='/api/license'&&method==='GET'){let active=false,customer='';try{customer=license.assertValid().customer;active=true}catch{}return result(200,{active,customer,request:license.request()});}
   if(path==='/api/license'&&method==='POST'){license.activate(body.license);return result(200,{ok:true});}
   try{license.assertValid()}catch(e){sessions.clear();return result(423,{error:e.message,licenseRequired:true})}
   if(path==='/api/setup'&&method==='GET')return result(200,{required:!db.prepare('SELECT id FROM users LIMIT 1').get()});
   if(path==='/api/setup'&&method==='POST'){
    if(db.prepare('SELECT id FROM users LIMIT 1').get())return result(409,{error:'This installation is already configured'});createUser(db,{...body,role:'Admin'});return result(201,{ok:true});
   }
   if(path==='/api/auth/login'&&method==='POST'){
    if(typeof body.email!=='string'||typeof body.password!=='string'||body.password.length>128)return result(400,{error:'Enter your email and password'});
    const lock=JSON.parse(store.getMeta('login-limit')||'{"attempts":0,"until":0}');if(lock.until>Date.now()&&lock.attempts>=10)return result(429,{error:'Too many attempts. Wait 15 minutes before trying again.'});
    const user=db.prepare('SELECT * FROM users WHERE email=?').get(body.email.trim().toLowerCase());
    if(!passwordMatches(body.password,user)){const fresh=lock.until<=Date.now()?{attempts:0,until:Date.now()+900000}:lock;fresh.attempts++;store.setMeta('login-limit',JSON.stringify(fresh));return result(401,{error:'Email or password is incorrect'});}
    store.setMeta('login-limit','{"attempts":0,"until":0}');const session=randomBytes(32).toString('hex');sessions.set(session,{userId:user.id,version:user.token_version,expires:Date.now()+28800000});return result(200,{user:{name:user.name,email:user.email,role:user.role}},{session});
   }
   const user=userFor(token);if(!user)return result(401,{error:'Please sign in to continue'});
   if(path==='/api/auth/me'&&method==='GET')return result(200,{user:{name:user.name,email:user.email,role:user.role}});
   if(path==='/api/auth/logout'&&method==='POST'){db.prepare('UPDATE users SET token_version=token_version+1 WHERE id=?').run(user.id);sessions.delete(token);return result(200,{ok:true},{session:''});}
   if(path==='/api/users'){
    if(user.role!=='Admin')return result(403,{error:'Administrator access required'});
    if(method==='GET')return result(200,{users:db.prepare('SELECT id,name,email,role FROM users').all()});
    createUser(db,body);return result(201,{ok:true});
   }
   if(path==='/api/gym'&&method==='GET')return result(200,store.snapshot());
   if(path==='/api/gym'&&method==='POST'){
    if(user.role!=='Admin'&&['delete','plan','settings','restore'].includes(body.action))return result(403,{error:'Administrator access required'});
    db.exec('BEGIN IMMEDIATE');try{
     const old=store.snapshot();if(body.version!==old.version){db.exec('ROLLBACK');return result(409,{error:'Data changed in another window. Reload and retry.'});}
     let photos=[];let operation=body;
     if(body.action==='restore'&&body.value?.format==='ironpulse-desktop-backup-v1'){
      if(!Array.isArray(body.value.photos)||body.value.photos.length>5000)throw Error('Invalid backup photos');photos=body.value.photos.map(p=>{if(typeof p.id!=='string'||!/^[a-f0-9-]{36}$/.test(p.id))throw Error('Invalid backup photo ID');return {...p,bytes:photograph(p)}});if(photos.reduce((n,p)=>n+p.bytes.length,0)>64000000)throw Error('Backup photos exceed 64 MB');operation={...body,value:body.value.data};
     }
     const updated=applyMutation(old.data,operation);updated.logs[0].text+=' · '+user.name;
     const text=JSON.stringify(updated);if(Buffer.byteLength(text)>12000000)throw Error('Workspace size limit reached');
     for(const p of photos)db.prepare('INSERT INTO photos VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET mime=excluded.mime,bytes=excluded.bytes').run(p.id,p.type,p.bytes);
     db.prepare('UPDATE workspace SET payload=?,version=version+1 WHERE id=1').run(text);db.exec('COMMIT');return result(200,{data:updated,version:old.version+1});
    }catch(e){db.exec('ROLLBACK');throw e}
   }
   if(path==='/api/backup'&&method==='GET'){
    if(user.role!=='Admin')return result(403,{error:'Administrator access required'});const data=store.snapshot().data;const ids=new Set(data.members.filter(m=>m.photo).map(m=>new URL(m.photo,'https://local').searchParams.get('key')));const photos=db.prepare('SELECT * FROM photos').all().filter(p=>ids.has(p.id));if(photos.reduce((n,p)=>n+p.bytes.length,0)>64000000)return result(413,{error:'Photo backup exceeds 64 MB. Contact the owner for a database-level backup.'});return result(200,{format:'ironpulse-desktop-backup-v1',data,photos:photos.map(p=>({id:p.id,type:p.mime,base64:Buffer.from(p.bytes).toString('base64')}))});
   }
   if(path==='/api/photo'&&method==='POST'){const bytes=photograph(body);const id=randomUUID();db.prepare('INSERT INTO photos VALUES(?,?,?)').run(id,body.type,bytes);return result(200,{url:'/api/photo?key='+id});}
   if(path.startsWith('/api/photo?key=')&&method==='GET'){const id=new URL(path,'https://local').searchParams.get('key');const photo=db.prepare('SELECT mime,bytes FROM photos WHERE id=?').get(id);return photo?result(200,{base64:Buffer.from(photo.bytes).toString('base64'),type:photo.mime}):result(404,{error:'Photo not found'});}
   return result(404,{error:'Unknown operation'});
  }catch(e){return result(400,{error:String(e.message).includes('UNIQUE constraint')?'This account already exists':e.message})}
 }
 return {dispatch,close:()=>{sessions.clear();store.close()}};
}
