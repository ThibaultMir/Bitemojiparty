import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,KICK,kickPose,kickDuration,seededRandom} from '../dist/simulation.js';
function play(mode,jumpAt=Infinity,dt=1/120,index=3){
 const m=new Match({game:'kick',master:7,humans:8});m.attack(mode);let jumped=false;
 for(let t=0;t<kickDuration(mode)+.1&&!m.done;t+=dt){const fire=!jumped&&t>=jumpAt;if(fire)jumped=true;m.step(dt,{[index]:{action:fire}});}
 return m;
}
test('stationary spawns, jump-only controls and a single jump per press',()=>{
 const m=new Match({game:'kick',master:7,humans:8});const p=m.players[0],start={x:p.x,z:p.z};
 for(let i=0;i<130;i++)m.step(1/60,{0:{x:1,z:1,action:true}});
 assert.deepEqual({x:p.x,z:p.z},start);assert.equal(p.jump,0);assert.equal(m.events.filter(e=>e.type==='jump').length,1);
 m.step(1/60);m.step(1/60,{0:{action:true}});assert.ok(p.jump>0);
});
test('low eliminates idle, early and late jumps; well-timed jump survives at different frame rates',()=>{
 for(const dt of [1/30,1/60,1/120]){
  const arrival=KICK.windup+KICK.fast/2;
  assert.equal(play('low',Infinity,dt).players[3].alive,false);
  assert.equal(play('low',.05,dt).players[3].alive,false);
  assert.equal(play('low',arrival,dt).players[3].alive,false);
  assert.equal(play('low',arrival-.38,dt).players[3].alive,true);
 }
});
test('high safely passes above standing heads and eliminates a jumping player',()=>{
 assert.equal(play('high').players.filter(p=>p.alive).length,8);
 assert.equal(play('high',KICK.windup+KICK.fast/2-.36).players[3].alive,false);
});
test('slow punishes reacting to movement, but permits a correctly delayed jump at every station',()=>{
 assert.equal(play('slow',KICK.windup).players[3].alive,false);
 for(let i=0;i<7;i++){
  const angle=2.08+i*(Math.PI*2-4.16)/6;
  assert.equal(play('slow',KICK.windup+angle/(Math.PI*2)*KICK.slow-.38,1/120,i).players[i].alive,true,'station '+i);
 }
});
test('one full turn, identical fast speeds, raised recovery and exact home pose',()=>{
 for(const mode of ['low','high','slow']){
  const duration=mode==='slow'?KICK.slow:KICK.fast;
  assert.equal(kickPose({mode,age:KICK.windup+duration/2}).angle,Math.PI);
  const end=kickPose({mode,age:kickDuration(mode)});assert.equal(end.angle,Math.PI*2);assert.equal(end.y,0);assert.equal(end.striking,false);
 }
 assert.deepEqual(kickPose(null),{angle:0,y:0,striking:false});
});
test('attack rejects wrong role, invalid mode, overlap and held keys; J2 can be master',()=>{
 const m=new Match({game:'kick',master:1,humans:8});
 assert.equal(m.attack('low',0),false);assert.equal(m.attack('nonsense'),false);
 m.step(1/60,{1:{kick:'high'},0:{action:true}});assert.equal(m.hazards.length,1);assert.ok(m.players[0].jump>0);
 assert.equal(m.attack('slow'),false);
 for(let i=0;i<240;i++)m.step(1/60,{1:{kick:'high'}});
 assert.equal(m.hazards.length,0);assert.equal(m.events.filter(e=>e.type==='attack').length,1);
 m.step(1/60);m.step(1/60,{1:{kick:'low'}});assert.equal(m.hazards[0].mode,'low');
});
test('bots choose all attack modes and never leave their station while alive',()=>{
 const modes=new Set();
 for(let seed=1;seed<=12;seed++){
  const m=new Match({game:'kick',master:7,humans:0,random:seededRandom(seed)}),starts=m.players.map(p=>({x:p.x,z:p.z}));
  for(let i=0;i<1810&&!m.done;i++){m.step(1/60);m.players.forEach((p,j)=>{if(p.alive)assert.deepEqual({x:p.x,z:p.z},starts[j]);});}
  m.events.filter(e=>e.type==='attack').forEach(e=>modes.add(e.mode));assert.ok(m.done);
 }
 assert.deepEqual([...modes].sort(),['high','low','slow']);
});

test('rendered cleat crosses every station and camera contains the foot, players and screen',async()=>{
 const T=await import('../dist/vendor/three.module.js'),{World}=await import('../dist/world.js');
 const root=new T.Group(),shoe=World.prototype.boot.call({},root);
 root.updateMatrixWorld(true);
 const hits=new T.Raycaster(new T.Vector3(0,4,KICK.radius),new T.Vector3(0,-1,0)).intersectObject(shoe);
 assert.ok(hits.length>0);assert.ok(hits[0].point.y<=KICK.lowTop+.02);
 for(const [w,h] of [[1440,900],[390,844],[844,390]]){
  const view={camera:new T.OrthographicCamera(),game:'kick'};World.prototype.cameraAt.call(view,{x:0,z:0},w,h);view.camera.updateMatrixWorld();
  for(const p of [[0,0,7.3],[-8.5,9.2,-11.1],[8.5,9.2,-11.1],[6,4,-3],[-6,4,-3]]){
   const v=new T.Vector3(...p).project(view.camera);assert.ok(Math.abs(v.x)<1&&Math.abs(v.y)<1,`${w} × ${h}: ${p}`);
  }
 }
});
