export {};
declare global {interface Window {ironpulse?:{request:(path:string,method:string,body:unknown)=>Promise<{status:number,data:any}>,requestFile:()=>Promise<{ok:boolean}>,importLicense:()=>Promise<{ok:boolean,error?:string}>,print:()=>Promise<void>};}}
export function installDesktopBridge(){
 if(!window.ironpulse)return;
 const nativeFetch=window.fetch.bind(window);
 window.fetch=async(input,init)=>{
  const path=typeof input==='string'?input:input instanceof URL?input.pathname+input.search:input.url;
  if(!path.startsWith('/api/'))return nativeFetch(input,init);
  let body:any={};if(init?.body instanceof FormData){const file=init.body.get('photo');if(!(file instanceof File))throw Error('Select a photo');if(file.size>2097152)throw Error('Photo must be under 2 MB');const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));body={type:file.type,base64:btoa(binary)};}else if(typeof init?.body==='string')body=JSON.parse(init.body);
  const response=await window.ironpulse!.request(path,init?.method||'GET',body);if(response.status===423)window.dispatchEvent(new Event('ironpulse-license-required'));
  return new Response(JSON.stringify(response.data),{status:response.status,headers:{'Content-Type':'application/json'}});
 };
 window.print=()=>{void window.ironpulse!.print()};
}
