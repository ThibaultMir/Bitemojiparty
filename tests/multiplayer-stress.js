// Reproducible hostile-network simulation. It advances the actual authoritative Room.
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {Room} from '../server/room.js';
import {GAMES} from '../dist/simulation.js';
import {statefulRandom,publicMatch} from '../dist/net-state.js';
const began=performance.now(),report={seed:20260912,convergence:0,faultRounds:0,parties:0,packets:0,duplicates:0,dropped:0,late:0,disconnects:0,restarts:0,ticks:0};
const dt=1000/60;
function setup(count,game,seed){const room=new Room({code:'123456',owner:'p0',now:0,seed});for(let i=1;i<count;i++)room.join('p'+i,{name:'Player '+i},0);room.start('p0',game,0);room.members.forEach(m=>{if(m)room.heartbeat(m.key,5000);});room.advance(5000);return room;}
function step(room,absent=-1){const now=room.tickAt+dt+.001;room.members.forEach((m,id)=>{if(m&&id!==absent)room.heartbeat(m.key,now);});room.advance(now);report.ticks++;}
function command(room,id,tick,seq){const gm=id===room.match.master;return {roundId:room.roundId,tick,seq,input:{x:Math.sin(tick/70+id),z:Math.cos(tick/80+id),action:tick%48===0,reverse:gm&&tick%180===0,kick:gm&&tick%144===0?['low','high','slow'][Math.floor(tick/144)%3]:undefined,shot:gm&&tick%150===0?{id:seq+1,x:Math.sin(tick),y:.7}:undefined}};}
function validate(room){assert.equal(room.match.players.length,8);for(const p of room.match.players){for(const key of ['x','z','jump','cooldown'])assert.ok(Number.isFinite(p[key]),room.match.game+' invalid '+key);assert.ok(p.cooldown>=0);}
 if(['results','intermission'].includes(room.phase)){assert.equal(room.roundResults.length,8);for(const r of room.roundResults)assert.ok(r.points>=0&&r.points<=100);}
}
// Each WebSocket is ordered. Jitter changes delivery spacing but never packet ordering.
for(const game of Object.keys(GAMES))for(let count=1;count<=8;count++)for(const lag of [4,10]){
 const a=setup(count,game,77+count),b=setup(count,game,77+count),rng=statefulRandom(20260912+count),pending=[],last=Array(8).fill(0);let seq=0;
 for(let tick=0;tick<240;tick++){
  if(tick%6===0&&tick<216){for(let id=0;id<count;id++){
   const packet=command(a,id,tick,seq++);a.receive('p'+id,packet,a.tickAt);const at=Math.max(last[id],tick+Math.floor(rng()*(lag+1)));last[id]=at;pending.push({at,id,packet});
  }}
  for(const p of pending.filter(p=>p.at===tick)){b.receive('p'+p.id,p.packet,b.tickAt);report.packets++;assert.equal(b.receive('p'+p.id,p.packet,b.tickAt),false);report.duplicates++;}
  step(a);step(b);
 }
 assert.deepEqual(publicMatch(b.match),publicMatch(a.match),`${game}/${count}/${lag}: rollback diverged`);validate(b);report.convergence++;
}
console.log('Convergence: '+report.convergence+' ordered-jitter scenarios passed');
for(const game of Object.keys(GAMES))for(let count=1;count<=8;count++){
 let r=setup(count,game,20260912+count),rng=statefulRandom(99+count),pending=[],seq=0,absent=-1,iterations=0,deathAt=Array(8).fill(null);
 while(r.phase==='playing'&&iterations++<3800){
  const tick=r.frame;
  if(tick===120&&count>1){absent=count-1;r.disconnect('p'+absent,r.tickAt);report.disconnects++;}
  if(tick===360&&absent>=0){const id=r.join('p'+absent,{},r.tickAt).id;assert.equal(id,absent);absent=-1;}
  if(tick%6===0)for(let id=0;id<count;id++)if(id!==absent){
   const packet=command(r,id,tick,seq++);if(rng()<.15){report.dropped++;continue;}
   const delay=rng()<.12?30:Math.floor(rng()*11);pending.push({at:tick+delay,id,packet});
  }
  const due=pending.filter(p=>p.at<=tick);pending=pending.filter(p=>p.at>tick);
  for(const p of due){const accepted=r.receive('p'+p.id,p.packet,r.tickAt);if(tick-p.packet.tick>12){assert.equal(accepted,false);report.late++;}report.packets++;}
  step(r,absent);validate(r);
  r.match.players.forEach((p,i)=>{if(p.alive){assert.ok(deathAt[i]===null||r.frame-deathAt[i]<=13,'Resurrection after rollback window');deathAt[i]=null;}else deathAt[i]??=r.frame;});
 }
 assert.equal(r.phase,'results',game+' must finish despite faults');const totals=[...r.totals];r.advance(r.tickAt+500);assert.deepEqual(r.totals,totals,'Scores awarded twice');report.faultRounds++;
}
console.log('Faults: '+report.faultRounds+' full rounds passed');
for(let count=1;count<=8;count++){
 let r=setup(count,'party',123+count),committed=Array(8).fill(0),restarted=new Set(),scored=new Set(),guard=0;
 while(r.phase!=='results'&&guard++<18000){
  if(r.phase==='playing'){
   // Simulate backgrounded humans. Bots keep each game progressing.
   if(r.frame===60&&!restarted.has(r.round)){r=Room.recover(r.export(),r.tickAt+200);restarted.add(r.round);report.restarts++;continue;}
   const now=r.tickAt+dt+.001;r.heartbeat('p0',now);r.advance(now);report.ticks++;validate(r);
  }else if(r.phase==='countdown'){r.heartbeat('p0',r.phaseUntil);r.advance(r.phaseUntil);}
  else if(r.phase==='intermission'){
   if(!scored.has(r.round)){r.roundResults.forEach(v=>committed[v.id]+=v.points);scored.add(r.round);}
   const now=r.phaseUntil;r.heartbeat('p0',now);r.advance(now);
  }else assert.fail('Unexpected phase '+r.phase);
 }
 assert.equal(r.phase,'results');r.roundResults.forEach(v=>committed[v.id]+=v.points);assert.deepEqual(r.totals,committed);assert.equal(new Set(r.order).size,4);report.parties++;
}
report.elapsedSeconds=+( (performance.now()-began)/1000).toFixed(2);console.log(JSON.stringify(report,null,2));
