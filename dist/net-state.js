import {Match, GAMES} from './simulation.js';
export const PROTOCOL=1;
export const NET={tickRate:60,snapshotRate:20,rollbackTicks:12,maxLeadTicks:18,inputStaleTicks:30,botAfter:2000,hostGrace:120000,roomLifetime:7200000};
export function statefulRandom(seed=1){
 const random=()=>{random.state=(random.state+0x6D2B79F5)|0;let t=Math.imul(random.state^random.state>>>15,1|random.state);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};random.state=seed|0;return random;
}
export function masterWeights(humans){const ids=new Set(humans);return Array.from({length:8},(_,id)=>ids.size>=4?(ids.has(id)?1:0):(ids.has(id)?2:1));}
export function chooseMaster(humans,random=Math.random){const weights=masterWeights(humans),sum=weights.reduce((a,b)=>a+b,0);let roll=random()*sum;for(let i=0;i<8;i++){roll-=weights[i];if(roll<0)return i;}return weights.findLastIndex(w=>w>0);}
// Private round checkpoint. Pool piece/cell references are rebuilt on hydration.
export function captureMatch(match){
 const excluded=new Set(['random','nav','obstacles','config','players','pieces','tiles']);
 const state=Object.fromEntries(Object.entries(match).filter(([k])=>!excluded.has(k)));
 state.players=match.players.map(p=>({...p,kickThreat:match.hazards.indexOf(p.kickThreat)}));
 state.pool=match.pieces.map(p=>({alive:p.alive,sunkAt:p.sunkAt}));
 return structuredClone(state);
}
export function restoreMatch(data,random=Math.random){
 const m=new Match({game:data.game,master:data.master,humans:data.humans,humanIds:data.humanIds,random:()=>.5});
 const {pool,players,...state}=structuredClone(data);Object.assign(m,state);m.random=random;
 m.players=players.map(p=>({...p,kickThreat:m.hazards[p.kickThreat]}));
 pool.forEach((p,i)=>{Object.assign(m.pieces[i],p);m.pieces[i].cells.forEach(t=>t.alive=p.alive);});return m;
}
// Only public presentation state leaves the server. No credentials or bot decisions.
export function publicMatch(m){
 if(!m)return null;
 const keys=['game','master','time','done','masterWon','angle','direction','boost','boostNeedsReverse','spinSpeed','target','lastPoolShot'];
 const out=Object.fromEntries(keys.map(k=>[k,m[k]]));
 const playerKeys=['id','name','color','x','y','z','angle','jump','jumpV','alive','infected','infection','cooldown','dash','walk','survived','outAt','emote','rimAngle','vx','vz'];
 out.players=m.players.map(p=>Object.fromEntries(playerKeys.map(k=>[k,p[k]])));
 out.hazards=m.hazards.map(h=>({...h}));out.pool=m.pieces.map(p=>({alive:p.alive,sunkAt:p.sunkAt}));return out;
}
export function applyPublicMatch(m,s){
 const {players,hazards,pool,...state}=s;Object.assign(m,state);m.config=GAMES[s.game];m.players=structuredClone(players);const previous=new Map(m.hazards.map(h=>[h.uid,h]));m.hazards=hazards.map(h=>Object.assign(previous.get(h.uid)||{},structuredClone(h)));
 pool.forEach((p,i)=>{Object.assign(m.pieces[i],p);m.pieces[i].cells.forEach(t=>t.alive=p.alive);});return m;
}
export function cleanInput(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
 const axis=n=>Number.isFinite(n)?Math.max(-1,Math.min(1,n)):0;
 const input={x:axis(raw.x),z:axis(raw.z)};
 const len=Math.hypot(input.x,input.z);if(len>1){input.x/=len;input.z/=len;}
 if(raw.action===true)input.action=true;if(raw.reverse===true)input.reverse=true;
 if(['low','high','slow'].includes(raw.kick))input.kick=raw.kick;
 if(raw.shot&&Number.isFinite(raw.shot.x)&&Number.isFinite(raw.shot.y)&&Number.isSafeInteger(raw.shot.id)&&raw.shot.id>0&&raw.shot.id<1e9)input.shot={id:raw.shot.id,x:axis(raw.shot.x),y:Math.max(0,Math.min(1,raw.shot.y))};
 return input;
}
