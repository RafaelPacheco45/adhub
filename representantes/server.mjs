import http from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {join,resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {RepresentativeStore,BusinessError} from './store.mjs';
import {CONTRACT,CONTRACT_HASH} from './contract.mjs';
import {CONTRACT_VERSION} from './domain.mjs';

const here=fileURLToPath(new URL('.',import.meta.url));
const send=(res,status,data,headers={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; base-uri 'none'; object-src 'none'; frame-ancestors 'none'",...headers});res.end(JSON.stringify(data));};
const cookies=req=>Object.fromEntries((req.headers.cookie||'').split(';').map(p=>p.trim().split('=')).filter(p=>p.length===2));
const token=req=>cookies(req).adhub_rep_session;
const parse=async req=>{let body='';for await(const chunk of req){body+=chunk;if(body.length>8192)throw new BusinessError('Dados muito grandes.',413);}try{return JSON.parse(body||'{}');}catch{throw new BusinessError('JSON inválido.');}};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
export function createServer({store=new RepresentativeStore(':memory:'),hostname='127.0.0.1',port=4310}={}){
  const server=http.createServer(async(req,res)=>{
    try{
      const url=new URL(req.url,`http://${req.headers.host||'localhost'}`),path=url.pathname;
      if(!['GET','POST'].includes(req.method))return send(res,405,{error:'Método não permitido.'});
      if(path.startsWith('/api/')){
        if(req.method==='POST'){
          const expected=`http://${hostname}:${port}`;
          if(req.headers.origin!==expected)return send(res,403,{error:'Origem não autorizada.'});
          if(!req.headers['content-type']?.startsWith('application/json'))return send(res,415,{error:'Use JSON.'});
        }
        if(path==='/api/contract'&&req.method==='GET')return send(res,200,{version:CONTRACT_VERSION,hash:CONTRACT_HASH,text:CONTRACT,draft:true});
        if(path==='/api/register'&&req.method==='POST')return send(res,201,{registration:store.register(await parse(req))});
        if(path==='/api/login'&&req.method==='POST'){
          const {email,password}=await parse(req),result=store.login(email,password);
          return send(res,200,{ok:true}, {'Set-Cookie':`adhub_rep_session=${result.token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=604800`});
        }
        const user=store.session(token(req));
        if(path==='/api/me'&&req.method==='GET')return send(res,200,{representative:store.me(user)});
        if(path==='/api/logout'&&req.method==='POST'){store.logout(token(req));return send(res,200,{ok:true},{'Set-Cookie':'adhub_rep_session=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0'});}
        if(path==='/api/contract/accept'&&req.method==='POST')return send(res,200,store.accept(user,await parse(req)));
        if(path==='/api/leads'&&req.method==='GET')return send(res,200,{leads:store.leads(user)});
        if(path==='/api/leads'&&req.method==='POST')return send(res,201,{lead:store.lead(user,await parse(req))});
        if(path==='/api/commissions'&&req.method==='GET')return send(res,200,{commissions:store.commissions(user),notice:'Nenhuma comissão é confirmada sem conciliação financeira pelo operador.'});
        return send(res,404,{error:'Rota não encontrada.'});
      }
      if(req.method!=='GET')return send(res,405,{error:'Método não permitido.'});
      const pathname=path==='/'?'index.html':path.slice(1);
      if(!['index.html','app.js','style.css'].includes(pathname))return send(res,404,{error:'Arquivo não encontrado.'});
      const body=readFileSync(join(here,'public',pathname));
      res.writeHead(200,{'Content-Type':mime[extname(pathname)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'"});res.end(body);
    }catch(e){send(res,e instanceof BusinessError?e.status:500,{error:e instanceof BusinessError?e.message:'Falha inesperada.'});}
  });
  return {server,listen:()=>new Promise(resolve=>server.listen(port,hostname,resolve)),close:()=>new Promise(resolve=>server.close(resolve)),store};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const dbPath=process.env.ADHUB_REP_DB||join(here,'data','representatives.sqlite');
  mkdirSync(resolve(dbPath,'..'),{recursive:true});
  const app=createServer({store:new RepresentativeStore(dbPath)});
  await app.listen();console.log('AdHub — demonstração local de indicações em http://127.0.0.1:4310 (NÃO PUBLICAR)');
  process.on('SIGINT',async()=>{await app.close();app.store.close();});
}
