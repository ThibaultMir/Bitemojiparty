import test from 'node:test';
import assert from 'node:assert/strict';
import {bindPointerControls,readKeyboardInputs} from '../dist/controls.js';
import {Match} from '../dist/simulation.js';

// Exercise the actual pointer event handlers, including synchronous lost capture.
class Surface extends EventTarget {
 constructor(){super();this.style={};this.capture=new Set();this.attrs={};}
 getBoundingClientRect(){return {left:0,top:0,width:120,height:120};}
 setPointerCapture(id){this.capture.add(id);}
 hasPointerCapture(id){return this.capture.has(id);}
 releasePointerCapture(id){this.capture.delete(id);this.send('lostpointercapture',{pointerId:id});}
 setAttribute(key,value){this.attrs[key]=value;}
 send(type,props={}){const event=new Event(type,{cancelable:true});Object.assign(event,{pointerId:1,pointerType:'touch',button:0,clientX:60,clientY:60,...props});this.dispatchEvent(event);return event;}
}
function setup(overrides={}){
 const elements=Object.fromEntries(['canvas','joystick','stick','action','sling','ball','elastic'].map(k=>[k,new Surface()]));
 const game={playing:true,game:'pool',master:7,humans:1,alive:true,cooldown:0,match:{},...overrides},shots=[];
 const controls=bindPointerControls({...elements,getState:()=>game,onShot:s=>shots.push(s),aimAt:(x,y)=>({x,z:y})});
 return {...elements,game,shots,controls};
}
test('moving runner modes accept touch movement; joystick and action own separate fingers',()=>{
 for(const mode of ['pool','zombie','spin']){
  const f=setup({game:mode});f.joystick.send('pointerdown',{clientX:100});
  assert.ok(f.controls.state.virtual.x>.9);
  f.joystick.send('pointerdown',{pointerId:2,clientX:0});assert.ok(f.controls.state.virtual.x>.9,'second finger cannot steal the stick');
  if(mode!=='spin'){
   f.action.send('pointerdown',{pointerId:2});assert.ok(f.controls.state.actionHeld);
   f.joystick.send('pointerup',{pointerId:2});assert.ok(f.controls.state.virtual.x>.9);
   f.joystick.send('pointerup');assert.equal(f.controls.state.virtual.x,0);assert.ok(f.controls.state.actionHeld);
   f.action.send('pointerup',{pointerId:2});assert.equal(f.controls.state.actionHeld,false);
  }else {f.action.send('pointerdown',{pointerId:2});assert.equal(f.controls.state.actionHeld,false);}
 }
});
test('pool mouse/touch launch only on release; taps, wrong pointers and right-click do not shoot',()=>{
 for(const pointerType of ['mouse','touch']){
  const f=setup({master:0});
  f.sling.send('pointerdown',{pointerType,button:2});if(pointerType==='mouse')assert.equal(f.controls.state.pull,null);else f.controls.clear();
  f.sling.send('pointerdown',{pointerType});f.sling.send('pointerup',{pointerType});assert.equal(f.shots.length,0);
  f.sling.send('pointerdown',{pointerType});f.sling.send('pointermove',{pointerType,clientX:0,clientY:150});assert.equal(f.shots.length,0);
  f.sling.send('pointerup',{pointerType,pointerId:8,clientY:150});assert.equal(f.shots.length,0);
  f.sling.send('pointerup',{pointerType,clientX:0,clientY:150});assert.deepEqual(f.shots,[{x:-.5,y:.75}]);
  f.sling.send('pointerup',{pointerType,clientY:150});assert.equal(f.shots.length,1);
 }
});
test('cancel, capture loss, pause, round change, resize cleanup and cooldown discard sling gestures',()=>{
 for(const reason of ['pointercancel','lostpointercapture','pause','round','clear','cooldown']){
  const f=setup({master:0});f.sling.send('pointerdown');f.sling.send('pointermove',{clientY:150});
  if(reason==='pause')f.game.playing=false;
  else if(reason==='round')f.game.match={};
  else if(reason==='clear')f.controls.clear();
  else if(reason==='cooldown')f.game.cooldown=2;
  else f.sling.send(reason);
  f.sling.send('pointerup',{clientY:150});assert.equal(f.shots.length,0,reason);
  assert.equal(f.controls.state.pull,null);
 }
 const f=setup({master:0,cooldown:1});f.sling.send('pointerdown');f.game.cooldown=0;f.sling.send('pointerup',{clientY:150});assert.equal(f.shots.length,0);
});
test('canvas aiming is disabled; only zombie masters accept touch movement',()=>{
 for(const game of ['pool','zombie','kick','spin']){
  const f=setup({game,master:0});
  f.canvas.send('pointermove',{pointerType:'mouse',clientX:20,clientY:35});
  assert.deepEqual(f.controls.state.pointerAim,null);
  f.canvas.send('pointerdown',{pointerType:'mouse'});assert.equal(f.controls.state.actionHeld,false);f.controls.clear();
  f.canvas.send('pointerdown',{pointerType:'touch'});assert.equal(f.controls.state.actionHeld,false);
  f.joystick.send('pointerdown',{clientX:100});assert.equal(f.controls.state.virtual.x>0,game==='zombie');
 }
});
test('a local J2 pool master uses the mouse while J1 keeps independent movement and jump',()=>{
 const f=setup({master:1,humans:2}),m=new Match({game:'pool',master:1,humans:2});
 f.joystick.send('pointerdown',{clientX:100});f.action.send('pointerdown',{pointerId:2});
 f.sling.send('pointerdown',{pointerType:'mouse',pointerId:3});f.sling.send('pointerup',{pointerType:'mouse',pointerId:3,clientY:130});
 assert.equal(f.shots.length,1);assert.ok(f.controls.state.actionHeld);assert.ok(f.controls.state.virtual.x>0);
 m.step(1/60,{0:{x:f.controls.state.virtual.x,action:true},1:{shot:{...f.shots[0],id:1}}});
 assert.equal(m.hazards.length,1);assert.ok(m.players[0].jump>0);assert.ok(m.players[1].cooldown>2);
});

test('AZERTY/QWERTY, opposite keys, action keys and independent J2 controls stay intact',()=>{
 const input=readKeyboardInputs(new Set(['KeyQ','KeyZ','Space','ArrowRight','Enter','ShiftRight']),{virtual:{x:1,z:1}},{game:'pool',master:1});
 assert.deepEqual(input[0],{x:-1,z:-1,action:true,reverse:false});assert.deepEqual(input[1],{x:1,z:0,action:true,reverse:true});
 const opposite=readKeyboardInputs(new Set(['KeyA','KeyD','KeyW','KeyS']),{virtual:{x:1,z:1}});
 assert.equal(opposite[0].x,0);assert.equal(opposite[0].z,0);
 const state={virtual:{x:0,z:0},pointerAim:{x:7,z:4}};
 assert.equal(readKeyboardInputs(new Set(),state,{game:'kick',master:0})[0].aim,undefined);
 assert.equal(readKeyboardInputs(new Set(['KeyD']),state,{game:'kick',master:0})[0].aim,undefined);
 assert.equal(readKeyboardInputs(new Set(),state,{game:'pool',master:0})[0].aim,undefined);
});

test('Kick runners have only jump and both local masters have three distinct commands',()=>{
 const f=setup({game:'kick'});f.joystick.send('pointerdown',{clientX:100});assert.equal(f.controls.state.virtual.x,0);
 f.action.send('pointerdown');assert.ok(f.controls.state.actionHeld);f.action.send('pointercancel');assert.equal(f.controls.state.actionHeld,false);
 for(const [key,mode] of [['Digit1','low'],['Digit2','high'],['Digit3','slow']]){
  const input=readKeyboardInputs(new Set([key,'KeyD','Space','Enter']),{}, {game:'kick',master:0});
  assert.equal(input[0].kick,mode);assert.equal(input[0].x,0);assert.equal(input[1].action,true);
 }
 for(const [key,mode] of [['ArrowDown','low'],['ArrowUp','high'],['ArrowRight','slow']]){
  const input=readKeyboardInputs(new Set([key,'Space']),{}, {game:'kick',master:1});assert.equal(input[1].kick,mode);assert.equal(input[1].z,0);assert.equal(input[0].action,true);
 }
 const gm=setup({game:'kick',master:0});gm.action.send('pointerdown');assert.equal(gm.controls.state.actionHeld,false);
});
