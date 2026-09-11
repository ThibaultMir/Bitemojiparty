import {defineConfig} from 'vite';
import {readFileSync} from 'node:fs';

export default defineConfig({
 root:'dist',
 server:{host:'0.0.0.0',allowedHosts:['terminal.local']},
 plugins:[{
  name:'local-controls-tests',
  configureServer(server){
   server.middlewares.use((req,res,next)=>{
    if(req.url?.split('?')[0]!=='/__tests/controls')return next();
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.end(readFileSync(new URL('./tests/browser-controls.html',import.meta.url),'utf8'));
   });
  },
 }],
});
