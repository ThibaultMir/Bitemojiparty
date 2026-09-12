import test from 'node:test';
import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {startServer} from '../server/node-server.js';
import {RoomClient} from '../dist/network.js';
const token=n=>n.toString(16).padStart(64,'0');
const wait=(getter,predicate,timeout=4000)=>new Promise((resolve,reject)=>{const at=Date.now();const timer=setInterval(()=>{const value=getter();if(predicate(value)){clearInterval(timer);resolve(value);}else if(Date.now()-at>timeout){clearInterval(timer);reject(new Error('Network wait timeout'));}},10);});
async function create(server,n=1){const response=await fetch(server.url+'/api/rooms',{method:'POST',headers:{Origin:server.url,'Content-Type':'application/json'},body:JSON.stringify({token:token(n),profile:{name:'Player '+n}})});return {response,...await response.json()};}
async function connect(server,code,n){
 const ws=new WebSocket(server.url.replace('http:','ws:')+'/room/'+code,{origin:server.url}),packets=[];ws.on('message',raw=>packets.push(JSON.parse(raw)));
 await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});
 const send=p=>ws.send(JSON.stringify({protocol:1,...p}));send({type:'hello',token:token(n),profile:{name:'Player '+n}});
 await wait(()=>packets.at(-1),p=>p?.type==='snapshot'||p?.type==='error');return {ws,packets,send,latest:()=>packets.findLast(p=>p.type==='snapshot')};
}

test('real HTTP/WebSockets: 8 joins, 9th rejected, only creator starts; input roles remain isolated',async()=>{
 let clock=1000;const server=await startServer({now:()=>clock,manualTick:true});
 try{
  const {code}=await create(server);const people=await Promise.all(Array.from({length:8},(_,i)=>connect(server,code,i+1)));
  const ninth=await connect(server,code,9);assert.equal(ninth.packets.at(-1).code,'full');
  people[1].send({type:'start',game:'kick'});await wait(()=>people[1].packets.at(-1),p=>p?.type==='error');assert.match(people[1].packets.at(-1).message,/créateur/);
  people[0].send({type:'start',game:'kick'});await wait(()=>people[0].latest(),p=>p?.phase==='countdown');
  clock=7000;server.tick();clock+=20;server.tick();await wait(()=>people[0].latest(),p=>p?.phase==='playing');
  const m=people[0].latest(),master=m.match.master,impostor=people.find(p=>p.latest().selfId!==master),gm=people.find(p=>p.latest().selfId===master);
  impostor.send({type:'input',roundId:m.roundId,tick:m.frame,seq:0,input:{kick:'low',x:999,score:999}});
  await new Promise(r=>setTimeout(r,20));clock+=70;server.tick();assert.equal(server.rooms.get(code).match.attackSequence,0);
  const room=server.rooms.get(code);gm.send({type:'input',roundId:room.roundId,tick:room.frame,seq:1,input:{kick:'high'}});
  await new Promise(r=>setTimeout(r,20));clock+=70;server.tick();await wait(()=>people.every(p=>p.latest().match?.hazards.some(h=>h.mode==='high')),Boolean);assert.equal(room.match.attackSequence,1);
 }finally{await server.close();}
});
test('real transport: HTTP retry returns same room, forged origins are rejected, secret never appears in snapshots',async()=>{
 const server=await startServer();try{
  const a=await create(server,101),b=await create(server,101);assert.equal(a.code,b.code);assert.equal(server.rooms.size,1);
  const bad=await fetch(server.url+'/api/rooms',{method:'POST',headers:{Origin:'https://evil.example'},body:JSON.stringify({token:token(102)})});assert.equal(bad.status,403);
  const p=await connect(server,a.code,101);assert.ok(!JSON.stringify(p.latest()).includes(token(101)));assert.ok(!JSON.stringify(p.latest()).includes('"key"'));
  const config=await fetch(server.url+'/multiplayer-config.js');assert.ok((await config.text()).includes('location.origin'));
  assert.equal((await fetch(server.url+'/')).status,200);
 }finally{await server.close();}
});
test('real transport: same-session reconnect supersedes old socket and keeps creator rights',async()=>{
 const server=await startServer();try{
  const {code}=await create(server,201),a=await connect(server,code,201),b=await connect(server,code,201);
  await wait(()=>a.ws.readyState,s=>s===3);assert.equal(b.latest().selfId,0);assert.equal(b.latest().ownerId,0);assert.equal(server.rooms.get(code).members.filter(Boolean).length,1);
  b.send({type:'start',game:'spin'});await wait(()=>b.latest(),s=>s?.phase==='countdown');
 }finally{await server.close();}
});
test('real browser client automatically reconnects after forced transport loss without duplicating its seat',async()=>{
 const server=await startServer();let client;
 try{
  const {code}=await create(server,301);let state;const errors=[];
  class Socket extends WebSocket{constructor(url){super(url,{origin:server.url});}}
  client=new RoomClient({endpoint:server.url,profile:{name:'Browser'},onSnapshot:s=>state=s,onError:e=>errors.push(e),WebSocketClass:Socket,storage:null});
  await client.join(code,token(301));await wait(()=>state,s=>s?.phase==='waiting');
  for(const ws of server.sessions.keys())ws.terminate();await wait(()=>client.retries,n=>n>0);await wait(()=>client.retries,n=>n===0,5000);
  assert.equal(state.selfId,0);assert.equal(server.rooms.get(code).members.filter(Boolean).length,1);assert.deepEqual(errors,[]);
 }finally{client?.stop();await server.close();}
});
test('SQLite restart retains room code and creator, restarts a running round with no duplicated score',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'bitemoji-test-')),database=join(dir,'rooms.sqlite');let server;
 try{
  server=await startServer({database});const {code}=await create(server,401),p=await connect(server,code,401);
  p.send({type:'start',game:'pool'});await wait(()=>p.latest(),s=>s?.phase==='countdown');await server.close();
  server=await startServer({database});const resumed=await connect(server,code,401);assert.equal(resumed.latest().ownerId,0);assert.equal(resumed.latest().phase,'countdown');assert.equal(resumed.latest().match.time,0);assert.deepEqual(resumed.latest().totals,Array(8).fill(0));
 }finally{if(server)await server.close();await rm(dir,{recursive:true,force:true});}
});
test('production admission limits and malformed requests fail explicitly without disturbing existing rooms',async()=>{
 const s=await startServer({maxRooms:1});try{
  const a=await create(s,501);assert.equal(a.response.status,201);assert.equal((await create(s,501)).code,a.code);assert.equal((await create(s,502)).response.status,503);
  assert.equal((await fetch(s.url+'/api/rooms',{method:'POST',headers:{Origin:s.url},body:'null'})).status,400);
  assert.equal((await fetch(s.url+'/api/rooms',{method:'POST',headers:{Origin:s.url},body:'x'.repeat(3000)})).status,413);
  assert.equal((await fetch(s.url+'/__tests/online')).status,404);assert.equal((await fetch(s.url+'/api/rooms/000000')).status,404);
  const p=await connect(s,a.code,501);assert.equal(p.latest().ownerId,0);
 }finally{await s.close();}
});
