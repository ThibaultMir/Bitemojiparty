import test from 'node:test';
import assert from 'node:assert/strict';
import {Match, GAMES, MANSION, BASE_AREA, makeMansion, blocked, moveWithWalls, Navigation, seededRandom, INFECTION_SECONDS, partySchedule, poolShotPosition, kickPose} from '../dist/simulation.js';

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
 for(let i=0;i<90;i++)m.step(1/60);assert.equal(h.infected,false);
 for(let i=0;i<35;i++)m.step(1/60);assert.equal(h.infected,true);
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


test('party shuffles the four games and any avatar can be master, including repeats',()=>{
 const choices=new Set(),orders=new Set();let repeated=false;
 for(let seed=0;seed<100;seed++) {const p=partySchedule(seededRandom(seed));assert.deepEqual([...p.games].sort(),Object.keys(GAMES).sort());p.masters.forEach(id=>choices.add(id));orders.add(p.games.join(','));if(new Set(p.masters).size<4)repeated=true;}
 assert.equal(choices.size,8);assert.ok(orders.size>1);assert.ok(repeated);
});
test('breaking zombie contact reduces infection and conversion enables the new hunter',()=>{
 const m=new Match({game:'zombie',master:7,humans:8});m.players.forEach((p,i)=>{p.x=-11;p.z=-22+i*5;});const h=m.players[0],z=m.players[7];z.x=h.x+.6;z.z=h.z;
 for(let i=0;i<60;i++)m.step(1/60);assert.ok(h.infection>.4&&h.infection<.6);z.z+=5;
 for(let i=0;i<60;i++)m.step(1/60);assert.equal(h.infection,0);
 z.z=h.z;for(let i=0;i<Math.ceil(INFECTION_SECONDS*60)+2;i++)m.step(1/60);assert.equal(h.infected,true);
 z.z+=10;const q=m.players[1];q.x=h.x+.6;q.z=h.z;
 for(let i=0;i<Math.ceil(INFECTION_SECONDS*60)+2;i++)m.step(1/60);assert.equal(q.infected,true);
});

test('pool projectile launches at the slingshot and lands on its announced tile',()=>{
 const h={x:7,z:4,age:0,delay:1.05};assert.deepEqual(poolShotPosition(h),{x:0,y:2.4,z:-11.8});
 const mid=poolShotPosition({...h,age:.525});assert.ok(mid.y>5);assert.ok(mid.z>-11.8&&mid.z<4);
 const end=poolShotPosition({...h,age:1.05});assert.ok(Math.abs(end.x-7)<1e-10&&Math.abs(end.z-4)<1e-10&&Math.abs(end.y-.35)<1e-10);
});
test('mechanical kick hits on extension, not on warning or retraction; jumping avoids it',()=>{
 const prepare=()=>{const m=new Match({game:'kick',master:7,humans:8});m.players.forEach((p,i)=>{p.x=6;p.z=-7+i*2;});m.players[0].x=0;m.players[0].z=0;m.attack({x:0});return m;};
 const m=prepare();for(let i=0;i<50;i++)m.step(1/60);assert.equal(m.players[0].vz,0);
 for(let i=0;i<26;i++)m.step(1/60);assert.ok(m.hazards[0].hit0);assert.ok(m.players[0].vz>0);
 const n=prepare();for(let i=0;i<90;i++){n.players[0].jump=2;n.players[0].jumpV=0;n.step(1/60);}assert.equal(n.hazards[0].hit0,undefined);
 assert.equal(kickPose({age:1.4,delay:.85}).striking,false);assert.equal(kickPose({age:2,delay:.85}).z,-11);
});
test('spin reversal eases through inertia and the wheel carries grounded players',()=>{
 const m=new Match({game:'spin',master:7,humans:8});const p=m.players[0];p.x=4;p.z=0;const before=m.angle;
 m.step(1/60);assert.ok(p.z>0&&m.angle>before);const speed=m.spinSpeed;m.direction=-1;m.step(1/60);assert.ok(m.spinSpeed<speed&&m.spinSpeed>0);
 for(let i=0;i<90;i++)m.step(1/60);assert.ok(m.spinSpeed<0);assert.equal(m.events.some(e=>e.type==='bump'),false);
});
