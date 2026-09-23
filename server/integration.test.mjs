// Run only against an EMPTY disposable MongoDB database whose name ends in _test.
// TEST_MONGODB_URI=mongodb://127.0.0.1:27018/ironpulse_integration_test node server/integration.test.mjs
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
const uri=process.env.TEST_MONGODB_URI;
if(!uri||!new URL(uri).pathname.endsWith('_test'))throw Error('Set TEST_MONGODB_URI to an EMPTY disposable database with a name ending in _test. Never use your working gym database.');
const port=Number(process.env.TEST_PORT||3101),base='http://127.0.0.1:'+port;
let child,owned=false,checks=0,logs='';
await mongoose.connect(uri);if((await mongoose.connection.db.listCollections().toArray()).length)throw Error('Test database is not empty. Refusing to change it.');owned=true;
const password=randomBytes(20).toString('hex');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function request(path,{method='GET',body,cookie='',origin=base}={}){const headers={Origin:origin};if(cookie)headers.Cookie=cookie;if(body&&! (body instanceof FormData))headers['Content-Type']='application/json';const response=await fetch(base+path,{method,headers,body:body instanceof FormData?body:body?JSON.stringify(body):undefined});const contentType=response.headers.get('content-type')||'';const data=contentType.includes('json')?await response.json():await response.arrayBuffer();return {status:response.status,data,cookie:response.headers.get('set-cookie')?.split(';')[0]};}
function ok(actual,expected,label){assert.equal(actual,expected,label);checks++;console.log('PASS '+label)}
try{
 child=spawn(process.execPath,['--experimental-strip-types','server/index.mjs'],{env:{...process.env,MONGODB_URI:uri,JWT_SECRET:randomBytes(48).toString('hex'),ADMIN_NAME:'Integration Admin',ADMIN_EMAIL:'admin@example.test',ADMIN_PASSWORD:password,GYM_ID:'integration-test',APP_ORIGIN:base,PORT:String(port),NODE_ENV:'development',SEED_DEMO:'false'},stdio:['ignore','pipe','pipe']});child.stdout.on('data',b=>logs+=b);child.stderr.on('data',b=>logs+=b);
 let ready=false;for(let i=0;i<80;i++){if(child.exitCode!==null)throw Error('Test server exited: '+logs);try{const r=await request('/api/health');if(r.status===200){ready=true;break}}catch{}await pause(250)}if(!ready)throw Error('Test server did not start: '+logs);
 ok((await request('/api/gym')).status,401,'unauthenticated access denied');
 const login=await request('/api/auth/login',{method:'POST',body:{email:'admin@example.test',password}});ok(login.status,200,'admin login');const cookie=login.cookie;assert.ok(cookie);
 let state=(await request('/api/gym',{cookie})).data;for(const key of ['members','plans','payments','attendance'])ok(state.data[key].length,0,'empty '+key);
 async function mutation(action,value,id,expected=200,who=cookie,version=state.version){const r=await request('/api/gym',{method:'POST',cookie:who,body:{action,value,id,version}});ok(r.status,expected,action+' response '+expected);if(r.status===200)state=r.data;return r;}
 await mutation('plan',{name:'Standard',months:1,price:1000,description:'User-created plan'});const plan=state.data.plans[0];
 const date=new Date().toISOString().slice(0,10),end=new Date(Date.now()+30*86400000).toISOString().slice(0,10);
 await mutation('member',{name:'Integration Member',email:'member@example.test',phone:'9876543210',emergency:'Contact 9876543211',planId:plan.id,start:date,end,due:date,fee:1000,notes:'',photo:''});const member=state.data.members[0];
 await mutation('plan',{...plan,name:'Renamed',price:1200});ok(state.data.members[0].fee,1000,'plan edit leaves existing fee unchanged');ok(state.data.plans.length,1,'plan edit does not create duplicate');
 await mutation('payment',{memberId:member.id,amount:250,date,method:'UPI',note:'Partial payment'});await mutation('payment',{memberId:member.id,amount:751,date,method:'UPI',note:''},null,400);
 await mutation('attendance',null,member.id);await mutation('attendance',null,member.id,400);
 const nextDay=new Date(new Date(end+'T00:00:00Z').getTime()+86400000).toISOString().slice(0,10);await mutation('renew',{planId:plan.id,start:nextDay,due:date},member.id);ok(state.data.members[0].fee,2200,'renewal adds updated plan fee');ok(state.data.payments.length,1,'renewal retains payment history');
 await mutation('settings',state.data.settings,null,409,cookie,state.version-1);
 ok((await request('/api/gym',{method:'POST',cookie,origin:'https://invalid.example',body:{action:'settings',value:state.data.settings,version:state.version}})).status,403,'cross-origin mutation denied');
 const form=new FormData();form.set('photo',new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD1sAAAAASUVORK5CYII=','base64')],{type:'image/png'}),'photo.png');const photo=await request('/api/photo',{method:'POST',cookie,body:form});ok(photo.status,200,'photo uploaded');ok((await request(photo.data.url,{cookie})).status,200,'authenticated photo download');ok((await request(photo.data.url)).status,401,'photo hidden from unauthenticated requests');
 await mutation('member',{...state.data.members[0],photo:photo.data.url});
 ok((await request('/api/users',{method:'POST',cookie,body:{name:'Staff User',email:'staff@example.test',password,role:'Staff'}})).status,201,'create staff account');
 const staff=(await request('/api/auth/login',{method:'POST',body:{email:'staff@example.test',password}})).cookie;
 for(const action of ['plan','delete','settings','restore'])await mutation(action,{},member.id,403,staff);
 ok((await request('/api/users',{method:'POST',cookie:staff,body:{}})).status,403,'staff cannot create users');
 await mutation('payment',{memberId:member.id,amount:100,date,method:'Cash',note:''},null,200,staff);
 const backup=structuredClone(state.data),bad=structuredClone(backup);bad.payments[0].memberId='missing';await mutation('restore',bad,null,400);await mutation('restore',backup);
 await mutation('delete',null,member.id);ok(state.data.payments.length+state.data.attendance.length,0,'delete cleans related records');
 ok((await request('/api/auth/logout',{method:'POST',cookie})).status,200,'logout');ok((await request('/api/gym',{cookie})).status,401,'logout invalidates old token');
 console.log('All '+checks+' HTTP/MongoDB integration checks passed.');
}finally{if(child){child.kill('SIGTERM');await new Promise(r=>{child.once('exit',r);setTimeout(r,3000)});}if(owned)await mongoose.connection.db.dropDatabase();await mongoose.disconnect();}
