(()=>{
 const $=id=>document.getElementById(id);let busy=false;
 async function load(){
  if(busy)return;busy=true;$('refresh').disabled=true;$('status').textContent='正在读取…';
  try{
   const response=await SketchAuth.fetch('/api/results?mode='+$('mode').value),data=await response.json();if(!response.ok)throw Error(data.error);
   $('metrics').replaceChildren();$('rows').replaceChildren();
   for(const p of data.participants){const n=data.rows.filter(r=>r.participant===p).length,card=document.createElement('div');card.className='metric';card.innerHTML=`<span>${p}</span><strong>${n} / 12</strong><progress value="${n}" max="12" aria-label="${p} 进度"></progress>`;$('metrics').append(card);}
   for(const r of data.rows){const tr=document.createElement('tr');for(const v of [r.participant,r.trial_index,r.profile,r.condition,r.valence,r.arousal,r.dominance,r.confidence,(r.audio_ms/1000).toFixed(1)]){const td=document.createElement('td');td.textContent=v;tr.append(td);}$('rows').append(tr);}
   const people=data.participants.length,target=people*data.total;
   $('cohortSummary').textContent=`${people} PARTICIPANTS / ${target} RATINGS`;
   $('status').textContent=`${$('mode').value==='test'?'测试':'正式'}：${data.rows.length} / ${target} 份评分；${data.participants.filter(p=>data.rows.filter(r=>r.participant===p).length===data.total).length} / ${people} 人已完成`;
  }catch(e){$('status').textContent=e.message;}finally{busy=false;$('refresh').disabled=false;}
 }
 async function download(path,name){try{const r=await SketchAuth.fetch(path);if(!r.ok)throw Error((await r.json()).error);const url=URL.createObjectURL(await r.blob()),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){$('status').textContent=e.message;}}
 $('refresh').onclick=load;$('mode').onchange=load;
 $('export').onclick=()=>download('/api/export.csv?mode='+$('mode').value,`2d_sketch_sam_${$('mode').value}.csv`);
 $('assignments').onclick=()=>download('/api/assignments.csv','2d_sketch_assignments.csv');
 SketchAuth.ready.then(()=>{if(SketchAuth.role!=='ADMIN'){document.querySelector('.toolbar').classList.add('hidden');$('status').textContent='仅研究者可查看结果。';return;}load();});
})();
