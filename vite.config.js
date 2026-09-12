import {defineConfig} from 'vite';
import {attachLocalRooms} from './server/local.js';
import {readFileSync} from 'node:fs';

export default defineConfig({
 root:'dist',
 server:{host:'0.0.0.0',allowedHosts:['terminal.local']},
 plugins:[{
  name:'local-controls-tests',
  configureServer(server){
   const rooms=attachLocalRooms(server.httpServer);server.middlewares.use(rooms.handler);server.httpServer.once('close',()=>rooms.close());
   server.middlewares.use((req,res,next)=>{
    const path=req.url?.split('?')[0];
    // Full interface + real room transport, with only WebGL replaced. Never served in production.
    if(path==='/__tests/online'){
     res.setHeader('Content-Type','text/html; charset=utf-8');
     return res.end(readFileSync(new URL('./dist/index.html',import.meta.url),'utf8').replace('<head>','<head><base href="/">').replace('src="./app.js"','src="/__tests/app.js"'));
    }
    if(path==='/__tests/app.js'){
     res.setHeader('Content-Type','text/javascript');
     return res.end(readFileSync(new URL('./dist/app.js',import.meta.url),'utf8').replaceAll("from './","from '/").replace("import('./world.js')","import('/__tests/world.js')"));
    }
    if(path==='/__tests/world.js'){
     res.setHeader('Content-Type','text/javascript');
     return res.end('export class World {build(){} update(){} resize(){} pointer(){return {x:0,z:0}}}');
    }
    if(req.url?.split('?')[0]!=='/__tests/controls')return next();
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.end(readFileSync(new URL('./tests/browser-controls.html',import.meta.url),'utf8'));
   });
  },
 }],
});
