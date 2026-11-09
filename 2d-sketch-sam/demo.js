// Offline-in-browser scoring adapter. No fetch, claim, invitation or production writes.
(()=>{
 const SLOT='self-scape-demo-local-silent-v2',PROTOCOL='demo-local-silent-v2',RATER='T1';
 const trials=[['P7','2D'],['P2','Sketch'],['P12','Sketch'],['P4','2D'],['P9','Sketch'],['P1','2D'],['P11','2D'],['P6','Sketch'],['P3','Sketch'],['P10','2D'],['P5','2D'],['P8','Sketch']].map(([profile,condition])=>({profile,condition}));
 const config={protocol:PROTOCOL,total:12,raters:[RATER],dominance_low:'Low control',dominance_high:'High control'};
 const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
 function rows(){try{const a=JSON.parse(localStorage.getItem(SLOT)||'[]');return Array.isArray(a)?a.filter(r=>r.protocol===PROTOCOL&&trials.some(t=>t.profile===r.profile)):[];}catch{return[];}}
 window.SketchAuth={role:'ADMIN',ready:Promise.resolve({demo:true}),async fetch(path,options={}){
  const url=new URL(path,location.origin),mode=url.searchParams.get('mode');
  if(options.method!=='POST'&&mode!=='test')return reply({error:'演示页面仅支持本地测试数据。'},400);
  const saved=rows();
  if(url.pathname==='/api/status')return reply({...config,counts:{[RATER]:saved.length}});
  if(url.pathname==='/api/session')return reply({...config,sequence:trials.map(t=>t.profile),trials,completed:saved.map(r=>r.profile)});
  if(url.pathname==='/api/submit'&&options.method==='POST'){
   let b;try{b=JSON.parse(options.body);}catch{return reply({error:'无效测试评分。'},400);}
   if(b.mode!=='test'||b.protocol!==PROTOCOL||b.rater!==RATER||!trials.some(t=>t.profile===b.profile&&t.condition===b.condition))return reply({error:'仅允许演示任务，不会提交正式数据。'},400);
   const scores=['valence','arousal','dominance','confidence'];
   if(scores.some(k=>!Number.isInteger(b[k])||b[k]<1||b[k]>(k==='confidence'?7:9)))return reply({error:'请完整填写四项评分。'},400);
   if(b.audio_version!=='none'||b.audio_ms!==0)return reply({error:'测试页面已更新，请刷新后重试。'},400);
   const previous=saved.find(r=>r.profile===b.profile);
   if(previous)return scores.every(k=>previous[k]===b[k])?reply({ok:true,already_saved:true}):reply({error:'本地测试评分已保存，可重新开始测试。'},409);
   if(trials.find(t=>!saved.some(r=>r.profile===t.profile))?.profile!==b.profile)return reply({error:'测试进度已变化，请刷新继续。'},409);
   try{localStorage.setItem(SLOT,JSON.stringify([...saved,{...b,submitted_at_utc:new Date().toISOString()}]));}catch{return reply({error:'浏览器无法保存测试进度。请允许本地存储后重试；不会上传到云端。'},503);}
   return reply({ok:true});
  }
  return reply({error:'演示页不连接研究后台。'},404);
 }};
 document.querySelector('.mode-switch').classList.add('hidden');
 document.querySelector('a[href="results.html"]').remove();
 const reset=document.createElement('button');reset.id='resetDemo';reset.className='secondary';reset.textContent='重新开始测试';reset.onclick=()=>{
  if(!confirm('清除本浏览器的演示评分并重新开始？不会影响任何正式任务或报名。'))return;
  localStorage.removeItem(SLOT);const draftKeys=Object.keys(localStorage).filter(k=>k.startsWith('sketch-sam:'+PROTOCOL+':'));for(const k of draftKeys)localStorage.removeItem(k);location.reload();
 };document.querySelector('nav').append(reset);
 document.getElementById('testBanner').textContent='演示测试 · 不报名、不占名额、不上传评分；测试进度仅保存在当前浏览器';
})();
