// Eight concurrent rooms, 64 actual TCP/WebSocket clients, production Node transport.
import assert from 'node:assert/strict';
import {setImmediate} from 'node:timers/promises';
import {WebSocket} from 'ws';
import {startServer} from '../server/node-server.js';
let clock=1000;const server=await startServer({now:()=>clock,manualTick:true}),clients=[],codes=[],durations=[];
let messages=0,bytes=0;const token=n=>n.toString(16).padStart(64,'0');
const until=async(predicate)=>{for(let i=0;i<300;i++){if(predicate())return;await new Promise(r=>setTimeout(r,5));}assert.fail('WebSocket load timeout');};
try{
 for(let room=0;room<8;room++){
  const owner=room*8+1;const res=await fetch(server.url+'/api/rooms',{method:'POST',headers:{Origin:server.url},body:JSON.stringify({token:token(owner)})});assert.equal(res.status,201);const {code}=await res.json();codes.push(code);
  for(let seat=0;seat<8;seat++){
   const ws=new WebSocket(server.url.replace('http:','ws:')+'/room/'+code,{origin:server.url});const client={ws,room,seat,latest:null,seq:0,errors:[]};clients.push(client);
   client.send=p=>ws.send(JSON.stringify({protocol:1,...p}));
   ws.on('message',raw=>{messages++;bytes+=raw.length;const p=JSON.parse(raw);if(p.type==='snapshot'){if(client.latest&&p.roundId===client.latest.roundId)assert.ok(p.frame>=client.latest.frame);client.latest=p;}else if(p.type==='error')client.errors.push(p);});
   await new Promise((r,j)=>{ws.once('open',r);ws.once('error',j);});client.send({type:'hello',token:token(owner+seat),profile:{name:'Player '+seat}});
  }
 }
 await until(()=>clients.every(c=>c.latest));
 for(const c of clients)if(c.seat===0)c.send({type:'start',game:['pool','zombie','kick','spin'][c.room%4]});
 await until(()=>codes.every(code=>server.rooms.get(code).phase==='countdown'));
 clock=6000;clients.forEach(c=>c.send({type:'ping',echo:clock}));await setImmediate();await setImmediate();server.tick();
 for(let tick=0;tick<240;tick++){
  if(tick%3===0)for(const c of clients){const room=server.rooms.get(codes[c.room]);c.send({type:'input',roundId:room.roundId,tick:room.frame,seq:c.seq++,input:{x:0,z:0,action:tick%60===0,kick:tick%120===0?'low':undefined,shot:tick%150===0?{id:c.seq,x:0,y:.5}:undefined}});}
  await setImmediate();await setImmediate();clock+=1000/60+.001;const at=performance.now();server.tick();durations.push(performance.now()-at);
 }
 clock+=51;server.tick();await until(()=>clients.every(c=>c.latest.frame===server.rooms.get(codes[c.room]).frame));
 for(const c of clients){assert.deepEqual(c.errors,[]);assert.equal(c.latest.selfId,c.seat);assert.deepEqual(c.latest.match,clients[c.room*8].latest.match);}
 durations.sort((a,b)=>a-b);console.log(JSON.stringify({rooms:8,clients:64,simulationSeconds:4,messages,bytes,tickP95ms:+durations[Math.floor(durations.length*.95)].toFixed(2),maxTickMs:+durations.at(-1).toFixed(2),rssMB:Math.round(process.memoryUsage().rss/1048576),errors:0},null,2));
}finally{await server.close();}
