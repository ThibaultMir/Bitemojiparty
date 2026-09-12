// Development-only transport. Production uses server/node-server.js with SQLite.
import {WebSocketServer} from 'ws';
import {Room} from './room.js';
import {digest,validToken,handleMessage,safeSend} from './protocol.js';
export function attachLocalRooms(httpServer,{now=Date.now,tickMs=1000/60}={}){
 const rooms=new Map(),sessions=new Map(),wss=new WebSocketServer({noServer:true,maxPayload:4096});let seed=1;
 const handler=async(req,res,next=()=>{res.writeHead(404);res.end();})=>{
  const lookup=req.url?.match(/^\/api\/rooms\/(\d{6})$/)?.[1];if(lookup&&req.method==='GET'){const r=rooms.get(lookup);res.writeHead(r&&r.phase!=='closed'?200:404,{'Content-Type':'application/json'});res.end(JSON.stringify({code:lookup}));return;}
  if(req.url?.split('?')[0]!=='/api/rooms'||req.method!=='POST')return next();
  try{let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>2048)throw new Error('Trop volumineux');}const body=JSON.parse(raw);if(!validToken(body.token))throw new Error('Session invalide');
   const owner=await digest(body.token);let room=[...rooms.values()].find(r=>r.owner===owner&&r.phase!=='closed');if(!room){const code=String(100000+seed++);room=new Room({code,owner,profile:body.profile,now:now(),seed});rooms.set(code,room);}
   res.writeHead(201,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({code:room.code,protocol:1}));
  }catch(e){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({message:e.message}));}
 };
 httpServer.on('upgrade',(req,socket,head)=>{
  const code=req.url?.match(/^\/room\/(\d{6})$/)?.[1];if(!code)return;
  const room=rooms.get(code);if(!room||room.phase==='closed'){socket.write('HTTP/1.1 404 Not Found\r\n\r\n');socket.destroy();return;}
  wss.handleUpgrade(req,socket,head,ws=>{
   const session={room};sessions.set(ws,session);
   ws.on('message',async(raw,isBinary)=>{try{
    const effect=await handleMessage(room,session,isBinary?raw:raw.toString(),now());
    if(effect.joined)for(const [old,s] of sessions)if(old!==ws&&s.room===room&&s.key===session.key){sessions.delete(old);old.close(4001,'Session remplacée');}
    if(effect.pong)safeSend(ws,effect.pong);
    if(effect.left){safeSend(ws,{type:'left'});sessions.delete(ws);ws.close();}
    else if(effect.joined||effect.critical)safeSend(ws,room.view(session.key,now()));
   }catch(e){safeSend(ws,{type:'error',code:e.code||'server',message:e.message});}});
   ws.on('close',()=>{if(sessions.get(ws)===session&&session.key)room.disconnect(session.key,now());sessions.delete(ws);});
  });
 });
 let lastBroadcast=0;
 const timer=setInterval(()=>{const time=now();for(const room of rooms.values())room.advance(time);if(time-lastBroadcast>=50){lastBroadcast=time;for(const [ws,s] of sessions)if(s.key)try{safeSend(ws,s.room.view(s.key,time));}catch{}}},tickMs);timer.unref();
 return {handler,rooms,sessions,close(){clearInterval(timer);for(const ws of sessions.keys())ws.terminate();wss.close();}};
}
