(() => {
  const $ = id => document.getElementById(id);
  let loading = false;
  const stage=()=>$('stage').value;
  const apiPath=path=>path+(path.includes('?')?'&':'?')+'stage='+stage();
  if(new URLSearchParams(location.search).get('stage')==='2')$('stage').value='2';
  async function load() {
    if (loading) return; loading = true;
    $('refresh').disabled = true; $('mode').disabled = true; $('stage').disabled = true;
    $('status').textContent = '正在读取…'; $('status').classList.remove('error');
    const mode = $('mode').value;
    try {
      const response = await window.SketchAuth.fetch(apiPath(`/api/results?mode=${mode}`)); const data = await response.json();
      if (!response.ok) throw new Error(data.error || '读取失败');
      $('coding').textContent = `SAM：1–9；Confidence：1–7。Dominance：1 = ${data.dominance_low}，9 = ${data.dominance_high}。`;
      $('metrics').replaceChildren(); $('rows').replaceChildren();
      const second=stage()==='2',profiles=second?data.profiles:Array.from({length:24},(_,n)=>`P${n+1}`),total=profiles.length;
      $('overview').textContent=second?'第二阶段：7 份作品 × 3 位 Rater，共 21 份复评。每格显示第一阶段评分与第二阶段评分。':'第一阶段：24 张 Sketch × 3 位 Rater，共 72 份评价。';
      $('tableNote').textContent=second?'每格上行为第一阶段评分，下行为第二阶段评分；两行均依次为 Valence / Arousal / Dominance / Confidence。CSV 同时保留原评分、复评分和展示的解释。':'表格每格依次为 Valence / Arousal / Dominance / Confidence。长表为每次评价一行；宽表为每张 Sketch 一行、三位 Rater 的评分分别列出，空值表示未评价。';
      for (const rater of data.raters) {
        const count = data.rows.filter(row => row.rater === rater).length;
        const card = document.createElement('div'); card.className = 'metric';
        card.innerHTML = `<span>${rater}</span><strong>${count} / ${total}</strong><progress max="${total}" value="${count}" aria-label="${rater} 进度"></progress>`;
        $('metrics').appendChild(card);
      }
      for (const profile of profiles) {
        const tr = document.createElement('tr');
        const title = document.createElement('td'); title.textContent = profile; tr.appendChild(title);
        let count = 0;
        for (const rater of data.raters) {
          const row = data.rows.find(r => r.profile === profile && r.rater === rater);
          const td = document.createElement('td');
          if (row) {
            const keys=['valence','arousal','dominance','confidence'];
            if(second){for(const [label,scores]of [['原评分',row.baseline],['复评分',row]]){const line=document.createElement('span');line.className='stage2-results';line.textContent=label+'：'+keys.map(k=>scores[k]).join(' / ');td.append(line);}}
            else td.textContent=keys.map(k=>row[k]).join(' / ');
            count++;
          }
          else { td.textContent = '未评价'; td.className = 'pending'; }
          tr.appendChild(td);
        }
        const total = document.createElement('td'); total.textContent = `${count} / 3`; tr.appendChild(total); $('rows').appendChild(tr);
      }
      const silent=data.rows.filter(r=>!r.audio_version||r.audio_version==='none').length;
      $('status').textContent = second?`${mode==='test'?'测试':'正式'}第二阶段：${data.rows.length} / 21 份已保存。第一阶段评分与复评分分别保留。`:`${mode === 'test' ? '测试' : '正式'}第一阶段：${data.rows.length} / 72 份已保存；其中仅图片 ${silent} 份，有声版 ${data.rows.length-silent} 份。CSV 已分别标记，请勿直接混合分析。`;
    } catch (error) { $('status').textContent = error.message; $('status').classList.add('error'); }
    finally { loading = false; $('refresh').disabled = false; $('mode').disabled = false; $('stage').disabled = false; }
  }
  for(const [id,layout] of [['longExport','long'],['wideExport','wide']]){
    $(id).href='#';
    $(id).addEventListener('click',async event=>{
      event.preventDefault();
      try{
        const mode=$('mode').value;
        const selectedStage=stage();
        const response=await window.SketchAuth.fetch(apiPath(`/api/export.csv?mode=${mode}&layout=${layout}`));
        if(!response.ok)throw new Error((await response.json()).error||'导出失败');
        const url=URL.createObjectURL(await response.blob());const link=document.createElement('a');
        link.href=url;link.download=`sketch_sam_stage${selectedStage}_${mode}_${layout}.csv`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
      }catch(error){$('status').textContent=error.message;$('status').classList.add('error');}
    });
  }
  $('mode').addEventListener('change',load); $('refresh').addEventListener('click',load);
  $('stage').addEventListener('change',load);
  window.SketchAuth.ready.then(()=>{
    if(window.SketchAuth.role!=='ADMIN'){
      $('status').textContent='仅研究者可查看结果。请返回评分首页。';
      for(const id of ['longExport','wideExport','refresh','mode','stage'])$(id).classList.add('hidden');return;
    }
    load();
  });
})();
