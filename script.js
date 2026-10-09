/* ============ НАСТРОЙКА ============
   Вход через Google: вставь сюда свой OAuth Client ID.
   1) console.cloud.google.com → APIs & Services → Credentials → Create credentials → OAuth client ID
   2) Тип: Web application
   3) Authorized JavaScript origins: адрес сайта, например https://ТВОЙ_НИК.github.io
   4) Скопируй Client ID (вида 123-abc.apps.googleusercontent.com) в кавычки ниже.
   Пока поле пустое — кнопка Google показывает подсказку, остальной вход работает. */
const GOOGLE_CLIENT_ID = '';
/* =================================== */

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms)), pick=a=>a[Math.floor(Math.random()*a.length)];
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const LS={get(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v??d}catch{return d}},
          set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch{toast('Не хватило места в памяти браузера');return false}}};
const GRADS=['linear-gradient(135deg,#6d28d9,#0891b2)','linear-gradient(135deg,#be123c,#f59e0b)','linear-gradient(135deg,#065f46,#22d3ee)','linear-gradient(135deg,#1e1b4b,#c026d3)',
 'linear-gradient(135deg,#0f172a,#475569)','linear-gradient(135deg,#f472b6,#fb923c)','linear-gradient(135deg,#312e81,#06b6d4,#a3e635)','radial-gradient(circle at 30% 30%,#fbbf24,#7c2d12)'];
const EMOJI=['😎','🤑','👑','🦊','🐺','🐉','👾','🤖','💀','🔥','🍀','💎','🎩','🦄','🐱','🚀'];
const DAY=864e5, GUEST_TTL=7*DAY, ONLINE_MS=45e3, GIFT=100;

let accounts={}, me=null, bet=50, busy=false, side=0, curView='lobby', navBusy=false;

/* ---------- Хранилище аккаунтов ---------- */
function norm(a){
  if(!a.type)a.type=a.id.startsWith('g_')?'google':a.id.startsWith('guest_')?'guest':'user';
  if(!Array.isArray(a.friends))a.friends=[];
  if(!a.seen)a.seen=Date.now();
  if(!a.created)a.created=a.seen;
  return a;
}
function sync(){accounts=LS.get('nv_acc',{});Object.values(accounts).forEach(norm);return accounts}
/* записать меня, не затирая изменения из других вкладок */
function save(){if(!me)return;const fresh=LS.get('nv_acc',{});fresh[me.id]=me;accounts=fresh;LS.set('nv_acc',accounts)}
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
  coins:1000,games:0,won:0,best:0,bonusAt:0,friends:[],seen:Date.now(),on:false,created:Date.now()});

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
function startApp(){
  $('#loader').classList.add('hide');setTimeout(()=>$('#loader').remove(),900);
  purgeGuests(LS.get('nv_cur',null));
  const cur=LS.get('nv_cur',null);
  if(cur&&accounts[cur])enter(accounts[cur],true);else showAuth();
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

/* вход по нику и паролю */
$('#fLogin').onsubmit=e=>submit(e,async()=>{
  const nick=normName($('#lgNick').value),pw=$('#lgPass').value;
  if(!nick||!pw)return aErr('Введи ник и пароль');
  const k=failKey(nick),left=lockLeft(k);
  if(left)return aErr(`Слишком много попыток. Подожди ${left} с`);
  const a=findByName(nick);
  if(!a)return aErr('Такого аккаунта нет. Создай его на вкладке «Регистрация»');
  if(a.type==='google')return aErr('Этот аккаунт создан через Google — нажми «Продолжить с Google»');
  if(a.type==='guest')return aErr('Это гостевой ник, пароля у него нет. Выбери другой ник или зарегистрируйся');
  if(!(await checkPass(a,pw))){
    const n=addFail(k);
    return aErr(n>=5?`Слишком много попыток. Подожди ${lockLeft(k)} с`:`Неверный пароль (осталось попыток: ${5-n})`);
  }
  clearFail(k);enter(a);
});
/* регистрация */
$('#fReg').onsubmit=e=>submit(e,async()=>{
  const nick=normName($('#rgNick').value),pw=$('#rgPass').value,pw2=$('#rgPass2').value;
  const ne=nameError(nick);if(ne)return aErr(ne);
  if(findByName(nick))return aErr('Этот ник уже занят — выбери другой');
  if(pw.length<6)return aErr('Пароль — минимум 6 символов');
  if(pw!==pw2)return aErr('Пароли не совпадают');
  const a=newAcc(rid('u_'),'user',nick);a.pass=await makePass(pw);
  enter(a,false,'Аккаунт создан! Добро пожаловать, '+a.name);
});
/* гость: ник запоминается как гостевой аккаунт, но занятый ник не открывается */
$('#fGuest').onsubmit=e=>submit(e,async()=>{
  const nick=normName($('#gsNick').value),ne=nameError(nick);if(ne)return aErr(ne);
  const ex=findByName(nick);
  if(ex)return aErr(ex.type==='guest'?'Этот ник уже занял другой гость — выбери другой':'Это ник зарегистрированного игрока. Войди с паролем или выбери другой ник');
  enter(newAcc(rid('gs_'),'guest',nick));
});
async function submit(e,fn){
  e.preventDefault();const b=e.target.querySelector('[type=submit]');if(b.disabled||navBusy)return;
  b.disabled=true;$('#aErr').textContent='';sync();
  try{await fn()}catch(err){console.error(err);aErr('Что-то пошло не так, попробуй ещё раз')}
  b.disabled=false;
}

async function enter(a,instant,msg){
  me=norm(a);me.on=true;me.seen=Date.now();LS.set('nv_cur',a.id);purgeGuests(me.id);save();
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
  me.on=false;me.seen=Date.now();save();LS.set('nv_cur',null);me=null;
  navBusy=true;await transition(()=>{$('#app').style.display='none';resetViews();showAuth()},()=>{const b=$('.auth-box');b.style.animation='none';void b.offsetWidth;b.style.animation=''});navBusy=false;
};
/* вкладки браузера синхронизируются между собой */
addEventListener('storage',e=>{
  if(e.key!=='nv_acc'||!me)return;
  sync();const f=accounts[me.id];if(f){me=f;updBal(true)}
  if(curView==='friends')renderFriends();
});

/* ---------- Отрисовка профиля ---------- */
function setAvEl(el,av){
  if(av.t==='img'&&/^(https:|data:image\/)/.test(av.v)){el.style.backgroundImage=`url("${av.v.replace(/"/g,'%22')}")`;el.textContent=''}
  else{el.style.backgroundImage='';el.textContent=av.t==='emoji'?av.v:'🙂'}
}
const setAv=el=>setAvEl(el,me.av);
function bgCss(){const b=me.bg;return b.t==='grad'?GRADS[b.v]:b.t==='color'?b.v:`url("${String(b.v).replace(/"/g,'%22')}") center/cover`}
const TYPE_LBL={guest:'Гость',user:'Аккаунт',google:'Google'};
function render(){
  document.documentElement.style.setProperty('--accent',me.accent);
  setAv($('#miniAv'));setAv($('#bigAv'));
  $('#miniNick').textContent=me.name;$('#lobNick').textContent=me.name;
  const bn=$('#bigNick');bn.textContent=me.name;bn.className='nick fx-'+me.fx;bn.style.setProperty('--nc',me.nc);
  $('#mail').textContent=me.type==='google'&&me.email?me.email:TYPE_LBL[me.type];
  $('#banner').style.background=bgCss();
  $('#nickIn').value=me.name;$('#fxSel').value=me.fx;$('#nickCol').value=me.nc;$('#accCol').value=me.accent;
  $$('#emo button').forEach(b=>b.classList.toggle('on',me.av.t==='emoji'&&b.textContent===me.av.v));
  $$('#sws .sw').forEach((b,i)=>b.classList.toggle('on',me.bg.t==='grad'&&me.bg.v===i));
  updBal(true);stats();renderSec();
}
function stats(){$('#stC').textContent=me.coins.toLocaleString('ru');$('#stG').textContent=me.games;$('#stW').textContent=me.won.toLocaleString('ru');$('#stB').textContent=me.best.toLocaleString('ru')}
function updBal(quiet){$('#balN').textContent=me.coins.toLocaleString('ru');if(!quiet){const b=$('#bal');b.classList.remove('pulse');void b.offsetWidth;b.classList.add('pulse')}stats()}
function addCoins(n){me.coins=Math.max(0,me.coins+n);save();updBal()}

/* редактор профиля */
EMOJI.forEach(e=>{const b=document.createElement('button');b.textContent=e;b.onclick=()=>{me.av={t:'emoji',v:e};save();render()};$('#emo').appendChild(b)});
GRADS.forEach((g,i)=>{const b=document.createElement('button');b.className='sw';b.style.background=g;b.onclick=()=>{me.bg={t:'grad',v:i};save();render()};$('#sws').appendChild(b)});
/* ник меняется по Enter / когда поле теряет фокус — и должен быть свободным */
$('#nickIn').onchange=e=>{
  const v=normName(e.target.value);
  if(v===me.name){e.target.value=v;return}
  const err=nameError(v);if(err){toast(err);e.target.value=me.name;return}
  const ex=findByName(v);if(ex&&ex.id!==me.id){toast('Ник «'+v+'» уже занят');e.target.value=me.name;return}
  me.name=v;save();render();toast('Ник изменён');
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
$('#resetBal').onclick=()=>{me.coins=1000;save();updBal();toast('Баланс сброшен: 1000 монет')};
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
  const n1=inp('Новый пароль (от 6 символов)'),n2=inp('Повтори новый пароль');
  const btn=document.createElement('button');btn.className='btn';btn.textContent=me.type==='guest'?'🔒 Создать пароль':'🔒 Сменить пароль';
  btn.onclick=async()=>{
    if(btn.disabled)return;
    if(old&&!(await checkPass(me,old.value)))return toast('Текущий пароль неверный');
    if(n1.value.length<6)return toast('Пароль — минимум 6 символов');
    if(n1.value!==n2.value)return toast('Пароли не совпадают');
    btn.disabled=true;
    try{me.pass=await makePass(n1.value);const was=me.type;me.type='user';save();render();toast(was==='guest'?'Готово! Теперь это полноценный аккаунт 🎉':'Пароль изменён')}
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
  fi.append(top,m);r.append(av,fi,...acts);return r;
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
$('#frForm').onsubmit=e=>{
  e.preventDefault();const v=normName($('#frIn').value);if(!v)return;
  const a=findByName(v);
  if(!a)return toast('Игрок «'+v+'» не найден — ему нужно хотя бы раз зайти в систему');
  if(a.id===me.id)return toast('Себя добавить нельзя 🙂');
  if(me.friends.includes(a.id))return toast('Вы уже друзья');
  link(a.id);
};
$('#frIn').oninput=()=>renderFriends();
setInterval(()=>{if(!me)return;me.seen=Date.now();save();if(curView==='friends'&&!$('#frIn').matches(':focus'))renderFriends()},20e3);

/* ---------- Диалог ---------- */
function ask(t,p,ok='Да',no='Отмена'){
  return new Promise(res=>{
    $('#dT').textContent=t;$('#dP').textContent=p;$('#dYes').textContent=ok;$('#dNo').textContent=no;
    const d=$('#dlg');d.classList.add('show');
    const done=v=>{d.classList.remove('show');$('#dYes').onclick=$('#dNo').onclick=null;res(v)};
    $('#dYes').onclick=()=>done(true);$('#dNo').onclick=()=>done(false);
  });
}

/* ---------- Бонус ---------- */
function bonusTick(){
  if(!me)return;
  const left=864e5-(Date.now()-me.bonusAt),b=$('#bonusBtn');
  if(left<=0){b.textContent='🎁 Забрать +500 монет';b.disabled=false}
  else{const h=Math.floor(left/36e5),m=Math.floor(left%36e5/6e4),s=Math.floor(left%6e4/1e3);b.textContent=`⏳ Следующий бонус через ${h}ч ${m}м ${s}с`;b.disabled=true}
}
setInterval(bonusTick,1000);
$('#bonusBtn').onclick=()=>{me.bonusAt=Date.now();addCoins(500);rain();toast('🎁 +500 монет!');bonusTick()};

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
    if(id==='friends')renderFriends();if(id==='profile')renderSec();
  },()=>popIn(to),ev);
  navBusy=false;
}
$$('.nbtn').forEach(b=>b.onclick=e=>go(b.dataset.view,e));
$$('.gcard').forEach(c=>{
  c.onclick=e=>go(c.dataset.go,e);
  c.onmousemove=e=>{const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;c.style.transform=`rotateY(${x*22}deg) rotateX(${-y*22}deg) scale(1.04)`};
  c.onmouseleave=()=>c.style.transform='';
});

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
