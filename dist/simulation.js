// Gameplay is independent of rendering. Coordinates are world-space x/z.
export const BASE_AREA = 20 * 20;
export const MANSION = { width: 40, depth: 50, vision: 11, area: 2000 };
export const GAMES = {
 pool: {name:'Pool Party', icon:'🌊', color:'#51d5ed', duration:40, subtitle:'Garde les pieds au sec.', runner:'Évite les cibles rouges et les trous. Saute entre les bouées !', master:'Déplace la cible et tire pour couler les bouées.', action:'Sauter', masterAction:'Tirer'},
 zombie: {name:'Zombie Escape', icon:'👻', color:'#b1ee75', duration:60, subtitle:'Bienvenue au manoir des trouillards.', runner:'Fuis les zombies jusqu’à la fin. Le sprint peut te sauver !', master:'Reste près des humains pour les infecter. Ils rejoignent ton équipe.', action:'Sprinter', masterAction:'Sprinter'},
 kick: {name:'Kick Off', icon:'👟', color:'#ffa96c', duration:40, subtitle:'Attention à la pointure 300.', runner:'Évite la ligne rouge. Saute par-dessus la botte au bon moment.', master:'Vise une colonne et envoie la botte géante.', action:'Sauter', masterAction:'Shooter'},
 spin: {name:'Spin Session', icon:'🌀', color:'#d4a7ff', duration:40, subtitle:'Ça va tourner au vinaigre.', runner:'Reste sur le disque, compense la rotation et saute la barre.', master:'Inverse la rotation ou accélère pour déstabiliser les joueurs.', action:'Sauter', masterAction:'Accélérer'}
};
export const COLORS = ['#ffca48','#55d6cf','#f78bc1','#8c94ff','#fd926d','#a0dc79','#c690eb','#f56f80'];
export const NAMES = ['Toi','Milo','Lola','Sacha','Zoé','Noé','Jade','Gus'];
export const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
export const distance = (a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const wrap = a=>Math.atan2(Math.sin(a),Math.cos(a));
export function seededRandom(seed=1) { return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;}; }
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
  this.tiles=[];for(let z=0;z<6;z++)for(let x=0;x<6;x++)this.tiles.push({x:(x-2.5)*2.8,z:(z-2.5)*2.8,alive:true,sink:0});
  this.players=Array.from({length:8},(_,i)=>({id:i,name:names[i],color:colors[i],x:Math.cos(i/8*Math.PI*2)*4.5,z:Math.sin(i/8*Math.PI*2)*4.5,angle:0,jump:0,jumpV:0,alive:true,infected:game==='zombie'&&i===master,infection:0,cooldown:0,dash:0,vx:0,vz:0,walk:0,survived:0,outAt:null,botAt:0,brain:{x:0,z:0},path:[],input:{},emote:0}));
  if(game==='zombie') {const spots=[[-11,-17],[11,18],[-3,4],[11,-17],[-11,17],[3,-4],[-11,4],[11,-4]];this.players.forEach((p,i)=>{[p.x,p.z]=spots[i];});}
  if(game==='pool')this.players.forEach((p,i)=>{const t=this.tiles[[8,10,14,16,20,22,26,28][i]];p.x=t.x;p.z=t.z;});
  if(game!=='zombie'){const gm=this.players[master];gm.x=0;gm.z=-12;}
 }
 event(type,p,extra={}) {this.events.push({type,id:p?.id,...extra});}
 eliminate(p) {if(!p.alive)return;p.alive=false;p.outAt=this.time;p.jumpV=5;this.event('out',p);}
 action(p) {
  if(!p.alive||p.cooldown>0)return;
  if(this.game==='zombie'){p.dash=.48;p.cooldown=3.3;this.event('dash',p);return;}
  if(p.id===this.master) {
   if(this.game==='spin'){this.boost=2.6;p.cooldown=4.5;this.event('boost',p);}
   else{this.attack(this.target);p.cooldown=this.game==='pool'?1.15:1.55;}
   return;
  }
  if(p.jump<.01){p.jumpV=7.6;p.cooldown=.82;this.event('jump',p);}
 }
 attack(target) {
  if(this.game==='pool') {
   const t=this.tiles.filter(t=>t.alive).sort((a,b)=>distance(a,target)-distance(b,target))[0];
   if(t)this.hazards.push({type:'splash',x:t.x,z:t.z,age:0,delay:1.05,tile:this.tiles.indexOf(t),hit:false});
  } else if(this.game==='kick')this.hazards.push({type:'boot',x:clamp(target.x,-7.3,7.3),z:-11,age:0,delay:.85,hit:false});
  this.event('attack',this.players[this.master]);
 }
 bot(p,dt) {
  const r=this.random;
  if(p.id===this.master&&this.game!=='zombie') {
   if(this.time>=this.nextAttack) {
    const targets=this.players.filter(q=>q.alive&&q.id!==this.master);const t=targets[Math.floor(r()*targets.length)];
    if(t){this.target={x:t.x+(r()-.5)*2,z:t.z};this.action(p);}
    if(this.game==='spin'&&r()<.45)this.direction*=-1;
    this.nextAttack=this.time+(this.game==='pool'?1.45:this.game==='kick'?1.9:4)+r()*.8;
   }
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
    const current=this.tiles.find(t=>t.alive&&Math.abs(t.x-p.x)<1.4&&Math.abs(t.z-p.z)<1.4);
    const danger=this.hazards.some(h=>distance(h,p)<2.5&&h.age<h.delay+.2);
    if(danger && r()<.25) return {x:0,z:0};
    if(!current||danger||r()<.08) {
     const safe=this.tiles.filter(t=>t.alive&&!this.hazards.some(h=>h.tile===this.tiles.indexOf(t)&&h.age<1.5));safe.sort((a,b)=>distance(a,p)-distance(b,p));
     if(safe[0])p.brain={x:safe[0].x,z:safe[0].z};
     if((danger||!current)&&r()<.8)this.action(p);
    }else p.brain={x:p.x,z:p.z};
   } else if(this.game==='kick') {
    const threat=this.hazards.find(h=>h.age<2.9&&Math.abs(p.x-h.x)<2);
    p.brain=threat?{x:clamp(threat.x+(p.x>threat.x?3.5:-3.5),-8,8),z:p.z}:{x:p.x*.8+(r()-.5),z:p.z*.8};
    if(threat&&threat.z>p.z-3&&threat.z<p.z+1&&r()<.8)this.action(p);
   } else {
    const orbit=3.7+(p.id%4)*.65;
    p.brain={x:Math.cos(p.id*1.3+this.time*.08)*orbit,z:Math.sin(p.id*1.3+this.time*.08)*orbit};
    const d=Math.abs(wrap(Math.atan2(p.z,p.x)-this.angle));if(Math.min(d,Math.PI-d)<.4&&r()<.9)this.action(p);
   }
  }
  let target=p.brain;
  if(this.game==='zombie'){while(p.path[0]&&distance(p,p.path[0])<.4)p.path.shift();target=p.path[0]||p;}
  let dx=target.x-p.x,dz=target.z-p.z;const len=Math.hypot(dx,dz);return len>.15?{x:dx/len,z:dz/len}:{x:0,z:0};
 }
 step(delta,inputs={}) {
  if(this.done)return;
  const dt=Math.min(delta,.04);this.time+=dt;this.boost=Math.max(0,this.boost-dt);
  this.spinSpeed=(.72+this.time*.028+(this.boost?1.3:0))*this.direction;
  if(this.game==='spin')this.angle+=this.spinSpeed*dt;
  for(const p of this.players) {
   p.cooldown=Math.max(0,p.cooldown-dt);p.dash=Math.max(0,p.dash-dt);p.emote=Math.max(0,p.emote-dt);
   if(!p.alive){p.jumpV-=16*dt;p.jump+=p.jumpV*dt;p.x+=p.vx*dt;p.z+=p.vz*dt;continue;}
   p.survived=this.time;
   const input=p.id<this.humans?(inputs[p.id]||{x:0,z:0}):this.bot(p,dt);
   if(input.aim&&p.id===this.master&&this.game!=='zombie')this.target={x:clamp(input.aim.x,-8,8),z:clamp(input.aim.z,-8,8)};
   if(input.action)this.action(p);
   if(p.id===this.master&&this.game!=='zombie') {
    if(p.id<this.humans) {
     if(input.aim)this.target={x:clamp(input.aim.x,-8,8),z:clamp(input.aim.z,-8,8)};
     else {this.target.x=clamp(this.target.x+(input.x||0)*10*dt,-8,8);this.target.z=clamp(this.target.z+(input.z||0)*10*dt,-8,8);}
     if(this.game==='spin'&&input.reverse&&p.reverseReady!==false){this.direction*=-1;p.reverseReady=false;this.event('reverse',p);}else if(!input.reverse)p.reverseReady=true;
    }
    continue;
   }
   let dx=input.x||0,dz=input.z||0;const len=Math.hypot(dx,dz);if(len>1){dx/=len;dz/=len;}
   const speed=(this.game==='zombie'?(p.infected?4.05:4.6):5.6)*(p.dash>0?1.9:1);
   if(p.jump>0||p.jumpV>0){p.jumpV-=19*dt;p.jump+=p.jumpV*dt;if(p.jump<=0){p.jump=0;p.jumpV=0;}}
   let vx=dx*speed+p.vx,vz=dz*speed+p.vz;p.vx*=Math.exp(-4.2*dt);p.vz*=Math.exp(-4.2*dt);
   if(this.game==='spin'&&p.jump<.4) {const radius=Math.hypot(p.x,p.z);vx+=-p.z*this.spinSpeed*.55+p.x*(.10+radius*.027)*Math.abs(this.spinSpeed);vz+=p.x*this.spinSpeed*.55+p.z*(.10+radius*.027)*Math.abs(this.spinSpeed);}
   if(this.game==='zombie')moveWithWalls(p,vx*dt,vz*dt,this.obstacles);else{p.x+=vx*dt;p.z+=vz*dt;}
   if(len>.05){p.angle=Math.atan2(dx,dz);p.walk+=dt*(p.dash>0?19:12);}else p.walk=0;
   if(this.game==='pool'&&p.jump<.12) {
    const tile=this.tiles.find(t=>t.alive&&Math.abs(t.x-p.x)<1.42&&Math.abs(t.z-p.z)<1.42);
    if(!tile)this.eliminate(p);
   }
   if(this.game==='kick'&&(Math.abs(p.x)>9||Math.abs(p.z)>9))this.eliminate(p);
   if(this.game==='spin') {
    const radius=Math.hypot(p.x,p.z);
    if(radius<1.65){p.x=p.x/(radius||1)*1.65;p.z=p.z/(radius||1)*1.65;if(!radius)p.x=1.65;}
    if(radius>8.9)this.eliminate(p);
    const d=Math.abs(wrap(Math.atan2(p.z,p.x)-this.angle));
    if(Math.min(d,Math.PI-d)<.12&&Math.hypot(p.x,p.z)>1.6&&p.jump<.65&&(p.lastHit||0)<this.time) {
     p.vx=-Math.sin(this.angle)*this.direction*17+p.x*1.1;p.vz=Math.cos(this.angle)*this.direction*17+p.z*1.1;p.lastHit=this.time+.9;this.event('bump',p);
    }
   }
  }
  if(this.game!=='zombie') {
   const runners=this.players.filter(p=>p.alive&&p.id!==this.master);
   for(let a=0;a<runners.length;a++)for(let b=a+1;b<runners.length;b++){const p=runners[a],q=runners[b],d=distance(p,q);if(d<.8&&Math.abs(p.jump-q.jump)<.7){const x=(p.x-q.x)/(d||1),z=(p.z-q.z)/(d||1),push=(.8-d)*.5;p.x+=x*push;p.z+=z*push;q.x-=x*push;q.z-=z*push;}}
  }
  if(this.game==='zombie') {
   for(const p of this.players.filter(p=>!p.infected)) {
    const z=this.players.find(q=>q.infected&&distance(q,p)<1.25&&lineClear(q,p,this.obstacles,.1));
    p.infection=z?Math.min(1,p.infection+dt/0.52):Math.max(0,p.infection-dt*.85);
    if(p.infection>=1){p.infected=true;p.outAt=this.time;p.infection=0;p.dash=0;p.cooldown=1;this.event('infect',p,{by:z.id});}
   }
  }
  for(const h of this.hazards) {
   h.age+=dt;
   if(h.type==='splash'&&h.age>=h.delay&&!h.hit) {
    h.hit=true;this.tiles[h.tile].alive=false;this.event('splash',null,{x:h.x,z:h.z});
    for(const p of this.players)if(p.alive&&p.id!==this.master&&distance(p,h)<2.3&&p.jump<.6){p.vx=(p.x-h.x||.3)*5;p.vz=(p.z-h.z||.3)*5;}
   }
   if(h.type==='boot'&&h.age>=h.delay) {
    const old=h.z;h.z=-11+(h.age-h.delay)*17;
    for(const p of this.players)if(p.alive&&p.id!==this.master&&Math.abs(p.x-h.x)<1.8&&p.z>=old-1.5&&p.z<=h.z+1.5&&p.jump<.8&&!h['hit'+p.id]){h['hit'+p.id]=true;p.vz=24;p.vx=(p.x-h.x)*4;this.event('bump',p);}
   }
  }
  this.hazards=this.hazards.filter(h=>h.age<3.1);
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
