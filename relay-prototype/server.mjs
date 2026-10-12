import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import Fastify from 'fastify';
import staticFiles from '@fastify/static';
import {server as wisp,logging} from '@mercuryworkshop/wisp-js/server';
import {scramjetPath} from '@mercuryworkshop/scramjet/path';
import {libcurlPath} from '@mercuryworkshop/libcurl-transport';
import {baremuxPath} from '@mercuryworkshop/bare-mux/node';
import {hosts,validUpgrade} from './policy.mjs';
const port=Number(process.env.PORT||4219),started=Date.now(),stats={up:0,down:0,connections:0,active:0};
logging.set_level(logging.WARN);
Object.assign(wisp.options,{hostname_whitelist:hosts,port_whitelist:[443],allow_udp_streams:false,allow_direct_ip:false,allow_private_ips:false,allow_loopback_ips:false,parse_real_ip:false,stream_limit_total:100,stream_limit_per_host:24,dns_result_order:'ipv4first'});
const app=Fastify({serverFactory:handler=>createServer(handler)});
app.server.on('upgrade',(req,socket,head)=>{
 if(!validUpgrade(req,port)||stats.active>=4){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}
 stats.connections++;stats.active++;const read=socket.bytesRead,written=socket.bytesWritten;
 socket.on('close',()=>{stats.up+=socket.bytesRead-read;stats.down+=socket.bytesWritten-written;stats.active--;sockets.delete(socket);});
 sockets.set(socket,{read,written});wisp.routeRequest(req,socket,head);
});
const sockets=new Map();
app.addHook('onRequest',async(req,reply)=>{if(req.headers.host!==`127.0.0.1:${port}`)return reply.code(403).send('Invalid host');});
app.addHook('onSend',async(req,reply,payload)=>{reply.header('Cross-Origin-Opener-Policy','same-origin').header('Cross-Origin-Embedder-Policy','require-corp').header('Cache-Control','no-store');return payload;});
app.get('/health',async()=>({ok:true,mode:'local-prototype'}));
app.get('/metrics',async()=>{let up=stats.up,down=stats.down;for(const [s,b]of sockets){up+=s.bytesRead-b.read;down+=s.bytesWritten-b.written;}return {...stats,up,down,seconds:Math.round((Date.now()-started)/1000),rss:process.memoryUsage().rss,cpu:process.cpuUsage(),unit:'bytes on relay WebSocket including protocol overhead; excludes static assets'};});
for(const [root,prefix] of [[fileURLToPath(new URL('./public/',import.meta.url)),'/'],[scramjetPath,'/scram/'],[libcurlPath,'/libcurl/'],[baremuxPath,'/baremux/']])await app.register(staticFiles,{root,prefix,decorateReply:prefix==='/',list:false});
process.on('SIGINT',()=>{for(const s of sockets.keys())s.destroy();app.close();});
await app.listen({host:'127.0.0.1',port});console.log(`AdHub relay local: http://127.0.0.1:${port}`);
