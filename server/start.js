import {startServer} from './node-server.js';
const server=await startServer({host:'0.0.0.0',port:Number(process.env.PORT||3000),database:process.env.ROOM_DATABASE||'data/rooms.sqlite',origin:process.env.APP_ORIGIN||null,maxRooms:Number(process.env.MAX_ROOMS||64),trustProxy:process.env.TRUST_PROXY==='1'});
console.log('Bitemoji Party écoute sur le port '+(process.env.PORT||3000));
let stopping=false;async function stop(){if(stopping)return;stopping=true;await server.close();process.exit(0);}process.on('SIGTERM',stop);process.on('SIGINT',stop);
