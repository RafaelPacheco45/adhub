import test from 'node:test';
import assert from 'node:assert/strict';
import {RepresentativeStore,BusinessError} from '../store.mjs';
import {CONTRACT,CONTRACT_HASH} from '../contract.mjs';
import {CONTRACT_VERSION,split} from '../domain.mjs';

const account={name:'Rafael Teste Silva',email:'rafael@example.test',city:'Campinas',password:'Senha-segura-teste-123!'};
test('divisão 85% / 10% / 5% para campanha de R$ 300',()=>assert.deepEqual(split(30000),{gross:30000,venue:25500,platformGross:4500,representative:1500,platformNet:3000}));
test('arredondamento em centavos conserva o total e comissão nunca supera a plataforma',()=>{for(const amount of [0,1,37,1999,10001,999999]){const p=split(amount);assert.equal(p.venue+p.representative+p.platformNet,amount);assert.ok(p.representative<=p.platformGross)}assert.throws(()=>split(-1));});
test('cadastro/login/contrato versionado/indicações em duas categorias',()=>{
 const store=new RepresentativeStore();try{
  const rep=store.register(account);assert.equal(rep.status,'pending_review');
  assert.throws(()=>store.register(account),e=>e.status===409);
  assert.throws(()=>store.login(account.email,'errada'),e=>e.status===401);
  const {token}=store.login(account.email,account.password),user=store.session(token);
  assert.equal(store.me(user).contract_accepted,false);
  assert.throws(()=>store.lead(user,{type:'venue',name:'Café',email:'cafe@example.test'}),e=>e.status===403);
  assert.throws(()=>store.accept(user,{signed_name:account.name,version:CONTRACT_VERSION,hash:'errado'}),e=>e.status===409);
  store.accept(user,{signed_name:account.name,version:CONTRACT_VERSION,hash:CONTRACT_HASH});
  assert.equal(store.me(user).contract_accepted,true);
  store.lead(user,{type:'venue',name:'Café Central',email:'cafe@example.test'});
  store.lead(user,{type:'advertiser',name:'Mercado Teste',email:'mercado@example.test'});
  assert.equal(store.leads(user).length,2);
  assert.throws(()=>store.lead(user,{type:'venue',name:'Café Central',email:'cafe@example.test'}),e=>e.status===409);
  assert.equal(store.commissions(user).length,0);
  store.logout(token);assert.throws(()=>store.session(token),e=>e.status===401);
 }finally{store.close()}
});
test('representantes não enxergam leads de outra conta',()=>{
 const store=new RepresentativeStore();try{store.register(account);store.register({...account,email:'outro@example.test',name:'Pessoa Outra Silva'});
 const a=store.session(store.login(account.email,account.password).token),b=store.session(store.login('outro@example.test',account.password).token);
 store.accept(a,{signed_name:a.name,version:CONTRACT_VERSION,hash:CONTRACT_HASH});
 store.accept(b,{signed_name:b.name,version:CONTRACT_VERSION,hash:CONTRACT_HASH});
 store.lead(a,{type:'venue',name:'Local Exemplo',email:'local@example.test'});
 assert.equal(store.leads(a).length,1);assert.equal(store.leads(b).length,0);
 }finally{store.close()}
});
test('contrato está identificado como minuta e sem CNPJ fictício',()=>{assert.match(CONTRACT,/MINUTA/);assert.match(CONTRACT,/PREENCHER/);assert.equal(CONTRACT_HASH.length,64)});
