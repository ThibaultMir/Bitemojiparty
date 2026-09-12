import test from 'node:test';
import assert from 'node:assert/strict';
import {RoomClient} from '../dist/network.js';
import {Room} from '../server/room.js';
const response=(code='123456')=>new Response(JSON.stringify({code}),{status:200});
test('leaving during HTTP creation or room lookup cannot resurrect an abandoned connection',async()=>{
 for(const operation of ['create','join']){
  let resolve,opened=0;const pending=new Promise(r=>resolve=r);
  class Socket{constructor(){opened++;}}
  const client=new RoomClient({endpoint:'http://game.test',profile:{},fetchRequest:()=>pending,WebSocketClass:Socket,storage:null});
  const work=operation==='create'?client.create():client.join('123456');client.leave();resolve(response());await work;assert.equal(opened,0);assert.equal(client.closed,true);
 }
});
test('fresh room start invalidates the previous in-flight lookup',async()=>{
 let resolve,opened=[];const pending=new Promise(r=>resolve=r);
 class Socket{constructor(url){opened.push(url);this.readyState=0;}addEventListener(){}close(){}}
 const client=new RoomClient({endpoint:'http://game.test',profile:{},fetchRequest:url=>url.endsWith('123456')?pending:Promise.resolve(response('654321')),WebSocketClass:Socket,storage:null});
 try{const first=client.join('123456');await client.join('654321');resolve(response());await first;assert.equal(opened.length,1);assert.equal(client.code,'654321');}finally{client.stop();}
});
test('a server restart keeps the revealed master for an interrupted round',()=>{
 for(let seed=1;seed<30;seed++){
  const room=new Room({code:'123456',owner:'host',now:0,seed});room.join('other',null,0);room.start('host','kick',0);const restored=Room.recover(room.export(),1000);assert.equal(restored.match.master,room.match.master);
 }
});
test('input edges are single-use, pause suppresses commands, stale snapshots are ignored',async()=>{
 let socket,clock=1000;const seen=[],sent=[];
 class Socket{constructor(){socket=this;this.readyState=1;this.bufferedAmount=0;this.listeners={};}addEventListener(type,fn){this.listeners[type]=fn;}send(raw){sent.push(JSON.parse(raw));}close(){}emit(p){this.listeners.message({data:JSON.stringify(p)});}}
 const client=new RoomClient({endpoint:'http://game.test',profile:{},now:()=>clock,onSnapshot:s=>seen.push(s.frame),fetchRequest:async()=>response(),WebSocketClass:Socket,storage:null});
 try{
  await client.join('123456');const p={type:'snapshot',protocol:1,roundId:1,phase:'playing',selfId:0,frame:100,ack:-1,canPlay:true,match:{players:[{jump:0,cooldown:0}]}};socket.emit(p);socket.emit({...p,frame:99});socket.emit({...p,roundId:0,frame:1000});assert.deepEqual(seen,[100]);
  client.setInput({action:true});client.setInput({action:true});clock+=60;client.flush();assert.equal(sent.filter(p=>p.input?.action).length,1);
  client.setAway(true);client.setInput({kick:'low'});clock+=60;client.flush();assert.equal(sent.filter(p=>p.input?.kick).length,0);
  client.setAway(false);client.flush(true);assert.equal(sent.filter(p=>p.input?.kick).length,0);
 }finally{client.stop();}
});
test('reserved humans keep their draw weight during disconnect; late spectators remain spectators after restart',()=>{
 for(let seed=1;seed<=30;seed++){
  const r=new Room({code:'123456',owner:'host',now:0,seed});for(let i=1;i<4;i++)r.join('p'+i,{},0);r.disconnect('p1',0);r.disconnect('p2',0);r.disconnect('p3',0);r.start('host','kick',0);assert.ok(r.match.master<4);assert.equal(r.roster.filter(p=>p.human).length,4);
  r.join('late',{},10);const restored=Room.recover(r.export(),100);assert.equal(restored.view('late',100).canPlay,false);assert.equal(restored.match.master,r.match.master);
 }
});
test('runner timestamps follow the rendered scene and remain bounded as latency grows',async()=>{
 let socket;const packets=[];
 class Socket{constructor(){socket=this;this.readyState=1;this.bufferedAmount=0;this.listeners={};}addEventListener(k,f){this.listeners[k]=f;}send(raw){packets.push(JSON.parse(raw));}close(){}}
 const c=new RoomClient({endpoint:'http://game.test',profile:{},now:()=>1000,fetchRequest:async()=>response(),WebSocketClass:Socket,storage:null});
 try{await c.join('123456');socket.listeners.message({data:JSON.stringify({type:'snapshot',protocol:1,phase:'playing',roundId:1,selfId:0,frame:100,canPlay:true,match:{game:'kick',master:7,players:[{jump:0,cooldown:0}]}})});
  c.flush(true);assert.equal(packets.at(-1).tick,96);c.rtt=300;c.flush(true);assert.equal(packets.at(-1).tick,108);
  c.latest.match.master=0;c.rtt=0;c.flush(true);assert.equal(packets.at(-1).tick,100);
 }finally{c.stop();}
});
