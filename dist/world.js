import * as T from './vendor/three.module.js';
import {COLORS, MANSION, SPIN, POOL, poolOutline, makeMansion, distance, lineClear, wrap, poolShotPosition, kickPose} from './simulation.js';
const matCache=new Map();
const sight={center:{value:new T.Vector2()},radius:{value:1000},enabled:{value:0},fog:{value:new T.Color(.055,.068,.13)}};
function material(color,extra={}) {
 const key=color+JSON.stringify(extra);if(matCache.has(key))return matCache.get(key);
 const m=new T.MeshStandardMaterial({color,roughness:.78,metalness:0,...extra});
 m.onBeforeCompile=s=>{
  s.uniforms.sightCenter=sight.center;s.uniforms.sightRadius=sight.radius;s.uniforms.sightEnabled=sight.enabled;s.uniforms.sightFog=sight.fog;
  s.vertexShader='varying vec3 sightWorld;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvec4 sw=vec4(transformed,1.0);\n#ifdef USE_INSTANCING\nsw=instanceMatrix*sw;\n#endif\nsightWorld=(modelMatrix*sw).xyz;');
  s.fragmentShader='varying vec3 sightWorld; uniform vec2 sightCenter; uniform float sightRadius; uniform float sightEnabled; uniform vec3 sightFog;\n'+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <dithering_fragment>','#include <dithering_fragment>\nfloat obscured=smoothstep(sightRadius*0.60,sightRadius,length(sightWorld.xz-sightCenter)); gl_FragColor.rgb=mix(gl_FragColor.rgb,sightFog,obscured*sightEnabled);');
 };
 matCache.set(key,m);return m;
}
const geometries={sphere:new T.SphereGeometry(1,16,12),box:new T.BoxGeometry(1,1,1),cylinder:new T.CylinderGeometry(1,1,1,24),capsule:new T.CapsuleGeometry(.5,1,4,12)};
function mesh(parent,geo,color,x,y,z,sx=1,sy=1,sz=1,extra={}) {const m=new T.Mesh(geo,material(color,extra));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.receiveShadow=true;parent.add(m);return m;}
const box=(p,c,x,y,z,w,h,d)=>mesh(p,geometries.box,c,x,y,z,w,h,d);
const orb=(p,c,x,y,z,w,h=w,d=w)=>mesh(p,geometries.sphere,c,x,y,z,w,h,d);
const cyl=(p,c,x,y,z,r,h)=>mesh(p,geometries.cylinder,c,x,y,z,r,h,r);
function pill(p,c,x,y,z,w,h,d) {return mesh(p,geometries.capsule,c,x,y,z,w,h/2,d);}
function torus(p,c,x,y,z,r,t,rx=Math.PI/2) {const m=mesh(p,new T.TorusGeometry(r,t,8,32),c,x,y,z);m.rotation.x=rx;return m;}
function group(parent,x=0,y=0,z=0) {const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g;}
function textSprite(text,color='#ffffff',size=1) {
 const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.font='900 56px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.strokeStyle='#202037';ctx.lineWidth=9;ctx.lineJoin='round';ctx.strokeText(text,256,64);ctx.fillStyle=color;ctx.fillText(text,256,64);
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const m=new T.SpriteMaterial({map:tex,transparent:true,depthTest:false});const s=new T.Sprite(m);s.scale.set(3.8*size,.95*size,1);return s;
}
function shadow(parent,r=.55) {const m=new T.Mesh(new T.CircleGeometry(r,20),new T.MeshBasicMaterial({color:0x1a1634,transparent:true,opacity:.18,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.y=.025;parent.add(m);return m;}
const skins=['#f1b485','#b97650','#ffd0a1','#d99768','#8e583b','#efc099'];
export class Avatar {
 constructor(parent,id,color,name,skin=0,hair=0) {
  this.id=id;this.root=group(parent);this.shadow=shadow(this.root);this.body=group(this.root);this.head=group(this.body,0,1.65,0);this.head.rotation.z=.03;
  this.skin=skin;this.color=color;this.hairType=hair;this.name=name;
  const skinColor=skins[skin%skins.length];this.skinMeshes=[];
  const sk=(x,y,z,w,h=w,d=w)=>{const m=orb(this.head,skinColor,x,y,z,w,h,d);this.skinMeshes.push(m);return m;};
  sk(0,.18,0,.59,.67,.5);sk(-.59,.10,0,.12,.18,.10);sk(.59,.10,0,.12,.18,.10);
  sk(0,.08,.49,.115,.13,.14);
  for(const x of [-.22,.22]) {
   orb(this.head,'#fffaf2',x,.25,.437,.16,.195,.09);orb(this.head,'#333143',x+.022,.24,.511,.07,.093,.035);orb(this.head,'#ffffff',x+.042,.28,.535,.026);
   const brow=box(this.head,'#4a2c29',x,.48,.44,.25,.06,.065);brow.rotation.z=x>0?-.13:.13;
  }
  const smile=orb(this.head,'#572e35',0,-.16,.454,.225,.105,.07);orb(this.head,'#fff9df',0,-.13,.49,.17,.042,.035);
  this.hairGroup=group(this.head);const hairColors=['#483032','#6e432c','#f2c64d','#1f2436'];const hc=hairColors[hair%4];
  orb(this.hairGroup,hc,0,.70,-.09,.59,.27,.49);
  for(let j=0;j<4;j++){const q=orb(this.hairGroup,hc,-.4+j*.24,.70+Math.sin(j)*.08,.20,.19,.25,.19);q.rotation.z=-.4;}
  if(hair===1){orb(this.hairGroup,hc,.44,.30,-.26,.25,.6,.28);orb(this.hairGroup,hc,-.44,.30,-.26,.25,.6,.28);}
  if(hair===2){const q=orb(this.hairGroup,hc,.15,.97,-.08,.25,.3,.26);q.rotation.z=-.4;}
  this.shirt=pill(this.body,color,0,1.05,0,.70,.86,.51);orb(this.body,'#ffffff',0,1.23,.28,.13,.13,.035);
  this.arms=[];this.legs=[];
  for(const dir of [-1,1]) {
   const arm=group(this.body,dir*.46,1.35,0);this.arms.push(arm);pill(arm,color,0,-.16,0,.23,.43,.24);const hand=orb(arm,skinColor,0,-.46,.015,.145,.19,.15);this.skinMeshes.push(hand);
   const leg=group(this.body,dir*.22,.65,0);this.legs.push(leg);pill(leg,'#34344c',0,-.21,0,.28,.47,.3);orb(leg,'#fff9e9',0,-.48,.09,.22,.145,.31);
  }
  this.tag=textSprite(name,id===0?'#fff28c':'#ffffff',.53);this.tag.position.set(0,3.03,0);this.root.add(this.tag);
  this.infectionBar=group(this.root,0,3.55,0);box(this.infectionBar,'#332d54',0,0,0,1.55,.16,.12);this.infectionFill=box(this.infectionBar,'#b1ee75',0,0,.07,1.45,.1,.06);this.infectionBar.visible=false;
  this.ring=torus(this.root,id===0?'#fff57b':'#ffffff',0,.035,0,.66,.035);this.ring.visible=id===0;
  this.crown=group(this.head,0,1.0,0);cyl(this.crown,'#ffce43',0,0,0,.28,.16);for(let i=0;i<5;i++){const a=i/5*Math.PI*2;orb(this.crown,'#fff291',Math.cos(a)*.27,.18,Math.sin(a)*.27,.055);box(this.crown,'#ffce43',Math.cos(a)*.24,.08,Math.sin(a)*.24,.065,.24,.065);}this.crown.visible=false;
  this.skinMeshes[0].castShadow=true;this.shirt.castShadow=true;this.infected=false;this.dance=0;
 }
 setZombie(zombie){if(this.infected===zombie)return;this.infected=zombie;for(const m of this.skinMeshes)m.material=material(zombie?'#96d765':skins[this.skin%skins.length]);}
 update(p,time,lobby=false,dance=0) {
  const fallLimit=p.rimAngle===undefined?-5:-20;
  this.root.position.set(p.x,(p.y||0)+Math.max(fallLimit,p.jump||0),p.z);this.root.visible=p.alive!==false||(p.jump||0)>fallLimit;
  this.infectionBar.visible=!p.infected&&(p.infection||0)>0;this.infectionFill.scale.x=1.45*(p.infection||0);this.infectionFill.position.x=-.725+.725*(p.infection||0);
  this.setZombie(!!p.infected);this.body.rotation.y+=wrap((p.angle||0)-this.body.rotation.y)*.18;
  const moving=p.walk||0;let sway=moving?Math.sin(moving):Math.sin(time*2+p.id)*.12;
  this.body.position.y=moving?Math.abs(Math.sin(moving))*.085:Math.sin(time*2+p.id)*.025;
  this.body.rotation.z=moving?Math.sin(moving)*.045:0;
  this.arms.forEach((a,i)=>{a.rotation.x=sway*(i?-.65:.65);a.rotation.z=(i?-.14:.14);});this.legs.forEach((l,i)=>l.rotation.x=sway*(i?.65:-.65));
  this.head.rotation.z=Math.sin(time*2+p.id)*.04;
  if(this.infected){this.arms.forEach(a=>a.rotation.x=-1.25);this.body.rotation.z=Math.sin(time*4+p.id)*.09;}
  if(dance||p.emote){this.body.position.y=Math.abs(Math.sin(time*6))*.22;this.body.rotation.z=Math.sin(time*6)*.15;this.arms.forEach((a,i)=>{a.rotation.z=(i?-1:1)*(1.7+Math.sin(time*6+i)*.45);});this.head.rotation.z=Math.sin(time*6)*.15;if(dance===2)this.body.rotation.y=time*3;if(dance===3){const beat=Math.floor(time*4);this.body.rotation.y=(beat%4)*Math.PI/2;this.body.rotation.z=0;this.arms.forEach((a,i)=>{a.rotation.z=(i?-1:1)*(beat%2?1.57:.5);a.rotation.x=beat%2?0:-1.57;});this.head.rotation.z=beat%2?.22:-.22;}}
  this.shadow.visible=p.alive!==false&&(p.jump||0)<.5;this.crown.visible=!!p.master&&!this.infected;
  this.shadow.rotation.y=p.rimAngle||0;this.ring.rotation.y=p.rimAngle||0;
 }
}
function tiles(parent,cols,rows,size,colors,y=0) {
 const count=cols*rows,ms=colors.map(c=>new T.InstancedMesh(geometries.box,material(c),Math.ceil(count/colors.length)+1));const index=colors.map(()=>0),dummy=new T.Object3D();
 for(let z=0;z<rows;z++)for(let x=0;x<cols;x++){const i=(x+z)%colors.length;dummy.position.set((x-(cols-1)/2)*size,y,(z-(rows-1)/2)*size);dummy.scale.set(size-.025,.12,size-.025);dummy.updateMatrix();ms[i].setMatrixAt(index[i]++,dummy.matrix);}
 ms.forEach((m,i)=>{m.count=index[i];m.receiveShadow=true;parent.add(m);});
}
function palm(parent,x,z,scale=1) {
 const g=group(parent,x,0,z);g.scale.setScalar(scale);const trunk=cyl(g,'#b97653',0,1.75,0,.18,3.5);trunk.rotation.z=.13;
 for(let i=0;i<6;i++){const a=i*Math.PI/3;const leaf=orb(g,i%2?'#39b28d':'#58d3a0',Math.cos(a)*.8,3.6,Math.sin(a)*.8,.9,.14,.38);leaf.rotation.y=-a;leaf.rotation.z=.22;}
 orb(g,'#a36b43',.15,3.3,0,.22);
}
function speaker(parent,x,z) {const g=group(parent,x,0,z);box(g,'#2e3152',0,1.2,0,1.4,2.5,1);for(const y of [.65,1.7]){const c=cyl(g,'#535474',0,y,.55,.46,.1);c.rotation.x=Math.PI/2;orb(g,'#282a40',0,y,.63,.23,.23,.08);}return g;}
function ghost(parent,x,z) {const g=group(parent,x,2.4,z);orb(g,'#c6f8de',0,0,0,.6,.8,.45);for(let i=0;i<3;i++)orb(g,'#c6f8de',-.37+i*.37,-.55,0,.22,.3,.38);for(const a of [-.2,.2])orb(g,'#38456b',a,.12,.4,.09,.15,.04);orb(g,'#38456b',0,-.14,.43,.08,.10,.025);return g;}
function pumpkin(parent,x,z,scale=1) {const g=group(parent,x,.5*scale,z);g.scale.setScalar(scale);for(let i=0;i<7;i++){const a=i/7*Math.PI*2;orb(g,i%2?'#f8a044':'#f18b39',Math.cos(a)*.17,0,Math.sin(a)*.17,.34,.45,.34);}cyl(g,'#526b37',0,.48,0,.07,.2);for(const a of [-.17,.17])orb(g,'#49324e',a,.08,.44,.06,.09,.02);box(g,'#49324e',0,-.13,.44,.22,.06,.025);return g;}
function furniture(parent,o) {
 const g=group(parent,o.x,0,o.z);const gold='#e6b76d',wood='#755580';
 if(o.kind==='wall') {box(g,'#575078',0,.65,0,o.w,1.3,o.d);box(g,'#ae8792',0,1.35,0,o.w+.08,.13,o.d+.08);box(g,'#332d54',0,.13,0,o.w,.25,o.d+.07);}
 if(o.kind==='sofa') {box(g,'#734ba4',0,.45,0,o.w,.7,o.d);pill(g,'#9464b8',0,1,-.5,o.w,1,.65);for(const x of [-1.7,1.7])orb(g,'#a975c0',x,.72,0,.4,.55,.85);for(const x of [-.9,.4]){const p=orb(g,x<0?'#d69bb0':'#b6db83',x,.85,.2,.55,.18,.54);p.rotation.z=x*.1;}}
 if(o.kind==='table') {for(const x of [-1.3,1.3])for(const z of [-.8,.8])box(g,wood,x,.45,z,.22,.9,.22);box(g,'#b58482',0,1,0,o.w,.18,o.d);box(g,'#725d91',0,1.12,0,1.3,.04,2.4);for(const x of [-.8,.8]){cyl(g,gold,x,1.24,0,.19,.09);cyl(g,'#fff0b9',x,1.51,0,.07,.5);orb(g,'#ffd45d',x,1.85,0,.07,.15,.07);}}
 if(o.kind==='cabinet') {box(g,'#69567b',0,1.1,0,o.w,2.2,o.d);box(g,gold,0,2.28,0,o.w+.15,.16,o.d+.1);for(const y of [.5,1.1,1.7]){box(g,'#90738e',0,y,o.d/2+.02,o.w-.18,.45,.06);orb(g,gold,0,y,o.d/2+.1,.075);}g.rotation.z=.045;}
 if(o.kind==='coffin') {box(g,'#4e416a',0,.42,0,o.w,.8,o.d);box(g,'#9a7487',0,.87,0,o.w+.12,.14,o.d+.12);box(g,gold,0,.96,-.25,.12,.05,1.35);box(g,gold,0,.96,-.55,.7,.05,.13);}
 if(o.kind==='cauldron') {orb(g,'#3c3959',0,.68,0,.85,.7,.85);cyl(g,'#a7ed6b',0,1.13,0,.64,.04);torus(g,'#625476',0,1.12,0,.73,.12);for(const a of [-1,1])orb(g,'#3c3959',a*.6,.15,.2,.18);orb(g,'#b4f293',.2,1.4,0,.13);}
 return g;
}
export class World {
 constructor(canvas) {
  this.renderer=new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.2;
  this.scene=new T.Scene();this.camera=new T.OrthographicCamera(-20,20,15,-15,.1,150);this.scene.add(new T.HemisphereLight('#e9edff','#66507b',2.5));this.sun=new T.DirectionalLight('#fff1cf',3);this.sun.position.set(-12,24,12);this.sun.castShadow=true;this.sun.shadow.mapSize.set(1024,1024);Object.assign(this.sun.shadow.camera,{left:-26,right:26,top:26,bottom:-26});this.sun.shadow.bias=-.001;this.scene.add(this.sun);
  this.root=group(this.scene);this.characters=group(this.scene);this.dynamic=group(this.scene);this.avatars=[];this.follow=new T.Vector3();this.ghosts=[];this.game='lobby';this.width=innerWidth;this.height=innerHeight;this.resize();
 }
 resize(){this.width=innerWidth;this.height=innerHeight;this.renderer.setSize(this.width,this.height,false);}
 clear() {
  const shared=new Set(Object.values(geometries));
  for(const g of [this.root,this.characters,this.dynamic]) {g.traverse(o=>{if(o.geometry&&!shared.has(o.geometry))o.geometry.dispose();if(o.isSprite){o.material.map?.dispose();o.material.dispose();}});g.clear();}
  this.avatars=[];this.ghosts=[];this.tileMeshes=[];this.hazardMeshes=new Map();this.spinGroup=null;
 }
 build(game,roster,match=null,skin=0,hair=0) {
  this.clear();this.game=game;this.match=match;const g=this.root;
  this.scene.background=new T.Color(game==='zombie'?'#171e35':game==='pool'?'#9edddd':game==='kick'?'#a4cce7':game==='spin'?'#b3a1ec':'#848be0');this.scene.fog=new T.Fog(this.scene.background,65,110);
  this.sun.intensity=game==='zombie'?1.5:3;this.renderer.toneMappingExposure=game==='zombie'?1.3:1.2;
  if(game==='lobby') {
   cyl(g,'#6f62af',0,-.8,0,10.5,1.6);cyl(g,'#e4cba9',0,-.03,0,10.3,.12);
   const floor=group(g,0,.08,0);tiles(floor,8,8,1.55,['#67d2ce','#fa97b8','#e4b4ec','#f2d478']);
   torus(g,'#ffffb3',0,-.4,0,10.55,.08);
   for(const x of [-9,9])for(const z of [-5,5])palm(g,x,z,1.4);
   speaker(g,-5,-6.7);speaker(g,5,-6.7);box(g,'#5b5192',0,.45,-7.3,7,.8,1.4);box(g,'#c0b2eb',0,.91,-7.3,7.3,.16,1.6);
   for(const x of [-2,0,2]){const disk=cyl(g,'#33324c',x,1.02,-7.3,.55,.05);cyl(g,'#ed91c1',x,1.06,-7.3,.14,.06);}
   const sign=textSprite('PARTY TIME','#fff593',2);sign.position.set(0,5.5,-7.8);g.add(sign);
   for(let i=0;i<12;i++){const a=i/12*Math.PI*2;orb(g,COLORS[i%8],Math.cos(a)*8,4+Math.sin(i)*.4,Math.sin(a)*8,.35,.46,.35);}
   const disco=orb(g,'#dedbf5',0,6,-2,.8);disco.material=material('#e8e7fa',{metalness:.7,roughness:.3});
   for(let i=0;i<8;i++){const a=i*Math.PI/4;box(g,'#6c64b3',Math.cos(a)*.5,6+Math.sin(a)*.5,-1.37,.15,.15,.04);}
  }
  if(game==='pool') {
   box(g,'#49bccc',0,-1.05,0,34,.4,34);box(g,'#f3d9af',0,-.55,0,24,.4,24);box(g,'#4caac5',0,-.28,0,20,.35,20);box(g,'#69d3df',0,-.06,0,19.3,.12,19.3);
   const colors=['#f1be5c','#ad9ae1','#6ed8b3','#f39cc2','#78bfee','#ed9971','#98c979','#db8ed0','#e4cf76','#75d7ce'];
   for(const piece of match.pieces){
    const outline=poolOutline(piece.cells),shape=new T.Shape();
    outline.forEach(([x,z],i)=>{
     const prev=outline[(i+outline.length-1)%outline.length],next=outline[(i+1)%outline.length];
     const nx=Math.sign(z-prev[1])+Math.sign(next[1]-z),nz=-Math.sign(x-prev[0])-Math.sign(next[0]-x);
     const px=(x-3)*POOL.cell-nx*.065,pz=(z-3)*POOL.cell-nz*.065;
     if(i)shape.lineTo(px,-pz);else shape.moveTo(px,-pz);
    });shape.closePath();
    const gPiece=group(g,0,-.35,0);
    const geo=new T.ExtrudeGeometry(shape,{depth:.32,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.035,bevelThickness:.035});
    const body=mesh(gPiece,geo,colors[piece.id],0,0,0);body.rotation.x=-Math.PI/2;
    this.tileMeshes.push(gPiece);
   }
   for(const x of [-14,14])for(const z of [-12,12])palm(g,x,z,1.5);
   for(const x of [-12,12]){const chair=box(g,'#fc90b5',x,.2,0,1.5,.3,3);box(g,'#fff4d9',x,.2,3,1.5,.3,3);}
   // Slingshot on the Game Master's deck.
   cyl(g,'#87534e',-1.2,1.3,-11.8,.18,2.6);cyl(g,'#87534e',1.2,1.3,-11.8,.18,2.6);box(g,'#e8bb78',0,.45,-11.8,3.2,.25,.8);const band=box(g,'#bc7777',0,2.4,-11.8,2.5,.1,.12);
   orb(g,'#ffe36d',0,2.25,-11.6,.4);for(const z of [-6,0,6])torus(g,'#ffffff',11,.1,z,.7,.19);
  }
  if(game==='zombie') {
   box(g,'#292942',0,-.5,0,42,.85,52);tiles(g,20,25,2,['#66526a','#72586b']);
   const hall=box(g,'#894961',0,.1,0,5.2,.05,48);for(const x of [-2.5,2.5])box(g,'#c3937f',x,.13,0,.08,.02,48);
   for(const z of [-25,25]){box(g,'#504164',0,1.3,z,40,2.6,.5);box(g,'#bd8991',0,2.65,z,40,.15,.65);}
   for(const x of [-20,20]){box(g,'#504164',x,1.3,0,.5,2.6,50);box(g,'#bd8991',x,2.65,0,.65,.15,50);}
   for(const o of makeMansion())furniture(g,o);
   for(const z of [-20,-7,7,20])for(const x of [-19.7,19.7]){
    const frame=group(g,x,2,z);frame.rotation.y=x>0?-Math.PI/2:Math.PI/2;box(frame,'#c2946c',0,0,0,1.8,2,.12);box(frame,'#575376',0,0,.09,1.55,1.7,.07);orb(frame,'#b2a2c7',0,0,.18,.35,.55,.04);orb(frame,'#efdfa0',-.12,.12,.23,.055);orb(frame,'#efdfa0',.12,.12,.23,.055);
   }
   for(const [x,z] of [[-18,-23],[18,23],[-4,17],[4,-17],[-10,-12],[10,12],[-16,2],[16,-2]])pumpkin(g,x,z,.8);
   for(const [x,z] of [[-14,-11],[14,11],[0,22],[0,-22]])this.ghosts.push(ghost(g,x,z));
   for(const z of [-18,0,18]) {const rug=box(g,'#a96683',0,.14,z,4,.04,5);box(g,'#d2a281',0,.17,z,3.7,.02,.09);}
   const welcome=textSprite('BOUH !','#d6e9a8',.9);welcome.position.set(0,3.4,-24);g.add(welcome);
  }
  if(game==='kick') {
   box(g,'#b1b6c6',0,-.7,0,22,1.2,22);box(g,'#6fbb91',0,-.04,0,18,.15,18);
   for(let z=0;z<6;z++)box(g,z%2?'#70b789':'#80c597',0,.05,(z-2.5)*3,18,.05,3);
   for(const x of [-8.8,8.8])box(g,'#fcf4d7',x,.09,0,.12,.02,17.6);for(const z of [-8.8,0,8.8])box(g,'#fcf4d7',0,.09,z,17.6,.02,.12);torus(g,'#fcf4d7',0,.1,0,2,.045);
   for(const z of [-10,10]){for(const x of [-4,4])cyl(g,'#fff4dc',x,1.7,z,.14,3.4);const beam=cyl(g,'#fff4dc',0,3.4,z,.14,8);beam.rotation.z=Math.PI/2;}
   for(const x of [-13,13])for(let z=-8;z<=8;z+=4){box(g,'#a278bd',x,.6,z,3,.8,3);box(g,'#d5b0d8',x,.99,z,3.2,.18,3.2);}
   this.bootHome=this.boot(g,0,-11);this.bootHome.scale.setScalar(.85);
  }
  if(game==='spin') {
   this.spinGroup=group(g,0,SPIN.centerY,0);
   // Cylinder axis is Z: a vertical disc with a broad, continuous running tread.
   const wheel=mesh(this.spinGroup,new T.CylinderGeometry(SPIN.radius,SPIN.radius,SPIN.width,96),'#9777ce',0,0,0);wheel.rotation.x=Math.PI/2;
   for(const z of [-SPIN.width/2,SPIN.width/2]) {
    torus(this.spinGroup,'#ffe694',0,0,z,SPIN.radius,.10,0);
    torus(this.spinGroup,'#ba85da',0,0,z,6.9,.17,0);
    const hub=cyl(this.spinGroup,'#ffcd69',0,0,z,1.1,.24);hub.rotation.x=Math.PI/2;
    for(let i=0;i<12;i++) {
     const a=i*Math.PI/6;
     const spoke=box(this.spinGroup,i%2?'#ffe694':'#d4a7ff',Math.sin(a)*4.9,Math.cos(a)*4.9,z,.16,6.4,.08);spoke.rotation.z=-a;
    }
   }
   for(let i=0;i<32;i++) {
    const a=i*Math.PI/16;
    const tread=box(this.spinGroup,i%4===0?'#ffe694':'#ba85da',Math.sin(a)*(SPIN.radius+.015),Math.cos(a)*(SPIN.radius+.015),0,.17,.04,SPIN.width-.16);tread.rotation.z=-a;
   }
   // Separate suspended deck for the master; there is empty space under the wheel.
   box(g,'#6c549c',0,3.7,-6,5,.6,2.6);box(g,'#a89ccc',0,4.5,-6.8,2.6,1,1);
   for(const x of [-1.8,1.8]){const s=speaker(g,x,-6);s.position.y=4;s.scale.setScalar(.6);}
   this.spinSign=textSprite('', '#fff593',.9);this.spinSign.position.set(0,-6,4.3);g.add(this.spinSign);
  }
  roster.forEach((r,i)=>this.avatars.push(new Avatar(this.characters,i,r.color,r.name,i===0?skin:i%6,i===0?hair:i%4)));
  this.cursor=torus(this.dynamic,'#fff5a6',0,.5,0,.8,.08);this.cursor.visible=false;
  this.follow.set(match?.players[0].x||0,0,match?.players[0].z||0);
 }
 boot(parent,x,z) {const g=group(parent,x,0,z);pill(g,'#f6d982',0,2.4,0,1.8,3.4,1.7);orb(g,'#ee9d72',0,.9,.6,1.5,.9,2.2);box(g,'#79466a',0,.26,.6,2.8,.45,3.8);for(let i=0;i<3;i++)box(g,'#fff7d3',0,1.64,.3+i*.4,1.35,.10,.18);return g;}
 pointer(clientX,clientY){const n=new T.Vector2(clientX/this.width*2-1,-clientY/this.height*2+1);const ray=new T.Raycaster();ray.setFromCamera(n,this.camera);const out=new T.Vector3();return ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),0),out)?{x:out.x,z:out.z}:null;}
 cameraAt(center,width,height,game=this.game) {
  const aspect=width/height;const size=game==='spin'?Math.max(34,25/aspect):game==='zombie'?21:game==='lobby'?(aspect<.8?34:26):(aspect<.8?37:28);
  this.camera.left=-size*aspect/2;this.camera.right=size*aspect/2;this.camera.top=size/2;this.camera.bottom=-size/2;this.camera.updateProjectionMatrix();
  if(game==='spin'){this.camera.position.set(0,12,34);this.camera.lookAt(0,-4,0);}
  else{this.camera.position.set(center.x,24,center.z+22);this.camera.lookAt(center.x,0,center.z);}
 }
 update(match,roster,time,{dance=0,two=false,lobby=false}={}) {
  const ps=match?match.players:roster;
  this.avatars.forEach((a,i)=>a.update({...ps[i],master:match&&i===match.master},time,lobby,dance));
  if(this.game==='lobby')this.avatars.forEach((a,i)=>{if(i>0)a.update({...ps[i],emote:1},time,true,i%2+1);});
  this.ghosts.forEach((g,i)=>{g.position.y=2.4+Math.sin(time*1.8+i)*.3;g.rotation.z=Math.sin(time+i)*.1;});
  if(match) {
   if(this.game==='pool')this.tileMeshes.forEach((g,i)=>{const p=match.pieces[i];g.position.y=p.alive?-.35+Math.sin(time*2+i)*.02:Math.max(-3,g.position.y-.09);g.visible=g.position.y>-2.8;});
   if(this.game==='spin'&&this.spinGroup){
    this.spinGroup.rotation.z=-match.angle;
    if(this.spinSign.userData.direction!==match.direction){
     this.spinSign.material.map.dispose();this.spinSign.material.dispose();this.root.remove(this.spinSign);
     this.spinSign=textSprite(match.direction>0?'ROTATION →':'← ROTATION','#fff593',.9);
     this.spinSign.position.set(0,-6,4.3);this.spinSign.userData.direction=match.direction;this.root.add(this.spinSign);
    }
   }
   this.cursor.visible=match.master<match.humans&&this.game==='kick';this.cursor.position.set(match.target.x,.6,this.game==='kick'?0:match.target.z);this.cursor.scale.setScalar(1+Math.sin(time*8)*.1);
   if(this.game==='kick') {this.bootHome.position.x=match.target.x;this.bootHome.visible=!match.hazards.some(h=>h.type==='boot');}
   const alive=new Set(match.hazards);
   for(const [h,g] of this.hazardMeshes)if(!alive.has(h)){this.dynamic.remove(g);g.traverse(o=>{if(o.geometry&&!Object.values(geometries).includes(o.geometry))o.geometry.dispose();});this.hazardMeshes.delete(h);}
   for(const h of match.hazards) {
    let g=this.hazardMeshes.get(h);
    if(!g){g=group(this.dynamic,h.x,.1,h.z);if(h.type==='splash'){const splash=group(g);torus(splash,'#ffffff',0,.08,0,1.3,.07);torus(splash,'#9ff4ff',0,.08,0,.8,.09);g.userData.splash=splash;const toy=group(g);orb(toy,'#ffd564',0,0,0,.7);orb(toy,'#fff7e8',0,.15,.55,.46,.46,.2);orb(toy,'#78d9dc',0,-.3,-.45,.5,.28,.3);g.userData.toy=toy;}
     else {box(g,'#fb7779',0,0,0,3.2,.05,19);const boot=this.boot(g,0,-11);g.userData.boot=boot;g.userData.leg=box(g,'#98a2b6',0,1.4,-11,.7,.7,1);cyl(g,'#675676',0,.8,-11,1.2,1.6);}
     this.hazardMeshes.set(h,g);}
    if(h.type==='splash'){g.position.set(h.x,.3,h.z);const shot=poolShotPosition(h);g.userData.toy.position.set(shot.x-h.x,shot.y-.3,shot.z-h.z);g.userData.toy.rotation.x=h.age*7;g.userData.toy.visible=h.age<h.delay;g.visible=h.age<h.delay+.45;g.userData.splash.visible=h.age>=h.delay;g.userData.splash.scale.setScalar(1+Math.max(0,h.age-h.delay)*3);}
    else{g.position.set(h.x,.13,0);g.children[0].visible=h.age<h.delay;const pose=kickPose(h);g.userData.boot.position.z=pose.z;g.userData.boot.rotation.x=h.age<h.delay?-.3*Math.sin(h.age/h.delay*Math.PI):0;g.userData.leg.position.z=(-11+pose.z)/2;g.userData.leg.scale.z=Math.max(.5,pose.z+11);}
   }
  }
  const renderView=(p,x,width,split=false)=>{
   if(this.game==='zombie') {
    sight.enabled.value=1;sight.center.value.set(p.x,p.z);sight.radius.value=MANSION.vision;
    const center=new T.Vector3(p.x,0,p.z);if(!split){this.follow.lerp(center,.10);center.copy(this.follow);}this.cameraAt(center,width,this.height);
    this.avatars.forEach((a,i)=>{const q=ps[i];a.root.visible=q.alive!==false&&distance(p,q)<MANSION.vision&&(i===p.id||lineClear(p,q,match.obstacles,.1));});
   } else {
    sight.enabled.value=0;const desktop=this.width/this.height>1.1;const center={x:this.game==='lobby'&&desktop?-5:0,z:this.game==='lobby'?(desktop?0:6):-1};this.cameraAt(center,width,this.height);
   }
   this.renderer.setViewport(x,0,width,this.height);this.renderer.setScissor(x,0,width,this.height);this.renderer.render(this.scene,this.camera);
  };
  if(two&&this.game==='zombie'&&match) {this.renderer.setScissorTest(true);renderView(ps[0],0,this.width/2,true);renderView(ps[1],this.width/2,this.width/2,true);this.renderer.setScissorTest(false);}
  else renderView(ps[0],0,this.width);
 }
 photo(){return this.renderer.domElement.toDataURL('image/png');}
}
