import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {createPoolPiece,World} from '../dist/world.js';
import {makePool,POOL,Match,poolPieceY,poolAim,poolShotPosition} from '../dist/simulation.js';

test('actual 3D pool solids stay above water throughout bobbing and retain concave holes',()=>{
 const {pieces,tiles}=makePool(),root=new T.Group();
 for(const piece of pieces){
  const g=createPoolPiece(root,piece),body=g.children[0];body.geometry.computeBoundingBox();
  assert.ok(body.geometry.boundingBox.max.z-body.geometry.boundingBox.min.z>.79,'thick solid walls');
  assert.ok(body.material[1].color.r<body.material[0].color.r,'contrasting side material');
  for(let time=0;time<=30;time+=.125){
   g.position.y=poolPieceY(piece,time);root.updateMatrixWorld(true);
   for(const cell of tiles){
    const ray=new T.Raycaster(new T.Vector3(cell.x,4,cell.z),new T.Vector3(0,-1,0));
    const hits=ray.intersectObject(body);
    if(cell.piece===piece.id){assert.ok(hits.length);assert.ok(hits[0].point.y>.57,'water at y=0 must never occlude a surviving top');}
    else assert.equal(hits.length,0,'no geometry across holes or adjacent pieces');
   }
  }
  piece.alive=false;piece.sunkAt=10;
  assert.ok(Math.abs(poolPieceY(piece,10)-poolPieceY({...piece,alive:true},10))<1e-10,'sinking starts continuously');
  assert.ok(poolPieceY(piece,10.3)+POOL.thickness+POOL.bevel<0,'destroyed piece submerges fully');
  body.geometry.dispose();
 }
});
test('master and launcher are below the pool; pull direction stays intuitive in PC and phone cameras',()=>{
 const match=new Match({game:'pool',master:0,humans:8}),gm=match.players[0];
 assert.ok(gm.z>POOL.launcherZ);assert.equal(gm.y,0);assert.equal(gm.angle,Math.PI);
 assert.ok(match.players.slice(1).every(p=>p.y===POOL.surfaceY));
 for(const [width,height] of [[1440,900],[390,844],[844,390]]){
  const view={camera:new T.OrthographicCamera(),game:'pool'};
  World.prototype.cameraAt.call(view,{x:0,z:-1},width,height);view.camera.updateMatrixWorld();
  const project=p=>new T.Vector3(p.x,p.y||0,p.z).project(view.camera);
  const origin=poolShotPosition({x:0,z:0,age:0,delay:1});
  assert.ok(project(gm).y<project({x:0,z:8.4}).y,'GM is on the bottom side');
  assert.ok(Math.abs(project(gm).x)<1&&Math.abs(project(gm).y)<1,'GM stays in frame');
  for(const pullX of [-.6,.6]){
   const aim=poolAim({x:pullX,y:.6});
   const shot=poolShotPosition({...aim,age:.5,delay:1});
   assert.ok((project(shot).x-project(origin).x)*pullX<0,'release travels opposite the horizontal drag');
  }
  const near=poolAim({x:0,y:.2}),far=poolAim({x:0,y:.9});
  assert.ok(project(near).y<project(far).y,'stronger downward pull travels farther up the pool');
 }
});
