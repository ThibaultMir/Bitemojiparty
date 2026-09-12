import {Match,COLORS,NAMES,GAMES} from '../dist/simulation.js';
import {PROTOCOL,NET,statefulRandom,chooseMaster,captureMatch,restoreMatch,publicMatch,cleanInput} from '../dist/net-state.js';
export class RoomError extends Error{constructor(code,message){super(message);this.code=code;}}
const fail=(code,message)=>{throw new RoomError(code,message);};
export class Room {
 constructor({code,owner,profile={},now=Date.now(),seed=1}){
  this.code=code;this.owner=owner;this.createdAt=now;this.updatedAt=now;this.phase='waiting';this.members=Array(8).fill(null);this.rng=statefulRandom(seed);this.totals=Array(8).fill(0);this.order=[];this.round=0;this.roundId=0;this.revision=0;this.frame=0;this.match=null;this.notice='';this.join(owner,profile,now);
 }
 join(key,profile,now){
  if(!profile||typeof profile!=='object'||Array.isArray(profile))profile={};
  this.checkOpen(now);let id=this.members.findIndex(m=>m?.key===key),resumed=id>=0;
  if(id<0){id=this.members.findIndex(m=>!m);if(id<0)fail('full','Cette room est complète (8 joueurs).');
   const name=String(profile.name||'Joueur').replace(/[\p{C}<>]/gu,'').trim().slice(0,16)||'Joueur';
   this.members[id]={key,name,color:COLORS.includes(profile.color)?profile.color:COLORS[id],skin:Number.isInteger(profile.skin)?Math.max(0,Math.min(5,profile.skin)):0,hair:Number.isInteger(profile.hair)?Math.max(0,Math.min(3,profile.hair)):0,joinedAt:now,lastSeen:now,connected:true,seq:-1};
  }else{this.members[id].lastSeen=now;this.members[id].connected=true;}
  this.updatedAt=now;this.revision++;return {id,resumed};
 }
 checkOpen(now){if(this.phase==='closed'||now-this.createdAt>NET.roomLifetime)fail('closed','Cette room a expiré. Crée une nouvelle room.');}
 member(key){const id=this.members.findIndex(m=>m?.key===key);if(id<0)fail('session','Ta place n’est plus réservée. Rejoins la room à nouveau.');return id;}
 heartbeat(key,now){const id=this.member(key);this.members[id].lastSeen=now;this.members[id].connected=true;this.updatedAt=now;return id;}
 disconnect(key,now){const id=this.members.findIndex(m=>m?.key===key);if(id<0)return;this.members[id].connected=false;this.members[id].lastSeen=now;this.revision++;}
 leave(key,now){const id=this.member(key);if(key===this.owner){this.phase='closed';this.notice='Le créateur a fermé la room.';}else this.members[id]=null;this.updatedAt=now;this.revision++;}
 activeHumans(now){return this.members.flatMap((m,id)=>m&&m.connected&&now-m.lastSeen<NET.botAfter?[id]:[]);}
 start(key,game,now){
  this.checkOpen(now);if(key!==this.owner)fail('owner','Seul le créateur peut lancer la partie.');
  if(!['waiting','results'].includes(this.phase))fail('started','Une partie est déjà en cours.');
  if(game!=='party'&&!Object.hasOwn(GAMES,game))fail('game','Mini-jeu inconnu.');
  this.order=game==='party'?Object.keys(GAMES):[game];
  for(let i=this.order.length-1;i>0;i--){const j=Math.floor(this.rng()*(i+1));[this.order[i],this.order[j]]=[this.order[j],this.order[i]];}
  this.totals.fill(0);this.round=0;this.beginRound(now);
 }
 beginRound(now,recover=false){
  // Reserved human seats remain human for the draw, even during a temporary bot relay.
  const ids=recover?this.roster.filter(p=>p.human).map(p=>p.id):this.members.flatMap((m,id)=>m?[id]:[]);if(!ids.length){this.phase='waiting';this.match=null;return;}
  const master=recover&&Number.isInteger(this.roundMaster)?this.roundMaster:chooseMaster(ids,this.rng);this.roundMaster=master;
  if(!recover){this.participants=this.members.map(m=>m?.key||null);this.roster=this.members.map((m,id)=>({id,name:m?.name||NAMES[id],color:m?.color||COLORS[id],skin:m?.skin??id%6,hair:m?.hair??id%4,human:ids.includes(id)}));}
  this.match=new Match({game:this.order[this.round],master,humanIds:ids,humans:ids.length,names:this.roster.map(p=>p.name),colors:this.roster.map(p=>p.color),random:this.rng});
  this.roundId++;this.frame=0;this.history=new Map();this.timeline=new Map();this.masks=new Map();this.controls=Array.from({length:8},()=>({x:0,z:0}));this.inputTicks=Array(8).fill(-999);this.received=Array(8).fill(-1);this.rollbackFrom=null;this.doneFrame=null;
  this.phase='countdown';this.phaseUntil=now+5000;this.tickAt=this.phaseUntil;this.notice=recover?'Connexion du serveur rétablie : la manche reprend depuis le début, scores conservés.':'';this.revision++;
 }
 receive(key,packet,now){
  const id=this.heartbeat(key,now);
  if(this.phase!=='playing'||packet.roundId!==this.roundId||this.participants[id]!==key||!this.roster[id].human)return false;
  if(!Number.isSafeInteger(packet.seq)||packet.seq<0||packet.seq>=1e9||packet.seq<=this.received[id])return false;
  const input=cleanInput(packet.input);if(!input||!Number.isSafeInteger(packet.tick))return false;
  // Consumed even when late: a retry cannot become a delayed attack in another tick.
  this.received[id]=packet.seq;
  if(packet.tick<this.frame-NET.rollbackTicks||packet.tick>this.frame+NET.maxLeadTicks)return false;
  const tick=Math.max(0,packet.tick),entries=this.timeline.get(tick)||new Map();
  // All commands from one player in one simulation tick are merged, with one edge per action.
  const previous=entries.get(id);entries.set(id,{...previous,...input,action:!!(previous?.action||input.action),reverse:!!(previous?.reverse||input.reverse),kick:input.kick||previous?.kick,shot:input.shot||previous?.shot});this.timeline.set(tick,entries);
  if(tick<this.frame)this.rollbackFrom=Math.min(this.rollbackFrom??tick,tick);return true;
 }
 checkpoint(){return {match:captureMatch(this.match),rng:this.rng.state,controls:structuredClone(this.controls),inputTicks:[...this.inputTicks],doneFrame:this.doneFrame};}
 simulateTick(tick,mask){
  this.history.set(tick,this.checkpoint());this.masks.set(tick,mask);this.match.humanIds=mask;
  const entries=this.timeline.get(tick),inputs={};
  for(const id of mask){
   const command=entries?.get(id);if(command){this.controls[id]={x:command.x,z:command.z};this.inputTicks[id]=tick;}
   inputs[id]={...(tick-this.inputTicks[id]<=NET.inputStaleTicks?this.controls[id]:{x:0,z:0}),...(command||{})};
   // The transport sequence deduplicates releases; server IDs survive bot relay and page reload.
   if(inputs[id].shot)inputs[id].shot={...inputs[id].shot,id:this.match.lastPoolShot+1};
  }
  this.match.step(1/NET.tickRate,inputs);this.match.events.length=0;
  if(this.match.done&&this.doneFrame===null)this.doneFrame=tick;
 }
 rollback(){
  const from=this.rollbackFrom;this.rollbackFrom=null;if(from===null)return;
  const snap=this.history.get(from);if(!snap)return;
  this.rng.state=snap.rng;this.match=restoreMatch(snap.match,this.rng);this.controls=structuredClone(snap.controls);this.inputTicks=[...snap.inputTicks];this.doneFrame=snap.doneFrame;
  for(let tick=from;tick<this.frame;tick++)this.simulateTick(tick,this.masks.get(tick)||[]);
 }
 advance(now){
  if(this.phase==='closed')return;
  const owner=this.members.find(m=>m?.key===this.owner);
  if(!owner||now-owner.lastSeen>NET.hostGrace||now-this.createdAt>NET.roomLifetime){this.phase='closed';this.notice='Le créateur est absent depuis trop longtemps. Crée une nouvelle room.';this.revision++;return;}
  for(let i=0;i<8;i++){const m=this.members[i];if(!m||m.key===this.owner)continue;if(now-m.lastSeen>60000&&['waiting','results'].includes(this.phase)){this.members[i]=null;this.revision++;}}
  if(this.phase==='countdown'&&now>=this.phaseUntil){this.phase='playing';this.tickAt=this.phaseUntil;this.revision++;}
  if(this.phase==='intermission'&&now>=this.phaseUntil){this.round++;this.beginRound(now);return;}
  if(this.phase!=='playing')return;
  this.rollback();
  // A long server suspension must not fast-forward players into hazards.
  if(now-this.tickAt>1000){this.tickAt=now;this.notice='Le serveur a ralenti : le chronomètre a été préservé.';}
  let steps=0;
  while(this.tickAt+1000/NET.tickRate<=now&&steps++<60){
   const mask=this.activeHumans(now).filter(id=>this.participants[id]===this.members[id]?.key&&this.roster[id].human);
   this.simulateTick(this.frame,mask);this.frame++;this.tickAt+=1000/NET.tickRate;
   for(const map of [this.history,this.timeline,this.masks])for(const k of map.keys())if(k<this.frame-NET.rollbackTicks-2)map.delete(k);
   if(this.doneFrame!==null&&this.frame-this.doneFrame>NET.rollbackTicks){this.finishRound(now);break;}
  }
 }
 finishRound(now){
  this.roundResults=this.match.results();for(const r of this.roundResults)this.totals[r.id]+=r.points;
  this.phase=this.round+1<this.order.length?'intermission':'results';this.phaseUntil=now+7000;this.revision++;
 }
 view(key,now){
  const id=this.member(key),canPlay=!!this.match&&this.participants?.[id]===key&&this.roster[id].human;
  return {type:'snapshot',protocol:PROTOCOL,code:this.code,selfId:id,ownerId:this.members.findIndex(m=>m?.key===this.owner),serverTime:now,revision:this.revision,phase:this.phase,phaseUntil:this.phaseUntil,round:this.round,roundId:this.roundId,frame:this.frame,order:this.order,notice:this.notice,canPlay,
   members:this.members.map((m,id)=>m?{id,name:m.name,color:m.color,connected:m.connected&&now-m.lastSeen<NET.botAfter,owner:m.key===this.owner}:null),roster:this.roster,totals:this.totals,results:this.roundResults,ack:this.received?.[id]??-1,match:publicMatch(this.match)};
 }
 export(){return {version:PROTOCOL,code:this.code,owner:this.owner,createdAt:this.createdAt,updatedAt:this.updatedAt,phase:this.phase,members:this.members,totals:this.totals,order:this.order,round:this.round,roundId:this.roundId,roundMaster:this.roundMaster,revision:this.revision,roster:this.roster,participants:this.participants,roundResults:this.roundResults,rng:this.rng.state};}
 static recover(data,now){
  if(data.version!==PROTOCOL)fail('version','Cette room utilise une ancienne version. Crée une nouvelle room.');
  const room=Object.create(Room.prototype);Object.assign(room,structuredClone(data));room.rng=statefulRandom(data.rng);room.match=null;room.frame=0;room.notice='';
  if(['playing','countdown','intermission'].includes(data.phase)){
   if(data.phase==='intermission')room.round++;
   room.members.forEach(m=>{if(m){m.connected=true;m.lastSeen=now;}});room.beginRound(now,data.phase!=='intermission');
  }
  return room;
 }
}
