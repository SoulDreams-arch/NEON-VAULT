/* NEON VAULT Master features: progress, quests, notifications, reporting UI. */
(()=>{
 'use strict';
 const API='https://renderneon.souldreams.blitz.cloud/api';
 const TOKEN='nv_api_token';
 const $=s=>document.querySelector(s);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 async function call(path,opts={}){
  const token=sessionStorage.getItem(TOKEN)||'';
  const r=await fetch(API+path,{...opts,mode:'cors',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...(opts.headers||{})}});
  let data={};try{data=await r.json()}catch{}
  if(!r.ok)throw new Error(data.error||`Ошибка сервера (${r.status})`);
  return data;
 }
 function toastMsg(s){if(typeof window.toast==='function')window.toast(s);else{const t=$('#toast');if(t){t.textContent=s;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2800)}else alert(s)}}
 const iconFor=id=>({visit:'🌱',play3:'🎲',social:'💬'}[id]||'✦');
 window.renderMasterProgress=async function(){
  const q=$('#dailyQuestGrid'),a=$('#achievementGrid');if(!q||!a)return;
  q.innerHTML='<div class="empty-state">Загружаем задания…</div>';a.innerHTML='<div class="empty-state">Загружаем достижения…</div>';
  try{
   const d=await call('/progress');
   $('#progressLevel').textContent=d.level||1;$('#progressXp').textContent=(d.xp||0)+' XP';
   const claimed=d.quests.filter(x=>x.claimed).length;
   q.innerHTML=d.quests.map(x=>`<article class="master-item ${x.claimed?'is-done':''}"><div class="master-item-icon">${iconFor(x.id)}</div><div class="master-item-copy"><b>${esc(x.title)}</b><p>${esc(x.description)}</p><div class="master-meter"><i style="width:${Math.min(100,Math.floor((x.current/Math.max(1,x.progress))*100))}%"></i></div><small>${Math.min(x.current,x.progress)} / ${x.progress} · награда ${x.reward.toLocaleString('ru')} 🪙</small></div><button class="btn ${x.claimed?'ghost':''}" data-claim-quest="${esc(x.id)}" ${x.claimed||x.current<x.progress?'disabled':''}>${x.claimed?'Получено':'Забрать'}</button></article>`).join('')||'<div class="empty-state">Заданий пока нет.</div>';
   const unlocked=d.achievements.filter(x=>x.unlocked).length;$('#achievementCount').textContent=`${unlocked} / ${d.achievements.length} ОТКРЫТО`;
   a.innerHTML=d.achievements.map(x=>`<article class="master-achievement ${x.unlocked?'unlocked':'locked'}"><span class="master-achievement-icon">${x.unlocked?esc(x.icon):'◇'}</span><b>${esc(x.name)}</b><p>${esc(x.description)}</p><small>${x.unlocked?'Открыто · '+new Date(x.unlockedAt).toLocaleDateString('ru'):'Ещё впереди'}</small></article>`).join('');
  }catch(e){q.innerHTML=`<div class="empty-state">Не удалось загрузить задания: ${esc(e.message)}</div>`;a.innerHTML='<div class="empty-state">Проверь подключение к серверу и войди в аккаунт.</div>'}
 };
 document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-claim-quest]');if(!b)return;
  b.disabled=true;try{const d=await call('/progress/quests/'+encodeURIComponent(b.dataset.claimQuest)+'/claim',{method:'POST',body:'{}'});toastMsg(`Получено ${d.reward} монет!`);await window.renderMasterProgress()}catch(err){toastMsg(err.message);b.disabled=false}
 });
 document.addEventListener('submit',async e=>{
  if(e.target.id!=='masterReportForm')return;e.preventDefault();
  const target=$('#reportTarget').value.trim(),reason=$('#reportReason').value,details=$('#reportDetails').value.trim();
  try{await call('/reports',{method:'POST',body:JSON.stringify({targetId:target,reason,details})});e.target.reset();toastMsg('Жалоба отправлена команде модерации. Спасибо.')}catch(err){toastMsg(err.message)}
 });
 const style=document.createElement('style');style.textContent=`
 #v-progress .progress-hero{display:flex;align-items:center;justify-content:space-between;gap:20px;background:linear-gradient(120deg,rgba(112,132,108,.13),rgba(255,255,255,.02))}
 .progress-level{min-width:96px;display:grid;place-items:center;padding:14px;border:1px solid var(--line);border-radius:18px;background:rgba(128,145,120,.08)}.progress-level span,.progress-level small{font-size:10px;letter-spacing:.12em;color:var(--muted)}.progress-level b{font-size:32px;color:var(--text)}
 .master-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:16px}.master-item{display:flex;gap:12px;align-items:center;padding:14px;border:1px solid var(--line);border-radius:16px;background:var(--card2,rgba(120,130,115,.05));min-width:0}.master-item.is-done{opacity:.72}.master-item-icon{width:42px;height:42px;flex:0 0 42px;display:grid;place-items:center;border-radius:13px;background:rgba(123,145,116,.13);font-size:21px}.master-item-copy{flex:1;min-width:0}.master-item-copy b,.master-achievement b{font-size:14px;color:var(--text)}.master-item-copy p,.master-achievement p{margin:5px 0;color:var(--muted);font-size:12px;line-height:1.5}.master-item-copy small,.master-achievement small{font-size:10px;color:var(--muted)}.master-meter{height:5px;background:rgba(130,140,125,.15);border-radius:10px;overflow:hidden;margin:8px 0}.master-meter i{display:block;height:100%;background:#83977b;border-radius:10px;transition:width .35s}.master-achievement{padding:16px;border:1px solid var(--line);border-radius:16px;min-height:150px;display:flex;flex-direction:column;align-items:flex-start;gap:7px;background:rgba(120,130,115,.035)}.master-achievement.locked{opacity:.58}.master-achievement-icon{font-size:25px;width:44px;height:44px;display:grid;place-items:center;border-radius:13px;background:rgba(123,145,116,.13)}.master-achievement.unlocked{border-color:rgba(125,151,116,.5)}.master-report-form{display:grid;gap:12px;max-width:620px}.master-report-form label{display:grid;gap:7px;color:var(--muted);font-size:12px}.master-report-form .btn{justify-self:start}.empty-state{padding:20px;border:1px dashed var(--line);border-radius:14px;color:var(--muted);font-size:13px;grid-column:1/-1}
 @media(max-width:700px){.master-grid{grid-template-columns:1fr}.master-item{align-items:flex-start;flex-wrap:wrap}.master-item-copy{min-width:calc(100% - 60px)}.master-item>.btn{margin-left:54px}.progress-level{min-width:76px}.progress-level b{font-size:25px}}
 `;document.head.appendChild(style);
})();
