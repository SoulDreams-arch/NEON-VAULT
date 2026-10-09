/* ============ НАСТРОЙКА ============
   Чтобы заработал вход через Google, вставь сюда свой OAuth Client ID
   (Google Cloud Console → Credentials → OAuth client ID → Web application).
   В "Authorized JavaScript origins" добавь адрес сайта: https://ТВОЙ_НИК.github.io */
const GOOGLE_CLIENT_ID = '';
/* =================================== */

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms)), pick=a=>a[Math.floor(Math.random()*a.length)];
const LS={get(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v??d}catch{return d}},
          set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch{toast('Не хватило места в памяти браузера');return false}}};
const GRADS=['linear-gradient(135deg,#6d28d9,#0891b2)','linear-gradient(135deg,#be123c,#f59e0b)','linear-gradient(135deg,#065f46,#22d3ee)','linear-gradient(135deg,#1e1b4b,#c026d3)',
 'linear-gradient(135deg,#0f172a,#475569)','linear-gradient(135deg,#f472b6,#fb923c)','linear-gradient(135deg,#312e81,#06b6d4,#a3e635)','radial-gradient(circle at 30% 30%,#fbbf24,#7c2d12)'];
const EMOJI=['😎','🤑','👑','🦊','🐺','🐉','👾','🤖','💀','🔥','🍀','💎','🎩','🦄','🐱','🚀'];

let accounts=LS.get('nv_acc',{}), me=null, bet=50, busy=false, side=0;

/* ---------- Загрузка ---------- */
'NEON VAULT'.split('').forEach((c,i)=>{const s=document.createElement('span');s.textContent=c===' '?'\u00A0':c;s.style.animationDelay=(.15+i*.09)+'s';$('#ldTitle').appendChild(s)});
(function load(){
  const msgs=['Запуск хранилища…','Зажигаем неон…','Тасуем карты…','Полируем монеты…','Почти готово…'];
  let p=0;const t=setInterval(()=>{p+=Math.random()*9+3;if(p>=100){p=100;clearInterval(t);setTimeout(startApp,500)}
    $('#ldBar').style.width=p+'%';$('#ldTxt').textContent=msgs[Math.min(4,Math.floor(p/21))]},170);
})();
function startApp(){
  $('#loader').classList.add('hide');setTimeout(()=>$('#loader').remove(),900);
  const cur=LS.get('nv_cur',null);
  if(cur&&accounts[cur]) enter(accounts[cur]); else showAuth();
}

/* ---------- Авторизация ---------- */
function showAuth(){
  $('#app').style.display='none';$('#auth').style.display='grid';
  if(!GOOGLE_CLIENT_ID){$('#gHint').style.display='block';return}
  if(window.google&&google.accounts)return initG();
  const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;s.onload=initG;
  s.onerror=()=>{$('#gHint').style.display='block';$('#gHint').textContent='Не удалось загрузить Google. Войди как гость.'};
  document.head.appendChild(s);
}
function initG(){
  google.accounts.id.initialize({client_id:GOOGLE_CLIENT_ID,callback:onGoogle});
  $('#gBtn').innerHTML='';
  google.accounts.id.renderButton($('#gBtn'),{theme:'filled_black',size:'large',shape:'pill',text:'signin_with',locale:'ru'});
}
function onGoogle(r){
  try{
    let b=r.credential.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');b+='='.repeat((4-b.length%4)%4);
    const p=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b),c=>c.charCodeAt(0))));
    login('g_'+p.sub,p.name||'Игрок',p.picture,p.email);
  }catch(e){toast('Ошибка входа через Google')}
}
$('#guestGo').onclick=()=>{
  const n=$('#guestName').value.trim();
  if(n.length<2)return toast('Ник — минимум 2 символа');
  login('guest_'+n.toLowerCase(),n,null,null);
};
$('#guestName').onkeydown=e=>{if(e.key==='Enter')$('#guestGo').click()};
function login(id,name,pic,email){
  let a=accounts[id];
  if(!a){a=accounts[id]={id,name,email,av:{t:pic?'img':'emoji',v:pic||pick(EMOJI)},bg:{t:'grad',v:0},accent:'#a855f7',fx:'neon',nc:'#ffffff',
    coins:1000,games:0,won:0,best:0,bonusAt:0}}
  else if(pic&&a.av.t==='img'&&/^https/.test(a.av.v))a.av.v=pic;
  enter(a);
}
function enter(a){
  me=a;LS.set('nv_cur',a.id);save();
  $('#auth').style.display='none';$('#app').style.display='flex';
  render();buildWipe();toast('Добро пожаловать, '+me.name+'!');
}
function save(){if(me){accounts[me.id]=me;LS.set('nv_acc',accounts)}}
$('#logout').onclick=()=>{LS.set('nv_cur',null);me=null;location.reload()};

/* ---------- Отрисовка профиля ---------- */
function setAv(el){if(me.av.t==='img'){el.style.backgroundImage=`url("${me.av.v}")`;el.textContent=''}else{el.style.backgroundImage='';el.textContent=me.av.v}}
function bgCss(){const b=me.bg;return b.t==='grad'?GRADS[b.v]:b.t==='color'?b.v:`url("${b.v}") center/cover`}
function render(){
  document.documentElement.style.setProperty('--accent',me.accent);
  setAv($('#miniAv'));setAv($('#bigAv'));
  $('#miniNick').textContent=me.name;$('#lobNick').textContent=me.name;
  const bn=$('#bigNick');bn.textContent=me.name;bn.className='nick fx-'+me.fx;bn.style.setProperty('--nc',me.nc);
  $('#mail').textContent=me.email||'Гость';
  $('#banner').style.background=bgCss();
  $('#nickIn').value=me.name;$('#fxSel').value=me.fx;$('#nickCol').value=me.nc;$('#accCol').value=me.accent;
  $$('#emo button').forEach(b=>b.classList.toggle('on',me.av.t==='emoji'&&b.textContent===me.av.v));
  $$('#sws .sw').forEach((b,i)=>b.classList.toggle('on',me.bg.t==='grad'&&me.bg.v===i));
  updBal(true);stats();
}
function stats(){$('#stC').textContent=me.coins.toLocaleString('ru');$('#stG').textContent=me.games;$('#stW').textContent=me.won.toLocaleString('ru');$('#stB').textContent=me.best.toLocaleString('ru')}
function updBal(quiet){$('#balN').textContent=me.coins.toLocaleString('ru');if(!quiet){const b=$('#bal');b.classList.remove('pulse');void b.offsetWidth;b.classList.add('pulse')}stats()}
function addCoins(n){me.coins=Math.max(0,me.coins+n);save();updBal()}

/* редактор профиля */
EMOJI.forEach(e=>{const b=document.createElement('button');b.textContent=e;b.onclick=()=>{me.av={t:'emoji',v:e};save();render()};$('#emo').appendChild(b)});
GRADS.forEach((g,i)=>{const b=document.createElement('button');b.className='sw';b.style.background=g;b.onclick=()=>{me.bg={t:'grad',v:i};save();render()};$('#sws').appendChild(b)});
$('#nickIn').oninput=e=>{const v=e.target.value.trim();if(v.length>=2){me.name=v;save();$('#miniNick').textContent=v;$('#lobNick').textContent=v;$('#bigNick').textContent=v}};
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
$('#mini').onclick=()=>go('profile');

/* ---------- Бонус ---------- */
function bonusTick(){
  const left=me?864e5-(Date.now()-me.bonusAt):0,b=$('#bonusBtn');
  if(left<=0){b.textContent='🎁 Забрать +500 монет';b.disabled=false}
  else{const h=Math.floor(left/36e5),m=Math.floor(left%36e5/6e4),s=Math.floor(left%6e4/1e3);b.textContent=`⏳ Следующий бонус через ${h}ч ${m}м ${s}с`;b.disabled=true}
}
setInterval(bonusTick,1000);
$('#bonusBtn').onclick=()=>{me.bonusAt=Date.now();addCoins(500);rain();toast('🎁 +500 монет!');bonusTick()};

/* ---------- 3D-навигация ---------- */
let curView='lobby',navBusy=false;

/* логотип: кольцо из монет + NEON VAULT по центру (рисуется на canvas) */
function drawCoin(x,px,py,r){
  const g=x.createRadialGradient(px-r*.3,py-r*.35,r*.1,px,py,r);
  g.addColorStop(0,'#fff6bf');g.addColorStop(.5,'#fbbf24');g.addColorStop(1,'#b45309');
  x.shadowColor='#fbbf24';x.shadowBlur=r*.8;x.fillStyle=g;x.beginPath();x.arc(px,py,r,0,7);x.fill();x.shadowBlur=0;
  x.beginPath();x.arc(px,py,r*.74,0,7);x.strokeStyle='rgba(120,53,15,.75)';x.lineWidth=r*.1;x.stroke();
  x.fillStyle='#5b3a00';x.font=`900 ${r}px Orbitron, sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillText('$',px,py+r*.04);
}
function drawLogo(W,H,dpr){
  const c=document.createElement('canvas');c.width=W*dpr;c.height=H*dpr;
  const x=c.getContext('2d');x.scale(dpr,dpr);
  const bg=x.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.max(W,H)*.7);
  bg.addColorStop(0,'#2a1460');bg.addColorStop(1,'#05040c');x.fillStyle=bg;x.fillRect(0,0,W,H);
  const cx=W/2,cy=H/2,m=Math.min(W,H),R=m*.32,cr=m*.075,inner=R-cr;
  x.beginPath();x.arc(cx,cy,R,0,7);x.strokeStyle='rgba(168,85,247,.45)';x.lineWidth=3;x.shadowColor='#a855f7';x.shadowBlur=26;x.stroke();x.shadowBlur=0;
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2-Math.PI/2;drawCoin(x,cx+Math.cos(a)*R,cy+Math.sin(a)*R,cr)}
  x.textAlign='center';x.textBaseline='middle';
  const tw=inner*1.75;x.font='900 100px Orbitron, sans-serif';
  let fs=100*tw/x.measureText('NEON VAULT').width,lines=['NEON VAULT'];
  if(fs<24){lines=['NEON','VAULT'];fs=Math.min(m*.13,100*tw/x.measureText('VAULT').width)}
  const g=x.createLinearGradient(0,cy-fs,0,cy+fs);g.addColorStop(0,'#ffffff');g.addColorStop(.5,'#22d3ee');g.addColorStop(1,'#a855f7');
  x.fillStyle=g;x.shadowColor='#a855f7';x.shadowBlur=fs*.55;x.font=`900 ${fs}px Orbitron, sans-serif`;
  lines.forEach((t,i)=>x.fillText(t,cx,cy+(i-(lines.length-1)/2)*fs*1.1));
  return c;
}

/* сетка квадратиков, каждый показывает свой кусочек логотипа */
let wipeKey='',wipeUrl='';
async function buildWipe(){
  const W=innerWidth,H=innerHeight,key=W+'x'+H;if(key===wipeKey)return;wipeKey=key;
  try{await document.fonts.load('900 60px Orbitron')}catch{}
  const cv=drawLogo(W,H,Math.min(2,devicePixelRatio||1));
  const blob=await new Promise(r=>cv.toBlob(r,'image/png'));
  if(wipeUrl)URL.revokeObjectURL(wipeUrl);wipeUrl=URL.createObjectURL(blob);
  const s=W<700?44:60,cols=Math.ceil(W/s),rows=Math.ceil(H/s),frag=document.createDocumentFragment();
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const t=document.createElement('i'),d=(c/cols+r/rows)/2;
    t.style.cssText=`left:${c*s}px;top:${r*s}px;width:${s+1}px;height:${s+1}px;background-image:url("${wipeUrl}");background-size:${W}px ${H}px;background-position:-${c*s}px -${r*s}px;--d:${Math.round(d*240+Math.random()*200)}ms;--d2:${Math.round((1-d)*240+Math.random()*200)}ms`;
    frag.appendChild(t);
  }
  const w=$('#wipe');w.innerHTML='';w.appendChild(frag);
}
let rzT;addEventListener('resize',()=>{clearTimeout(rzT);rzT=setTimeout(()=>{if(me&&!navBusy)buildWipe()},400)});

async function go(id){
  if(navBusy||id===curView)return;navBusy=true;
  $$('.nbtn').forEach(b=>b.classList.toggle('on',b.dataset.view===id));
  await buildWipe();
  const w=$('#wipe');w.style.display='block';void w.offsetWidth;w.classList.add('cover');   // квадраты с логотипом закрывают экран
  await sleep(720);
  $('#v-'+curView).classList.remove('active');const to=$('#v-'+id);to.classList.add('active');to.scrollTop=0;curView=id;  // вкладка меняется под логотипом
  await sleep(350);
  w.classList.add('leave');                                                                // квадраты уходят
  await sleep(720);
  w.classList.remove('cover','leave');w.style.display='none';navBusy=false;
}
$$('.nbtn').forEach(b=>b.onclick=()=>go(b.dataset.view));
$$('.gcard').forEach(c=>{
  c.onclick=()=>go(c.dataset.go);
  c.onmousemove=e=>{const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;c.style.transform=`rotateY(${x*22}deg) rotateX(${-y*22}deg) scale(1.04)`};
  c.onmouseleave=()=>c.style.transform='';
});

/* ---------- Общее для игр ---------- */
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('show'),2400)}
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
