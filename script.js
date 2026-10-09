/* ============ НАСТРОЙКА ============
   Вход через Google: вставь сюда свой OAuth Client ID.
   1) console.cloud.google.com → APIs & Services → Credentials → Create credentials → OAuth client ID
   2) Тип: Web application
   3) Authorized JavaScript origins: адрес сайта, например https://ТВОЙ_НИК.github.io
   4) Скопируй Client ID (вида 123-abc.apps.googleusercontent.com) в кавычки ниже.
   Пока поле пустое — кнопка Google показывает подсказку, остальной вход работает. */
const GOOGLE_CLIENT_ID = '';

/* Права владельца проверяются сервером. Ключ хранится только в переменных окружения сервера. */
const CREATOR = { s:'', h:'' };
const OWNER_TAG = {id:'owner',ic:'👑',n:'Владелец',c:'#fbbf24',g:'creator'};

/* Пожертвования автору (блок внизу лобби). Пока пусто — блок покажет подсказку.
   links: кнопки-ссылки (только https://), requisites: реквизиты с кнопкой «копировать».
   goal*: необязательная цель сбора — заполняй сам и обновляй вручную. */
const DONATE = {
  links: [ /* { label:'DonationAlerts', url:'https://www.donationalerts.com/r/ТВОЙ_НИК' }, { label:'Boosty', url:'https://boosty.to/ТВОЙ_НИК' } */ ],
  requisites: [ /* { label:'Карта', value:'0000 0000 0000 0000' }, { label:'USDT (TRC20)', value:'T...' } */ ],
  goalTitle: '', goalTarget: 0, goalCurrent: 0, goalUnit: '₽'
};
/* =================================== */

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms)), pick=a=>a[Math.floor(Math.random()*a.length)];
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const LS={get(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v??d}catch{return d}},
          set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch{toast('Не хватило места в памяти браузера');return false}}};
const API_BASE='https://renderneon.souldreams.blitz.cloud/api';
const API_TOKEN_KEY='nv_api_token';
let API_ON=false, apiBusy=false;
const apiToken=()=>{try{return sessionStorage.getItem(API_TOKEN_KEY)||''}catch{return ''}};
async function api(path,opts={}) {
 const headers={'Content-Type':'application/json',...(opts.headers||{})};
 const token=apiToken(); if(token) headers.Authorization='Bearer '+token;
 const r=await fetch(API_BASE+path,{...opts,headers,mode:'cors'});
 let d={}; try{d=await r.json()}catch{}
 if(!r.ok) throw new Error(d.error||('Ошибка сервера '+r.status));
 if((path==='/auth/login'||path==='/auth/register')&&d.token){try{sessionStorage.setItem(API_TOKEN_KEY,d.token)}catch{}}
 if(path==='/auth/logout'){try{sessionStorage.removeItem(API_TOKEN_KEY)}catch{}}
 return d;
}
function hydrateServerUser(u){const state=u?.state&&typeof u.state==='object'?u.state:{};const a=norm({...newAcc(u.id,'user',u.name),...state,id:u.id,name:u.name,type:'user',owner:u.role==='owner'||u.owner===true,creator:u.role==='owner'||u.creator===true,role:u.role||'user',status:u.status||'active'});delete a.pass;return a}
let serverSaveTimer=null,serverSaveSeq=0;function saveServerState(){if(!API_ON||!me)return;clearTimeout(serverSaveTimer);const uid=me.id,seq=++serverSaveSeq;serverSaveTimer=setTimeout(()=>{if(!me||me.id!==uid)return;const state={...me};delete state.pass;delete state.owner;delete state.creator;delete state.role;delete state.status;api('/account/state',{method:'PUT',body:JSON.stringify({state})}).then(d=>{if(seq===serverSaveSeq&&d.user&&me&&me.id===uid){const a=hydrateServerUser(d.user);const localPass=me.pass;me={...me,...a};if(localPass)me.pass=localPass;}}).catch(e=>{if(e.message.includes('Сессия')||e.message.includes('Войди'))toast('Сессия истекла. Войди снова.');else console.warn('Server save failed:',e.message)})},450)}
async function flushServerState(){if(!API_ON||!me)return;clearTimeout(serverSaveTimer);const state={...me};delete state.pass;delete state.owner;delete state.creator;delete state.role;delete state.status;await api('/account/state',{method:'PUT',body:JSON.stringify({state})})}
async function refreshServerUsers(){if(!API_ON)return;try{const d=await api('/users');const all=LS.get('nv_acc',{});for(const u of d.users||[]){const a=hydrateServerUser(u);const old=all[a.id];all[a.id]=old?{...old,...a,pass:old.pass}:a;}if(me&&all[me.id])all[me.id]=me;accounts=all;LS.set('nv_acc',accounts)}catch(e){console.warn('Directory refresh failed:',e.message)}}
const GRADS=['linear-gradient(135deg,#6d28d9,#0891b2)','linear-gradient(135deg,#be123c,#f59e0b)','linear-gradient(135deg,#065f46,#22d3ee)','linear-gradient(135deg,#1e1b4b,#c026d3)',
 'linear-gradient(135deg,#0f172a,#475569)','linear-gradient(135deg,#f472b6,#fb923c)','linear-gradient(135deg,#312e81,#06b6d4,#a3e635)','radial-gradient(circle at 30% 30%,#fbbf24,#7c2d12)'];
const EMOJI=['😎','🤑','👑','🦊','🐺','🐉','👾','🤖','💀','🔥','🍀','💎','🎩','🦄','🐱','🚀'];
const DAY=864e5, GUEST_TTL=7*DAY, ONLINE_MS=45e3, GIFT=100;

let accounts={}, me=null, bet=50, busy=false, side=0, curView='lobby', navBusy=false;

/* ---------- Хранилище аккаунтов ---------- */
function norm(a){
  if(!a.type)a.type=a.id.startsWith('g_')?'google':a.id.startsWith('guest_')?'guest':'user';
  if(!Array.isArray(a.friends))a.friends=[];
  if(!Array.isArray(a.tags))a.tags=[];
  a.creator=a.creator===true;
  a.owner=a.owner===true; a.tapCurrency=Math.max(0,+a.tapCurrency||0); a.tapLevel=Math.max(1,+a.tapLevel||1); a.tapPower=Math.max(1,+a.tapPower||1); a.tapPowerLv=Math.max(0,+a.tapPowerLv||0); a.tapIdle=Math.max(0,+a.tapIdle||0); a.tapIdleLv=Math.max(0,+a.tapIdleLv||0); a.tapXp=Math.max(0,+a.tapXp||0); a.tapLast=+a.tapLast||Date.now(); a.petId=typeof a.petId==='string'?a.petId:''; a.petRank=Math.max(0,+a.petRank||0); if(!Array.isArray(a.petOwned))a.petOwned=a.petId?['cat','bunny','bear',a.petId]:[]; if(!a.petNoTrade||typeof a.petNoTrade!=='object')a.petNoTrade={}; if(typeof a.petTagId!=='string')a.petTagId='';
  ['streak','bestStreak','donated','received'].forEach(k=>a[k]=+a[k]||0);
  if(typeof a.lastDay!=='string')a.lastDay='';
  if(!a.seen)a.seen=Date.now();
  if(!a.created)a.created=a.seen;
  return a;
}
function sync(){accounts=LS.get('nv_acc',{});Object.values(accounts).forEach(norm);return accounts}
/* записать меня, не затирая изменения из других вкладок */
function save(){if(!me)return;const fresh=LS.get('nv_acc',{});fresh[me.id]=me;accounts=fresh;LS.set('nv_acc',accounts);saveServerState()}
/* изменить несколько аккаунтов за раз (подарки, дружба) */
function tx(fn){sync();accounts[me.id]=me;const r=fn(accounts);LS.set('nv_acc',accounts);return r}
/* гостевые аккаунты, которыми не пользовались 7 дней, освобождают ник */
function purgeGuests(keep){
  sync();let ch=false;
  for(const id in accounts){const a=accounts[id];if(a.type==='guest'&&id!==keep&&Date.now()-a.seen>GUEST_TTL){delete accounts[id];ch=true}}
  if(ch){Object.values(accounts).forEach(a=>a.friends=a.friends.filter(f=>accounts[f]))}
  LS.set('nv_acc',accounts);
}
sync();LS.set('nv_acc',accounts);

const normName=s=>String(s).trim().replace(/\s+/g,' ');
const keyName=s=>normName(s).toLocaleLowerCase('ru');
const findByName=n=>{const k=keyName(n);return Object.values(sync()).find(a=>keyName(a.name)===k)};
function nameError(n){
  n=normName(n);
  if(n.length<2||n.length>20)return 'Ник должен быть от 2 до 20 символов';
  if(!/^[\p{L}\p{N}_.\- ]+$/u.test(n))return 'В нике можно только буквы, цифры, пробел и символы _ - .';
  return '';
}
function uniqueName(base){
  base=normName(base).replace(/[^\p{L}\p{N}_.\- ]/gu,'').slice(0,17)||'Игрок';
  let n=base,i=1;while(findByName(n)){i++;n=base+i}return n;
}
const rid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const newAcc=(id,type,name)=>({id,type,name,email:null,av:{t:'emoji',v:pick(EMOJI)},bg:{t:'grad',v:0},accent:'#a855f7',fx:'neon',nc:'#ffffff',
  coins:1000,games:0,won:0,best:0,bonusAt:0,streak:0,bestStreak:0,lastDay:'',donated:0,received:0,friends:[],tags:[],creator:false,owner:false,tapCurrency:0,tapLevel:1,tapPower:1,tapPowerLv:0,tapIdle:0,tapIdleLv:0,tapXp:0,tapLast:Date.now(),petId:'',petRank:0,petOwned:[],seen:Date.now(),on:false,created:Date.now()});

/* ---------- Пароли (PBKDF2 + соль, в открытом виде не хранятся) ---------- */
const hex=u=>[...new Uint8Array(u)].map(b=>b.toString(16).padStart(2,'0')).join('');
async function hashPw(pw,salt,alg){
  if(alg==='pbkdf2'){
    const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveBits']);
    return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:150000,hash:'SHA-256'},k,256));
  }
  /* запасной вариант, если браузер открыл страницу не по https */
  let h1=0xdeadbeef,h2=0x41c6ce57,s=salt+'|'+pw;
  for(let r=0;r<2000;r++)for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677)}
  h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);
  h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);
  return (h2>>>0).toString(16).padStart(8,'0')+(h1>>>0).toString(16).padStart(8,'0');
}
async function makePass(pw){
  const salt=hex(crypto.getRandomValues(new Uint8Array(16))),alg=(window.crypto&&crypto.subtle)?'pbkdf2':'weak';
  return {a:alg,s:salt,h:await hashPw(pw,salt,alg)};
}
async function checkPass(a,pw){
  if(!a.pass)return false;
  try{return await hashPw(pw,a.pass.s,a.pass.a)===a.pass.h}catch{return false}
}
/* защита от перебора пароля: 5 ошибок → пауза, дальше всё дольше */
const failKey=a=>keyName(a);
function lockLeft(k){const f=LS.get('nv_fail',{})[k];return f&&f.until>Date.now()?Math.ceil((f.until-Date.now())/1000):0}
function addFail(k){const all=LS.get('nv_fail',{}),f=all[k]||{n:0,until:0};f.n++;if(f.n>=5)f.until=Date.now()+Math.min(600,30*2**(f.n-5))*1e3;all[k]=f;LS.set('nv_fail',all);return f.n}
function clearFail(k){const all=LS.get('nv_fail',{});if(all[k]){delete all[k];LS.set('nv_fail',all)}}

/* ---------- Загрузка ---------- */
'NEON VAULT'.split('').forEach((c,i)=>{const s=document.createElement('span');s.textContent=c===' '?'\u00A0':c;s.style.animationDelay=(.15+i*.09)+'s';$('#ldTitle').appendChild(s)});
(function load(){
  const msgs=['Запуск хранилища…','Зажигаем неон…','Тасуем карты…','Полируем монеты…','Почти готово…'],D=RM?500:2400,bar=$('#ldBar'),txt=$('#ldTxt');
  let t0=0;
  requestAnimationFrame(function tick(now){
    if(!t0)t0=now;
    const k=Math.min(1,(now-t0)/D),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
    bar.style.transform=`scaleX(${e})`;txt.textContent=msgs[Math.min(4,Math.floor(k*5))];
    if(k<1)requestAnimationFrame(tick);else setTimeout(startApp,350);
  });
})();
async function startApp(){
  $('#loader').classList.add('hide');setTimeout(()=>$('#loader').remove(),900);
  try{await fetch(API_BASE+'/health',{cache:'no-store',mode:'cors'}).then(r=>{if(!r.ok)throw new Error('offline');return r.json()});API_ON=true}catch{API_ON=false}
  const guestTab=$('#aTabs button[data-t="guest"]');if(guestTab)guestTab.hidden=true;const guestForm=$('#fGuest');if(guestForm)guestForm.hidden=true;
  if(API_ON)try{const d=await api('/auth/me');const a=hydrateServerUser(d.user);const all=LS.get('nv_acc',{});all[a.id]=a;accounts=all;LS.set('nv_acc',all);await refreshServerUsers();enter(a,true);return}catch(e){try{sessionStorage.removeItem(API_TOKEN_KEY)}catch{}console.warn('Saved session unavailable:',e.message)}
  purgeGuests(LS.get('nv_cur',null));
  const cur=LS.get('nv_cur',null);
  if(!API_ON&&cur&&accounts[cur]){LS.set('nv_cur',null);showAuth();aErr('Сервер базы аккаунтов не подключён. Для постоянной регистрации запусти сервер по README_SERVER.txt.')}else{showAuth();if(!API_ON)aErr('Подключи сервер Node.js для постоянных аккаунтов и базы данных.')} 
}

/* ---------- Экран входа ---------- */
function showAuth(){
  $('#app').style.display='none';$('#auth').style.display='grid';
  $$('#auth input').forEach(i=>i.value='');
  setTab('login',true);setupGoogle();
}
function setTab(t,quiet){
  const tabs=['login','reg','guest'];
  $$('#aTabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));
  $('#aTabs').style.setProperty('--ti',tabs.indexOf(t));
  $$('.aform').forEach(f=>f.classList.toggle('on',f.dataset.f===t));
  $('#aErr').textContent='';
  if(!quiet&&innerWidth>700){const f=$('.aform.on input');f&&setTimeout(()=>f.focus(),60)}
}
$$('#aTabs button').forEach(b=>b.onclick=()=>setTab(b.dataset.t));
$$('.eye').forEach(b=>b.onclick=()=>{const i=b.previousElementSibling;i.type=i.type==='password'?'text':'password';b.style.opacity=i.type==='text'?1:''});
function aErr(m){const e=$('#aErr');e.textContent=m;e.classList.remove('shake');void e.offsetWidth;e.classList.add('shake')}

function setupGoogle(){
  if(API_ON){$('#gFake').style.display='flex';$('#gBtn').style.display='none';$('#gFake').textContent='В этой серверной версии вход через Google пока не подключён — используй ник и пароль.';return}
  if(!GOOGLE_CLIENT_ID){$('#gFake').style.display='flex';$('#gBtn').style.display='none';return}
  $('#gFake').style.display='none';$('#gBtn').style.display='flex';
  if(window.google&&google.accounts)return initG();
  if($('#gsiScript'))return;
  const s=document.createElement('script');s.id='gsiScript';s.src='https://accounts.google.com/gsi/client';s.async=true;s.onload=initG;
  s.onerror=()=>{s.remove();$('#gBtn').style.display='none';const h=$('#gHint');h.style.display='block';h.textContent='Не удалось загрузить Google. Войди по нику и паролю.'};
  document.head.appendChild(s);
}
$('#gFake').onclick=()=>{const h=$('#gHint');h.style.display=h.style.display==='block'?'none':'block'};
function initG(){
  google.accounts.id.initialize({client_id:GOOGLE_CLIENT_ID,callback:onGoogle});
  $('#gBtn').innerHTML='';
  google.accounts.id.renderButton($('#gBtn'),{theme:'filled_black',size:'large',shape:'pill',text:'continue_with',locale:'ru'});
}
function onGoogle(r){
  let p;
  try{
    let b=r.credential.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');b+='='.repeat((4-b.length%4)%4);
    p=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b),c=>c.charCodeAt(0))));
    if(!p.sub)throw 0;
  }catch(e){return toast('Ошибка входа через Google')}
  sync();const id='g_'+p.sub;let a=accounts[id];
  if(!a){
    a=newAcc(id,'google',uniqueName(p.name||'Игрок'));a.email=p.email||null;
    if(p.picture)a.av={t:'img',v:p.picture};
  }else if(p.picture&&a.av.t==='img'&&/^https/.test(a.av.v))a.av.v=p.picture;
  enter(a);
}

/* Вход/регистрация через серверную базу, если сайт запущен вместе с server.js. */
$('#fLogin').onsubmit=e=>submit(e,async()=>{
  const nick=normName($('#lgNick').value),pw=$('#lgPass').value;
  if(!nick||!pw)return aErr('Введи ник и пароль');
  if(!API_ON)return aErr('Сервер базы аккаунтов не подключён. Запусти NEON VAULT через Node.js по инструкции README_SERVER.txt.');
  if(API_ON){const d=await api('/auth/login',{method:'POST',body:JSON.stringify({name:nick,password:pw})});const a=hydrateServerUser(d.user);const all=LS.get('nv_acc',{});all[a.id]=a;accounts=all;LS.set('nv_acc',all);await refreshServerUsers();return enter(a,false,'Вход выполнен! Данные аккаунта загружены из базы.');}
  const k=failKey(nick),left=lockLeft(k);if(left)return aErr(`Слишком много попыток. Подожди ${left} с`);
  const a=findByName(nick);if(!a)return aErr('Такого аккаунта нет. Создай его на вкладке «Регистрация»');
  if(a.type==='google')return aErr('Этот аккаунт создан через Google — нажми «Продолжить с Google»');
  if(a.type==='guest')return aErr('Это гостевой ник, пароля у него нет. Зарегистрируйся');
  if(!(await checkPass(a,pw))){const n=addFail(k);return aErr(n>=5?`Слишком много попыток. Подожди ${lockLeft(k)} с`:`Неверный пароль (осталось попыток: ${5-n})`)}
  clearFail(k);enter(a);
});
$('#fReg').onsubmit=e=>submit(e,async()=>{
  const nick=normName($('#rgNick').value),pw=$('#rgPass').value,pw2=$('#rgPass2').value;
  const ne=nameError(nick);if(ne)return aErr(ne);
  if(pw.length<8)return aErr('Пароль должен содержать минимум 8 символов');
  if(pw!==pw2)return aErr('Пароли не совпадают');
  if(!API_ON)return aErr('Сервер базы аккаунтов не подключён. Запусти NEON VAULT через Node.js по инструкции README_SERVER.txt.');
  if(API_ON){const d=await api('/auth/register',{method:'POST',body:JSON.stringify({name:nick,password:pw})});const a=hydrateServerUser(d.user);const all=LS.get('nv_acc',{});all[a.id]=a;accounts=all;LS.set('nv_acc',all);return enter(a,false,'Аккаунт создан в базе данных! Добро пожаловать, '+a.name);}
  if(findByName(nick))return aErr('Этот ник уже занят — выбери другой');
  const a=newAcc(rid('u_'),'user',nick);a.pass=await makePass(pw);enter(a,false,'Аккаунт создан! Добро пожаловать, '+a.name);
});
/* гость: ник запоминается как гостевой аккаунт, но занятый ник не открывается */
$('#fGuest').onsubmit=e=>{e.preventDefault();aErr('Гостевой вход отключён. Создай постоянный аккаунт с паролем.');};
async function submit(e,fn){
  e.preventDefault();const b=e.target.querySelector('[type=submit]');if(b.disabled||navBusy)return;
  b.disabled=true;$('#aErr').textContent='';sync();
  try{await fn()}catch(err){console.error(err);aErr('Что-то пошло не так, попробуй ещё раз')}
  b.disabled=false;
}

async function enter(a,instant,msg){
  me=norm(a);me.on=true;me.seen=Date.now();LS.set('nv_cur',a.id);if(!API_ON)purgeGuests(me.id);save();if(API_ON)refreshServerUsers();
  const apply=()=>{$('#auth').style.display='none';$('#app').style.display='flex';resetViews();render()};
  if(instant){apply();$('#app').classList.add('app-in');popIn($('#v-lobby'));setTimeout(()=>$('#app').classList.remove('app-in'),900)}
  else{navBusy=true;await transition(apply,()=>popIn($('#v-lobby')));navBusy=false}
  toast(msg||'С возвращением, '+me.name+'!');
}
function resetViews(){
  $$('.view').forEach(v=>v.classList.remove('active','pop'));$('#v-lobby').classList.add('active');curView='lobby';
  $$('.nbtn').forEach(b=>b.classList.toggle('on',b.dataset.view==='lobby'));
}
$('#logout').onclick=async()=>{
  if(navBusy)return;
  if(me.type==='guest'&&!(await ask('Выйти из гостевого аккаунта?','Войти в гостя повторно нельзя: ник освободится через 7 дней. Задай пароль в профиле — тогда аккаунт сохранится навсегда.','Всё равно выйти','Остаться')))return;
  me.on=false;me.seen=Date.now();save();if(API_ON){try{await flushServerState();await api('/auth/logout',{method:'POST'})}catch(e){console.warn('Logout sync failed:',e.message)}}try{sessionStorage.removeItem(API_TOKEN_KEY)}catch{}LS.set('nv_cur',null);me=null;
  navBusy=true;await transition(()=>{$('#app').style.display='none';resetViews();showAuth()},()=>{const b=$('.auth-box');b.style.animation='none';void b.offsetWidth;b.style.animation=''});navBusy=false;
};
/* вкладки браузера синхронизируются между собой */
addEventListener('storage',e=>{
  if(e.key!=='nv_acc'||!me)return;
  sync();const f=accounts[me.id];if(f){me=f;updBal(true)}
  if(curView==='friends')renderFriends();
  if(curView==='messenger')renderMessenger();
  if(curView==='lobby')renderLobbyCommunity();
  if(curView==='top')renderTop();
});

/* ---------- Отрисовка профиля ---------- */
function setAvEl(el,av){
  if(av.t==='img'&&/^(https:|data:image\/)/.test(av.v)){el.style.backgroundImage=`url("${av.v.replace(/"/g,'%22')}")`;el.textContent=''}
  else{el.style.backgroundImage='';el.textContent=av.t==='emoji'?av.v:'🙂'}
}
const setAv=el=>setAvEl(el,me.av);
function bgCss(){const b=me.bg;return b.t==='grad'?GRADS[b.v]:b.t==='color'?b.v:`url("${String(b.v).replace(/"/g,'%22')}") center/cover`}
const TYPE_LBL={guest:'Гость',user:'Аккаунт',google:'Google'};

/* ---------- Теги ----------
   rank    — по лучшему (максимальному) выигрышу, открываются по возрастанию
   fun     — для души, ставит любой
   earn    — за достижения
   creator — ТОЛЬКО для создателей: не показываются и не ставятся остальным */
const MAX_TAGS=3;
const TIERS=[['🌱','Новичок',0],['✨','Искра',100],['🍀','Везунчик',500],['🎯','Игрок',2000],['💎','Хайроллер',10000],['🏆','Легенда',50000]];
const TAGS=[
  ...TIERS.map(([ic,n,min],i)=>({id:'r'+i,g:'rank',ic,n,c:['#a5a3c4','#7dd3fc','#86efac','#fcd34d','#22d3ee','#f0abfc'][i],
    need:a=>a.best>=min,hint:min?`Макс. выигрыш от ${min.toLocaleString('ru')}`:''})),
  {id:'f1',g:'fun',ic:'🍀',n:'На удачу',c:'#86efac'},{id:'f2',g:'fun',ic:'🎰',n:'Слотоман',c:'#f0abfc'},
  {id:'f3',g:'fun',ic:'🎡',n:'Колесничий',c:'#fcd34d'},{id:'f4',g:'fun',ic:'🪙',n:'Орёл или решка',c:'#fbbf24'},
  {id:'f5',g:'fun',ic:'😎',n:'Холодная голова',c:'#7dd3fc'},{id:'f6',g:'fun',ic:'😈',n:'Рисковый',c:'#fb7185'},
  {id:'f7',g:'fun',ic:'🐢',n:'Осторожный',c:'#4ade80'},{id:'f8',g:'fun',ic:'🌙',n:'Ночная смена',c:'#a78bfa'},
  {id:'f9',g:'fun',ic:'🧠',n:'Считаю шансы',c:'#38bdf8'},
  {id:'e1',g:'earn',ic:'🔥',n:'Завсегдатай',c:'#fb923c',need:a=>a.games>=50,hint:'Сыграй 50 игр'},
  {id:'e2',g:'earn',ic:'🏅',n:'Ветеран',c:'#facc15',need:a=>a.games>=250,hint:'Сыграй 250 игр'},
  {id:'e3',g:'earn',ic:'💰',n:'Богач',c:'#fbbf24',need:a=>a.coins>=10000,hint:'Накопи 10 000 монет'},
  {id:'e4',g:'earn',ic:'🏦',n:'Золотой запас',c:'#fde68a',need:a=>a.coins>=50000,hint:'Накопи 50 000 монет'},
  {id:'e5',g:'earn',ic:'🤝',n:'Душа компании',c:'#f472b6',need:a=>a.friends.length>=3,hint:'Заведи 3 друзей'},
  {id:'e6',g:'earn',ic:'💜',n:'Меценат',c:'#f472b6',need:a=>a.donated>=1000,hint:'Отправь автору 1 000 монет'},
  {id:'e7',g:'earn',ic:'📅',n:'Неделя подряд',c:'#38bdf8',need:a=>a.bestStreak>=7,hint:'Заходи 7 дней подряд'},
  {id:'e8',g:'earn',ic:'🗓',n:'Месяц подряд',c:'#a78bfa',need:a=>a.bestStreak>=30,hint:'Заходи 30 дней подряд'},
  {id:'c1',g:'creator',ic:'👑',n:'Создатель',c:'#fbbf24'},{id:'c2',g:'creator',ic:'🛠',n:'Архитектор',c:'#22d3ee'},
  {id:'c3',g:'creator',ic:'⚡',n:'Хозяин хранилища',c:'#c084fc'},{id:'c4',g:'creator',ic:'🌟',n:'Основатель',c:'#fde68a'}
];
const TAG_BY=Object.fromEntries(TAGS.map(t=>[t.id,t]));
const TAG_GROUPS=[['rank','🏆 По максимальному выигрышу'],['fun','🎭 Для души'],['earn','🎖 За достижения'],['creator','👑 Только для создателей']];
const tagOpen=(a,t)=>t.g==='creator'?a.creator===true:!t.need||t.need(a);
const topTier=a=>TAG_BY['r'+TIERS.reduce((m,t,i)=>a.best>=t[2]?i:m,0)];
/* что видят другие: создательские теги — только у создателей, остальные — только если открыты */
function shownTags(a){
  const list=(a.tags||[]).map(id=>TAG_BY[id]).filter(t=>t&&tagOpen(a,t)).slice(0,MAX_TAGS).sort((x,y)=>(y.g==='creator')-(x.g==='creator'));
  const pt=(typeof PETS!=='undefined'?PETS:[]).find(p=>p.id===a.petTagId); if(pt&&(a.petOwned||[]).includes(pt.id)&&pt.price>=100000)list.push({id:'pet-'+pt.id,g:'pet',ic:'🐾',n:pt.name,c:'#c084fc'});
  if(a.owner)list.unshift(OWNER_TAG);
  if(!list.some(t=>t.g!=='creator'))list.push(topTier(a));
  return list;
}
function tagEl(t){const s=document.createElement('span');s.className='tg'+(t.g==='creator'?' crt':'');s.style.setProperty('--tc',t.c);s.textContent=t.ic+' '+t.n;return s}
function tagsRow(a){const d=document.createElement('div');d.className='tgs';shownTags(a).forEach(t=>d.appendChild(tagEl(t)));return d}

function renderTags(){
  const box=$('#tagBody');box.innerHTML='';
  const eq=me.tags.filter(id=>TAG_BY[id]&&tagOpen(me,TAG_BY[id]));
  const info=document.createElement('p');info.className='secp';
  info.textContent=`Выбрано ${eq.length} из ${MAX_TAGS}. Теги видят все — в друзьях, профиле и лидерборде. Если ничего не выбрано, показывается твой ранг по максимальному выигрышу (сейчас: ${me.best.toLocaleString('ru')}).`;
  box.appendChild(info);
  TAG_GROUPS.forEach(([g,title])=>{
    if(g==='creator'&&!me.creator)return;           /* остальным этот раздел не показывается вообще */
    const h=document.createElement('div');h.className='tgh';h.textContent=title;box.appendChild(h);
    const row=document.createElement('div');row.className='tpick';
    TAGS.filter(t=>t.g===g).forEach(t=>{
      const open=tagOpen(me,t),on=eq.includes(t.id);
      const b=document.createElement('button');b.type='button';b.className='tpb'+(on?' on':'')+(open?'':' lk')+(g==='creator'?' crt':'');
      b.style.setProperty('--tc',t.c);
      b.textContent=(open?t.ic:'🔒')+' '+t.n;
      if(!open)b.title=t.hint||'Недоступно';
      b.onclick=()=>{
        if(!open)return toast('🔒 '+(t.hint||'Тег пока недоступен'));
        const cur=me.tags.filter(id=>TAG_BY[id]&&tagOpen(me,TAG_BY[id]));
        if(cur.includes(t.id))me.tags=cur.filter(x=>x!==t.id);
        else{if(cur.length>=MAX_TAGS)return toast(`Можно максимум ${MAX_TAGS} тега — сними один`);me.tags=[...cur,t.id]}
        save();render();
      };
      row.appendChild(b);
      if(!open&&t.hint){const s=document.createElement('small');s.className='tpn';s.textContent=t.hint;b.appendChild(s)}
    });
    box.appendChild(row);
  });
  /* Кастомный тег купленного питомца */
  const ownedTagPets=PETS.filter(p=>p.price>=100000&&(me.petOwned||[]).includes(p.id));
  const ph=document.createElement('div');ph.className='tgh';ph.textContent='🐾 Тег питомца';box.appendChild(ph);
  const pp=document.createElement('p');pp.className='secp';pp.textContent='Можно выбрать тег любого купленного питомца от 100 000 монет. Полученный через трейд питомец тоже подходит, но его нельзя передать дальше.';box.appendChild(pp);
  const pr=document.createElement('div');pr.className='tpick';
  const none=document.createElement('button');none.type='button';none.className='tpb'+(!me.petTagId?' on':'');none.textContent='Без тега питомца';none.onclick=()=>{me.petTagId='';save();render();};pr.appendChild(none);
  ownedTagPets.forEach(p=>{const b=document.createElement('button');b.type='button';b.className='tpb'+(me.petTagId===p.id?' on':'');b.textContent='🐾 '+p.name;b.title='Поставить тег '+p.name;b.onclick=()=>{me.petTagId=p.id;save();render();};pr.appendChild(b)});
  if(!ownedTagPets.length){const empty=document.createElement('small');empty.className='tpn';empty.textContent='Купи питомца в каталоге от 100 000 монет, чтобы открыть его тег.';pr.appendChild(empty)}
  box.appendChild(pr);
  /* статус создателя */
  const foot=document.createElement('div');foot.className='tfoot';
  if(me.creator){
    const p=document.createElement('p');p.className='secp';p.textContent='👑 Ты создатель сайта — тебе доступны теги создателей.';
    const r=document.createElement('button');r.type='button';r.className='btn ghost';r.textContent='Снять статус создателя';
    r.onclick=async()=>{if(!(await ask('Снять статус создателя?','Теги создателей пропадут. Вернуть их можно, снова введя код.','Снять','Отмена')))return;
      me.creator=false;me.tags=me.tags.filter(id=>TAG_BY[id]&&TAG_BY[id].g!=='creator');save();render();toast('Статус создателя снят')};
    foot.append(p,r);
  }else{
    const d=document.createElement('details');d.className='cdet';
    const s=document.createElement('summary');s.textContent='🔑 Я создатель сайта';
    const row=document.createElement('div');row.className='row';row.style.marginTop='10px';
    const i=document.createElement('input');i.className='inp';i.type='password';i.placeholder='Код создателя';i.autocomplete='off';i.style.cssText='flex:1;min-width:180px;margin:0';
    const b=document.createElement('button');b.type='button';b.className='btn';b.textContent='Подтвердить';
    const go=async()=>{if(b.disabled)return;b.disabled=true;try{await claimCreator(i.value)}finally{b.disabled=false}};
    b.onclick=go;i.onkeydown=e=>{if(e.key==='Enter')go()};
    row.append(i,b);d.append(s,row);foot.appendChild(d);
  }
  box.appendChild(foot);
}
async function claimCreator(code){
  code=String(code).trim();if(!code)return toast('Введи код');
  if(me.type==='guest')return toast('Сначала зарегистрируй аккаунт');
  if(API_ON){try{const d=await api('/admin/claim',{method:'POST',body:JSON.stringify({key:code})});me=hydrateServerUser(d.user);save();render();rain();toast('👑 Права владельца активированы сервером!')}catch(e){toast(e.message)}return}
  return toast('Для активации владельца запусти сайт с сервером и задай OWNER_BOOTSTRAP_KEY в переменных окружения.');
}

function render(){
  document.documentElement.style.setProperty('--accent',me.accent);applySiteTheme((me.petCustom||{}).site||'default');
  setAv($('#miniAv'));setAv($('#bigAv'));
  $('#miniNick').textContent=me.name;$('#lobNick').textContent=me.name;
  const bn=$('#bigNick');bn.textContent=me.name;bn.className='nick fx-'+me.fx;bn.style.setProperty('--nc',me.nc);
  $('#mail').textContent=me.type==='google'&&me.email?me.email:TYPE_LBL[me.type];
  $('#banner').style.background=bgCss();
  $('#nickIn').value=me.name;$('#fxSel').value=me.fx;$('#nickCol').value=me.nc;$('#accCol').value=me.accent;
  $$('#emo button').forEach(b=>b.classList.toggle('on',me.av.t==='emoji'&&b.textContent===me.av.v));
  $$('#sws .sw').forEach((b,i)=>b.classList.toggle('on',me.bg.t==='grad'&&me.bg.v===i));
  const bt=$('#bigTags');bt.replaceChildren(...shownTags(me).map(tagEl));
  updBal(true);stats();renderSec();renderTags();renderDonate();renderStreak();renderTapper();renderAdmin();renderLobbyCommunity();renderMessenger();$('#adminNav').hidden=!me.owner;
}
function stats(){$('#stC').textContent=me.coins.toLocaleString('ru');$('#stG').textContent=me.games;$('#stW').textContent=me.won.toLocaleString('ru');$('#stB').textContent=me.best.toLocaleString('ru')}
function updBal(quiet){$('#balN').textContent=me.coins.toLocaleString('ru');if(!quiet){const b=$('#bal');b.classList.remove('pulse');void b.offsetWidth;b.classList.add('pulse')}stats()}
function addCoins(n){me.coins=Math.max(0,me.coins+n);save();updBal()}

/* редактор профиля */
EMOJI.forEach(e=>{const b=document.createElement('button');b.textContent=e;b.onclick=()=>{me.av={t:'emoji',v:e};save();render()};$('#emo').appendChild(b)});
GRADS.forEach((g,i)=>{const b=document.createElement('button');b.className='sw';b.style.background=g;b.onclick=()=>{me.bg={t:'grad',v:i};save();render()};$('#sws').appendChild(b)});
/* ник меняется по Enter / когда поле теряет фокус — и должен быть свободным */
$('#nickIn').onchange=async e=>{
  const v=normName(e.target.value);
  if(v===me.name){e.target.value=v;return}
  const err=nameError(v);if(err){toast(err);e.target.value=me.name;return}
  const ex=findByName(v);if(ex&&ex.id!==me.id){toast('Ник «'+v+'» уже занят');e.target.value=me.name;return}
  if(API_ON){try{const d=await api('/account/name',{method:'PATCH',body:JSON.stringify({name:v})});me.name=d.user.name}catch(err){toast(err.message);e.target.value=me.name;return}}else me.name=v;save();render();toast('Ник изменён');
};
$('#nickIn').onkeydown=e=>{if(e.key==='Enter')e.target.blur()};
$('#fxSel').onchange=e=>{me.fx=e.target.value;save();render()};
$('#nickCol').oninput=e=>{me.nc=e.target.value;save();$('#bigNick').style.setProperty('--nc',me.nc)};
$('#accCol').oninput=e=>{me.accent=e.target.value;save();document.documentElement.style.setProperty('--accent',me.accent)};
$('#bgCol').oninput=e=>{me.bg={t:'color',v:e.target.value};save();$('#banner').style.background=bgCss();$$('#sws .sw').forEach(b=>b.classList.remove('on'))};
function readImg(file,max,cb,square){
  const fr=new FileReader();fr.onload=()=>{const im=new Image();im.onload=()=>{
    const c=document.createElement('canvas'),x=c.getContext('2d');
    if(square){const s=Math.min(im.width,im.height);c.width=c.height=max;x.drawImage(im,(im.width-s)/2,(im.height-s)/2,s,s,0,0,max,max)}
    else{const k=Math.min(1,max/im.width);c.width=im.width*k;c.height=im.height*k;x.drawImage(im,0,0,c.width,c.height)}
    cb(c.toDataURL('image/jpeg',.82))};im.src=fr.result};fr.readAsDataURL(file);
}
$('#avFile').onchange=e=>{const f=e.target.files[0];if(f)readImg(f,160,d=>{me.av={t:'img',v:d};save();render()},true)};
$('#bgFile').onchange=e=>{const f=e.target.files[0];if(f)readImg(f,1000,d=>{me.bg={t:'img',v:d};save();render()})};
$('#mini').onclick=e=>go('profile',e);

/* безопасность: пароль для гостя / смена пароля */
function renderSec(){
  const box=$('#secBody');box.innerHTML='';
  const p=t=>{const e=document.createElement('p');e.className='secp';e.textContent=t;box.appendChild(e)};
  if(me.type==='google'){p('Аккаунт защищён входом через Google — пароль не нужен.');return}
  const grid=document.createElement('div');grid.className='secgrid';
  const inp=ph=>{const i=document.createElement('input');i.className='inp';i.type='password';i.placeholder=ph;i.autocomplete='new-password';grid.appendChild(i);return i};
  let old=null;
  if(me.type==='guest')p('Сейчас ты гость: войти в этот ник повторно нельзя, а аккаунт пропадёт через 7 дней без активности. Задай пароль — и он станет обычным аккаунтом с сохранением баланса и друзей.');
  else{p('Сменить пароль. Старый пароль нужен, чтобы никто не мог сделать это за тебя.');old=inp('Текущий пароль')}
  const n1=inp('Новый пароль (от 8 символов)'),n2=inp('Повтори новый пароль');
  const btn=document.createElement('button');btn.className='btn';btn.textContent=me.type==='guest'?'🔒 Создать пароль':'🔒 Сменить пароль';
  btn.onclick=async()=>{
    if(btn.disabled)return;
    if(old&&!API_ON&&!(await checkPass(me,old.value)))return toast('Текущий пароль неверный');
    if(n1.value.length<8)return toast('Пароль — минимум 8 символов');
    if(n1.value!==n2.value)return toast('Пароли не совпадают');
    btn.disabled=true;
    try{const was=me.type;if(API_ON){await api('/account/password',{method:'PATCH',body:JSON.stringify({currentPassword:old?old.value:'',newPassword:n1.value})});me.type='user';save();render();toast('Пароль изменён в базе данных')}else{me.pass=await makePass(n1.value);me.type='user';save();render();toast(was==='guest'?'Готово! Теперь это полноценный аккаунт 🎉':'Пароль изменён')}}
    finally{btn.disabled=false}
  };
  box.appendChild(grid);const r=document.createElement('div');r.className='row';r.style.marginTop='12px';r.appendChild(btn);box.appendChild(r);
}

/* ---------- Друзья ---------- */
const isOnline=a=>a.id===me.id||(a.on&&Date.now()-a.seen<ONLINE_MS);
function ago(t){
  const m=Math.floor((Date.now()-t)/6e4);
  if(m<1)return 'только что';if(m<60)return m+' мин назад';
  const h=Math.floor(m/60);if(h<24)return h+' ч назад';
  return Math.floor(h/24)+' дн назад';
}
function btnEl(txt,cls,title,fn){const b=document.createElement('button');b.className=cls;b.textContent=txt;b.title=title;b.onclick=fn;return b}
function friendRow(a,k,acts){
  const r=document.createElement('div');r.className='frow';r.style.setProperty('--k',k);
  const av=document.createElement('div');av.className='av';setAvEl(av,a.av);
  const dot=document.createElement('i');dot.className='dot'+(isOnline(a)?' on':'');av.appendChild(dot);
  const fi=document.createElement('div');fi.className='fi';
  const top=document.createElement('div');top.className='ftop';
  const n=document.createElement('b');n.textContent=a.name;n.className='fx-'+a.fx;n.style.setProperty('--nc',a.nc);
  const tag=document.createElement('span');tag.className='tag t-'+a.type;tag.textContent=TYPE_LBL[a.type].toLowerCase();
  top.append(n,tag);
  const m=document.createElement('small');m.textContent=`🪙 ${a.coins.toLocaleString('ru')} · игр: ${a.games} · ${isOnline(a)?'в сети':ago(a.seen)}`;
  fi.append(top,tagsRow(a),m);r.append(av,fi,...acts);return r;
}
function renderFriends(){
  if(!me)return;sync();
  const fl=$('#frList'),sg=$('#frSug'),q=keyName($('#frIn').value||'');
  const friends=me.friends.map(id=>accounts[id]).filter(Boolean).sort((a,b)=>isOnline(b)-isOnline(a)||a.name.localeCompare(b.name,'ru'));
  $('#frCnt').textContent=friends.length?`(${friends.length})`:'';
  fl.innerHTML='';sg.innerHTML='';
  const empty=(box,t)=>{const e=document.createElement('div');e.className='empty';e.textContent=t;box.appendChild(e)};
  if(!friends.length)empty(fl,'Пока никого. Введи ник сверху или добавь игрока из списка «Игроки в системе»');
  friends.forEach((a,i)=>fl.appendChild(friendRow(a,i,[
    btnEl('🎁','ib','Подарить '+GIFT+' монет',()=>gift(a.id)),
    btnEl('🔁','ib','Трейд: передать монеты или питомца',()=>tradeWith(a.id)),
    btnEl('💬','ib','Написать сообщение',()=>openDirectChat(a.id)),
    btnEl('✖','ib dng','Убрать из друзей',()=>unfriend(a.id))])));
  const others=Object.values(accounts).filter(a=>a.id!==me.id&&!me.friends.includes(a.id)&&(!q||keyName(a.name).includes(q)))
    .sort((a,b)=>isOnline(b)-isOnline(a)||b.seen-a.seen).slice(0,30);
  if(!others.length)empty(sg,q?'Никого с таким ником не нашлось':'Здесь появятся все, кто зайдёт в систему — хоть гостем');
  others.forEach((a,i)=>sg.appendChild(friendRow(a,i,[btnEl('➕','ib','Добавить в друзья',()=>link(a.id))])));
}
function link(id){
  const name=tx(acc=>{
    const o=acc[id];if(!o)return null;
    if(!me.friends.includes(id))me.friends.push(id);
    if(!o.friends.includes(me.id))o.friends.push(me.id);
    return o.name;
  });
  if(!name)return toast('Игрок пропал из системы');
  $('#frIn').value='';renderFriends();toast('🤝 '+name+' теперь в друзьях');
}
function unfriend(id){
  tx(acc=>{me.friends=me.friends.filter(f=>f!==id);if(acc[id])acc[id].friends=acc[id].friends.filter(f=>f!==me.id)});
  renderFriends();toast('Убрано из друзей');
}
function gift(id){
  if(me.coins<GIFT)return toast('Не хватает монет для подарка');
  const name=tx(acc=>{const o=acc[id];if(!o)return null;me.coins-=GIFT;o.coins+=GIFT;return o.name});
  if(!name)return toast('Игрок пропал из системы');
  updBal();renderFriends();toast(`🎁 ${name} получил ${GIFT} монет`);
}
async function tradeWith(id){
  sync();const friend=accounts[id];if(!friend||!me.friends.includes(id))return toast('Трейд доступен только друзьям');
  const choice=prompt(`Трейд с ${friend.name}\nВведите: coins — передать монеты, pet — передать купленного питомца.\nПередача питомца необратима: получатель не сможет передать его дальше.`);
  if(!choice)return;const type=choice.trim().toLowerCase();
  if(!['coins','pet'].includes(type))return toast('Выбери coins или pet');
  let payload={targetId:id,type};let label='';
  if(type==='coins'){
    const amount=Math.floor(Number(prompt('Сколько монет передать?')));if(!Number.isSafeInteger(amount)||amount<1)return toast('Укажи положительное число монет');
    if(amount>me.coins)return toast('Не хватает монет');if(!confirm(`Передать ${amount.toLocaleString('ru')} монет игроку ${friend.name}? Отменить перевод нельзя.`))return;
    payload.amount=amount;label=`🪙 Передано ${amount.toLocaleString('ru')} монет игроку ${friend.name}`;
  }else{
    const transferable=PETS.filter(p=>p.price>=100000&&(me.petOwned||[]).includes(p.id)&&!(me.petNoTrade||{})[p.id]);
    if(!transferable.length)return toast('Нет купленных питомцев, доступных для передачи');
    const n=Number(prompt('Какого питомца передать? Введи номер:\n'+transferable.map((p,i)=>`${i+1}. ${p.name} — ${p.price.toLocaleString('ru')} монет`).join('\n')));const p=transferable[n-1];if(!p)return toast('Питомец не выбран');
    if(!confirm(`⚠️ НЕОБРАТИМЫЙ ТРЕЙД\n\nПередать «${p.name}» игроку ${friend.name}?\nПитомец исчезнет из твоей коллекции, а получатель не сможет передать его дальше или вернуть. Продолжить?`))return;
    payload.petId=p.id;label=`🐾 «${p.name}» передан игроку ${friend.name}`;
  }
  if(API_ON){try{const d=await api('/game/trade',{method:'POST',body:JSON.stringify(payload)});const all=LS.get('nv_acc',{});const updated=hydrateServerUser({...d.state,id:me.id,name:me.name,role:me.role,status:me.status});me={...me,...updated};all[me.id]=me;LS.set('nv_acc',all);await refreshServerUsers();save();updBal(true);render();renderFriends();toast(label);return}catch(e){return toast(e.message)}}
  const result=tx(acc=>{const o=acc[id];if(!o||!me.friends.includes(id))return 'friend';if(type==='coins'){if(me.coins<payload.amount)return 'funds';me.coins-=payload.amount;o.coins=(+o.coins||0)+payload.amount;return 'ok'}const petId=payload.petId;if(!(me.petOwned||[]).includes(petId)||(me.petNoTrade||{})[petId])return 'pet';me.petOwned=me.petOwned.filter(x=>x!==petId);if(me.petId===petId)me.petId='';o.petOwned=Array.isArray(o.petOwned)?o.petOwned:[];if(!o.petOwned.includes(petId))o.petOwned.push(petId);o.petNoTrade=o.petNoTrade||{};o.petNoTrade[petId]=true;return 'ok'});
  if(result==='funds')return toast('Не хватает монет');if(result!=='ok')return toast('Трейд не выполнен');save();updBal();renderFriends();toast(label);
}
$('#frForm').onsubmit=e=>{
  e.preventDefault();const v=normName($('#frIn').value);if(!v)return;
  const a=findByName(v);
  if(!a)return toast('Игрок «'+v+'» не найден — ему нужно хотя бы раз зайти в систему');
  if(a.id===me.id)return toast('Себя добавить нельзя 🙂');
  if(me.friends.includes(a.id))return toast('Вы уже друзья');
  link(a.id);
};
$('#frIn').oninput=()=>renderFriends();
setInterval(()=>{if(!me)return;me.seen=Date.now();save();if(API_ON)refreshServerUsers();if(curView==='friends'&&!$('#frIn').matches(':focus'))renderFriends();if(curView==='top')renderTop()},20e3);

/* ---------- Лидерборд ----------
   В рейтинге только зарегистрированные (ник+пароль или Google) и гости, задавшие пароль
   (после этого тип аккаунта меняется на «user»). Обычные гости в таблицу не попадают. */
const ranked=a=>a.type!=='guest';
const TOP_MODES=[
  {k:'coins',ic:'🪙',n:'Монеты',v:a=>a.coins},
  {k:'best',ic:'🏆',n:'Макс. выигрыш',v:a=>a.best},
  {k:'won',ic:'💸',n:'Всего выиграно',v:a=>a.won},
  {k:'games',ic:'🎮',n:'Игр сыграно',v:a=>a.games}
];
let topMode=0;
(function(){
  const t=$('#topTabs');
  TOP_MODES.forEach((m,i)=>{const b=document.createElement('button');b.type='button';b.className=i?'':'on';b.textContent=m.ic+' '+m.n;
    b.onclick=()=>{topMode=i;$$('#topTabs button').forEach(x=>x.classList.toggle('on',x===b));renderTop()};t.appendChild(b)});
})();
function renderTop(){
  if(!me)return;sync();accounts[me.id]=me;
  const m=TOP_MODES[topMode],list=Object.values(accounts).filter(ranked)
    .sort((a,b)=>m.v(b)-m.v(a)||b.best-a.best||b.coins-a.coins||a.name.localeCompare(b.name,'ru'));
  const box=$('#topList'),note=$('#topNote');box.innerHTML='';note.innerHTML='';
  const pos=list.findIndex(a=>a.id===me.id);
  const msg=document.createElement('div');msg.className='tnote';
  if(me.type==='guest'){
    msg.textContent='Ты играешь как гость — в таблице тебя нет. Задай пароль в профиле, и аккаунт попадёт в рейтинг вместе со всем прогрессом.';
    const b=document.createElement('button');b.type='button';b.className='btn';b.textContent='🔒 Создать пароль';b.onclick=e=>go('profile',e);
    note.append(msg,b);
  }else{
    msg.textContent=pos>=0?`Твоё место: #${pos+1} из ${list.length} · ${m.ic} ${m.v(me).toLocaleString('ru')}`:'';
    note.append(msg);
  }
  if(!list.length){const e=document.createElement('div');e.className='empty';e.textContent='Пока в таблице никого. Зарегистрируйся — и стань первым!';box.appendChild(e);return}
  list.slice(0,50).forEach((a,i)=>{
    const r=document.createElement('div');r.className='frow trow'+(a.id===me.id?' me':'')+(i<3?' p'+(i+1):'');r.style.setProperty('--k',i);
    const rk=document.createElement('div');rk.className='rk';rk.textContent=i<3?['🥇','🥈','🥉'][i]:'#'+(i+1);
    const av=document.createElement('div');av.className='av';setAvEl(av,a.av);
    const dot=document.createElement('i');dot.className='dot'+(isOnline(a)?' on':'');av.appendChild(dot);
    const fi=document.createElement('div');fi.className='fi';
    const top=document.createElement('div');top.className='ftop';
    const n=document.createElement('b');n.textContent=a.name;n.className='fx-'+a.fx;n.style.setProperty('--nc',a.nc);top.appendChild(n);
    if(a.id===me.id){const y=document.createElement('span');y.className='tag';y.textContent='ты';top.appendChild(y)}
    const s=document.createElement('small');s.textContent=`🏆 макс. выигрыш: ${a.best.toLocaleString('ru')} · 🪙 ${a.coins.toLocaleString('ru')} · игр: ${a.games}`;
    fi.append(top,tagsRow(a),s);
    const v=document.createElement('div');v.className='tv';v.textContent=m.v(a).toLocaleString('ru');
    const vl=document.createElement('span');vl.textContent=m.n;v.appendChild(vl);
    r.append(rk,av,fi,v);box.appendChild(r);
  });
}

/* ---------- Пожертвования ---------- */
function renderDonate(){
  renderCoinDonate();
  const g=$('#dnGrid'),h=$('#dnHint'),gl=$('#dnGoal');g.innerHTML='';h.textContent='';gl.innerHTML='';
  const links=(DONATE.links||[]).filter(l=>l&&l.label&&/^https:\/\//i.test(l.url));
  const reqs=(DONATE.requisites||[]).filter(r=>r&&r.label&&r.value);
  links.forEach(l=>{const a=document.createElement('a');a.className='btn gold';a.href=l.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent='💜 '+l.label;g.appendChild(a)});
  reqs.forEach(r=>{
    const d=document.createElement('div');d.className='dn-req';
    const t=document.createElement('div');const s=document.createElement('small');s.textContent=r.label;const v=document.createElement('b');v.textContent=r.value;t.append(s,v);
    const c=document.createElement('button');c.type='button';c.className='ib';c.title='Скопировать';c.textContent='📋';
    c.onclick=async()=>{try{await navigator.clipboard.writeText(r.value);toast('Скопировано: '+r.label)}catch{toast('Не удалось скопировать — выдели и скопируй вручную')}};
    d.append(t,c);g.appendChild(d);
  });
  if(!links.length&&!reqs.length)h.textContent='Способы поддержки скоро появятся здесь 💜';
  const T=+DONATE.goalTarget||0;
  if(T>0){
    const cur=Math.max(0,+DONATE.goalCurrent||0),p=Math.min(100,Math.round(cur/T*100)),u=DONATE.goalUnit||'';
    const l=document.createElement('div');l.className='dn-gl';l.textContent=`${DONATE.goalTitle||'Цель сбора'}: ${cur.toLocaleString('ru')} / ${T.toLocaleString('ru')} ${u} (${p}%)`;
    const bar=document.createElement('div');bar.className='dn-bar';const f=document.createElement('b');f.style.width=p+'%';bar.appendChild(f);
    gl.append(l,bar);
  }
}

/* пожертвования монетами: перевод на аккаунт создателя (самого раннего из созданных) */
const COIN_AMTS=[100,200,300,500,1000,5000],RUB_AMTS=[100,200,300,500,1000];
let dnMode='coin',dnCoin=100,dnRub=300;
function amtButtons(box,list,cur,unit,set){
  box.innerHTML='';
  list.forEach(v=>{const b=document.createElement('button');b.type='button';b.className=v===cur?'on':'';b.textContent=v.toLocaleString('ru')+' '+unit;b.onclick=()=>set(v);box.appendChild(b)});
}
const findCreator=()=>Object.values(sync()).filter(a=>a.creator&&(!me||a.id!==me.id)).sort((a,b)=>a.created-b.created)[0];
function renderCoinDonate(){
  if(!me)return;
  $$('#dnTabs button').forEach(b=>b.classList.toggle('on',b.dataset.m===dnMode));
  $('#dnCoin').hidden=dnMode!=='coin';$('#dnRub').hidden=dnMode!=='rub';
  const custom=$('#dnCustom').value!=='';
  amtButtons($('#dnCoinAmts'),COIN_AMTS,custom?0:dnCoin,'🪙',v=>{dnCoin=v;$('#dnCustom').value='';renderCoinDonate()});
  amtButtons($('#dnRubAmts'),RUB_AMTS,dnRub,'₽',v=>{dnRub=v;renderCoinDonate()});
  $('#dnPay').textContent='₽ Поддержать на '+dnRub.toLocaleString('ru')+' ₽';
  const info=$('#dnCoinInfo'),btn=$('#dnSend'),c=findCreator();
  if(me.creator){info.textContent=`Ты создатель сайта — монеты от игроков приходят тебе. Получено всего: ${me.received.toLocaleString('ru')} 🪙`;btn.disabled=true}
  else{
    btn.disabled=!c;
    info.textContent=c?`Получатель: ${c.name} · у тебя ${me.coins.toLocaleString('ru')} 🪙`+(me.donated?` · уже отправлено: ${me.donated.toLocaleString('ru')} 🪙`:''):'Создатель пока не зарегистрирован в системе — отправлять монеты некому.';
  }
}
$$('#dnTabs button').forEach(b=>b.onclick=()=>{dnMode=b.dataset.m;renderCoinDonate()});
$('#dnCustom').oninput=()=>renderCoinDonate();
$('#dnSend').onclick=()=>{
  if(!me||me.creator)return;
  const raw=$('#dnCustom').value,n=Math.floor(+(raw!==''?raw:dnCoin));
  if(!(n>=1))return toast('Введи сумму от 1 монеты');
  if(n>me.coins)return toast('Не хватает монет');
  const to=tx(acc=>{
    const c=Object.values(acc).filter(a=>a.creator&&a.id!==me.id).sort((a,b)=>a.created-b.created)[0];
    if(!c)return null;
    me.coins-=n;me.donated+=n;c.coins+=n;c.received=(c.received||0)+n;return c;
  });
  if(!to)return toast('Создатель не найден');
  $('#dnCustom').value='';rain();updBal();render();toast(`💜 Спасибо! ${to.name} получил ${n.toLocaleString('ru')} монет`);
};
$('#dnPay').onclick=()=>{
  const l=(DONATE.links||[]).find(l=>l&&/^https:\/\//i.test(l.url));
  if(!l)return toast('Приём рублей скоро подключим 💜');
  window.open(l.url,'_blank','noopener,noreferrer');
};

/* ---------- Диалог ---------- */
function ask(t,p,ok='Да',no='Отмена'){
  return new Promise(res=>{
    $('#dT').textContent=t;$('#dP').textContent=p;$('#dYes').textContent=ok;$('#dNo').textContent=no;
    const d=$('#dlg');d.classList.add('show');
    const done=v=>{d.classList.remove('show');$('#dYes').onclick=$('#dNo').onclick=null;res(v)};
    $('#dYes').onclick=()=>done(true);$('#dNo').onclick=()=>done(false);
  });
}

/* ---------- Ежедневный вход ----------
   День N серии = N×100 монет, максимум на 100-й день (10 000). Пропущенный календарный день обнуляет серию. */
const STREAK_MAX=100,STREAK_STEP=100,reward=n=>Math.min(n,STREAK_MAX)*STREAK_STEP;
const dayKey=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const todayKey=()=>dayKey(new Date());
const yestKey=()=>{const d=new Date();d.setDate(d.getDate()-1);return dayKey(d)};
function streakState(){
  const t=todayKey(),claimed=me.lastDay===t,alive=claimed||me.lastDay===yestKey();
  const cur=alive?me.streak:0;
  return {claimed,cur,day:claimed?cur:cur+1};     /* day — номер дня, который сегодня забирается / уже забран */
}
let stKey='';
function renderStreak(){
  if(!me)return;
  const s=streakState(),page=Math.floor((s.day-1)/10)*10,g=$('#stGrid');g.innerHTML='';stKey=todayKey()+'|'+me.streak+'|'+me.lastDay;
  $('#stSum').textContent=s.cur?`Серия: ${s.cur} дн. · рекорд: ${me.bestStreak}`:`Серия начнётся с первого входа · рекорд: ${me.bestStreak}`;
  for(let i=1;i<=10;i++){
    const d=page+i,c=document.createElement('div');
    c.className='st-day'+(d<=s.cur?' done':'')+(d===s.day?' today':'')+(d>s.day||(d===s.day&&!s.claimed&&d>s.cur)?' fut':'');
    if(d===s.day&&!s.claimed)c.classList.add('now');
    const a=document.createElement('small'),b=document.createElement('b'),m=document.createElement('span');
    a.textContent='День '+d;b.textContent='+'+reward(d).toLocaleString('ru');m.textContent=d<=s.cur?'✓':(d===s.day?'🎁':'🪙');
    c.append(a,m,b);g.appendChild(c);
  }
}
function bonusTick(){
  if(!me)return;
  if(stKey!==todayKey()+'|'+me.streak+'|'+me.lastDay)renderStreak();
  const s=streakState(),b=$('#bonusBtn');
  if(!s.claimed){b.textContent=`🎁 День ${s.day}: забрать +${reward(s.day).toLocaleString('ru')} монет`;b.disabled=false;return}
  const nx=new Date();nx.setHours(24,0,0,0);const left=nx-Date.now();
  const h=Math.floor(left/36e5),m=Math.floor(left%36e5/6e4),sec=Math.floor(left%6e4/1e3);
  b.textContent=`⏳ День ${s.day+1}: +${reward(s.day+1).toLocaleString('ru')} · через ${h}ч ${m}м ${sec}с`;b.disabled=true;
}
setInterval(bonusTick,1000);
$('#bonusBtn').onclick=()=>{
  if(!me)return;sync();const s=streakState();if(s.claimed)return bonusTick();
  me.streak=s.day;me.lastDay=todayKey();me.bestStreak=Math.max(me.bestStreak,me.streak);
  const r=reward(s.day);addCoins(r);rain();render();bonusTick();
  toast(`🎁 День ${s.day}: +${r.toLocaleString('ru')} монет!`);
};

/* ---------- Анимированный переход ----------
   Круг-«шторка» раскрывается от места клика, под ним крутится кольцо из монет,
   проявляется логотип, потом шторка плавно растворяется, а новый экран «въезжает». */
(function buildWipe(){
  const w=$('#wipe');
  const coins=Array.from({length:12},(_,i)=>`<div class="wp-c" style="--a:${i*30}deg"><div class="wp-ci" style="--a:${i*30}deg;--i:${i}"><div class="wp-cf" style="--i:${i}">$</div></div></div>`).join('');
  const row=t=>`<div class="wp-row">${[...t].map((c,i)=>`<span style="--i:${i}">${c}</span>`).join('')}</div>`;
  const sparks=Array.from({length:22},()=>{
    const x=(Math.random()-.5)*innerWidth*.9,y=(Math.random()-.5)*innerHeight*.9;
    return `<i style="--x:${x|0}px;--y:${y|0}px;--t:${(.9+Math.random()*.9).toFixed(2)}s;--d:${(Math.random()*.6).toFixed(2)}s"></i>`}).join('');
  w.innerHTML=`<div class="wp-grid"></div><div class="wp-glow"></div><div class="wp-orbit"></div><div class="wp-ring">${coins}</div>
    <div class="wp-title">${row('NEON')}${row('VAULT')}</div><div class="wp-sparks">${sparks}</div><div class="wp-sweep"></div>`;
})();

async function transition(swap,reveal,ev){
  const w=$('#wipe'),W=innerWidth,H=innerHeight;
  const x=ev&&(ev.clientX||ev.clientY)?ev.clientX:W/2,y=ev&&(ev.clientX||ev.clientY)?ev.clientY:H/2;
  const R=Math.hypot(Math.max(x,W-x),Math.max(y,H-y))+24;
  let swapped=false;const doSwap=()=>{if(!swapped){swapped=true;swap&&swap()}};
  try{
    w.style.clipPath=`circle(0px at ${x}px ${y}px)`;w.style.display='block';w.classList.add('cover');
    const open=w.animate([{clipPath:`circle(0px at ${x}px ${y}px)`},{clipPath:`circle(${R}px at ${x}px ${y}px)`}],
      {duration:RM?1:520,easing:'cubic-bezier(.65,0,.25,1)',fill:'forwards'});
    await open.finished;
    doSwap();                                    // экран меняется под закрытой шторкой
    await sleep(RM?1:460);
    reveal&&reveal();
    const out=w.animate([{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(1.1)'}],
      {duration:RM?200:560,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'});
    await out.finished;
  }catch(err){console.warn('transition fallback',err);doSwap();reveal&&reveal()}
  w.getAnimations().forEach(a=>a.cancel());
  w.style.display='none';w.style.clipPath='';w.classList.remove('cover');
}
/* плавное «въезжание» карточек нового экрана */
function popIn(v){
  [...v.children].forEach((c,i)=>c.style.setProperty('--k',i));
  v.classList.remove('pop');void v.offsetWidth;v.classList.add('pop');
  clearTimeout(popIn.t);popIn.t=setTimeout(()=>v.classList.remove('pop'),1500);
}

async function go(id,ev){
  if(navBusy||id===curView||!me)return;navBusy=true;
  $$('.nbtn').forEach(b=>b.classList.toggle('on',b.dataset.view===id));
  const to=$('#v-'+id);
  await transition(()=>{
    $('#v-'+curView).classList.remove('active','pop');to.classList.add('active');to.scrollTop=0;curView=id;
    if(id==='friends')renderFriends();if(id==='messenger')renderMessenger();if(id==='lobby')renderLobbyCommunity();if(id==='profile'){renderSec();renderTags()}if(id==='top')renderTop();if(id==='tap')renderTapper();if(id==='evolution'){renderTapper();renderEvolutionScreen()}if(id==='admin'){if(!me.owner){toast('Нет доступа');navBusy=false;return}renderAdmin()}
  },()=>popIn(to),ev);
  navBusy=false;
}
$$('.nbtn').forEach(b=>b.onclick=e=>go(b.dataset.view,e));
$$('.gcard').forEach(c=>{
  c.onclick=e=>go(c.dataset.go,e);
  c.onmousemove=e=>{const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;c.style.transform=`rotateY(${x*22}deg) rotateX(${-y*22}deg) scale(1.04)`};
  c.onmouseleave=()=>c.style.transform='';
});


/* ---------- Лобби: журнал обновлений, идеи и VaultBot ---------- */
const IDEA_KEY='nv_community_ideas_v1';
const CHAT_KEY='nv_messenger_chats_v1';
let activeChatId='';
const ROLE_MENTIONS=['Создатель','Архитектор','Хозяин хранилища','Основатель'];
function loadIdeas(){const v=LS.get(IDEA_KEY,[]);return Array.isArray(v)?v:[]}
function saveIdeas(v){LS.set(IDEA_KEY,v)}
function notifyRoleAccounts(idea){
  sync();const targets=Object.values(accounts).filter(a=>a.id!==me.id&&(a.tags||[]).some(id=>TAG_BY[id]&&TAG_BY[id].g==='creator'));
  if(!targets.length)return;
  const chats=loadChats();targets.forEach(a=>{let c=chats.find(x=>x.type==='bot'&&x.members.includes(a.id));if(!c){c={id:rid('bot_'),type:'bot',members:[a.id,'vaultbot'],name:'VaultBot · идеи проекта',created:Date.now(),messages:[]};chats.push(c)}c.messages.push({id:rid('msg_'),from:'vaultbot',time:Date.now(),kind:'text',text:`Новое предложение от ${idea.author}: «${idea.title}»${idea.details?' — '+idea.details:''}\n\nОткрой лобби NEON VAULT, чтобы посмотреть идею и проголосовать.`});});saveChats(chats);
}
async function renderLobbyCommunity(){
  if(!me)return;
  const feed=$('#ideaFeed');if(!feed)return;
  let ideas=loadIdeas();
  if(API_ON){try{const d=await api('/community/ideas');ideas=(d.ideas||[]).map(x=>({id:x.id,title:x.title,details:x.details,author:x.author,authorId:x.author_id,created:x.created_at,votes:x.votes,voted:!!x.voted}));}catch(e){console.warn('Ideas sync failed:',e.message)}}
  ideas.sort((a,b)=>b.created-a.created);ideas=ideas.slice(0,12);feed.replaceChildren();
  if(!ideas.length){const empty=document.createElement('div');empty.className='idea-empty';empty.textContent='Пока нет предложений. Стань первым, кто предложит новую функцию!';feed.appendChild(empty);return}
  ideas.forEach((idea,i)=>{
    const card=document.createElement('article');card.className='idea-card';
    const top=document.createElement('div');top.className='idea-card-top';
    const bot=document.createElement('span');bot.className='bot-chip';bot.textContent='🤖 VaultBot';
    const when=document.createElement('time');when.textContent=new Date(idea.created).toLocaleDateString('ru');top.append(bot,when);
    const title=document.createElement('h3');title.textContent=idea.title;
    const desc=document.createElement('p');desc.textContent=idea.details||'Автор не добавил подробностей.';
    const author=document.createElement('small');author.className='idea-author';author.textContent='Предложил: '+idea.author;
    const roles=document.createElement('div');roles.className='role-mentions';ROLE_MENTIONS.forEach(r=>{const b=document.createElement('span');b.textContent='@'+r;roles.appendChild(b)});
    const foot=document.createElement('div');foot.className='idea-card-foot';const vote=document.createElement('button');vote.type='button';vote.className='btn ghost idea-vote'+((idea.voted||(idea.voters||[]).includes(me.id))?' voted':'');vote.textContent='▲ Поддержать · '+(idea.votes??(idea.voters||[]).length);vote.onclick=async()=>{if(API_ON){try{await api('/community/ideas/'+encodeURIComponent(idea.id)+'/vote',{method:'POST'});await renderLobbyCommunity()}catch(e){toast(e.message)}return}const all=loadIdeas(),x=all.find(y=>y.id===idea.id);if(!x)return;x.voters=x.voters||[];if(x.voters.includes(me.id))x.voters=x.voters.filter(id=>id!==me.id);else x.voters.push(me.id);saveIdeas(all);renderLobbyCommunity()};
    const status=document.createElement('span');status.className='idea-status';status.textContent='VaultBot опубликовал идею';foot.append(vote,status);card.append(top,title,desc,author,roles,foot);feed.appendChild(card);
  });
}
$('#ideaForm')?.addEventListener('submit',async e=>{
  e.preventDefault();if(!me)return;const title=$('#ideaTitle').value.trim(),details=$('#ideaDetails').value.trim();if(title.length<4)return toast('Напиши идею чуть подробнее');
  if(API_ON){try{await api('/community/ideas',{method:'POST',body:JSON.stringify({title,details})});$('#ideaTitle').value='';$('#ideaDetails').value='';await renderLobbyCommunity();toast('🤖 Идея опубликована и сохранена на сервере');}catch(err){toast(err.message)}return}
  const ideas=loadIdeas();const idea={id:rid('idea_'),title,details,author:me.name,authorId:me.id,created:Date.now(),voters:[]};ideas.push(idea);saveIdeas(ideas);notifyRoleAccounts(idea);$('#ideaTitle').value='';$('#ideaDetails').value='';renderLobbyCommunity();toast('🤖 VaultBot опубликовал идею и уведомил аккаунты с тегами проекта');
});

/* ---------- Мессенджер: личные и групповые чаты ---------- */
function loadChats(){const v=LS.get(CHAT_KEY,[]);return Array.isArray(v)?v:[]}
function saveChats(v){LS.set(CHAT_KEY,v)}
function dmId(a,b){return 'dm_'+[a,b].sort().join('_')}
async function openDirectChat(id){
  if(!me||!me.friends.includes(id))return toast('Личные сообщения доступны друзьям');
  sync();const friend=accounts[id];if(!friend)return toast('Игрок не найден');
  if(API_ON){try{const d=await api('/community/chats/dm',{method:'POST',body:JSON.stringify({userId:id})});activeChatId=d.id;}catch(e){return toast(e.message)}}
  else{const chats=loadChats(),cid=dmId(me.id,id);let chat=chats.find(c=>c.id===cid);if(!chat){chat={id:cid,type:'dm',members:[me.id,id],name:'',created:Date.now(),messages:[]};chats.push(chat);saveChats(chats)}activeChatId=cid}
  go('messenger');setTimeout(()=>renderMessenger(),0);
}
async function createGroupChat(){
  if(!me)return;sync();const friends=me.friends.map(id=>accounts[id]).filter(Boolean);
  if(!friends.length)return toast('Сначала добавь друзей — группу можно создать с любым количеством участников');
  const name=prompt('Название группы:');if(!name||!name.trim())return;
  const list=friends.map((f,i)=>`${i+1}. ${f.name}`).join('\n');const raw=prompt('Введи номера участников через запятую. Можно добавить всех друзей.\n'+list+'\n\nПример: 1,2,3');if(raw===null)return;
  const nums=raw.split(/[ ,;]+/).map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=friends.length);const members=[me.id,...nums.map(n=>friends[n-1].id)];const unique=[...new Set(members)];
  if(API_ON){try{const d=await api('/community/chats/group',{method:'POST',body:JSON.stringify({name:name.trim().slice(0,60),memberIds:unique.filter(id=>id!==me.id)})});activeChatId=d.id;await renderMessenger();toast('👥 Группа создана: '+unique.length+' участника(ов)')}catch(e){toast(e.message)}return}const chat={id:rid('group_'),type:'group',members:unique,name:name.trim().slice(0,60),created:Date.now(),messages:[]};const chats=loadChats();chats.push(chat);saveChats(chats);activeChatId=chat.id;renderMessenger();toast('👥 Группа создана: '+unique.length+' участника(ов)');
}
function getChatName(chat){if(chat.type==='group'||chat.type==='bot')return chat.name||(chat.type==='bot'?'VaultBot':'Группа');const other=chat.members.find(id=>id!==me.id);if(other==='vaultbot')return 'VaultBot';sync();return accounts[other]?.name||'Удалённый игрок'}
async function renderMessenger(){
  if(!me||!$('#chatList'))return;sync();let chats=loadChats().filter(c=>Array.isArray(c.members)&&c.members.includes(me.id));
  if(API_ON){try{const d=await api('/community/chats');chats=(d.chats||[]).map(c=>({...c,messages:[],members:c.members||[]}));if(activeChatId&&!chats.some(c=>c.id===activeChatId))activeChatId='';if(activeChatId){const m=await api('/community/chats/'+encodeURIComponent(activeChatId)+'/messages');const active=chats.find(c=>c.id===activeChatId);if(active)active.messages=(m.messages||[]).map(x=>{let payload={};try{payload=JSON.parse(x.body)}catch{payload={text:x.body}};return {id:x.id,from:x.sender_id,time:x.created_at,kind:x.kind,...payload}})}}catch(e){console.warn('Messenger sync failed:',e.message)}}
  const q=($('#chatSearch')?.value||'').toLocaleLowerCase('ru');const filtered=chats.filter(c=>getChatName(c).toLocaleLowerCase('ru').includes(q)).sort((a,b)=>(b.messages?.at(-1)?.time||b.created)-(a.messages?.at(-1)?.time||a.created));
  $('#chatCount').textContent=chats.length;const list=$('#chatList');list.replaceChildren();
  if(!filtered.length){const e=document.createElement('div');e.className='chat-list-empty';e.textContent='Чатов пока нет. Открой «Друзья» и нажми 💬 или создай группу.';list.appendChild(e)}
  filtered.forEach(c=>{const b=document.createElement('button');b.type='button';b.className='chat-list-item'+(c.id===activeChatId?' active':'');const av=document.createElement('span');av.className='chat-list-avatar';av.textContent=c.type==='group'?'👥':c.type==='bot'?'🤖':'💬';const info=document.createElement('span');info.className='chat-list-info';const n=document.createElement('b');n.textContent=getChatName(c);const last=document.createElement('small');const m=(c.messages||[]).at(-1);last.textContent=m?(m.kind==='pet'?'🐾 Питомец':m.kind==='image'?'▧ Изображение':m.kind==='sticker'?'Стикер '+m.text:(m.text||'GIF')).slice(0,48):'Начни общение';info.append(n,last);b.append(av,info);b.onclick=()=>{activeChatId=c.id;renderMessenger()};list.appendChild(b)});
  const active=chats.find(c=>c.id===activeChatId);
  if(!active){$('#chatEmpty').hidden=false;$('#chatActive').hidden=true;return}
  $('#chatEmpty').hidden=true;$('#chatActive').hidden=false;$('#activeChatName').textContent=getChatName(active);$('#activeChatMeta').textContent=active.type==='group'?`${active.members.length} участников · группа`:active.type==='bot'?'Системные уведомления NEON VAULT':'Личный чат · друг';$('#activeChatAvatar').textContent=active.type==='group'?'👥':active.type==='bot'?'🤖':'✦';
  const msgs=$('#chatMessages');msgs.replaceChildren();(active.messages||[]).forEach(m=>{
    const row=document.createElement('div');row.className='message-row'+(m.from===me.id?' mine':'');const bubble=document.createElement('div');bubble.className='message-bubble';
    if(m.from!==me.id){const who=document.createElement('small');who.className='message-author';sync();who.textContent=m.from==='vaultbot'?'VaultBot':(accounts[m.from]?.name||'Игрок');bubble.appendChild(who)}
    if(m.kind==='image'){const im=document.createElement('img');im.className='message-image';im.src=m.src;im.alt=m.text||'Вложение';im.loading='lazy';bubble.appendChild(im);if(m.text){const cap=document.createElement('p');cap.textContent=m.text;bubble.appendChild(cap)}}
    else if(m.kind==='pet'){const p=PETS.find(x=>x.id===m.petId);const petbox=document.createElement('div');petbox.className='shared-pet';const im=document.createElement('img');im.src=petArtSrc(m.petId);im.alt=p?.name||'Питомец';const name=document.createElement('b');name.textContent=(p?.name||'Питомец')+' · питомец игрока';petbox.append(im,name);bubble.appendChild(petbox)}
    else{const txt=document.createElement('p');txt.textContent=m.text||'';bubble.appendChild(txt)}
    const time=document.createElement('time');time.textContent=new Date(m.time).toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'});bubble.appendChild(time);row.appendChild(bubble);msgs.appendChild(row);
  });msgs.scrollTop=msgs.scrollHeight;
}
async function sendChatMessage(payload){
  if(API_ON){if(!activeChatId)return toast('Сначала выбери или открой личный чат');try{await api('/community/chats/'+encodeURIComponent(activeChatId)+'/messages',{method:'POST',body:JSON.stringify({kind:payload.kind||'text',body:JSON.stringify(payload)})});$('#chatText').value='';$('#chatQuickPicker').hidden=true;await renderMessenger()}catch(e){toast(e.message)}return}
  const chats=loadChats(),chat=chats.find(c=>c.id===activeChatId&&c.members.includes(me.id));if(!chat)return toast('Сначала выбери чат');
  chat.messages=chat.messages||[];chat.messages.push({id:rid('msg_'),from:me.id,time:Date.now(),...payload});if(chat.messages.length>500)chat.messages=chat.messages.slice(-500);saveChats(chats);$('#chatText').value='';$('#chatQuickPicker').hidden=true;renderMessenger();
}
$('#newGroupBtn')?.addEventListener('click',createGroupChat);
$('#newDmBtn')?.addEventListener('click',()=>{const name=prompt('Ник друга, которому написать:');if(!name)return;sync();const a=Object.values(accounts).find(x=>keyName(x.name)===keyName(name));if(!a)return toast('Игрок не найден');if(!me.friends.includes(a.id))return toast('Сначала добавь игрока в друзья');openDirectChat(a.id)});
$('#chatSearch')?.addEventListener('input',renderMessenger);
setInterval(()=>{if(API_ON&&me&&curView==='messenger'&&!$('#chatText')?.matches(':focus'))renderMessenger()},10000);
$('#chatCompose')?.addEventListener('submit',e=>{e.preventDefault();const text=$('#chatText').value.trim();if(text)sendChatMessage({kind:'text',text})});
const QUICK_EMOJI=['😀','😂','🥹','😍','😎','😭','🔥','💜','💗','✨','🎉','👍','👀','🤝','🫶','🐱','🐰','🐻'];
const QUICK_STICKERS=['🐱💖','🐰✨','🐻🫶','😻','ฅ^•ﻌ•^ฅ','(づ｡◕‿‿◕｡)づ','✨ NEON ✨','🐾'];
function openPicker(kind){const box=$('#chatQuickPicker');box.replaceChildren();const items=kind==='emoji'?QUICK_EMOJI:QUICK_STICKERS;items.forEach(v=>{const b=document.createElement('button');b.type='button';b.className='quick-pick';b.textContent=v;b.onclick=()=>{if(kind==='emoji')$('#chatText').value += v;else sendChatMessage({kind:'sticker',text:v});if(kind==='emoji')$('#chatText').focus()};box.appendChild(b)});box.hidden=false}
$('#emojiBtn')?.addEventListener('click',()=>openPicker('emoji'));
$('#stickerBtn')?.addEventListener('click',()=>openPicker('sticker'));
$('#gifBtn')?.addEventListener('click',()=>{const url=prompt('Вставь прямую HTTPS-ссылку на GIF (например, .gif):');if(!url)return;if(!/^https:\/\//i.test(url))return toast('Для GIF нужна HTTPS-ссылка');sendChatMessage({kind:'image',src:url,text:'GIF'})});
$('#chatImageInput')?.addEventListener('change',e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;if(!file.type.startsWith('image/'))return toast('Выбери файл изображения или GIF');if(file.size>450*1024)return toast('Файл слишком большой — максимум 450 КБ');const reader=new FileReader();reader.onload=()=>sendChatMessage({kind:'image',src:String(reader.result),text:file.name});reader.onerror=()=>toast('Не удалось прочитать файл');reader.readAsDataURL(file)});
$('#showPetBtn')?.addEventListener('click',()=>{if(!me.petId)return toast('Сначала выбери питомца в тапалке');sendChatMessage({kind:'pet',petId:me.petId})});

/* ---------- NEON PET CLUB ---------- */
const PETS=[
{id:'cat',name:'Котик любви',emoji:'🐱',price:0,rarity:'СТАРТОВЫЙ',desc:'Ласковый талисман с сердечками.',free:true},
{id:'bunny',name:'Зайка облачко',emoji:'🐰',price:0,rarity:'СТАРТОВЫЙ',desc:'Прыгучий друг с удачей.',free:true},
{id:'bear',name:'Мишка-мёдик',emoji:'🐻',price:0,rarity:'СТАРТОВЫЙ',desc:'Добрый защитник коллекции.',free:true},
{id:'fox',name:'Неоновый лис',emoji:'🦊',price:100000,rarity:'НЕОНОВЫЙ',desc:'Хитрый и быстрый компаньон.'},
{id:'panda',name:'Панда матча',emoji:'🐼',price:250000,rarity:'НЕОНОВЫЙ',desc:'Спокойствие превращает тапы в силу.'},
{id:'frog',name:'Мятный жабик',emoji:'🐸',price:400000,rarity:'НЕОНОВЫЙ',desc:'Редкий прыгун из мятного сада.'},
{id:'hamster',name:'Хомяк-бублик',emoji:'🐹',price:650000,rarity:'НЕОНОВЫЙ',desc:'Запасает энергию на будущее.'},
{id:'koala',name:'Коала мечты',emoji:'🐨',price:900000,rarity:'НЕОНОВЫЙ',desc:'Сонный, но невероятно милый.'},
{id:'unicorn',name:'Пудровый единорог',emoji:'🦄',price:1500000,rarity:'ЭПИЧЕСКИЙ',desc:'Оставляет за собой искры магии.'},
{id:'dragon',name:'Дракончик плазмы',emoji:'🐲',price:3000000,rarity:'ЭПИЧЕСКИЙ',desc:'Маленькое сердце большой силы.'},
{id:'alien',name:'Космо-пришелец',emoji:'👽',price:5000000,rarity:'ЭПИЧЕСКИЙ',desc:'Прибыл с далёкой тап-планеты.'},
{id:'octopus',name:'Осьминог диско',emoji:'🐙',price:8000000,rarity:'ЭПИЧЕСКИЙ',desc:'Восемь лап — восемь поводов тапнуть.'},
{id:'tiger',name:'Тигр-неон',emoji:'🐯',price:12000000,rarity:'ЛЕГЕНДАРНЫЙ',desc:'Полосатая энергия и золотой взгляд.'},
{id:'phoenix',name:'Феникс искр',emoji:'🐦‍🔥',price:50000000,rarity:'ЛЕГЕНДАРНЫЙ',desc:'Возрождается ярче после каждой эволюции.'},
{id:'star',name:'Звёздный кот',emoji:'🌟',price:500000000,rarity:'МИФИЧЕСКИЙ',desc:'Собрал созвездия в пушистую форму.'},
{id:'cosmic',name:'Космический хранитель',emoji:'🐉',price:1000000000,rarity:'АРХОНТ',desc:'Легенда NEON PET CLUB — почти невозможная находка.'}
];
const PET_PALETTE={cat:['#fff8f2','#f59e0b'],bunny:['#f5efff','#c4b5fd'],bear:['#c99164','#8b5e3c'],fox:['#fb923c','#9a3412'],panda:['#f8fafc','#171717'],frog:['#86efac','#15803d'],hamster:['#d6a77a','#9a6a43'],koala:['#cbd5e1','#64748b'],unicorn:['#f5d0fe','#c084fc'],dragon:['#86efac','#047857'],alien:['#67e8f9','#0891b2'],octopus:['#f0abfc','#a21caf'],tiger:['#fdba74','#c2410c'],phoenix:['#fca5a5','#ea580c'],star:['#fde68a','#a16207'],cosmic:['#c4b5fd','#6d28d9']};
function petArtSrc(id){const webArt={bunny:'pet-images/bunny.jpg',bear:'pet-images/bear.webp',fox:'pet-images/fox.jfif',panda:'pet-images/panda.png',frog:'pet-images/frog.jpg',hamster:'pet-images/hamster.jfif',koala:'pet-images/koala.jfif',unicorn:'pet-images/unicorn.jfif',dragon:'pet-images/dragon.png',octopus:'pet-images/octopus.png',phoenix:'pet-images/phoenix.png',tiger:'pet-images/tiger.png',star:'pet-images/star.png',alien:'pet-images/alien.png',cosmic:'pet-images/cosmic.png'};if(id==='cat')return 'cat-sticker.webp';if(webArt[id])return webArt[id];const c=PET_PALETTE[id]||['#e9d5ff','#8b5cf6'];const ears=id==='bunny'?'<ellipse cx="39" cy="24" rx="10" ry="25"/><ellipse cx="81" cy="24" rx="10" ry="25"/>':id==='bear'||id==='panda'||id==='koala'?'<circle cx="35" cy="43" r="16"/><circle cx="85" cy="43" r="16"/>':'<path d="M27 49 L24 20 L49 37 Z"/><path d="M73 37 L98 20 L95 49 Z"/>';
const marks=id==='fox'||id==='tiger'?'<path d="M31 48 L44 61 L36 70 M89 48 L76 61 L84 70" stroke="'+c[1]+'" stroke-width="5" fill="none"/>':id==='panda'?'<ellipse cx="39" cy="61" rx="12" ry="15" fill="#171717"/><ellipse cx="81" cy="61" rx="12" ry="15" fill="#171717"/>':'';
const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 130"><defs><linearGradient id="f" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient><filter id="g"><feGaussianBlur stdDeviation="3"/></filter></defs><ellipse cx="60" cy="117" rx="34" ry="7" fill="${c[1]}" opacity=".3" filter="url(#g)"/>${ears.replaceAll('<ellipse','<ellipse fill="url(#f)"').replaceAll('<circle','<circle fill="url(#f)"').replaceAll('<path','<path fill="url(#f)"')}<path d="M25 57 Q22 36 43 34 Q60 22 77 34 Q98 36 95 57 L91 91 Q83 111 60 111 Q37 111 29 91Z" fill="url(#f)" stroke="${c[1]}" stroke-width="2.5"/>${marks}<ellipse cx="45" cy="68" rx="5" ry="7" fill="#24152f"/><ellipse cx="75" cy="68" rx="5" ry="7" fill="#24152f"/><circle cx="46" cy="66" r="2" fill="white"/><circle cx="76" cy="66" r="2" fill="white"/><ellipse cx="60" cy="81" rx="10" ry="7" fill="#fff7ed" opacity=".9"/><path d="M57 79 Q60 83 63 79 M60 84 Q56 90 52 86 M60 84 Q64 90 68 86" stroke="#8b4560" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="36" cy="81" r="5" fill="#fb7185" opacity=".5"/><circle cx="84" cy="81" r="5" fill="#fb7185" opacity=".5"/></svg>`;return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg)}
const CUSTOM_BG={default:'radial-gradient(circle at 50% 25%,#51306f,#151126 70%)',moon:'radial-gradient(circle at 70% 18%,#9ca3ff55,transparent 24%),linear-gradient(145deg,#101b43,#19102c)',sakura:'radial-gradient(circle at 25% 20%,#fb718655,transparent 28%),linear-gradient(145deg,#4a163f,#21112e)',arcade:'linear-gradient(135deg,#150b3b,#062d46,#36104b)',forest:'radial-gradient(circle at 70% 25%,#34d39955,transparent 30%),linear-gradient(145deg,#103a37,#13241f)',sunset:'radial-gradient(circle at 50% 20%,#fb923c66,transparent 35%),linear-gradient(145deg,#3b164d,#21102e)'};
const TOP_DECO={none:'',crown:'♛',halo:'◯',stars:'✦ ✧ ✦',hearts:'♡ ♥ ♡',bubbles:'○ ◦ ○'};const BOTTOM_DECO={none:'',ribbon:'〰 ♡ 〰',crystals:'◆ ◇ ◆',flowers:'✿ ❀ ✿',sparkles:'✧ ✦ ✧',pawprint:'● ᵔᴥᵔ ●'};
function renderPetCustom(){if(!me)return;const c=me.petCustom||(me.petCustom={bg:'default',top:'stars',bottom:'hearts',effect:'glow',site:'default'});const p=pet();$('#customPetImg').src=petArtSrc(p?p.id:'cat');$('#customPetImg').alt=p?p.name:'Твой питомец';$('#customPetLabel').textContent=p?p.name:'Выбери питомца';$('#petCustomPreview').style.background=CUSTOM_BG[c.bg]||CUSTOM_BG.default;$('#customTopDeco').textContent=TOP_DECO[c.top]||'';$('#customBottomDeco').textContent=BOTTOM_DECO[c.bottom]||'';$('#customPetImg').style.filter=c.effect==='rainbow'?'hue-rotate(90deg) drop-shadow(0 0 22px #67e8f9)':c.effect==='shadow'?'drop-shadow(0 12px 24px #000)':c.effect==='glow'?'drop-shadow(0 0 22px #f0abfc)':'';['petBgSelect','petTopSelect','petBottomSelect','petEffectSelect','siteThemeSelect'].forEach((id,i)=>{$('#'+id).value=[c.bg,c.top,c.bottom,c.effect,c.site][i]});applySiteTheme(c.site)}
function applySiteTheme(theme){const themes={default:['#c084fc','#100b1c'],ocean:['#38bdf8','#071827'],rose:['#fb7185','#241020'],emerald:['#34d399','#071d19'],gold:['#fbbf24','#201606']};const t=themes[theme]||themes.default;document.documentElement.style.setProperty('--accent',t[0]);document.documentElement.style.setProperty('--bg',t[1]);document.body.dataset.siteTheme=theme||'default'}
function savePetCustom(){me.petCustom={bg:$('#petBgSelect').value,top:$('#petTopSelect').value,bottom:$('#petBottomSelect').value,effect:$('#petEffectSelect').value,site:$('#siteThemeSelect').value};save();renderPetCustom();toast('Персонализация сохранена!')}
['petBgSelect','petTopSelect','petBottomSelect','petEffectSelect','siteThemeSelect'].forEach(id=>$('#'+id).addEventListener('change',()=>{const c={bg:$('#petBgSelect').value,top:$('#petTopSelect').value,bottom:$('#petBottomSelect').value,effect:$('#petEffectSelect').value,site:$('#siteThemeSelect').value};me.petCustom=c;renderPetCustom()}));$('#savePetCustom').onclick=savePetCustom;
const tapRanks=['Милый новичок','Пушистик','Любимчик','Сердечный маг','Звёздный питомец','Легенда любви','Космический хранитель'];
function pet(){return PETS.find(p=>p.id===me.petId)||null}
function tapRank(){return tapRanks[Math.min(tapRanks.length-1,Math.floor((me.tapLevel-1)/3))]}
function petCard(p,starter=false){const owned=me.petId===p.id,unlocked=p.free||(me.petOwned||[]).includes(p.id);return `<article class="pet-card ${owned?'is-active':''} rarity-${p.rarity.toLowerCase().replace(/[^а-яёa-z]/g,'')}"><img class="pet-card-art" src="${petArtSrc(p.id)}" alt="${p.name}"><div class="pet-card-name">${p.name}</div><span class="pet-rarity">${p.rarity}</span><p>${p.desc}</p><button class="btn ${owned?'ghost':p.free?'':'gold'}" data-pet="${p.id}" type="button">${owned?'Активен':unlocked?'Выбрать':me.coins>=p.price?'Купить · '+p.price.toLocaleString('ru')+' 🪙':'🔒 '+p.price.toLocaleString('ru')+' 🪙'}</button></article>`}
function renderPetCatalog(){if(!me)return;if(me.petId&&!PETS.some(p=>p.id===me.petId)){me.petId='';me.petRank=0;save()}me.petOwned=(me.petOwned||[]).filter(id=>PETS.some(p=>p.id===id));const picker=$('#petPicker');if(!me.petId)picker.hidden=false;$('#starterPets').innerHTML=PETS.filter(p=>p.free).map(p=>petCard(p,true)).join('');$('#petCatalog').innerHTML=PETS.map(p=>petCard(p)).join('');const p=pet();$('#petCurrentArt').innerHTML=p?`<img src="${petArtSrc(p.id)}" alt="${p.name}">`:`<span>Выбери</span>`;$('#petName').textContent=p?p.name:'Выбери питомца';$('#petRarity').textContent=p?p.rarity:'НЕТ ПИТОМЦА';$('#petDescription').textContent=p?p.desc:'Начни с одного из трёх бесплатных друзей.';$('#petOwnedInfo').textContent=p?`Ранг эволюции ${me.petRank||0} · активный питомец`:'Коллекция ждёт первого питомца';$('#petSticker').src=petArtSrc(p?p.id:'cat');$('#petSticker').hidden=false;$('#petEmojiTap').hidden=true;$('#petCurrentArt').hidden=false;renderPetCustom();if(document.getElementById('v-evolution'))renderEvolutionScreen();$('#petTap').setAttribute('aria-label',p?'Тапнуть по '+p.name:'Сначала выбери питомца');const stake=p&&p.price>=100000&&(me.petOwned||[]).includes(p.id);$('#evoChance').textContent='Шанс успеха: 30%';$('#evoCost').textContent=stake?'Ставка: '+p.name:'Нужен купленный питомец от 100 000 🪙';$('#evoRoll').disabled=!stake;}
function renderTapper(){if(!me)return;const now=Date.now(),elapsed=Math.min(3600,Math.max(0,(now-(me.tapLast||now))/1000));if(elapsed>0&&me.tapIdle)me.tapCurrency+=Math.floor(elapsed*me.tapIdle);me.tapLast=now;save();
 const xpNeed=me.tapLevel*100,powerCost=50*(me.tapPowerLv+1)**2,idleCost=100*(me.tapIdleLv+1)**2,levelCost=250*me.tapLevel;
 $('#tapLevel').textContent=me.tapLevel;$('#tapRank').textContent=tapRank();$('#tapCurrency').textContent=me.tapCurrency.toLocaleString('ru')+' 💗';$('#tapPower').textContent='+'+me.tapPower;$('#tapIdle').textContent=me.tapIdle.toLocaleString('ru');$('#tapXpText').textContent=(me.tapXp%xpNeed).toLocaleString('ru')+' / '+xpNeed.toLocaleString('ru');$('#tapXpBar').style.width=Math.min(100,(me.tapXp%xpNeed)/xpNeed*100)+'%';$('#petSticker').src=petArtSrc(me.petId||'cat');$('#petSticker').style.filter=me.tapLevel>=20?'hue-rotate(115deg) saturate(1.7) drop-shadow(0 15px 28px #22d3ee88)':me.tapLevel>=12?'hue-rotate(55deg) saturate(1.5) drop-shadow(0 15px 28px #fbbf2488)':me.tapLevel>=7?'hue-rotate(-25deg) saturate(1.4) drop-shadow(0 15px 28px #c084fc88)':me.tapLevel>=4?'saturate(1.25) drop-shadow(0 15px 28px #fb718688)':'drop-shadow(0 15px 25px #f472b655)';$('#convertInfo').textContent='Доступно: '+me.tapCurrency.toLocaleString('ru')+' 💗';$('#powerCost').textContent='Цена: '+powerCost.toLocaleString('ru')+' 💗';$('#idleCost').textContent='Цена: '+idleCost.toLocaleString('ru')+' 💗';$('#levelCost').textContent='Цена: '+levelCost.toLocaleString('ru')+' 💗';
 $('#upgradePower').disabled=me.tapCurrency<powerCost;$('#upgradeIdle').disabled=me.tapCurrency<idleCost;$('#upgradeLevel').disabled=me.tapCurrency<levelCost;$('#convertCurrency').disabled=me.tapCurrency<10000;renderPetCatalog();}
function choosePet(id){const p=PETS.find(x=>x.id===id);if(!p)return;const unlocked=p.free||(me.petOwned||[]).includes(id);if(!unlocked&&me.coins<p.price)return toast('Не хватает обычных монет для покупки питомца');if(!unlocked){me.coins-=p.price;me.petOwned.push(id)}if(p.free&&!me.petOwned.includes(id))me.petOwned.push(id);me.petId=id;save();updBal(true);renderTapper();toast(p.free?'Новый друг выбран!':'Питомец куплен и экипирован!')}
$('#openPetPicker').onclick=()=>{$('#petPicker').hidden=!$('#petPicker').hidden;$('#petPicker').scrollIntoView({behavior:'smooth',block:'nearest'})};
document.addEventListener('click',e=>{const b=e.target.closest('[data-pet]');if(b&&me)choosePet(b.dataset.pet)});
function tapPet(){if(!me.petId){$('#petPicker').hidden=false;return toast('Сначала выбери бесплатного питомца 🐾')}me.tapCurrency+=me.tapPower;me.tapXp+=1;while(me.tapXp>=me.tapLevel*100){me.tapXp-=me.tapLevel*100;me.tapLevel++;toast('✨ Новый уровень питомца: '+me.tapLevel+'!')}const f=$('#tapFloat');f.textContent='+'+me.tapPower+' 💗';f.classList.remove('pop');void f.offsetWidth;f.classList.add('pop');$('#petTap').classList.remove('bop');void $('#petTap').offsetWidth;$('#petTap').classList.add('bop');save();renderTapper()}
$('#petTap').addEventListener('click',tapPet);
$('#upgradePower').onclick=()=>{const c=50*(me.tapPowerLv+1)**2;if(me.tapCurrency<c)return;me.tapCurrency-=c;me.tapPowerLv++;me.tapPower+=1+Math.floor(me.tapLevel/5);save();renderTapper();toast('⚡ Сила тапа улучшена!')};
$('#upgradeIdle').onclick=()=>{const c=100*(me.tapIdleLv+1)**2;if(me.tapCurrency<c)return;me.tapCurrency-=c;me.tapIdleLv++;me.tapIdle+=1;save();renderTapper();toast('✨ Авто-обнимашки улучшены!')};
$('#upgradeLevel').onclick=()=>{const c=250*me.tapLevel;if(me.tapCurrency<c)return;me.tapCurrency-=c;me.tapLevel++;me.tapXp=0;save();renderTapper();toast('🌟 Питомец эволюционировал!')};
$('#convertCurrency').onclick=()=>{const bundles=Math.floor(me.tapCurrency/10000);if(!bundles)return toast('Нужно минимум 10 000 💗');const hearts=bundles*10000,coins=bundles*100;me.tapCurrency-=hearts;me.coins+=coins;save();updBal();renderTapper();toast('Обмен: '+hearts.toLocaleString('ru')+' 💗 → '+coins.toLocaleString('ru')+' 🪙')};
$('#evoRoll').onclick=async()=>{
 const p=pet();
 if(!p||p.price<100000||!(me.petOwned||[]).includes(p.id))return toast('Для эволюции нужен активный купленный питомец от 100 000 монет');
 const upgrades=PETS.filter(x=>!x.free&&x.price>p.price).sort((a,b)=>a.price-b.price);
 if(!upgrades.length)return toast('Этот питомец уже высшей формы — попробуй поставить другого!');
 const chance=30;
 const preview=upgrades[0];
 if(!confirm(`⚠️ НЕОНОВЫЙ РАЗЛОМ — АПГРЕЙД

Ставка: ${p.name} (${p.price.toLocaleString('ru')} 🪙)
Шанс апгрейда: ${chance}%
При успехе питомец превратится в случайного более дорогого питомца из каталога (например, ${preview.name}).

При неудаче поставленный питомец сгорит, а прогресс тапалки обнулится. Это необратимо. Продолжить?`))return;
 if(API_ON){
   try{const d=await api('/game/evolve',{method:'POST',body:JSON.stringify({petId:p.id})});
     const mine=await api('/auth/me');me=hydrateServerUser(mine.user);const all=LS.get('nv_acc',{});all[me.id]=me;LS.set('nv_acc',all);updBal();renderTapper();
     if(d.success){const won=PETS.find(x=>x.id===d.won);toast('✨ АПГРЕЙД УДАЛСЯ! '+p.name+' → '+(won?.name||d.won)+'!')}else{$('#petPicker').hidden=false;toast('💥 Неудача: питомец сгорел, прогресс тапалки обнулён.')}
   }catch(e){toast(e.message)}return;
 }
 if(Math.random()*100<chance){
   // Case-battle-style upgrade: a win consumes the stake and awards one higher-priced pet already in the catalog.
   const pool=upgrades;
   const won=pool[Math.floor(Math.random()*pool.length)];
   me.petOwned=me.petOwned.filter(id=>id!==p.id);
   if(me.petTagId===p.id)me.petTagId='';
   if(!me.petOwned.includes(won.id))me.petOwned.push(won.id);
   me.petId=won.id;me.petRank=0;
   me.tapPower+=Math.max(1,Math.floor(Math.log10(won.price/p.price+1)));
   save();updBal();renderTapper();
   toast('✨ АПГРЕЙД УДАЛСЯ! '+p.name+' → '+won.name+'! Новый питомец добавлен в коллекцию.');
 }else{
   me.petOwned=me.petOwned.filter(id=>id!==p.id);if(me.petTagId===p.id)me.petTagId='';me.petId='';me.petRank=0;me.tapCurrency=0;me.tapLevel=1;me.tapPower=1;me.tapPowerLv=0;me.tapIdle=0;me.tapIdleLv=0;me.tapXp=0;me.tapLast=Date.now();save();renderTapper();$('#petPicker').hidden=false;$('#petPicker').scrollIntoView({behavior:'smooth',block:'start'});toast('💥 Апгрейд не прошёл! '+p.name+' сгорел — прогресс обнулён. Выбери бесплатного питомца.');
 }
};
setInterval(()=>{if(me&&me.tapIdle>0){me.tapCurrency+=me.tapIdle;me.tapLast=Date.now();save();if(curView==='tap')renderTapper()}},1000);

/* ---------- Панель владельца (локальная версия) ---------- */
async function renderAdmin(){
 if(!me||!me.owner){$('#adminNav').hidden=true;return}$('#adminNav').hidden=false;
 if(API_ON){try{const d=await api('/admin/overview');$('#adminUsers').textContent=d.users??0;$('#adminCoins').textContent=(d.coins||0).toLocaleString('ru');$('#adminHearts').textContent=(d.hearts||0).toLocaleString('ru');}catch(e){toast(e.message);return}}
 const all=Object.values(sync());const sel=$('#adminUser'),old=sel.value;sel.innerHTML='';all.forEach(a=>{const o=document.createElement('option');o.value=a.id;o.textContent=a.name+' ('+(+a.coins||0)+' 🪙)'+(a.status==='banned'?' · БАН':'');sel.appendChild(o)});if(old)sel.value=old;
 const box=$('#adminUserList');if(box){box.innerHTML='';all.slice(0,50).forEach(a=>{const row=document.createElement('div');row.className='admin-user-row';const label=document.createElement('span');label.textContent=a.name+' · '+(a.role==='owner'?'Владелец':a.role==='moderator'?'Модератор':'Игрок')+' · '+(a.status==='banned'?'Заблокирован':'Активен');row.appendChild(label);box.appendChild(row)})}
}
async function adminGrant(field){if(!me||!me.owner)return toast('Нет доступа');const id=$('#adminUser').value,n=Math.floor(+(field==='coins'?$('#adminGrant').value:$('#adminGrantHearts').value));if(!id||!(n>0))return toast('Выбери аккаунт и укажи сумму');if(API_ON){try{await api('/admin/users/'+encodeURIComponent(id)+'/grant',{method:'POST',body:JSON.stringify({field,amount:n})});await refreshServerUsers();if(id===me.id){const mine=await api('/auth/me');me=hydrateServerUser(mine.user);const all=LS.get('nv_acc',{});all[me.id]=me;LS.set('nv_acc',all);updBal()}renderAdmin();toast('Начислено '+n.toLocaleString('ru')+(field==='coins'?' 🪙':' 💗'));return}catch(e){return toast(e.message)}}const all=sync(),a=all[id];if(!a)return toast('Аккаунт не найден');a[field]=(+(a[field])||0)+n;LS.set('nv_acc',all);accounts=all;if(id===me.id){me=a;updBal()}renderAdmin();toast('Начислено '+n.toLocaleString('ru'))}
$('#adminGrantBtn').onclick=()=>adminGrant('coins');
$('#adminGrantHeartsBtn')?.addEventListener('click',()=>adminGrant('tapCurrency'));
$('#adminSearchBtn')?.addEventListener('click',async()=>{if(!me?.owner)return;if(!API_ON)return renderAdmin();try{const d=await api('/admin/users?q='+encodeURIComponent($('#adminSearch').value));const box=$('#adminUserList');box.innerHTML='';d.users.forEach(a=>{const row=document.createElement('div');row.className='admin-user-row';const label=document.createElement('span');label.textContent=`${a.name} · ${a.coins} 🪙 · ${a.status==='banned'?'Блок':'Активен'}`;const ban=document.createElement('button');ban.className='btn ghost';ban.textContent=a.status==='banned'?'Разблокировать':'Заблокировать';ban.onclick=async()=>{try{await api('/admin/users/'+encodeURIComponent(a.id)+'/status',{method:'PATCH',body:JSON.stringify({status:a.status==='banned'?'active':'banned'})});toast('Статус аккаунта изменён');renderAdmin()}catch(e){toast(e.message)}};const role=document.createElement('button');role.className='btn ghost';role.textContent='Модератор';role.onclick=async()=>{try{await api('/admin/users/'+encodeURIComponent(a.id)+'/role',{method:'PATCH',body:JSON.stringify({role:'moderator'})});toast('Роль обновлена');renderAdmin()}catch(e){toast(e.message)}};row.append(label,ban,role);box.appendChild(row)})}catch(e){toast(e.message)}});
$('#adminAuditBtn')?.addEventListener('click',async()=>{if(!me?.owner||!API_ON)return toast('Доступно в серверной версии');try{const d=await api('/admin/audit');const box=$('#adminAudit');box.innerHTML='';d.rows.forEach(x=>{const row=document.createElement('div');row.className='admin-user-row';row.textContent=new Date(x.created_at).toLocaleString('ru')+' · '+x.action+' · '+(x.target_id||'—');box.appendChild(row)})}catch(e){toast(e.message)}});
$('#ownerDeactivate').onclick=async()=>{if(!me||!me.owner)return;if(API_ON){try{await api('/admin/deactivate-owner',{method:'POST'});me.owner=false;me.creator=false;me.role='user'}catch(e){return toast(e.message)}}else{me.owner=false;me.creator=false}me.tags=me.tags.filter(id=>TAG_BY[id]&&TAG_BY[id].g!=='creator');save();$('#adminNav').hidden=true;go('lobby');render();toast('Статус владельца снят')};

/* ---------- Общее для игр ---------- */
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('show'),2600)}
function rain(){for(let i=0;i<34;i++){const d=document.createElement('div');d.className='cr';d.textContent=pick(['🪙','💰','✨','⭐']);d.style.left=Math.random()*100+'vw';d.style.animationDuration=(1.4+Math.random()*1.6)+'s';d.style.animationDelay=Math.random()*.5+'s';document.body.appendChild(d);setTimeout(()=>d.remove(),3500)}}
$$('.bets').forEach(box=>[10,50,100,500,1000].forEach(v=>{const b=document.createElement('button');b.className='chip'+(v===bet?' on':'');b.textContent=v;b.onclick=()=>{bet=v;$$('.chip').forEach(c=>c.classList.toggle('on',+c.textContent===v))};box.appendChild(b)}));
function start(){if(busy)return false;if(me.coins<bet){toast('Недостаточно монет — забери бонус в лобби 🎁');return false}busy=true;addCoins(-bet);return true}
function finish(win,el,txt){
  me.games++;if(win>0){me.won+=win;me.best=Math.max(me.best,win);addCoins(win);el.className='res win';el.textContent=txt+' +'+win.toLocaleString('ru');if(win>=bet*5)rain()}
  else{el.className='res lose';el.textContent=txt;stats();save()}
  save();busy=false;$$('.btn.gold[id^=spin]').forEach(b=>b.disabled=false);
}
function lock(){$$('.btn.gold[id^=spin]').forEach(b=>b.disabled=true)}

/* ---------- Игра 1: Слоты ---------- */
const SYM=['🍒','🍋','🔔','⭐','💎','7️⃣'],MUL={'🍒':5,'🍋':8,'🔔':10,'⭐':15,'💎':25,'7️⃣':50};
$('#spinS').onclick=async()=>{
  if(!start())return;lock();$('#resS').textContent='';$('#resS').className='res';
  const reels=$$('.reel'),sp=reels.map(r=>r.querySelector('span')),out=[];
  reels.forEach(r=>{r.classList.remove('stop');r.classList.add('spin')});
  const tm=sp.map(s=>setInterval(()=>s.textContent=pick(SYM),70));
  for(let i=0;i<3;i++){
    await sleep(700+i*480);clearInterval(tm[i]);out[i]=pick(SYM);sp[i].textContent=out[i];
    reels[i].classList.remove('spin');reels[i].classList.add('stop');
  }
  const [a,b,c]=out;let win=0,t='Не повезло…';
  if(a===b&&b===c){win=bet*MUL[a];t='ДЖЕКПОТ!'}else if(a===b||b===c||a===c){win=bet;t='Пара — ставка вернулась'}
  finish(win,$('#resS'),t);
};

/* ---------- Игра 2: Колесо ---------- */
const WV=[0,.5,0,1.5,0,2,0,1,0,4];let rot=0;
(function(){
  const w=$('#wheel');
  const col=v=>v===0?'#1b1735':v>=2?'#d97706':v>=1?'#7c3aed':'#0e7490';
  w.style.background='conic-gradient('+WV.map((v,i)=>`${col(v)} ${i*36}deg ${(i+1)*36}deg`).join(',')+')';
  WV.forEach((v,i)=>{const l=document.createElement('b');l.textContent=v?'×'+v:'✖';l.style.transform=`rotate(${i*36+18}deg) translateY(-112px)`;w.appendChild(l)});
})();
$('#spinW').onclick=async()=>{
  if(!start())return;lock();$('#resW').textContent='';$('#resW').className='res';
  const i=Math.floor(Math.random()*WV.length),w=$('#wheel');
  rot=Math.ceil(rot/360)*360+360*5+(360-(i*36+18));
  w.style.transition='transform 4.4s cubic-bezier(.12,.7,.1,1)';w.style.transform=`rotate(${rot}deg)`;
  await sleep(4600);
  const win=Math.round(bet*WV[i]);
  finish(win,$('#resW'),WV[i]?`Выпало ×${WV[i]}`:'Пусто…');
};

/* ---------- Игра 3: Монетка ---------- */
let crot=0;
$$('[data-side]').forEach(b=>b.onclick=()=>{side=+b.dataset.side;$$('[data-side]').forEach(x=>x.classList.toggle('on',x===b))});
$('#spinC').onclick=async()=>{
  if(!start())return;lock();$('#resC').textContent='';$('#resC').className='res';
  const r=Math.random()<.5?0:1,wr=$('#coinWrap');
  crot+=1440+(((r*180)-(crot%360))+360)%360;
  wr.classList.remove('toss');void wr.offsetWidth;wr.classList.add('toss');
  $('#coin3d').style.transform=`rotateY(${crot}deg)`;
  await sleep(1800);
  const win=r===side?Math.floor(bet*1.95):0;
  finish(win,$('#resC'),r===0?'Выпал орёл 🦅':'Выпала решка 🌙');
};


/* NEON VAULT visual refresh: sidebar brand + evolution preview */
const sideBrand=document.querySelector('.side-brand');
if(sideBrand){sideBrand.addEventListener('click',e=>go('lobby',e));sideBrand.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go('lobby',e)}})}
const evoToPets=document.getElementById('evoToPets');if(evoToPets)evoToPets.addEventListener('click',e=>go('tap',e));
function renderEvolutionScreen(){
  if(!me)return;
  const p=pet();
  const owned=PETS.filter(x=>(me.petOwned||[]).includes(x.id));
  const better=p?PETS.filter(x=>!x.free&&x.price>p.price).sort((a,b)=>a.price-b.price):[];
  const prize=better.length?better[Math.min(better.length-1,Math.floor(Math.random()*Math.min(3,better.length)))]:PETS.filter(x=>!x.free).sort((a,b)=>a.price-b.price)[0];
  const setArt=(id,petObj)=>{const el=document.getElementById(id);if(el){el.src=petArtSrc(petObj?petObj.id:'cat');el.alt=petObj?petObj.name:'Питомец'}};
  setArt('evoStakeArt',p);setArt('evoPrizeArt',prize);
  const put=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value};
  put('evoStakeName',p?p.name:'Нет питомца');put('evoStakeRarity',p?p.rarity:'ВЫБЕРИ ПИТОМЦА');put('evoPrizeName',prize?prize.name:'Каталог пуст');put('evoSelectedName',p?p.name:'Выбери питомца');
  put('evoSelectedHint',p?`Текущая форма: ${p.rarity}. При победе питомец заменится на форму дороже.`:'Сначала выбери бесплатного питомца, затем купи форму от 100 000 монет.');
  put('evoChance','Шанс успеха: 30%');
  const eligible=!!(p&&p.price>=100000&&(me.petOwned||[]).includes(p.id)&&better.length);
  put('evoCost',eligible?'Ставка: '+p.name+' · '+p.price.toLocaleString('ru')+' 🪙':!p?'Сначала выбери питомца':'Нужен купленный питомец от 100 000 🪙');
  const btn=document.getElementById('evoRoll');if(btn)btn.disabled=!eligible;
  const mini=document.getElementById('evoMiniCollection');if(mini)mini.innerHTML=owned.slice(0,8).map(x=>`<button type="button" class="evo-mini-pet ${p&&p.id===x.id?'selected':''}" data-evo-pet="${x.id}" title="${x.name}"><img src="${petArtSrc(x.id)}" alt=""><span>${x.name}</span></button>`).join('')||'<p class="sub">Пока нет купленных питомцев.</p>';
  if(mini)mini.querySelectorAll('[data-evo-pet]').forEach(b=>b.addEventListener('click',()=>{choosePet(b.dataset.evoPet);renderEvolutionScreen()}));
}
