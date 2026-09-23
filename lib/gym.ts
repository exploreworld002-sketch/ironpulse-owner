import { z } from 'zod';
export const day=(d=new Date())=>d.toISOString().slice(0,10);
export const shift=(n:number)=>day(new Date(Date.now()+n*86400000));
export const money=(n:number)=>'₹'+n.toLocaleString('en-IN');
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>{const d=new Date(v+'T00:00:00Z');return !Number.isNaN(d.getTime())&&day(d)===v},'Enter a valid calendar date');
export const memberSchema=z.object({id:z.string(),name:z.string().trim().min(2).max(100),email:z.string().trim().toLowerCase().email(),phone:z.string().trim().min(8).max(25),emergency:z.string().max(150),planId:z.string(),start:date,end:date,fee:z.number().nonnegative().max(1000000).multipleOf(0.01),due:date,photo:z.string().max(300).refine(v=>!v||v.startsWith('/api/photo?key='),'Use an uploaded member photo').optional(),notes:z.string().max(2000)});
export const planSchema=z.object({id:z.string(),name:z.string().trim().min(2).max(80),months:z.number().int().min(1).max(36),price:z.number().positive().max(1000000).multipleOf(0.01),description:z.string().max(200)});
export const paymentSchema=z.object({id:z.string(),memberId:z.string(),amount:z.number().positive().max(1000000).multipleOf(0.01),date:date,method:z.enum(['UPI','Cash','Card','Bank transfer']),note:z.string().max(500)});
export const attendanceSchema=z.object({id:z.string(),memberId:z.string(),date:date,time:z.string().max(30)});
export const stateSchema=z.object({members:z.array(memberSchema).max(5000),plans:z.array(planSchema).max(100),payments:z.array(paymentSchema).max(30000),attendance:z.array(attendanceSchema).max(100000),logs:z.array(z.object({id:z.string(),text:z.string(),time:z.string()})).max(1000),settings:z.object({name:z.string().trim().min(2).max(80),email:z.union([z.literal(''),z.string().email()]),phone:z.string().max(30),address:z.string().max(300),renewalDays:z.number().int().min(1).max(90)})});
export type Member=z.infer<typeof memberSchema>;export type Plan=z.infer<typeof planSchema>;export type Payment=z.infer<typeof paymentSchema>;export type Gym=z.infer<typeof stateSchema>;
export function balance(s:Gym,id:string){const m=s.members.find(x=>x.id===id);return Math.max(0,cents(m?.fee||0)-s.payments.filter(p=>p.memberId===id).reduce((a,p)=>a+cents(p.amount),0))/100;}
export function status(m:Member){return m.start>day()?'Upcoming':m.end<day()?'Expired':'Active';}
export function emptyGym():Gym{return {members:[],plans:[],payments:[],attendance:[],logs:[],settings:{name:'My Gym',email:'',phone:'',address:'',renewalDays:7}};}
export const cents=(n:number)=>Math.round(n*100);
export function addMonths(start:string,months:number){const d=new Date(start+'T00:00:00Z');const original=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+months);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(original,last));return day(d);}
