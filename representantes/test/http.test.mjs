import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../server.mjs';
import {RepresentativeStore} from '../store.mjs';

test('API local valida origem, sessão e não permite comissão autodeclarada',async()=>{
 const port=43000+Math.floor(Math.random()*1000),store=new RepresentativeStore(),app=createServer({port,store});await app.listen();
 const base=`http://127.0.0.1:${port}`;
 const post=(path,data,headers={})=>fetch(base+path,{method:'POST',headers:{origin:base,'content-type':'application/json',...headers},body:JSON.stringify(data)});
 try{
  const forbidden=await post('/api/register',{},{origin:'http://evil.invalid'});assert.equal(forbidden.status,403);
  const registration=await post('/api/register',{name:'Teste HTTP Silva',city:'Campinas',email:'http@example.test',password:'Minha-Senha-123456'});assert.equal(registration.status,201);
  const unauth=await fetch(base+'/api/leads');assert.equal(unauth.status,401);
  const login=await post('/api/login',{email:'http@example.test',password:'Minha-Senha-123456'});assert.equal(login.status,200);
  const cookie=login.headers.get('set-cookie').split(';')[0];assert.match(login.headers.get('set-cookie'),/HttpOnly/);
  const me=await fetch(base+'/api/me',{headers:{cookie}});assert.equal(me.status,200);
  const bogus=await post('/api/commissions',{gross_cents:30000},{cookie});assert.equal(bogus.status,404);
  const contract=await fetch(base+'/api/contract');assert.equal((await contract.json()).draft,true);
 }finally{await app.close();store.close()}
});
