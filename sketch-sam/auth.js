(() => {
  'use strict';
  const API='https://sam-api.playerinmetaverse.tech';
  const cfg=window.StudyConfig||{};
  const SLOT=cfg.cohort?'cohort-sam-online-access':'sketch-sam-online-access';
  const main=document.querySelector('main');
  main.classList.add('hidden');
  const gate=document.createElement('section');gate.className='screen home';gate.id='accessGate';
  gate.innerHTML='<div class="eyebrow">SELF-SCAPE / INVITED RATERS</div><h1>Sketch 情绪评价</h1><p class="lead">请使用研究者发给你的邀请链接。</p><p class="muted">也可以输入邀请码。每位评价者只会进入自己的评分任务，提交后数据会保存在云端。</p><form id="accessForm" style="max-width:540px;margin-top:28px"><label for="accessCode">邀请码</label><input id="accessCode" type="password" autocomplete="off" spellcheck="false" required style="display:block;width:100%;padding:13px;margin:10px 0 18px;border:1px solid var(--line);border-radius:8px;font:inherit"><button class="primary" id="accessSubmit">进入评价</button><p id="accessStatus" class="status" role="status"></p></form>';
  main.before(gate);
  if(cfg.cohort&&!location.pathname.endsWith('results.html')){const join=document.createElement('a');join.href='join.html';join.className='primary';join.id='publicJoin';join.textContent='没有邀请码？开始或继续参与 →';gate.querySelector('#accessForm').before(join);}
  if(cfg.cohort){gate.querySelector('h1').textContent='2D / Sketch 情绪评价';gate.querySelector('.eyebrow').textContent='SELF-SCAPE / INVITED PARTICIPANTS';}
  let key='';let resolveReady;
  const ready=new Promise(resolve=>resolveReady=resolve);
  async function login(code){
    const status=document.getElementById('accessStatus');const button=document.getElementById('accessSubmit');
    if(!/^[A-Za-z0-9_-]{32}$/.test(code)){status.textContent='邀请码格式不正确，请使用完整邀请链接或重新输入。';return;}
    button.disabled=true;status.textContent='正在验证邀请码…';
    try{
      const response=await fetch(API+(cfg.cohort?'/api/cohort/auth':'/api/auth'),{headers:{Authorization:`Bearer ${code}`}});
      const data=await response.json();if(!response.ok)throw new Error(data.error||'验证失败');
      key=code;try{sessionStorage.setItem(SLOT,key);}catch{}
      window.SketchAuth.role=data.role;
      if(cfg.cohort&&data.access==='claim'){
        try{localStorage.setItem('cohort-sam-claim',code);}catch{}
        document.querySelector('.mode-switch')?.classList.add('hidden');
        const recovery=document.createElement('details');recovery.className='home-guide';
        recovery.innerHTML='<summary>保存我的恢复码（请勿分享）</summary><p class="muted">同一浏览器会自动继续。若需换设备，请在群入口选择“已有恢复码”，恢复原任务，不要重新报名。</p><input type="password" readonly aria-label="我的恢复码" style="max-width:100%;width:360px;padding:10px"><button type="button" class="secondary">复制恢复码</button><span role="status"></span>';
        recovery.querySelector('input').value=code;recovery.querySelector('button').onclick=async()=>{try{await navigator.clipboard.writeText(code);recovery.querySelector('span').textContent=' 已复制，请私下保存。';}catch{const input=recovery.querySelector('input');input.type='text';input.select();recovery.querySelector('span').textContent=' 请手动复制并私下保存。';}};
        document.getElementById('home')?.append(recovery);
      }
      if(data.role!=='ADMIN')document.querySelectorAll('a[href="results.html"]').forEach(a=>a.classList.add('hidden'));
      const identity=document.createElement('span');identity.className='pill';identity.textContent=data.role==='ADMIN'?'研究者':data.role;
      const logout=document.createElement('button');logout.className='text-button';logout.textContent='退出';
      logout.onclick=()=>{try{sessionStorage.removeItem(SLOT);}catch{}location.replace('./');};
      const header=document.querySelector('header');const actions=header.querySelector('nav')||header;actions.append(identity,logout);
      gate.classList.add('hidden');main.classList.remove('hidden');resolveReady(data);
    }catch(error){status.textContent=error.message||'暂时无法连接，请稍后重试。';status.classList.add('error');}
    finally{button.disabled=false;}
  }
  window.SketchAuth={ready,role:null,fetch:(url,options={})=>fetch(API+(cfg.cohort?url.replace(/^\/api\//,'/api/cohort/'):url),{...options,headers:{...options.headers,Authorization:`Bearer ${key}`}})};
  document.getElementById('accessForm').onsubmit=e=>{e.preventDefault();login(document.getElementById('accessCode').value.trim());};
  const hash=new URLSearchParams(location.hash.slice(1));const invitation=hash.get('key');
  if(invitation)history.replaceState(null,'',location.pathname+location.search);
  let cached='';try{cached=sessionStorage.getItem(SLOT)||'';}catch{}
  if(cfg.cohort&&!cached&&!location.pathname.endsWith('results.html'))try{cached=localStorage.getItem('cohort-sam-claim')||'';}catch{}
  if(invitation||cached)login(invitation||cached);
})();
