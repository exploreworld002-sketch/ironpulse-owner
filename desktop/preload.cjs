// Minimal audited bridge. No filesystem, signing key, or unrestricted IPC access.
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('ironpulse',Object.freeze({
 request:(path,method,body)=>ipcRenderer.invoke('ironpulse:api',{path,method,body}),
 requestFile:()=>ipcRenderer.invoke('ironpulse:request-file'),
 importLicense:()=>ipcRenderer.invoke('ironpulse:import-license'),
 print:()=>ipcRenderer.invoke('ironpulse:print')
}));
