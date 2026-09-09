import test from 'node:test';
import assert from 'node:assert/strict';
import {Match, GAMES, MANSION, BASE_AREA, makeMansion, blocked, moveWithWalls, Navigation, seededRandom} from '../dist/simulation.js';

test('the mansion covers five times the reference area and every spawn is connected',()=>{
 assert.equal(MANSION.area/BASE_AREA,5);
 const m=new Match({game:'zombie',random:seededRandom(42)});
 for(const p of m.players){assert.equal(blocked(p.x,p.z,m.obstacles,.55),false);for(const q of m.players)if(p!==q)assert.ok(m.nav.path(p,q).length>0,`${p.id} cannot reach ${q.id}`);}
 const nav=new Navigation(makeMansion());const walkable=nav.open.reduce((a,b)=>a+b,0);const seen=new Set(),queue=[nav.open.indexOf(1)];seen.add(queue[0]);
 for(const i of queue)for(const d of [-40,40,-1,1]){const j=i+d;if(j<0||j>=2000||Math.abs(i%40-j%40)>1||!nav.open[j]||seen.has(j))continue;seen.add(j);queue.push(j);}assert.equal(seen.size,walkable,'all walkable rooms must connect');
});
test('movement cannot tunnel through furniture or escape mansion bounds',()=>{
 const obstacles=[{x:0,z:0,w:2,d:2}];const p={x:-3,z:0};moveWithWalls(p,8,0,obstacles);assert.ok(p.x<-1.4);
 moveWithWalls(p,-100,100,obstacles);assert.ok(p.x>=-19.4&&p.z<=24.4);
});
test('infection takes sustained contact, propagates, and respects walls',()=>{
 const m=new Match({game:'zombie',master:7,humans:8});m.players.forEach((p,i)=>{p.x=-11;p.z=-22+i*5;});const h=m.players[0],z=m.players[7];z.x=h.x+.6;z.z=h.z;
 for(let i=0;i<20;i++)m.step(1/60);assert.equal(h.infected,false);
 for(let i=0;i<14;i++)m.step(1/60);assert.equal(h.infected,true);
 const n=new Match({game:'zombie',master:7,humans:8});n.obstacles=[{x:0,z:0,w:.2,d:4}];n.players[0].x=-.5;n.players[0].z=0;n.players[7].x=.5;n.players[7].z=0;for(let i=0;i<90;i++)n.step(1/60);assert.equal(n.players[0].infected,false);
});
test('pool attacks sink the targeted platform and eliminate grounded players',()=>{
 const m=new Match({game:'pool',master:7,humans:8});const p=m.players[0];m.attack(p);for(let i=0;i<80;i++)m.step(1/60);assert.equal(p.alive,false);assert.ok(m.tiles.some(t=>!t.alive));
});
test('all minigames terminate, assign exactly one master, and return bounded scores',()=>{
 for(const game of Object.keys(GAMES))for(let seed=1;seed<=4;seed++){
  const m=new Match({game,master:seed,humans:0,random:seededRandom(seed)});
  for(let i=0;i<4000&&!m.done;i++)m.step(1/60);
  assert.ok(m.done,game+' never ended');assert.ok(m.time<=GAMES[game].duration);const r=m.results();assert.equal(r.length,8);assert.equal(r.filter(p=>p.gm).length,1);assert.ok(r.every(p=>Number.isFinite(p.points)&&p.points>=0&&p.points<=100));
 }
});
test('human master actions have cooldowns and both local players can move',()=>{
 const m=new Match({game:'pool',master:0,humans:2});m.step(1/60,{0:{action:true},1:{x:1,z:0}});assert.equal(m.hazards.length,1);m.step(1/60,{0:{action:true}});assert.equal(m.hazards.length,1);
 const z=new Match({game:'zombie',humans:2});const old=z.players.map(p=>p.x);z.step(1/60,{0:{x:1,z:0},1:{x:-1,z:0}});assert.ok(z.players[0].x>old[0]);assert.ok(z.players[1].x<old[1]);
});
