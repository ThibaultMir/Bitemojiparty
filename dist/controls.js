import {POOL} from './simulation.js';
export function readKeyboardInputs(keys,{virtual={x:0,z:0},actionHeld=false,pointerAim=null}={},match={}) {
 const left=keys.has('KeyA')||keys.has('KeyQ'),right=keys.has('KeyD'),up=keys.has('KeyW')||keys.has('KeyZ'),down=keys.has('KeyS');
 const x=Number(right)-Number(left),z=Number(down)-Number(up);
 const input={0:{x:left||right?x:virtual.x,z:up||down?z:virtual.z,action:keys.has('Space')||actionHeld,reverse:keys.has('KeyF')},1:{x:Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft')),z:Number(keys.has('ArrowDown'))-Number(keys.has('ArrowUp')),action:keys.has('Enter'),reverse:keys.has('ShiftRight')}};
 if(match?.game==='kick'){
  for(const id of [0,1]){input[id].x=0;input[id].z=0;}
  if(match.master===0)input[0].kick=keys.has('Digit1')?'low':keys.has('Digit2')?'high':keys.has('Digit3')?'slow':null;
  if(match.master===1)input[1].kick=keys.has('ArrowDown')?'low':keys.has('ArrowUp')?'high':keys.has('ArrowRight')?'slow':null;
 }
 return input;
}
// Pointer ownership is per control: a second finger never releases another action.
// No global pointerup-to-fire handler; cancellation always discards a gesture.
export function bindPointerControls({canvas,joystick,stick,action,sling,ball,elastic,getState,onShot,aimAt}) {
 const state={virtual:{x:0,z:0},actionHeld:false,pointerAim:null,pull:null};
 const owners=new Map();let drag=null;
 const primary=e=>e.pointerType!=='mouse'||e.button===0;
 const playable=()=>{const s=getState();return s.playing&&s.alive;};
 const poolMaster=()=>{const s=getState();return s.playing&&s.game==='pool'&&s.master<s.humans;};
 const capture=(element,e)=>{if(owners.has(element))return false;owners.set(element,e.pointerId);element.setPointerCapture(e.pointerId);return true;};
 const release=element=>{const id=owners.get(element);owners.delete(element);if(id!==undefined&&element.hasPointerCapture(id))element.releasePointerCapture(id);};
 const paint=()=>{
  const x=state.pull?.px||0,y=state.pull?.py||0;
  ball.style.transform=`translate(${x}px,${y}px)`;
  elastic.setAttribute('x2',String(60+x));elastic.setAttribute('y2',String(45+y));
 };
 const stopStick=()=>{release(joystick);state.virtual={x:0,z:0};stick.style.transform='';};
 const stopAction=element=>{release(element);state.actionHeld=false;};
 const stopSling=()=>{release(sling);drag=null;state.pull=null;paint();};
 const moveStick=e=>{
  if(owners.get(joystick)!==e.pointerId)return;
  const r=joystick.getBoundingClientRect(),max=r.width*.33;
  let x=e.clientX-r.left-r.width/2,z=e.clientY-r.top-r.height/2;const length=Math.hypot(x,z);
  if(length>max){x*=max/length;z*=max/length;}
  state.virtual={x:x/max,z:z/max};stick.style.transform=`translate(${x}px,${z}px)`;
 };
 joystick.addEventListener('pointerdown',e=>{
  const s=getState();if(!primary(e)||!playable()||s.game==='kick'||(s.master===0&&['pool','spin'].includes(s.game)))return;
  e.preventDefault();if(capture(joystick,e))moveStick(e);
 });
 joystick.addEventListener('pointermove',moveStick);
 for(const type of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(type,e=>{if(owners.get(joystick)===e.pointerId)stopStick();});
 for(const element of [action,canvas]){
  element.addEventListener('pointerdown',e=>{
   const s=getState();if(!primary(e)||!playable())return;
   if(element===canvas)return;
   if(element===action&&s.game==='kick'&&s.master===0)return;
   if(element===action&&s.master===0&&s.game==='pool')return;
   if(element===action&&s.master!==0&&s.game==='spin')return;
   // One held action at a time, including mouse canvas vs action button.
   if(owners.has(action)||owners.has(canvas))return;
   e.preventDefault();if(capture(element,e)){state.actionHeld=true;if(element===canvas)state.pointerAim=aimAt(e.clientX,e.clientY);}
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(type,e=>{if(owners.get(element)===e.pointerId)stopAction(element);});
 }
 const moveSling=e=>{
  if(owners.get(sling)!==e.pointerId||!drag)return;
  const clamp=n=>Math.max(-1,Math.min(1,n));
  const x=clamp((e.clientX-drag.x)/drag.range),y=clamp((e.clientY-drag.y)/drag.range);
  state.pull={x,y,px:x*drag.range,py:y*drag.range};paint();
 };
 sling.addEventListener('pointerdown',e=>{
  if(!primary(e)||!poolMaster()||getState().cooldown>0)return;
  e.preventDefault();if(!capture(sling,e))return;
  const rect=sling.getBoundingClientRect();
  drag={x:e.clientX,y:e.clientY,range:Math.max(48,Math.min(140,rect.width)),match:getState().match};moveSling(e);
 });
 sling.addEventListener('pointermove',moveSling);
 sling.addEventListener('pointerup',e=>{
  if(owners.get(sling)!==e.pointerId)return;
  moveSling(e);const shot=state.pull,s=getState(),valid=poolMaster()&&s.cooldown<=0&&s.match===drag?.match;
  stopSling();if(valid&&shot&&shot.y>=POOL.minPull)onShot({x:shot.x,y:shot.y});
 });
 for(const type of ['pointercancel','lostpointercapture'])sling.addEventListener(type,e=>{if(owners.get(sling)===e.pointerId)stopSling();});
 for(const element of [canvas,joystick,action,sling])element.addEventListener('contextmenu',e=>e.preventDefault());
 return {state,clear(){stopStick();stopAction(action);stopAction(canvas);stopSling();state.pointerAim=null;}};
}
