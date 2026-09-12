import {PROTOCOL,NET,applyPublicMatch} from './net-state.js';
import {Match,wrap,moveWithWalls,SPIN,spinPosition} from './simulation.js';
export const newToken=()=>[...crypto.getRandomValues(new Uint8Array(32))].map(b=>b.toString(16).padStart(2,'0')).join('');
export function parseRoomCode(value){try{if(/^https?:/.test(value))value=new URL(value).searchParams.get('room')||'';}catch{}const s=String(value||'').trim();return /^\d{6}$/.test(s)?s:null;}
export function roomLink(code,base=location.href){const url=new URL(base);url.search='';url.hash='';url.searchParams.set('room',code);return url.href;}
// A socket represents one browser tab. Its secret is never placed in a shareable URL.
export class RoomClient {
 constructor({endpoint,profile,onSnapshot=()=>{},onStatus=()=>{},onError=()=>{},WebSocketClass=globalThis.WebSocket,fetchRequest=(...args)=>globalThis.fetch(...args),now=()=>performance.now(),storage=globalThis.sessionStorage}){
  Object.assign(this,{endpoint: endpoint.replace(/\/$/,''),profile,onSnapshot,onStatus,onError,WebSocketClass,fetchRequest,now,storage});this.seq=0;this.generation=0;this.retries=0;this.rtt=0;this.snapshots=[];this.closed=true;this.pendingEdges={};this.previous={};this.input={x:0,z:0};this.lastSent=0;this.lastMessage=0;this.predictedJumpAt=null;this.away=false;
 }
 async create(){
  this.stop(false);const operation=this.operation;
  const token=newToken();
  // Same token makes HTTP retries idempotent, even after a lost creation response.
  let error;
  for(let i=0;i<3;i++)try{
   const response=await this.fetchRequest(this.endpoint+'/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,profile:this.profile}),signal:AbortSignal.timeout(8000)});
   const body=await response.json();if(operation!==this.operation)return null;if(!response.ok)throw Object.assign(new Error(body.message||'Création impossible.'),{permanent:response.status<500});
   return await this.join(body.code,token,operation)?body.code:null;
  }catch(e){if(operation!==this.operation)return null;error=e;if(e.permanent)break;}
  throw error;
 }
 async join(code,token,operation){
  if(!parseRoomCode(code))throw new Error('Entre le code de room à 6 chiffres.');
  if(operation===undefined){this.stop(false);operation=this.operation;}
  const lookup=await this.fetchRequest(this.endpoint+'/api/rooms/'+code,{signal:AbortSignal.timeout(8000)});if(operation!==this.operation)return false;if(!lookup.ok)throw new Error('Cette room n’existe plus ou le code est incorrect.');
  this.code=code;
  if(!token)try{token=this.storage?.getItem('bitemoji-room:'+code);}catch{}
  this.token=token||newToken();try{this.storage?.setItem('bitemoji-room:'+code,this.token);}catch{}
  this.closed=false;this.seq=0;this.snapshots=[];this.latest=null;this.connect();return true;
 }
 connect(){
  if(this.closed)return;clearTimeout(this.retry);const generation=++this.generation;try{this.ws?.close();}catch{}
  this.onStatus(this.retries?'Reconnexion…':'Connexion…');
  const url=new URL(this.endpoint+'/room/'+this.code);url.protocol=url.protocol==='https:'?'wss:':'ws:';
  const ws=new this.WebSocketClass(url.href);this.ws=ws;this.lastMessage=this.now();
  ws.addEventListener('open',()=>{if(generation!==this.generation)return;this.send({type:'hello',token:this.token,profile:this.profile});});
  ws.addEventListener('message',event=>{
   if(generation!==this.generation||this.closed)return;
   let p;try{p=JSON.parse(event.data);}catch{return;}
   this.lastMessage=this.now();
   if(p.type==='error'){this.onError(p.message);if(['full','closed','session','version'].includes(p.code)){this.stop(false);this.onStatus('Connexion refusée');}return;}
   if(p.type==='left'){this.stop(true);return;}
   if(p.type==='pong'&&Number.isFinite(p.echo)){const rtt=this.now()-p.echo;if(rtt>=0&&rtt<10000)this.rtt=this.rtt?this.rtt*.7+rtt*.3:rtt;return;}
   if(p.type!=='snapshot'||p.protocol!==PROTOCOL)return;
   if(this.latest&&p.roundId===this.latest.roundId&&p.frame<this.latest.frame)return;
   if(this.latest&&p.roundId<this.latest.roundId)return;
   const newRound=!this.latest||p.roundId!==this.latest.roundId;
   if(newRound){this.snapshots=[];this.pendingEdges={};this.previous={};this.predictedJumpAt=null;}
   this.seq=Math.max(this.seq,(p.ack??-1)+1);this.latest=p;this.receivedAt=this.now();this.snapshots.push({state:p,at:this.receivedAt});if(this.snapshots.length>6)this.snapshots.shift();this.retries=0;
   this.onStatus(this.rtt>180?`Connexion lente · ${Math.round(this.rtt)} ms`:`En ligne · ${Math.round(this.rtt)} ms`);
   this.onSnapshot(p);
  });
  ws.addEventListener('close',event=>{
   if(generation!==this.generation||this.closed)return;
   clearInterval(this.pulse);this.pendingEdges={};this.previous={};this.input={x:0,z:0};
   if(event.code===4001){this.stop(false);this.onError('Cette place a été reprise dans un autre onglet.');return;}
   this.retries++;this.onStatus('Connexion perdue · un bot prend le relais');
   const delay=Math.min(5000,300*2**Math.min(this.retries,4))+Math.random()*200;
   this.retry=setTimeout(async()=>{
    if(generation!==this.generation||this.closed)return;
    if(this.retries>=3)try{
     const response=await this.fetchRequest(this.endpoint+'/api/rooms/'+this.code,{signal:AbortSignal.timeout(8000)});
     if(generation!==this.generation||this.closed)return;
     if(response.status===404){this.stop(false);if(this.latest)this.onSnapshot({...this.latest,phase:'closed',notice:'Cette room n’existe plus. Crée une nouvelle room.'});else this.onError('Cette room n’existe plus.');return;}
    }catch{}
    if(generation===this.generation&&!this.closed)this.connect();
   },delay);
  });
  ws.addEventListener('error',()=>{});
  clearInterval(this.pulse);this.pulse=setInterval(()=>{
   if(this.closed||generation!==this.generation)return;
   if(this.now()-this.lastMessage>6000){this.retries++;this.connect();return;}
   if(!this.away)this.send({type:'ping',echo:this.now()});
  },1000);
 }
 send(packet){if(this.ws?.readyState!==1||this.ws.bufferedAmount>128000)return false;this.ws.send(JSON.stringify({protocol:PROTOCOL,...packet}));return true;}
 start(game='party'){return this.send({type:'start',game});}
 setInput(input){
  this.input={x:input.x||0,z:input.z||0};
  for(const key of ['action','reverse'])if(input[key]&&!this.previous[key]){this.pendingEdges[key]=true;if(key==='action'){const p=this.latest?.match?.players[this.latest.selfId];if(p?.cooldown<=0&&p.jump<.01&&(this.predictedJumpAt===null||this.now()-this.predictedJumpAt>820))this.predictedJumpAt=this.now();}}
  if(input.kick&&!this.previous.kick)this.pendingEdges.kick=input.kick;
  if(input.shot)this.pendingEdges.shot=input.shot;
  this.previous={action:!!input.action,reverse:!!input.reverse,kick:input.kick};
  if(Object.keys(this.pendingEdges).length)this.flush(true);
 }
 flush(force=false){
  if(!this.latest||this.latest.phase!=='playing'||!this.latest.canPlay||this.away)return;
  const now=this.now();if(!force&&now-this.lastSent<50)return;
  const elapsed=Math.max(0,Math.min(500,now-this.receivedAt));
  const master=this.latest.match?.master===this.latest.selfId&&this.latest.match?.game!=='zombie';
  // Runners react to the buffered scene. Timestamp that scene, within the server's rewind budget.
  const renderDelay=master?0:75,compensation=Math.max(0,Math.min(300,this.rtt+renderDelay-165));
  const tick=Math.max(0,this.latest.frame+Math.round((elapsed-renderDelay+compensation)*NET.tickRate/1000));
  const packet={type:'input',roundId:this.latest.roundId,seq:this.seq++,tick,input:{...this.input,...this.pendingEdges}};
  if(this.send(packet)){this.pendingEdges={};this.lastSent=now;}
 }
 setAway(away){this.away=away;this.pendingEdges={};this.previous={};this.input={x:0,z:0};if(!away&&this.ws?.readyState!==1&&!this.closed){clearTimeout(this.retry);this.connect();}}
 stop(forget=false){
  this.closed=true;this.operation=(this.operation||0)+1;this.generation++;this.pendingEdges={};this.previous={};this.input={x:0,z:0};clearTimeout(this.retry);clearInterval(this.pulse);try{this.ws?.close();}catch{}
  if(forget&&this.code)try{this.storage?.removeItem('bitemoji-room:'+this.code);}catch{}
 }
 leave(){this.send({type:'leave'});this.stop(true);}
}
export function remapSnapshot(snapshot){
 const order=[snapshot.selfId,...Array.from({length:8},(_,i)=>i).filter(i=>i!==snapshot.selfId)];const toLocal=id=>order.indexOf(id);
 const out=structuredClone(snapshot);out.mapping=order;
 if(out.match){out.match.master=toLocal(out.match.master);out.match.players=order.map((id,local)=>({...snapshot.match.players[id],id:local}));}
 if(out.roster)out.roster=order.map((id,local)=>({...snapshot.roster[id],id:local}));
 out.totals=order.map(id=>snapshot.totals[id]);if(out.results)out.results=out.results.map(r=>({...r,id:toLocal(r.id)}));return out;
}
export function interpolateSnapshot(a,b,t){
 const out=structuredClone(b);if(!a?.match||!b?.match||a.roundId!==b.roundId)return out;t=Math.max(0,Math.min(1,t));
 const mix=(x,y)=>x+(y-x)*t;
 out.match.time=mix(a.match.time,b.match.time);out.match.angle=mix(a.match.angle,b.match.angle);
 out.match.players.forEach((p,i)=>{const old=a.match.players[i];if(old.alive!==p.alive||Math.hypot(old.x-p.x,old.z-p.z)>4)return;
  for(const k of ['x','y','z','jump','walk','rimAngle'])if(Number.isFinite(old[k])&&Number.isFinite(p[k]))p[k]=mix(old[k],p[k]);
  p.angle=old.angle+wrap(p.angle-old.angle)*t;
 });
 for(const h of out.match.hazards){const old=a.match.hazards.find(v=>v.uid===h.uid);if(old)h.age=mix(old.age,h.age);}
 return out;
}
export function renderSnapshot(client,now){
 const latest=client.latest;if(!latest)return null;
 const target=now-75;let a=client.snapshots[0],b=client.snapshots.at(-1);
 for(let i=1;i<client.snapshots.length;i++)if(client.snapshots[i].at>=target){a=client.snapshots[i-1];b=client.snapshots[i];break;}
 const out=a&&b?interpolateSnapshot(a.state,b.state,(target-a.at)/Math.max(1,b.at-a.at)):structuredClone(latest);
 return remapSnapshot(out);
}
export function makeViewMatch(snapshot){const s=snapshot.match;return applyPublicMatch(new Match({game:s.game,master:s.master,humans:1}),s);}
// Immediate local feedback. Eliminations, collisions, scores and other players stay server-owned.
export function predictLocal(match,client,now){
 if(!client.latest?.canPlay||!match.players[0].alive||client.away)return;
 const p=match.players[0],input=client.input,dt=Math.max(0,Math.min(.10,(now-client.receivedAt+client.rtt*.5)/1000));
 if(p.id===match.master&&match.game!=='zombie')return;
 if(match.game==='zombie')moveWithWalls(p,input.x*(p.infected?4.9:4.6)*dt,input.z*(p.infected?4.9:4.6)*dt,match.obstacles);
 if(match.game==='pool'){p.x+=input.x*5.6*dt;p.z+=input.z*5.6*dt;}
 if(match.game==='spin'&&Math.abs(input.x)>.15){p.rimAngle+=Math.sign(input.x)*(.42+match.time*.01)*dt;Object.assign(p,spinPosition(p.rimAngle));}
 if(['pool','kick'].includes(match.game)&&client.predictedJumpAt!==null){const t=(now-client.predictedJumpAt)/1000;if(t>=0&&t<.8)p.jump=Math.max(p.jump,7.6*t-9.5*t*t);}
}
