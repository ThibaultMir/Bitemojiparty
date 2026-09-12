import {PROTOCOL} from '../dist/net-state.js';
import {RoomError} from './room.js';
export const validToken=t=>typeof t==='string'&&/^[a-f0-9]{64}$/.test(t);
export const validCode=c=>typeof c==='string'&&/^\d{6}$/.test(c);
export async function digest(value){const bytes=new TextEncoder().encode(value);return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');}
export function decode(raw){
 if(typeof raw!=='string'||raw.length>4096)throw new RoomError('packet','Message trop volumineux.');
 let p;try{p=JSON.parse(raw);}catch{throw new RoomError('packet','Message illisible.');}
 if(!p||typeof p!=='object'||Array.isArray(p)||p.protocol!==PROTOCOL)throw new RoomError('version','Le jeu a été mis à jour. Recharge la page.');return p;
}
export function allowedOrigin(request,allowed){const origin=request.headers.get('Origin');return !!origin&&allowed.split(',').map(v=>v.trim()).includes(origin);}
export function safeSend(ws,message){try{if(ws.readyState===1){if((ws.bufferedAmount||0)>256000){ws.close(1013,'Connexion trop lente');return false;}ws.send(JSON.stringify(message));return true;}}catch{}return false;}
// Transport-independent command handling is also exercised over real local WebSockets.
export async function handleMessage(room,session,raw,now){
 const p=decode(raw);
 if(!session.key){
  if(p.type!=='hello'||!validToken(p.token))throw new RoomError('session','Reconnexion impossible. Rejoins à nouveau la room.');
  const key=await digest(p.token);const joined=room.join(key,p.profile||{},now);session.key=key;session.id=joined.id;return {joined:true,critical:true};
 }
 if(p.type==='ping'){room.heartbeat(session.key,now);return {pong:{type:'pong',echo:p.echo,serverTime:now}};}
 if(p.type==='input'){room.receive(session.key,p,now);return {};}
 if(p.type==='start'){room.heartbeat(session.key,now);room.start(session.key,p.game,now);return {critical:true};}
 if(p.type==='leave'){room.leave(session.key,now);return {critical:true,left:true};}
 throw new RoomError('packet','Commande inconnue.');
}
