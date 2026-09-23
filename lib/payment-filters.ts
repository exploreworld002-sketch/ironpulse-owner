import type { Payment } from './gym.ts';
export const paymentMethods=['All','Cash','UPI','Card','Bank transfer'] as const;
export type PaymentMethodFilter=typeof paymentMethods[number];
export function filterPayments(payments:Payment[],method:PaymentMethodFilter,from?:string,to?:string){return payments.filter(p=>(method==='All'||p.method===method)&&(!from||p.date>=from)&&(!to||p.date<=to)).sort((a,b)=>b.date.localeCompare(a.date));}
export function collectedTotal(payments:Payment[]){return payments.reduce((n,p)=>n+Math.round(p.amount*100),0)/100;}
