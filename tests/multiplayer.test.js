import test from 'node:test';
import assert from 'node:assert/strict';
import {Room} from '../server/room.js';
import {Match,COLORS,GAMES} from '../dist/simulation.js';
import {masterWeights,chooseMaster,statefulRandom,captureMatch,restoreMatch,publicMatch,cleanInput,NET} from '../dist/net-state.js';
import {decode,handleMessage,digest,allowedOrigin} from '../server/protocol.js';
import {parseRoomCode,roomLink,remapSnapshot,interpolateSnapshot} from '../dist/network.js';
const token=i=>i.toString(16).padStart(64,'0');
function setup(humans=4,seed=1){const r=new Room({code:'123456',owner:'owner',profile:{name:'Créateur'},now:0,seed});for(let i=1;i<humans;i++)r.join('p'+i,{name:'J'+i},0);return r;}
function alive(r,t){r.members.forEach(m=>{if(m)r.heartbeat(m.key,t);});}
function step(r,frames=1){for(let i=0;i<frames;i++){const t=(r.tickAt||r.phaseUntil)+1000/60+.001;alive(r,t);r.advance(t);}}
function start(r,game='kick'){r.start('owner',game,0);r.advance(r.phaseUntil);return r;}

test('master probabilities: exact requested weights for 1–8 humans, including non-contiguous seats',()=>{
 for(let n=1;n<=8;n++){
  const ids=Array.from({length:n},(_,i)=>(i*3)%8),w=masterWeights(ids);assert.equal(w.length,8);
  for(let i=0;i<8;i++)assert.equal(w[i],n>=4?(ids.includes(i)?1:0):(ids.includes(i)?2:1));
 }
 assert.deepEqual(masterWeights([0,1,2]),[2,2,2,1,1,1,1,1]);
 const rng=statefulRandom(2026),counts=Array(8).fill(0);for(let i=0;i<110000;i++)counts[chooseMaster([0,1,2],rng)]++;
 counts.forEach((count,i)=>assert.ok(Math.abs(count/110000-(i<3?2/11:1/11))<.005));
 for(let i=0;i<20000;i++)assert.ok([1,3,5,7].includes(chooseMaster([1,3,5,7],rng)));
});
test('room capacity, retries, sanitized names and creator-only start enforced on server',()=>{
 const r=setup(8);assert.throws(()=>r.join('ninth',{},0),/complète/);assert.equal(r.join('p3',{},1).id,3);
 assert.throws(()=>r.start('p1','party',0),/créateur/);assert.throws(()=>r.start('owner','invalid',0),/inconnu/);
 r.start('owner','party',0);assert.equal(new Set(r.order).size,4);assert.throws(()=>r.start('owner','party',0),/déjà/);
 const n=setup(1);n.join('x',{name:'<script>\nabcdefghijklmno',color:'url(x)',skin:99},0);assert.ok(!/[<>\n]/.test(n.members[1].name));assert.equal(n.members[1].color,COLORS[1]);
});
test('all room sizes produce exactly eight players and the expected bot count',()=>{
 for(let count=1;count<=8;count++)for(const game of Object.keys(GAMES)){
  const r=start(setup(count,count),game);assert.equal(r.match.players.length,8);assert.equal(r.match.humanIds.length,count);assert.equal(r.roster.filter(p=>!p.human).length,8-count);
  if(count>=4)assert.ok(r.match.humanIds.includes(r.match.master));
 }
});
test('late join waits for next round; a reconnect keeps its slot and never grants host rights',()=>{
 const r=start(setup(2),'party'),before=r.match.humanIds.slice();r.join('late',{name:'Retardataire'},5100);assert.equal(r.view('late',5100).canPlay,false);
 r.receive('late',{roundId:r.roundId,seq:1,tick:0,input:{action:true}},5100);assert.deepEqual(r.match.humanIds,before);
 r.disconnect('p1',5200);assert.equal(r.join('p1',{},5500).id,1);assert.equal(r.view('p1',5500).canPlay,true);assert.throws(()=>r.start('p1','kick',5500),/créateur/);
});
test('stale inputs stop; disconnected players become bots and recover without reviving',()=>{
 const r=start(setup(2),'kick'),m=r.match;r.receive('p1',{roundId:r.roundId,seq:0,tick:0,input:{action:true}},5000);step(r,2);assert.ok(r.match.players[1].jump>0);
 r.disconnect('p1',r.tickAt);r.advance(r.tickAt+17);assert.ok(!r.match.humanIds.includes(1));
 r.match.eliminate(r.match.players[1]);r.join('p1',{},r.tickAt+18);r.advance(r.tickAt+35);assert.equal(r.match.players[1].alive,false);
 const s=start(setup(8),'zombie');s.receive('p1',{roundId:s.roundId,seq:0,tick:0,input:{x:1}},5000);step(s,40);const x=s.match.players[1].x;step(s,20);assert.equal(s.match.players[1].x,x);
});
test('owner departure closes room; disconnect reserves ownership and expiry cannot elect a new host',()=>{
 const r=setup(2);r.disconnect('owner',0);r.advance(10000);assert.equal(r.phase,'waiting');assert.equal(r.join('owner',{},10001).id,0);r.leave('owner',10002);assert.equal(r.phase,'closed');assert.throws(()=>r.join('x',{},10003),/expiré/);
 const s=setup(2);s.heartbeat('p1',130000);s.advance(130000);assert.equal(s.phase,'closed');
});
test('duplicate, old-round, too old and too far future commands cannot replay attacks',()=>{
 const r=start(setup(8),'kick');const id=r.match.master,key=r.members[id].key;const cmd={roundId:r.roundId,seq:0,tick:0,input:{kick:'high'}};
 assert.ok(r.receive(key,cmd,5000));assert.equal(r.receive(key,cmd,5001),false);step(r,160);assert.equal(r.match.attackSequence,1);
 assert.equal(r.receive(key,{...cmd,seq:1,tick:0},r.tickAt),false);assert.equal(r.receive(key,{...cmd,seq:2,tick:r.frame+999},r.tickAt),false);assert.equal(r.receive(key,{...cmd,seq:3,roundId:99,tick:r.frame},r.tickAt),false);
 step(r,10);assert.equal(r.match.attackSequence,1);
});
test('state checkpoint round-trip is deterministic for every game, including hazards and bot brains',()=>{
 for(const game of Object.keys(GAMES)){
  const rng=statefulRandom(99),m=new Match({game,master:7,humans:0,random:rng});for(let i=0;i<155;i++)m.step(1/60);
  const saved=captureMatch(m),copyRng=statefulRandom(rng.state),copy=restoreMatch(saved,copyRng);
  for(let i=0;i<200&&!m.done;i++){m.step(1/60);copy.step(1/60);assert.deepEqual(publicMatch(copy),publicMatch(m),game+' tick '+i);}
 }
});
test('rollback compensates a delayed command and converges to the on-time authoritative state',()=>{
 for(const game of Object.keys(GAMES)){
  const a=start(setup(8,14),game),b=start(setup(8,14),game);let seq=0;
  const pending=[];
  for(let tick=0;tick<180;tick++){
   if(tick%6===0&&tick<160){const packet={roundId:a.roundId,seq:seq++,tick,input:{x:tick<80?1:-1,z:.2,action:tick%30===0,reverse:tick===60,kick:tick===0?'high':undefined,shot:tick===0?{id:1,x:0,y:.5}:undefined}};const key=a.members[a.match.master].key;a.receive(key,packet,a.tickAt);pending.push({at:tick+8,key,packet});}
   for(const p of pending.filter(p=>p.at===tick))b.receive(p.key,p.packet,b.tickAt);
   step(a);step(b);
  }
  assert.deepEqual(publicMatch(b.match),publicMatch(a.match),game);
 }
});
test('restart preserves membership, ownership and committed scores, restarts interrupted round fairly',()=>{
 const r=start(setup(4),'party');step(r,50);r.totals=[10,20,30,0,0,0,0,0];const restored=Room.recover(r.export(),9000);
 assert.equal(restored.owner,'owner');assert.deepEqual(restored.totals,r.totals);assert.equal(restored.phase,'countdown');assert.equal(restored.match.time,0);assert.equal(restored.round,r.round);assert.equal(restored.roundId,r.roundId+1);assert.ok(restored.notice.includes('scores conservés'));
});
test('untrusted packets cannot inject movement, credentials or scores; snapshots redact private state',async()=>{
 assert.throws(()=>decode('{'),/illisible/);assert.throws(()=>decode('x'.repeat(5000)),/volumineux/);assert.throws(()=>decode('{"protocol":999}'),/mis à jour/);
 assert.deepEqual(cleanInput({x:Infinity,z:NaN,action:'yes',score:999,shot:{id:1,x:'oops',y:1}}),{x:0,z:0});
 const r=start(setup(4),'pool'),view=r.view('owner',6000),str=JSON.stringify(view);for(const secret of ['"key"','"rng"','"brain"','"path"','"received"','"participants"'])assert.ok(!str.includes(secret));
 const session={};await assert.rejects(()=>handleMessage(r,session,JSON.stringify({protocol:1,type:'start',game:'party'}),6000),/Reconnexion/);
 const rr=setup(1),t=token(123),key=await digest(t);rr.join(key,{},0);const joined={};await handleMessage(rr,joined,JSON.stringify({protocol:1,type:'hello',token:t}),1);assert.equal(joined.key,key);
 await assert.rejects(()=>handleMessage(rr,joined,JSON.stringify({protocol:1,type:'start',game:'party'}),2),/créateur/);
 assert.equal(allowedOrigin(new Request('https://server',{headers:{Origin:'https://evil'}}),'https://game'),false);
});
test('links directly identify one room, local remapping preserves all roles and interpolation is bounded',()=>{
 assert.equal(parseRoomCode(' 123456 '),'123456');assert.equal(parseRoomCode('https://example.com/?room=234567'),'234567');assert.equal(parseRoomCode('12345'),null);assert.equal(roomLink('123456','https://game.example/?other=1#secret'),'https://game.example/?room=123456');
 const r=start(setup(8),'spin');step(r,4);const a=r.view('p5',r.tickAt),mapped=remapSnapshot(a);assert.equal(mapped.match.players[0].name,'J5');assert.equal(mapped.mapping[mapped.match.master],a.match.master);
 step(r,2);const b=r.view('p5',r.tickAt),middle=interpolateSnapshot(a,b,.5);assert.ok(middle.match.time>=a.match.time&&middle.match.time<=b.match.time);
});
test('pool shooting resumes after a bot relay or browser reload resets the client shot counter',()=>{
 const r=start(setup(8),'pool'),key=r.members[r.match.master].key;r.match.lastPoolShot=50;
 const command={roundId:r.roundId,seq:0,tick:0,input:{shot:{id:1,x:0,y:.5}}};assert.ok(r.receive(key,command,5000));step(r,1);assert.equal(r.match.lastPoolShot,51);assert.equal(r.match.hazards[0].uid,'splash:51');assert.equal(r.receive(key,command,5100),false);
});
test('long server suspension preserves the match clock and does not fast-forward collisions',()=>{
 const r=start(setup(4),'kick');step(r,20);const before=r.match.time;alive(r,15000);r.advance(15000);assert.equal(r.match.time,before);step(r);assert.ok(r.match.time>before&&r.match.time<before+.02);
});
