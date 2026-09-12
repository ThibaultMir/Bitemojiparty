// Production HTTP/WebSocket server for any Node 24 host. No player accounts.
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,dirname} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {WebSocketServer} from 'ws';
import {Room} from './room.js';
import {digest,validToken,handleMessage,safeSend} from './protocol.js';
export async function startServer({port=0,host='127.0.0.1',database=':memory:',origin=null,now=Date.now,manualTick=false,assets=resolve('dist'),maxRooms=64,trustProxy=false}={}){
 assets=resolve(assets);
 if(database!==':memory:')await mkdir(dirname(resolve(database)),{recursive:true});
 const db=new DatabaseSync(database);db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS rooms (code TEXT PRIMARY KEY, state TEXT NOT NULL)');
 const write=db.prepare('INSERT INTO rooms(code,state) VALUES (?,?) ON CONFLICT(code) DO UPDATE SET state=excluded.state');
 const remove=db.prepare('DELETE FROM rooms WHERE code=?');
 const rooms=new Map(),sessions=new Map(),rates=new Map(),revisions=new Map(),savedAt=new Map();
 const save=r=>{write.run(r.code,JSON.stringify(r.export()));revisions.set(r.code,r.revision);savedAt.set(r.code,now());};
 for(const row of db.prepare('SELECT code,state FROM rooms').all()){
  try{const data=JSON.parse(row.state);if(now()-data.createdAt>7200000){remove.run(row.code);continue;}const room=Room.recover(data,now());rooms.set(row.code,room);save(room);}catch{remove.run(row.code);}
 }
 const wss=new WebSocketServer({noServer:true,maxPayload:4096,perMessageDeflate:false});
 const json=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
 const permits=req=>{const actual=req.headers.origin;return actual&&(origin?actual===origin:actual==='http://'+req.headers.host);};
 const admit=(ip,token)=>{const t=now();let r=rates.get(ip);if(!r||t-r.at>600000){r={at:t,tokens:new Set()};rates.set(ip,r);}if(r.tokens.has(token))return true;if(r.tokens.size>=10)return false;r.tokens.add(token);return true;};
 const server=createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://local');
   if(url.pathname==='/health')return json(res,200,{ok:true,protocol:1});
   const lookup=url.pathname.match(/^\/api\/rooms\/(\d{6})$/)?.[1];if(lookup&&req.method==='GET'){const room=rooms.get(lookup);return json(res,room&&room.phase!=='closed'?200:404,{code:lookup,available:!!room&&room.phase!=='closed'});}
   if(url.pathname==='/api/rooms'&&req.method==='POST'){
    if(!permits(req))return json(res,403,{message:'Origine non autorisée.'});
    if(Number(req.headers['content-length']||0)>2048)return json(res,413,{message:'Requête trop volumineuse.'});
    let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>2048)return json(res,413,{message:'Requête trop volumineuse.'});}
    let body;try{body=JSON.parse(raw);}catch{return json(res,400,{message:'Requête illisible.'});}
    if(!body||!validToken(body.token))return json(res,400,{message:'Session invalide.'});
    const ip=trustProxy?String(req.headers['x-forwarded-for']||req.socket.remoteAddress).split(',').at(-1).trim():req.socket.remoteAddress;
    const key=await digest(body.token);if(!admit(ip,key))return json(res,429,{message:'Trop de créations de room. Réessaie dans quelques minutes.'});
    for(let attempt=0;attempt<8;attempt++){
     const hash=await digest(key+':'+attempt),code=String(100000+parseInt(hash.slice(0,12),16)%900000);
     const previous=rooms.get(code);if(previous){if(previous.owner===key&&previous.phase!=='closed')return json(res,200,{code,protocol:1});continue;}
     if([...rooms.values()].filter(r=>r.phase!=='closed').length>=maxRooms)return json(res,503,{message:'Le serveur est complet. Les parties en cours continuent ; réessaie plus tard.'});
     const room=new Room({code,owner:key,profile:body.profile,seed:parseInt(hash.slice(12,20),16),now:now()});save(room);rooms.set(code,room);return json(res,201,{code,protocol:1});
    }
    return json(res,503,{message:'Impossible de réserver un code.'});
   }
   if(!['GET','HEAD'].includes(req.method))return json(res,405,{message:'Méthode non autorisée.'});
   if(url.pathname==='/multiplayer-config.js'){
    res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});return res.end('export const MULTIPLAYER_URL=location.origin;');
   }
   const name=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));
   const path=resolve(assets,name);if(!path.startsWith(assets+'/'))return json(res,404,{message:'Introuvable.'});
   let body;try{body=await readFile(path);}catch{return json(res,404,{message:'Introuvable.'});}
   const type={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'}[extname(path)]||'application/octet-stream';
   res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'"});res.end(req.method==='HEAD'?undefined:body);
  }catch(error){console.error('http_request_failed',error.name);if(!res.headersSent)json(res,503,{message:'Le serveur est indisponible.'});else res.end();}
 });
 server.on('upgrade',(req,socket,head)=>{
  const code=req.url?.match(/^\/room\/(\d{6})$/)?.[1],room=rooms.get(code);
  const sameRoom=Array.from(sessions.values()).filter(s=>s.room===room).length;
  if(!permits(req)||!room||room.phase==='closed'||sameRoom>=16){socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');socket.destroy();return;}
  wss.handleUpgrade(req,socket,head,ws=>{
   const session={room,at:now(),window:now(),count:0};sessions.set(ws,session);let chain=Promise.resolve();
   ws.on('message',(raw,binary)=>{chain=chain.then(async()=>{
    if(sessions.get(ws)!==session)return;
    const time=now();if(time-session.window>=1000){session.window=time;session.count=0;}if(++session.count>80){ws.close(1008,'Trop de messages');return;}
    try{
     const effect=await handleMessage(room,session,binary?raw:raw.toString(),time);
     if(effect.joined)for(const [old,s] of sessions)if(old!==ws&&s.room===room&&s.key===session.key){sessions.delete(old);old.close(4001,'Session remplacée');}
     if(effect.critical)save(room);
     if(effect.pong)safeSend(ws,effect.pong);
     if(effect.left){safeSend(ws,{type:'left'});sessions.delete(ws);ws.close(1000,'Room quittée');}
     else if(effect.joined||effect.critical)safeSend(ws,room.view(session.key,time));
    }catch(error){safeSend(ws,{type:'error',code:error.code||'server',message:error.code?error.message:'Le serveur est indisponible.'});if(!session.key||!error.code)ws.close(1011,'Connexion interrompue');}
   });});
   ws.on('close',()=>{if(sessions.get(ws)===session&&session.key){room.disconnect(session.key,now());try{save(room);}catch{}}sessions.delete(ws);});
   ws.on('error',()=>{});
  });
 });
 let lastBroadcast=0;
 function tick(){
  const time=now();
  for(const [code,room] of rooms){try{room.advance(time);if(revisions.get(code)!==room.revision||time-(savedAt.get(code)||0)>5000)save(room);if(time-room.createdAt>7200000){rooms.delete(code);remove.run(code);}}catch{for(const [ws,s] of sessions)if(s.room===room)ws.close(1011,'Serveur indisponible');}}
  for(const [ip,rate] of rates)if(time-rate.at>600000)rates.delete(ip);
  for(const [ws,s] of sessions)if(!s.key&&time-s.at>5000){sessions.delete(ws);ws.close(1008,'Identification requise');}
  if(time-lastBroadcast>=50){lastBroadcast=time;for(const [ws,s] of sessions)if(s.key)try{safeSend(ws,s.room.view(s.key,time));if(s.room.phase==='closed')ws.close(1000,'Room fermée');}catch{ws.close();}}
 }
 const timer=manualTick?null:setInterval(tick,1000/60);timer?.unref();
 await new Promise(r=>server.listen(port,host,r));
 return {rooms,sessions,tick,url:'http://127.0.0.1:'+server.address().port,close:async()=>{clearInterval(timer);for(const ws of sessions.keys())ws.terminate();await new Promise(r=>server.close(r));for(const room of rooms.values())save(room);wss.close();db.close();}};
}
