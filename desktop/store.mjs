import {DatabaseSync} from 'node:sqlite';
import {randomBytes,scryptSync,timingSafeEqual,randomUUID} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
import {emptyGym} from '../lib/gym.ts';
export function openStore(file){
 mkdirSync(path.dirname(file),{recursive:true,mode:0o700});const db=new DatabaseSync(file);db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
 db.exec('CREATE TABLE IF NOT EXISTS workspace (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL, version INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,hash TEXT NOT NULL,salt TEXT NOT NULL,role TEXT NOT NULL,token_version INTEGER NOT NULL DEFAULT 0); CREATE TABLE IF NOT EXISTS photos (id TEXT PRIMARY KEY,mime TEXT NOT NULL,bytes BLOB NOT NULL); CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY,value TEXT NOT NULL);');
 db.prepare('INSERT OR IGNORE INTO workspace VALUES(1,?,1)').run(JSON.stringify(emptyGym()));
 return {db,getMeta:k=>db.prepare('SELECT value FROM meta WHERE key=?').get(k)?.value,setMeta:(k,v)=>db.prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(k,String(v)),snapshot:()=>{const r=db.prepare('SELECT payload,version FROM workspace WHERE id=1').get();return {data:JSON.parse(r.payload),version:r.version}},close:()=>db.close()};
}
export function passwordHash(password,salt=randomBytes(24).toString('hex')){return {salt,hash:scryptSync(password,salt,64).toString('hex')};}
export function passwordMatches(password,user){if(!user)return false;const hash=scryptSync(password,user.salt,64);return timingSafeEqual(hash,Buffer.from(user.hash,'hex'));}
export function createUser(db,value){if(!value||typeof value.email!=='string'||!/^\S+@\S+\.\S+$/.test(value.email)||value.email.length>254||typeof value.name!=='string'||value.name.trim().length<2||value.name.length>80||typeof value.password!=='string'||value.password.length<12||value.password.length>128||!['Admin','Staff'].includes(value.role))throw Error('Enter a name, email and password of 12–128 characters');const secret=passwordHash(value.password);db.prepare('INSERT INTO users(id,email,name,hash,salt,role) VALUES(?,?,?,?,?,?)').run(randomUUID(),value.email.trim().toLowerCase(),value.name.trim(),secret.hash,secret.salt,value.role);}
