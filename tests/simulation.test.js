import test from 'node:test';
import assert from 'node:assert/strict';
import {Match, SPIN, POOL, POOL_LAYOUT, makePool, poolAim, poolHit, poolOutline, GAMES, MANSION, BASE_AREA, makeMansion, blocked, moveWithWalls, Navigation, seededRandom, INFECTION_SECONDS, partySchedule, poolShotPosition, kickPose} from '../dist/simulation.js';

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
 const m=new Match({game:'pool',master:7,humans:8});const p=m.players[0];m.launchPool(7,{id:1,x:-p.x/10.5,y:(9-p.z)/18});for(let i=0;i<80;i++)m.step(1/60);assert.equal(p.alive,false);assert.ok(m.tiles.some(t=>!t.alive));
});
test('all minigames terminate, assign exactly one master, and return bounded scores',()=>{
 for(const game of Object.keys(GAMES))for(let seed=1;seed<=4;seed++){
  const m=new Match({game,master:seed,humans:0,random:seededRandom(seed)});
  for(let i=0;i<4000&&!m.done;i++)m.step(1/60);
  assert.ok(m.done,game+' never ended');assert.ok(m.time<=GAMES[game].duration);const r=m.results();assert.equal(r.length,8);assert.equal(r.filter(p=>p.gm).length,1);assert.ok(r.every(p=>Number.isFinite(p.points)&&p.points>=0&&p.points<=100));
 }
});
test('human master actions have cooldowns and both local players can move',()=>{
 const m=new Match({game:'pool',master:0,humans:2});m.step(1/60,{0:{shot:{id:1,x:0,y:.5}},1:{x:1,z:0}});assert.equal(m.hazards.length,1);m.step(1/60,{0:{shot:{id:2,x:0,y:.5}}});assert.equal(m.hazards.length,1);
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
 const h={x:7,z:4,age:0,delay:1.05};assert.deepEqual(poolShotPosition(h),{x:0,y:2.4,z:POOL.launcherZ});
 const mid=poolShotPosition({...h,age:.525});assert.ok(mid.y>5);assert.ok(mid.z<POOL.launcherZ&&mid.z>4);
 const end=poolShotPosition({...h,age:1.05});assert.ok(Math.abs(end.x-7)<1e-10&&Math.abs(end.z-4)<1e-10&&Math.abs(end.y-(POOL.surfaceY+.35))<1e-10);
});
const spinInputs=(m,x,masterInput={})=>Object.fromEntries(m.players.map(p=>[p.id,p.id===m.master?masterInput:{x,z:0}]));
const advance=(m,seconds,inputs)=>{for(let i=0;i<Math.round(seconds*60);i++)m.step(1/60,inputs);};

test('spin spawns seven runners on the wide vertical rim with a separate master',()=>{
 const m=new Match({game:'spin',master:0,humans:8});
 const runners=m.players.filter(p=>p.id!==m.master);
 assert.equal(new Set(runners.map(p=>p.z)).size,7);
 for(const p of runners){assert.ok(Math.abs(Math.hypot(p.x,p.y-SPIN.centerY)-SPIN.radius)<1e-10);assert.ok(Math.abs(p.z)<SPIN.width/2);}
 assert.ok(Math.abs(m.players[0].z)>SPIN.width/2);
});
test('opposing movement holds world position in either direction without a boost',()=>{
 for(const direction of [-1,1]){
  const m=new Match({game:'spin',master:7,humans:8});m.direction=direction;
  const before=m.players.slice(0,7).map(p=>({x:p.x,y:p.y,z:p.z}));
  advance(m,3,spinInputs(m,-direction));
  assert.ok(Math.sign(m.angle)===direction);
  m.players.slice(0,7).forEach((p,i)=>{assert.ok(p.alive);assert.deepEqual({x:p.x,y:p.y,z:p.z},before[i]);});
 }
});
test('idle runners are carried along the rim and same-direction running doubles drift',()=>{
 const idle=new Match({game:'spin',humans:8}),wrong=new Match({game:'spin',humans:8});
 const start=idle.players[0].rimAngle;
 advance(idle,.5,spinInputs(idle,0));advance(wrong,.5,spinInputs(wrong,1));
 assert.ok(Math.abs((wrong.players[0].rimAngle-start)-2*(idle.players[0].rimAngle-start))<1e-10);
 advance(wrong,1.5,spinInputs(wrong,1));assert.equal(wrong.players[0].alive,false);
 advance(idle,3,spinInputs(idle,0));assert.equal(idle.players[0].alive,false);
});
test('master reversal affects all runners immediately; quick correction saves, delay kills',()=>{
 for(const master of [0,7]){
  const m=new Match({game:'spin',master,humans:8});const runner=m.players[master===0?1:0];
  advance(m,.5,spinInputs(m,-1));
  const start=runner.rimAngle;
  m.step(1/60,spinInputs(m,-1,{reverse:true}));
  assert.equal(m.direction,-1);assert.ok(runner.rimAngle<start);
  advance(m,.2,spinInputs(m,-1,{reverse:true}));assert.equal(m.direction,-1,'held reverse must not toggle repeatedly');
  const rescued=runner.rimAngle;
  advance(m,2,spinInputs(m,1));assert.ok(runner.alive);assert.equal(runner.rimAngle,rescued);
  m.step(1/60,spinInputs(m,1,{reverse:true}));assert.equal(m.direction,1);
  advance(m,3,spinInputs(m,1));assert.equal(runner.alive,false);
  assert.equal(m.events.filter(e=>e.type==='reverse').length,2);
 }
});
test('spin touch input is directional, ignores depth and jumping, and bots must react',()=>{
 const m=new Match({game:'spin',humans:8});const p=m.players[0],before={x:p.x,y:p.y,z:p.z};
 advance(m,1,{...spinInputs(m,-1),0:{x:-.3,z:1,action:true}});
 assert.deepEqual({x:p.x,y:p.y,z:p.z},before);assert.equal(p.jump,0);assert.equal(p.jumpV,0);
 const bots=new Match({game:'spin',master:0,humans:1,random:seededRandom(4)});const b=bots.players[1];b.botAt=.5;
 bots.step(1/60,{0:{reverse:true}});assert.equal(b.brain.x,-1);
 const angle=b.rimAngle;advance(bots,.3,{});assert.ok(b.rimAngle<angle);
 advance(bots,.3,{});assert.equal(b.brain.x,1);assert.ok(b.alive);
});

const shotAt=(point,id=1)=>({id,x:-point.x/10.5,y:(9-point.z)/18});
test('pool is tiled by ten connected 2–5 cell pieces with exact seamless outlines',()=>{
 const {tiles,pieces}=makePool();assert.equal(tiles.length,36);assert.equal(pieces.length,10);
 assert.equal(new Set(tiles.map(t=>`${t.gx},${t.gz}`)).size,36);
 for(const piece of pieces){
  assert.ok(piece.cells.length>=2&&piece.cells.length<=5);
  const visited=new Set([piece.cells[0]]),queue=[piece.cells[0]];
  for(const t of queue)for(const q of piece.cells)if(!visited.has(q)&&Math.abs(t.gx-q.gx)+Math.abs(t.gz-q.gz)===1){visited.add(q);queue.push(q);}
  assert.equal(visited.size,piece.cells.length);
  const outline=poolOutline(piece.cells),area=Math.abs(outline.reduce((sum,p,i)=>{const q=outline[(i+1)%outline.length];return sum+p[0]*q[1]-p[1]*q[0];},0)/2);
  assert.equal(area,piece.cells.length,'outline must retain concave U/L corners');
  for(const cell of piece.cells)assert.equal(poolHit(tiles,cell,0).piece,piece.id);
 }
 assert.equal(POOL_LAYOUT[0],'AAABBB');
});
test('hitting any cell sinks exactly that whole piece; adjacent pieces and empty holes survive',()=>{
 for(const pieceId of [0,1,2,8]){
  const m=new Match({game:'pool',humans:8}),piece=m.pieces[pieceId];
  m.launchPool(7,shotAt(piece.cells.at(-1)));advance(m,1.2,{});
  assert.equal(piece.alive,false);assert.ok(piece.cells.every(t=>!t.alive));
  assert.ok(m.pieces.filter(p=>p.id!==pieceId).every(p=>p.alive&&p.cells.every(t=>t.alive)));
 }
 const m=new Match({game:'pool',humans:8}),hole=m.pieces[3].cells[0];
 m.pieces[3].cells.forEach(t=>t.alive=false);m.pieces[3].alive=false;
 m.launchPool(7,shotAt(hole));advance(m,1.2,{});assert.equal(m.pieces.filter(p=>!p.alive).length,1);
});
test('pool shot range covers all cells, misses stay misses, and edge forgiveness is bounded',()=>{
 const {tiles}=makePool();
 for(const t of tiles){const aim=poolAim(shotAt(t));assert.ok(Math.abs(aim.x-t.x)<1e-10&&Math.abs(aim.z-t.z)<1e-10);}
 assert.ok(poolHit(tiles,{x:8.6,z:7}));assert.equal(poolHit(tiles,{x:9,z:7}),null);
 const m=new Match({game:'pool',humans:8});m.launchPool(7,{id:1,x:1,y:1});advance(m,1.2,{});
 assert.ok(m.pieces.every(p=>p.alive));assert.equal(m.hazards[0].piece,null);
 assert.equal(poolAim({x:NaN,y:.5}),null);assert.equal(poolAim({x:0,y:.01}),null);assert.equal(poolAim({x:0,y:Infinity}),null);
});
test('pool requires one fresh release per shot; action keys, retries, cooldown and wrong roles cannot bypass it',()=>{
 for(const master of [0,1,7]){
  const m=new Match({game:'pool',master,humans:8});
  m.action(m.players[master]);assert.equal(m.hazards.length,0);
  assert.equal(m.launchPool((master+1)%8,{id:1,x:0,y:.5}),false);
  assert.equal(m.launchPool(master,{id:1,x:0,y:.5}),true);
  assert.equal(m.players[master].cooldown,POOL.cooldown);
  assert.equal(m.launchPool(master,{id:2,x:0,y:.5}),false);
  advance(m,POOL.cooldown+.1,{});
  assert.equal(m.launchPool(master,{id:2,x:0,y:.5}),false,'rejected release must not become a queued shot');
  assert.equal(m.launchPool(master,{id:3,x:0,y:.5}),true);
  assert.equal(m.launchPool(master,{id:4,x:Infinity,y:.5}),false);
  m.done=true;assert.equal(m.launchPool(master,{id:5,x:0,y:.5}),false);
 }
});
test('jumping avoids immediate drowning, but holding jump cannot hover over a missing piece forever',()=>{
 const m=new Match({game:'pool',humans:8}),p=m.players[0],piece=m.pieces[poolHit(m.tiles,p).piece];
 m.action(p);m.step(1/60);piece.cells.forEach(t=>t.alive=false);piece.alive=false;
 m.step(1/60);assert.ok(p.alive);
 advance(m,2,{0:{action:true}});assert.equal(p.alive,false);
});

test('boost gently carries opposing runners in both directions and ends without residual drift',()=>{
 for(const direction of [-1,1])for(const master of [0,7]){
  const m=new Match({game:'spin',master,humans:8});m.direction=direction;
  const runner=m.players[master===0?1:0],start=runner.rimAngle;
  m.action(m.players[master]);assert.equal(m.players[master].cooldown,5);
  advance(m,1,spinInputs(m,-direction));
  const drift=(runner.rimAngle-start)*direction;
  assert.ok(Math.abs(drift-SPIN.boostSpeed)<1e-9);
  assert.ok(drift>0&&drift<.05,'drift must remain very slight');
  advance(m,2,spinInputs(m,-direction));assert.ok(runner.alive);
  assert.ok(Math.abs(runner.rimAngle-start)<.11,'a whole boost moves less than one world unit along the rim');
  const end=runner.rimAngle;advance(m,.5,spinInputs(m,-direction));assert.equal(runner.rimAngle,end);
 }
});
test('boost requires both five seconds and a new reversal, for either local master',()=>{
 for(const master of [0,1,7]){
  const m=new Match({game:'spin',master,humans:8}),gm=m.players[master];
  m.action(gm);assert.equal(m.boostNeedsReverse,true);
  advance(m,5.1,spinInputs(m,-1,{action:true}));
  assert.equal(m.events.filter(e=>e.type==='boost').length,1,'held action cannot repeat without reversal');
  m.reverseSpin();assert.equal(m.boostNeedsReverse,false);
  m.action(gm);assert.equal(m.events.filter(e=>e.type==='boost').length,2);
  m.reverseSpin();m.action(gm);assert.equal(m.events.filter(e=>e.type==='boost').length,2,'reversal must not clear cooldown');
  advance(m,4.9,spinInputs(m,-1,{action:true}));assert.equal(m.events.filter(e=>e.type==='boost').length,2);
  advance(m,.2,spinInputs(m,-1,{action:true}));assert.equal(m.events.filter(e=>e.type==='boost').length,3);
  assert.equal(m.boostNeedsReverse,true);
 }
});
test('a reversal before the first boost cannot authorize a second boost',()=>{
 const m=new Match({game:'spin',master:0,humans:8});m.reverseSpin();m.action(m.players[0]);
 advance(m,5.1,spinInputs(m,1,{action:true}));assert.equal(m.events.filter(e=>e.type==='boost').length,1);
});
