import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import Fastify from 'fastify';
import staticFiles from '@fastify/static';
import {CampaignStore,FlowError} from './campaigns.mjs';
export async function installFlow(tv,{tvPort=4219,partnerPort=4218}={}){
 const directory=new URL('./.data/',import.meta.url);mkdirSync(directory,{recursive:true});const keyPath=new URL('tv-key',directory);if(!existsSync(keyPath))writeFileSync(keyPath,randomBytes(32),{flag:'wx',mode:0o600});
 const store=new CampaignStore(fileURLToPath(new URL('campaigns.sqlite',directory)),readFileSync(keyPath),{origin:`http://127.0.0.1:${tvPort}`});
 const partner=Fastify({bodyLimit:3*1024*1024});const origin=`http://127.0.0.1:${partnerPort}`;
 const errorHandler=(error,req,reply)=>reply.code(error instanceof FlowError?error.status:error.statusCode===413?413:500).send({error:error instanceof FlowError?error.message:error.statusCode===413?'A imagem deve ter até 2 MB.':'Não foi possível concluir. Tente novamente.'});
 partner.setErrorHandler(errorHandler);tv.setErrorHandler(errorHandler);
 partner.addHook('onRequest',async(req,reply)=>{if(req.headers.host!==`127.0.0.1:${partnerPort}`||(['POST','PUT','DELETE'].includes(req.method)&&req.headers.origin!==origin))return reply.code(403).send({error:'Acesso inválido.'});});
 partner.addHook('onSend',async(req,reply,payload)=>{reply.header('Cache-Control','no-store').header('X-Frame-Options','DENY').header('Referrer-Policy','no-referrer');return payload;});
 partner.get('/api/orders',async()=>({orders:store.list()}));
 partner.post('/api/orders',async(req,reply)=>reply.code(201).send(store.create(req.body||{})));
 partner.post('/api/orders/:id/decision',async req=>store.decide(req.params.id,req.body||{}));
 partner.post('/api/orders/:id/revoke',async req=>store.revoke(req.params.id));
 partner.get('/api/orders/:id/art',async(req,reply)=>{const art=store.preview(req.params.id);return reply.type(art.mime).header('X-Content-Type-Options','nosniff').send(Buffer.from(art.bytes));});
 partner.get('/',async(req,reply)=>reply.redirect('/site/'));
 partner.get('/parceiro.html',async(req,reply)=>reply.type('text/html').send(readFileSync(new URL('./partner/index.html',import.meta.url))));
 await partner.register(staticFiles,{root:fileURLToPath(new URL('./site/',import.meta.url)),prefix:'/site/',decorateReply:false,list:false});
 await partner.register(staticFiles,{root:fileURLToPath(new URL('./partner/',import.meta.url)),list:false});
 const token=req=>req.headers.authorization?.replace(/^Bearer /,'');
 tv.get('/api/tv/manifest',async req=>store.manifest(token(req)));
 tv.get('/api/tv/art',async(req,reply)=>{const art=store.asset(token(req));return reply.type(art.mime).header('X-Content-Type-Options','nosniff').send(Buffer.from(art.bytes));});
 tv.addHook('onClose',async()=>{await partner.close();store.close();});
 await partner.listen({host:'127.0.0.1',port:partnerPort});console.log(`Painel local do parceiro: ${origin}`);return {store,partner};
}

