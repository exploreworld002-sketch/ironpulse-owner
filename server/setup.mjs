import {createInterface} from 'node:readline/promises';
import {Writable} from 'node:stream';
import {randomBytes} from 'node:crypto';
import {existsSync,writeFileSync} from 'node:fs';
const file=new URL('./.env',import.meta.url);
if(existsSync(file)){console.log('server/.env already exists. Edit it manually; setup will not overwrite your settings.');process.exit(0)}
let muted=false;const output=new Writable({write(chunk,_encoding,done){if(!muted)process.stdout.write(chunk);done()}});
const rl=createInterface({input:process.stdin,output,terminal:true});
try{
 console.log('Set up your empty gym workspace. No sample data will be inserted.');
 const name=(await rl.question('Your name: ')).trim();
 const email=(await rl.question('Admin email: ')).trim().toLowerCase();
 process.stdout.write('Admin password (12+ characters, input hidden): ');muted=true;const password=await rl.question('');muted=false;process.stdout.write('\n');
 if(name.length<2||!/^\S+@\S+\.\S+$/.test(email)||password.length<12||Buffer.byteLength(password)>72)throw Error('Use a name, valid email, and a password of at least 12 characters (maximum 72 UTF-8 bytes). Run setup again.');
 const uri=(await rl.question('MongoDB URI [mongodb://127.0.0.1:27017/ironpulse_local]: ')).trim()||'mongodb://127.0.0.1:27017/ironpulse_local';
 if(!/^mongodb(\+srv)?:\/\//.test(uri))throw Error('Enter a MongoDB connection URI.');
 const quote=v=>JSON.stringify(v);
 writeFileSync(file,[['MONGODB_URI',uri],['JWT_SECRET',randomBytes(48).toString('hex')],['APP_ORIGIN','http://localhost:3000'],['PORT','3000'],['NODE_ENV','development'],['GYM_ID','ironpulse'],['ADMIN_EMAIL',email],['ADMIN_PASSWORD',password],['ADMIN_NAME',name]].map(([k,v])=>k+'='+quote(v)).join('\n')+'\n',{mode:0o600});
 console.log('Created server/.env. Start MongoDB, build the app, and run pnpm start.');
}catch(e){console.error(e.message);process.exitCode=1}finally{muted=false;rl.close()}
