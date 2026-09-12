// Gameplay is independent of rendering. Coordinates are world-space x/z.
export const BASE_AREA = 20 * 20;
export const MANSION = { width: 40, depth: 50, vision: 11, area: 2000 };
// Exact timing is an adaptation of Snap’s description: stay close for a few seconds.
export const INFECTION_SECONDS = 2;
export const POOL = {cell:2.8, minPull:.08, cooldown:2.4, hitTolerance:.35, flight:1.05, launcherZ:11.8, surfaceY:.6, thickness:.72, bevel:.04, bob:.02};
export function poolPieceY(piece,time) {
 const t=piece.alive?time:(piece.sunkAt??0);
 return POOL.surfaceY-POOL.thickness-POOL.bevel+Math.sin(t*2+piece.id)*POOL.bob-(piece.alive?0:Math.max(0,time-t)*4);
}
// Ten connected pieces, 2–5 cells each; no overlapping or isolated cells.
export const POOL_LAYOUT = ['AAABBB','ADACCB','FDDCCB','FDEEGG','FEEIIG','FHHHJJ'];
export function makePool() {
 const pieces=Array.from({length:10},(_,id)=>({id,alive:true,cells:[]})),tiles=[];
 POOL_LAYOUT.forEach((row,z)=>[...row].forEach((letter,x)=>{
  const piece=letter.charCodeAt(0)-65;
  const tile={x:(x-2.5)*POOL.cell,z:(z-2.5)*POOL.cell,gx:x,gz:z,piece,alive:true};
  pieces[piece].cells.push(tile);tiles.push(tile);
 }));
 return {pieces,tiles};
}
export function poolOutline(cells) {
 const occupied=new Set(cells.map(t=>`${t.gx},${t.gz}`)),edges=[];
 for(const {gx:x,gz:z} of cells){
  if(!occupied.has(`${x},${z-1}`))edges.push([[x,z],[x+1,z]]);
  if(!occupied.has(`${x+1},${z}`))edges.push([[x+1,z],[x+1,z+1]]);
  if(!occupied.has(`${x},${z+1}`))edges.push([[x+1,z+1],[x,z+1]]);
  if(!occupied.has(`${x-1},${z}`))edges.push([[x,z+1],[x,z]]);
 }
 const ordered=[edges.shift()];
 while(edges.length){const end=ordered.at(-1)[1],i=edges.findIndex(e=>e[0][0]===end[0]&&e[0][1]===end[1]);if(i<0)throw new Error('Disconnected pool outline');ordered.push(edges.splice(i,1)[0]);}
 // Remove collinear corners so beveling produces a single seamless polyomino.
 return ordered.map(e=>e[0]).filter((p,i,all)=>{const a=all[(i+all.length-1)%all.length],b=all[(i+1)%all.length];return (p[0]-a[0])*(b[1]-p[1])!==(p[1]-a[1])*(b[0]-p[0]);});
}
export function poolHit(tiles,point,tolerance=POOL.hitTolerance) {
 // Modest edge tolerance, never snap to a distant surviving piece.
 if(!Number.isFinite(point?.x)||!Number.isFinite(point?.z))return null;
 return tiles.filter(t=>t.alive).map(t=>({tile:t,d:Math.hypot(Math.max(0,Math.abs(t.x-point.x)-POOL.cell/2),Math.max(0,Math.abs(t.z-point.z)-POOL.cell/2))}))
  .filter(h=>h.d<=tolerance).sort((a,b)=>a.d-b.d||distance(a.tile,point)-distance(b.tile,point))[0]?.tile||null;
}
export function poolAim(pull) {
 if(!Number.isFinite(pull?.x)||!Number.isFinite(pull?.y)||pull.y<POOL.minPull)return null;
 return {x:-clamp(pull.x,-1,1)*10.5,z:9-clamp(pull.y,0,1)*18};
}
// Vertical wheel in the x/y plane; z is the width of its running surface.
export const SPIN = {radius:9, width:8, centerY:-7, fallAngle:.95, boostSpeed:.04, boostDuration:2.6, boostCooldown:5};
export function spinPosition(angle) {
 return {x:SPIN.radius*Math.sin(angle),y:SPIN.centerY+SPIN.radius*Math.cos(angle)};
}
export function partySchedule(random=Math.random) {
 const games=Object.keys(GAMES);
 for(let i=games.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[games[i],games[j]]=[games[j],games[i]];}
 return {games,masters:games.map(()=>Math.floor(random()*8))};
}
export const GAMES = {
 pool: {name:'Pool Party', icon:'🌊', color:'#51d5ed', duration:30, subtitle:'Garde les pieds au sec.', runner:'Surveille la balle et saute entre les pièces. Une pièce touchée coule en entier !', master:'Tire la balle vers le bas puis relâche. Plus tu tires, plus elle va loin ; tire du côté opposé pour diriger le tir. Recharge : 2,4 s.', action:'Sauter', masterAction:'Lancer'},
 zombie: {name:'Zombie Escape', icon:'👻', color:'#b1ee75', duration:60, subtitle:'Bienvenue au manoir des trouillards.', runner:'Fuis les zombies jusqu’à la fin. Le sprint peut te sauver !', master:'Reste 2 secondes près d’un humain pour l’infecter. Il rejoint ton équipe.', action:'Sprinter', masterAction:'Sprinter'},
 kick: {name:'Kick Off', icon:'👟', color:'#ffa96c', duration:30, subtitle:'Attention à la pointure 300.', runner:'Un seul bouton : sauter. Saute par-dessus le crampon bas ; reste au sol quand il passe en haut. Attention au tour lent : attends le bon moment !', master:'En bas : tour rapide au sol. En haut : même tour au-dessus des têtes. Lent : tour lent au sol pour piéger les sauts précoces.', action:'Sauter', masterAction:'Shooter'},
 spin: {name:'Spin Session', icon:'🌀', color:'#d4a7ff', duration:30, subtitle:'Disco : garde le cap sur la roue !', runner:'Sur la tranche de la roue, maintiens gauche ou droite à contre-sens. Change vite quand le Game Master inverse ! Le boost t’entraîne légèrement, même à contre-sens.', master:'Inverse le sens de la roue pour piéger les joueurs. Le boost entraîne légèrement les joueurs malgré leur course à contre-sens. Recharge : 5 s. Tu dois inverser entre deux boosts.', action:'Courir', masterAction:'Accélérer'}
};
export const COLORS = ['#ffca48','#55d6cf','#f78bc1','#8c94ff','#fd926d','#a0dc79','#c690eb','#f56f80'];
export const NAMES = ['Toi','Milo','Lola','Sacha','Zoé','Noé','Jade','Gus'];
export const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
export const distance = (a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const wrap = a=>Math.atan2(Math.sin(a),Math.cos(a));
export function seededRandom(seed=1) { return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;}; }
export function poolShotPosition(h) {
 const u=clamp(h.age/h.delay,0,1);
 return {x:h.x*u,y:2.4*(1-u)+(POOL.surfaceY+.35)*u+20*u*(1-u),z:POOL.launcherZ+(h.z-POOL.launcherZ)*u};
}
// Shared by collision detection and the rendered cleat. One clockwise revolution.
export const KICK = {radius:6, fast:1.5, slow:3, windup:.25, recovery:.35, rest:.3,
 halfWidth:.85, inner:2.5, outer:7.3, lowBottom:.08, lowTop:1.05, highBottom:3.15, bodyHeight:2.65, playerRadius:.3};
export function kickPose(h) {
 if(!h)return {angle:0,y:0,striking:false};
 const duration=h.mode==='slow'?KICK.slow:KICK.fast, t=h.age-KICK.windup;
 const progress=clamp(t/duration,0,1);
 const lift=h.mode==='high'?KICK.highBottom-KICK.lowBottom:0;
 const y=t<0?lift*clamp(h.age/KICK.windup,0,1):t>duration?lift*(1-clamp((t-duration)/KICK.recovery,0,1)):lift;
 return {angle:progress*Math.PI*2,y,striking:t>=0&&t<duration};
}
export function kickDuration(mode) {return KICK.windup+(mode==='slow'?KICK.slow:KICK.fast)+KICK.recovery;}
// Sample the swept shoe and interpolated jump, avoiding frame-rate-dependent misses.
export function kickHits(h,p,previousJump,dt) {
 const steps=Math.max(1,Math.ceil(dt/.004));
 for(let i=0;i<=steps;i++){
  const u=i/steps,pose=kickPose({...h,age:h.age-dt+dt*u});if(!pose.striking)continue;
  const radial=p.x*Math.sin(pose.angle)+p.z*Math.cos(pose.angle);
  const lateral=p.x*Math.cos(pose.angle)-p.z*Math.sin(pose.angle);
  if(radial<KICK.inner-KICK.playerRadius||radial>KICK.outer+KICK.playerRadius||Math.abs(lateral)>KICK.halfWidth+KICK.playerRadius)continue;
  const jump=previousJump+(p.jump-previousJump)*u;
  if(jump<KICK.lowTop+pose.y&&jump+KICK.bodyHeight>KICK.lowBottom+pose.y)return true;
 }
 return false;
}
export function makeMansion() {
 const items=[];
 const add=(kind,x,z,w,d,h=1.8)=>items.push({kind,x,z,w,d,h});
 // 6 rooms, connected by generous 4-unit doorways; low walls preserve the view.
 for(const z of [-14,0,14]) {add('wall',-15,z,10,.65,1.5);add('wall',0,z,12,.65,1.5);add('wall',15,z,10,.65,1.5);}
 for(const x of [-7,7]) for(const z of [-21,-7,7,21]) add('wall',x,z,.65,6,1.5);
 for(const [x,z] of [[-14,-20],[14,-20],[-14,7],[14,7]]) add('sofa',x,z,4,1.7,1.2);
 for(const [x,z] of [[0,-20],[0,20],[-14,-7],[14,-7]]) add('table',x,z,3.4,2.6,1.1);
 for(const [x,z] of [[-18,-11],[18,11],[-18,20],[18,-21],[4,5],[-4,-6]]) add('cabinet',x,z,1.7,2.2,2.4);
 for(const [x,z] of [[-13,21],[13,21],[-12,0],[12,0]]) add('coffin',x,z,1.6,3,1.2);
 for(const [x,z] of [[-4,12],[4,-12],[-17,14],[17,-14]]) add('cauldron',x,z,1.7,1.7,1.2);
 return items;
}
export function blocked(x,z,obstacles,r=.45) {
 return obstacles.some(o=>Math.abs(x-o.x)<o.w/2+r && Math.abs(z-o.z)<o.d/2+r);
}
export function lineClear(a,b,obstacles,r=.15) {
 const n=Math.max(1,Math.ceil(distance(a,b)/.35));
 for(let i=1;i<n;i++) if(blocked(a.x+(b.x-a.x)*i/n,a.z+(b.z-a.z)*i/n,obstacles,r)) return false;
 return true;
}
export function moveWithWalls(p,dx,dz,obstacles,width=40,depth=50) {
 const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.2));
 for(let i=0;i<steps;i++) {
  const x=clamp(p.x+dx/steps,-width/2+.6,width/2-.6);
  if(!blocked(x,p.z,obstacles)) p.x=x;
  const z=clamp(p.z+dz/steps,-depth/2+.6,depth/2-.6);
  if(!blocked(p.x,z,obstacles)) p.z=z;
 }
}
// Grid navigation is shared by every zombie; paths are recalculated at bot reaction intervals.
export class Navigation {
 constructor(obstacles) {this.obstacles=obstacles;this.w=40;this.h=50;this.open=new Uint8Array(2000);for(let z=0;z<50;z++)for(let x=0;x<40;x++)this.open[z*40+x]=blocked(x-19.5,z-24.5,obstacles,.55)?0:1;}
 cell(p) {return clamp(Math.floor(p.z+25),0,49)*40+clamp(Math.floor(p.x+20),0,39);}
 point(i) {return {x:i%40-19.5,z:Math.floor(i/40)-24.5};}
 path(a,b) {
  if(lineClear(a,b,this.obstacles,.6)) return [b];
  let start=this.cell(a),end=this.cell(b);
  if(!this.open[end]) {let best=Infinity;for(let i=0;i<2000;i++)if(this.open[i]){const d=distance(this.point(i),b);if(d<best){best=d;end=i;}}}
  const prev=new Int32Array(2000).fill(-1),q=[start];prev[start]=start;
  for(let k=0;k<q.length;k++){const i=q[k];if(i===end)break;for(const d of [-40,40,-1,1]) {const j=i+d;if(j<0||j>=2000||Math.abs(j%40-i%40)>1||!this.open[j]||prev[j]!==-1)continue;prev[j]=i;q.push(j);}}
  if(prev[end]===-1)return [];
  const out=[];for(let i=end;i!==start;i=prev[i])out.push(this.point(i));return out.reverse();
 }
}
export class Match {
 constructor({game='pool',master=7,humans=1,names=NAMES,colors=COLORS,random=Math.random}={}) {
  this.game=game;this.config=GAMES[game];this.master=master;this.humans=humans;this.random=random;this.time=0;this.done=false;this.events=[];this.hazards=[];this.nextAttack=1.6;this.angle=0;this.direction=1;this.boost=0;this.spinSpeed=.8;this.target={x:0,z:0};
  this.obstacles=game==='zombie'?makeMansion():[];this.nav=game==='zombie'?new Navigation(this.obstacles):null;
  Object.assign(this,makePool());this.lastPoolShot=0;
  this.players=Array.from({length:8},(_,i)=>({id:i,name:names[i],color:colors[i],x:Math.cos(i/8*Math.PI*2)*4.5,z:Math.sin(i/8*Math.PI*2)*4.5,angle:0,jump:0,jumpV:0,alive:true,infected:game==='zombie'&&i===master,infection:0,cooldown:0,dash:0,vx:0,vz:0,walk:0,survived:0,outAt:null,botAt:0,brain:{x:0,z:0},path:[],input:{},emote:0}));
  if(game==='zombie') {const spots=[[-11,-17],[11,18],[-3,4],[11,-17],[-11,17],[3,-4],[-11,4],[11,-4]];this.players.forEach((p,i)=>{[p.x,p.z]=spots[i];});}
  if(game==='pool')this.players.forEach((p,i)=>{const t=this.tiles[[8,10,14,16,20,22,26,28][i]];p.x=t.x;p.z=t.z;p.y=POOL.surfaceY;});
  if(game==='kick')this.players.filter(p=>p.id!==master).forEach((p,i)=>{p.kickAngle=2.08+i*(Math.PI*2-4.16)/6;p.x=Math.sin(p.kickAngle)*KICK.radius;p.z=Math.cos(p.kickAngle)*KICK.radius;});
  if(game==='spin') {
   this.spinSpeed=.42;this.boostNeedsReverse=false;
   this.players.filter(p=>p.id!==master).forEach((p,i)=>{
    p.rimAngle=[-.18,.12,-.08,.2,-.2,.04,.16][i];p.z=i-3;Object.assign(p,spinPosition(p.rimAngle));
    p.brain={x:-this.direction,z:0};p.botAt=.28+random()*.47;
   });
  }
  if(game!=='zombie'){const gm=this.players[master];gm.x=0;gm.z=-12;}
  if(game==='pool'){Object.assign(this.players[master],{x:3.6,z:POOL.launcherZ+.8,y:0,angle:Math.PI});}
  if(game==='spin'){this.players[master].z=-6;this.players[master].y=4;}
 }
 event(type,p,extra={}) {this.events.push({type,id:p?.id,...extra});}
 reverseSpin() {if(this.game!=='spin'||this.done)return;this.direction*=-1;this.boostNeedsReverse=false;this.event('reverse',this.players[this.master]);}
 eliminate(p) {if(!p.alive)return;p.alive=false;p.outAt=this.time;p.jumpV=5;this.event('out',p);}
 action(p) {
  if(this.done||!p.alive||p.cooldown>0)return;
  if(this.game==='zombie'){p.dash=.48;p.cooldown=3.3;this.event('dash',p);return;}
  if(p.id===this.master) {
   if(this.game==='spin'&&!this.boostNeedsReverse){this.boost=SPIN.boostDuration;p.cooldown=SPIN.boostCooldown;this.boostNeedsReverse=true;this.event('boost',p);}
   return;
  }
  if(this.game!=='spin'&&p.jump<.01){p.jumpV=7.6;p.cooldown=.82;this.event('jump',p);}
 }
 attack(mode,playerId=this.master) {
  const p=this.players[this.master];
  if(this.game!=='kick'||this.done||playerId!==this.master||!p.alive||p.cooldown>0||this.hazards.some(h=>h.type==='boot')||!['low','high','slow'].includes(mode))return false;
  p.cooldown=kickDuration(mode)+KICK.rest;
  this.hazards.push({type:'boot',mode,age:0});
  this.event('attack',p,{mode});return true;
 }
 launchPool(playerId,shot) {
  if(this.game!=='pool'||this.done||playerId!==this.master||!Number.isSafeInteger(shot?.id)||shot.id<=this.lastPoolShot)return false;
  this.lastPoolShot=shot.id; // Consume even a rejected release: no deferred shot after cooldown.
  const p=this.players[playerId],aim=poolAim(shot);
  if(!aim||!p.alive||p.cooldown>0)return false;
  p.cooldown=POOL.cooldown;
  this.hazards.push({type:'splash',...aim,age:0,delay:POOL.flight,hit:false,piece:null});
  this.event('attack',p);return true;
 }
 bot(p,dt) {
  const r=this.random;
  if(p.id===this.master&&this.game!=='zombie') {
   if(this.time>=this.nextAttack) {
    const targets=this.players.filter(q=>q.alive&&q.id!==this.master);const t=targets[Math.floor(r()*targets.length)];
    if(t){
     if(this.game==='pool')this.launchPool(p.id,{id:this.lastPoolShot+1,x:-(t.x+(r()-.5)*2)/10.5,y:(9-t.z+(r()-.5)*2)/18});
     else if(this.game==='kick')this.attack(['low','high','slow'][Math.floor(r()*3)]);
     else {this.target={x:t.x+(r()-.5)*2,z:t.z};this.action(p);}
    }
    if(this.game==='spin'&&r()<.65)this.reverseSpin();
    this.nextAttack=this.time+(this.game==='pool'?POOL.cooldown+.15:this.game==='kick'?1.9:4)+r()*.8;
   }
   return {x:0,z:0};
  }
  if(this.game==='kick'){
   const h=this.hazards.find(h=>h.type==='boot');
   if(h&&p.kickThreat!==h){
    p.kickThreat=h;
    const arrival=KICK.windup+p.kickAngle/(Math.PI*2)*(h.mode==='slow'?KICK.slow:KICK.fast);
    p.kickJumpAt=h.mode==='high'?(r()<.22?arrival-.34:Infinity):r()<.18?.3:arrival-.37+(r()-.5)*.18;
   }
   if(h&&h.age>=p.kickJumpAt){this.action(p);p.kickJumpAt=Infinity;}
   return {x:0,z:0};
  }
  p.botAt-=dt;
  if(p.botAt<=0) {
   p.botAt=.28+r()*.47;
   if(this.game==='zombie') {
    const enemies=this.players.filter(q=>q.alive&&q.infected!==p.infected);
    enemies.sort((a,b)=>distance(a,p)-distance(b,p));const nearest=enemies[0];
    let dest;
    if(p.infected&&nearest)dest={x:nearest.x,z:nearest.z};
    else {
     const enemyDistance=nearest?distance(p,nearest):30;
     if(enemyDistance<9||!p.path.length) {
      let best=-Infinity;
      for(let k=0;k<18;k++) {const v={x:r()*35-17.5,z:r()*45-22.5};if(blocked(v.x,v.z,this.obstacles,.8))continue;const score=(nearest?distance(v,nearest):10)-distance(v,p)*.38;if(score>best){dest=v;best=score;}}
     }
    }
    if(dest)p.path=this.nav.path(p,dest);
    if(nearest&&distance(p,nearest)<4.5&&r()<.28)this.action(p);
   } else if(this.game==='pool') {
    const current=poolHit(this.tiles,p,0);
    const threatened=new Set(this.hazards.filter(h=>h.age>.3&&h.age<h.delay+.15).map(h=>poolHit(this.tiles,h)?.piece));
    const danger=current&&threatened.has(current.piece);
    if(danger && r()<.25) return {x:0,z:0};
    if(!current||danger||r()<.08) {
     const safe=this.tiles.filter(t=>t.alive&&!threatened.has(t.piece));safe.sort((a,b)=>distance(a,p)-distance(b,p));
     if(safe[0])p.brain={x:safe[0].x,z:safe[0].z};
     if((danger||!current)&&r()<.8)this.action(p);
    }else p.brain={x:p.x,z:p.z};
   } else if(this.game==='spin') {
    // Bots react after their normal delay, rather than reading a reversal instantly.
    p.brain={x:-this.direction,z:0};
   }
  }
  if(this.game==='spin')return p.brain;
  let target=p.brain;
  if(this.game==='zombie'){
   while(p.path[0]&&distance(p,p.path[0])<.4)p.path.shift();target=p.path[0]||p;
   if(p.infected){const close=this.players.filter(q=>!q.infected&&distance(p,q)<5&&lineClear(p,q,this.obstacles,.6)).sort((a,b)=>distance(a,p)-distance(b,p))[0];if(close)target=close;}
  }
  let dx=target.x-p.x,dz=target.z-p.z;const len=Math.hypot(dx,dz);return len>.15?{x:dx/len,z:dz/len}:{x:0,z:0};
 }
 step(delta,inputs={}) {
  if(this.done)return;
  const dt=Math.min(delta,.04);this.time+=dt;this.boost=Math.max(0,this.boost-dt);
  if(this.game==='spin') {
   // Resolve the master first so all runners see the same wheel motion this tick.
   const gm=this.players[this.master];gm.cooldown=Math.max(0,gm.cooldown-dt);gm.survived=this.time;
   const input=gm.id<this.humans?(inputs[gm.id]||{}):this.bot(gm,dt);
   if(input.action)this.action(gm);
   if(input.reverse&&gm.reverseReady!==false){this.reverseSpin();gm.reverseReady=false;}
   else if(!input.reverse)gm.reverseReady=true;
   this.spinSpeed=(.42+this.time*.01+(this.boost>0?SPIN.boostSpeed:0))*this.direction;
   this.angle+=this.spinSpeed*dt;
  }
  for(const p of this.players) {
   if(this.game==='spin'&&p.id===this.master)continue;
   p.cooldown=Math.max(0,p.cooldown-dt);p.dash=Math.max(0,p.dash-dt);p.emote=Math.max(0,p.emote-dt);
   if(!p.alive){p.jumpV-=16*dt;p.jump+=p.jumpV*dt;p.x+=p.vx*dt;p.z+=p.vz*dt;continue;}
   p.survived=this.time;p.previousJump=p.jump;
   const input=p.id<this.humans?(inputs[p.id]||{x:0,z:0}):this.bot(p,dt);
   if(input.shot)this.launchPool(p.id,input.shot);
   if(this.game==='kick'){
    if(p.id===this.master){if(input.kick&&!p.kickHeld)this.attack(input.kick,p.id);p.kickHeld=!!input.kick;}
    else {if(input.action&&!p.actionHeld)this.action(p);p.actionHeld=!!input.action;}
   }else if(input.action)this.action(p);
   if(this.game==='spin') {
    // Running cancels normal rotation. Boost adds a slight unavoidable drift.
    // A touch stick is directional here: vertical input cannot dilute compensation.
    const dx=Math.abs(input.x||0)>.15?Math.sign(input.x):0;
    const angularVelocity=this.spinSpeed+dx*(.42+this.time*.01);
    p.rimAngle+=angularVelocity*dt;Object.assign(p,spinPosition(p.rimAngle));
    if(dx){p.angle=dx*Math.PI/2;p.walk+=dt*12;}else p.walk=0;
    if(Math.abs(p.rimAngle)>=SPIN.fallAngle){
     this.eliminate(p);
     p.vx=SPIN.radius*Math.cos(p.rimAngle)*angularVelocity;
     p.jumpV=-SPIN.radius*Math.sin(p.rimAngle)*angularVelocity;
    }
    continue;
   }
   if(p.id===this.master&&this.game!=='zombie')continue;
   let dx=this.game==='kick'?0:input.x||0,dz=this.game==='kick'?0:input.z||0;const len=Math.hypot(dx,dz);if(len>1){dx/=len;dz/=len;}
   const speed=(this.game==='zombie'?(p.infected?4.9:4.6):5.6)*(p.dash>0?1.9:1);
   if(p.jump>0||p.jumpV>0){p.jumpV-=19*dt;p.jump+=p.jumpV*dt;if(p.jump<=0){p.jump=0;p.jumpV=0;}}
   let vx=dx*speed+p.vx,vz=dz*speed+p.vz;p.vx*=Math.exp(-4.2*dt);p.vz*=Math.exp(-4.2*dt);
   if(this.game==='zombie')moveWithWalls(p,vx*dt,vz*dt,this.obstacles);else{p.x+=vx*dt;p.z+=vz*dt;}
   if(len>.05){p.angle=Math.atan2(dx,dz);p.walk+=dt*(p.dash>0?19:12);}else p.walk=0;
   if(this.game==='pool'&&p.jump<.12) {
    const tile=this.tiles.find(t=>t.alive&&Math.abs(t.x-p.x)<1.42&&Math.abs(t.z-p.z)<1.42);
    if(!tile)this.eliminate(p);
   }
   if(this.game==='kick'&&(Math.abs(p.x)>9||Math.abs(p.z)>9))this.eliminate(p);
  }
  if(this.game==='pool') {
   const runners=this.players.filter(p=>p.alive&&p.id!==this.master);
   for(let a=0;a<runners.length;a++)for(let b=a+1;b<runners.length;b++){const p=runners[a],q=runners[b],d=distance(p,q);if(d<.8&&Math.abs(p.jump-q.jump)<.7){const x=(p.x-q.x)/(d||1),z=(p.z-q.z)/(d||1),push=(.8-d)*.5;p.x+=x*push;p.z+=z*push;q.x-=x*push;q.z-=z*push;}}
  }
  if(this.game==='zombie') {
   for(const p of this.players.filter(p=>!p.infected)) {
    const z=this.players.find(q=>q.infected&&distance(q,p)<1.25&&lineClear(q,p,this.obstacles,.1));
    p.infection=z?Math.min(1,p.infection+dt/INFECTION_SECONDS):Math.max(0,p.infection-dt*.85);
    if(p.infection>=1){p.infected=true;p.outAt=this.time;p.infection=0;p.dash=0;p.cooldown=1;this.event('infect',p,{by:z.id});}
   }
  }
  for(const h of this.hazards) {
   h.age+=dt;
   if(h.type==='splash'&&h.age>=h.delay&&!h.hit) {
    h.hit=true;const tile=poolHit(this.tiles,h);
    if(tile){const piece=this.pieces[tile.piece];piece.alive=false;piece.sunkAt=this.time;piece.cells.forEach(t=>t.alive=false);h.piece=piece.id;}
    this.event('splash',null,{x:h.x,z:h.z});
    for(const p of this.players)if(p.alive&&p.id!==this.master&&distance(p,h)<2.3&&p.jump<.6){p.vx=(p.x-h.x||.3)*5;p.vz=(p.z-h.z||.3)*5;}
   }
   if(h.type==='boot') {
    for(const p of this.players)if(p.alive&&p.id!==this.master&&kickHits(h,p,p.previousJump??p.jump,dt)){
     p.vx=Math.cos(p.kickAngle)*13;p.vz=-Math.sin(p.kickAngle)*13;this.event('bump',p);this.eliminate(p);
    }
   }
  }
  this.hazards=this.hazards.filter(h=>h.age<(h.type==='boot'?kickDuration(h.mode):3.1));
  const survivors=this.players.filter(p=>p.id!==this.master&&p.alive&&(this.game!=='zombie'||!p.infected));
  if(!survivors.length||this.time>=this.config.duration){this.time=Math.min(this.time,this.config.duration);this.done=true;this.masterWon=!survivors.length;this.event('finish');}
 }
 results() {
  return this.players.map(p=>{
   const gm=p.id===this.master;const survived=p.alive&&(this.game!=='zombie'||!p.infected);const time=p.outAt??this.time;
   const points=gm?(this.masterWon?100:Math.round((7-this.players.filter(q=>q.id!==this.master&&q.alive&&(this.game!=='zombie'||!q.infected)).length)*10)):(survived?100:Math.round(time/this.config.duration*60));
   return {id:p.id,name:p.name,color:p.color,points,gm,survived,time};
  }).sort((a,b)=>b.points-a.points||a.id-b.id);
 }
}
