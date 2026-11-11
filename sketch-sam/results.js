(() => {
  const $ = id => document.getElementById(id);
  let loading = false;
  const stage=()=>$('stage').value;
  const expert=()=>$('instrument').value!=='legacy';
  const condition=()=>$('instrument').value==='expert-2d-dual-v1'?'2D':'Sketch';
  const apiPath=path=>path+(path.includes('?')?'&':'?')+'stage='+stage()+(expert()?'&instrument='+encodeURIComponent($('instrument').value):'');
  if(new URLSearchParams(location.search).get('stage')==='2')$('stage').value='2';
  async function load() {
    if (loading) return; loading = true;
    $('refresh').disabled = true; $('mode').disabled = true; $('stage').disabled = true; $('instrument').disabled=true;
    $('status').textContent = '正在读取…'; $('status').classList.remove('error');
    const mode = $('mode').value;
    try {
      const response = await window.SketchAuth.fetch(apiPath(`/api/results?mode=${mode}`)); const data = await response.json();
      if (!response.ok) throw new Error(data.error || '读取失败');
      $('coding').textContent = `情绪评分：1–9；判断信心：1–7。控制感：1 = 低控制感，9 = 高控制感。`;
      $('metrics').replaceChildren(); $('rows').replaceChildren();
      const second=stage()==='2',profiles=second?data.profiles:Array.from({length:24},(_,n)=>`P${n+1}`),total=profiles.length;
      $('overview').textContent=second?'第二阶段：7 份作品 × 3 位 Rater，共 21 份复评。每格显示第一阶段评分与第二阶段评分。':'第一阶段：24 张 Sketch × 3 位 Rater，共 72 份评价。';
      $('tableNote').textContent=second?'每格上行为第一阶段评分，下行为第二阶段评分；两行均依次为 Valence / Arousal / Dominance / Confidence。CSV 同时保留原评分、复评分和展示的解释。':'表格每格依次为 Valence / Arousal / Dominance / Confidence。长表为每次评价一行；宽表为每张 Sketch 一行、三位 Rater 的评分分别列出，空值表示未评价。';
      if(expert()){
        $('overview').textContent=second?`${condition()} 第二阶段：${total} 份作品 × 3 位专家，共 ${total*3} 份创作者意图复评。`:`${condition()} 第一阶段：24 张 × 3 位专家；每张两组情绪评分，2D 版每组另含独立判断信心。`;
        $('tableNote').textContent=second?'两行均为创作者意图的愉悦度／唤醒度／控制感／判断信心。CSV 另含完整新版第一阶段快照和解释。':(condition()==='2D'?'场景氛围与创作者意图均按愉悦度／唤醒度／控制感／判断信心显示。— 表示旧版未收集该项；CSV 保留两组分数与呈现顺序。':'场景氛围：V / A / D；创作者意图：V / A / D / Confidence。');
      }
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
            const keys=expert()?['intended_valence','intended_arousal','intended_dominance','confidence']:['valence','arousal','dominance','confidence'];
            if(second){for(const [label,scores]of [['原评分',row.baseline],['复评分',row]]){const line=document.createElement('span');line.className='stage2-results';line.textContent=label+'：'+keys.map(k=>scores[k]).join(' / ');td.append(line);}}
            else if(expert()){
              for(const [label,values]of [['场景氛围',['atmosphere_valence','atmosphere_arousal','atmosphere_dominance',...(condition()==='2D'?['atmosphere_confidence']:[])]],['创作者意图',keys]]){const line=document.createElement('span');line.className='stage2-results';line.textContent=label+'：'+values.map(k=>row[k]??'—').join(' / ');td.append(line);}
              const order=document.createElement('span');order.className='stage2-results';order.textContent=row.question_order==='atmosphere_first'?'顺序：场景氛围 → 创作者意图':'顺序：创作者意图 → 场景氛围';td.append(order);
              if(condition()!=='2D'){const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent='查看文字回答';details.append(summary);
              for(const [key,label]of [['visual_elements','视觉元素'],['personal_meaning','个人意义']]){const p=document.createElement('p');p.className='result-text';p.textContent=label+'：'+row[key];details.append(p);}td.append(details);}
            }else td.textContent=keys.map(k=>row[k]).join(' / ');
            count++;
          }
          else { td.textContent = '未评价'; td.className = 'pending'; }
          tr.appendChild(td);
        }
        const total = document.createElement('td'); total.textContent = `${count} / 3`; tr.appendChild(total); $('rows').appendChild(tr);
      }
      const silent=data.rows.filter(r=>!r.audio_version||r.audio_version==='none').length;
      $('status').textContent = second?`${mode==='test'?'测试':'正式'}第二阶段：${data.rows.length} / 21 份已保存。第一阶段评分与复评分分别保留。`:`${mode === 'test' ? '测试' : '正式'}第一阶段：${data.rows.length} / 72 份已保存；其中仅图片 ${silent} 份，有声版 ${data.rows.length-silent} 份。CSV 已分别标记，请勿直接混合分析。`;
          if(expert())$('status').textContent=`${mode==='test'?'测试':'正式'} ${condition()} 第 ${stage()} 阶段：${data.rows.length} / ${total*3} 份已保存。其他版本记录单独保留。`;
    } catch (error) { $('status').textContent = error.message; $('status').classList.add('error'); }
    finally { loading = false; $('refresh').disabled = false; $('mode').disabled = false; $('stage').disabled = false; $('instrument').disabled=false; }
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
        link.href=url;link.download=`${expert()?$('instrument').value:'sketch_sam_legacy'}_stage${selectedStage}_${mode}_${layout}.csv`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
      }catch(error){$('status').textContent=error.message;$('status').classList.add('error');}
    });
  }
  $('mode').addEventListener('change',load); $('refresh').addEventListener('click',load);
  $('stage').addEventListener('change',load);$('instrument').addEventListener('change',load);
  window.SketchAuth.ready.then(()=>{
    if(window.SketchAuth.role!=='ADMIN'){
      $('status').textContent='仅研究者可查看结果。请返回评分首页。';
      for(const id of ['longExport','wideExport','refresh','mode','stage','instrument'])$(id).classList.add('hidden');return;
    }
    load();
  });
})();
