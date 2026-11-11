const $=id=>document.getElementById(id);
let contract=null,person=null;
function notice(text,error=false){$('message').textContent=text;$('message').classList.toggle('error',error);}
async function api(path,{method='GET',data}={}){
  const response=await fetch('/api/'+path,{method,credentials:'same-origin',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(result.error||'Não foi possível concluir.');return result;
}
async function submit(form,action){const button=form.querySelector('button[type="submit"],button:not([type])');if(button.disabled)return;button.disabled=true;notice('Processando...');try{await action(Object.fromEntries(new FormData(form)));notice('Operação registrada com sucesso.');}catch(e){notice(e.message,true)}finally{button.disabled=false}}
function switchAuth(which){$('showLogin').classList.toggle('selected',which==='login');$('showRegister').classList.toggle('selected',which==='register');$('login').hidden=which!=='login';$('register').hidden=which!=='register';notice('');}
$('showLogin').onclick=()=>switchAuth('login');$('showRegister').onclick=()=>switchAuth('register');
$('login').onsubmit=e=>{e.preventDefault();submit(e.currentTarget,async data=>{await api('login',{method:'POST',data});await refresh()})};
$('register').onsubmit=e=>{e.preventDefault();submit(e.currentTarget,async data=>{await api('register',{method:'POST',data});$('login').elements.email.value=data.email;$('login').elements.password.value=data.password;switchAuth('login');notice('Cadastro criado. Entre para continuar.')})};
$('logout').onclick=async()=>{try{await api('logout',{method:'POST',data:{}})}finally{person=null;$('auth').hidden=false;$('dashboard').hidden=true;notice('Sessão encerrada.')}};
$('accept').onsubmit=e=>{e.preventDefault();submit(e.currentTarget,async data=>{await api('contract/accept',{method:'POST',data:{...data,version:contract.version,hash:contract.hash}});await refresh()})};
$('leadForm').onsubmit=e=>{e.preventDefault();const form=e.currentTarget;submit(form,async data=>{await api('leads',{method:'POST',data});form.reset();await loadLeads()})};
$('copyCode').onclick=async()=>{try{await navigator.clipboard.writeText(person.referral_code);notice('Código copiado.')}catch{notice('Copie o código exibido manualmente.',true)}};
async function loadLeads(){const [{leads},{commissions}]=await Promise.all([api('leads'),api('commissions')]);$('leads').replaceChildren(...leads.map(lead=>{const item=document.createElement('div');item.className='item';const title=document.createElement('strong');title.textContent=lead.name;const sub=document.createElement('small');sub.textContent=(lead.type==='venue'?'Estabelecimento':'Anunciante')+' · '+lead.status+' · '+new Date(lead.created_at).toLocaleDateString('pt-BR');item.append(title,sub);return item}));if(!leads.length)$('leads').textContent='Ainda não há indicações.';$('commissions').textContent=commissions.length?'Existem registros financeiros para conferência.':'Nenhuma comissão lançada.';}
async function refresh(){try{const {representative}=await api('me');person=representative;$('auth').hidden=true;$('dashboard').hidden=false;$('welcome').textContent='Olá, '+person.name.split(' ')[0];$('refCode').textContent=person.referral_code;$('acceptance').hidden=person.contract_accepted;$('leadSection').hidden=!person.contract_accepted;if(person.contract_accepted)await loadLeads();else{contract=await api('contract');$('contractText').textContent=contract.text;$('accept').elements.signed_name.value=person.name;}}catch(e){person=null;$('auth').hidden=false;$('dashboard').hidden=true;if(!/Sessão/.test(e.message))notice(e.message,true)}}
refresh();
