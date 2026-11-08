(() => {
  const $ = id => document.getElementById(id);
  let loading = false;
  async function load() {
    if (loading) return; loading = true;
    $('refresh').disabled = true; $('mode').disabled = true;
    $('status').textContent = '正在读取…'; $('status').classList.remove('error');
    const mode = $('mode').value;
    try {
      const response = await window.SketchAuth.fetch(`/api/results?mode=${mode}`); const data = await response.json();
      if (!response.ok) throw new Error(data.error || '读取失败');
      $('coding').textContent = `SAM：1–9；Confidence：1–7。Dominance：1 = ${data.dominance_low}，9 = ${data.dominance_high}。`;
      $('metrics').replaceChildren(); $('rows').replaceChildren();
      for (const rater of data.raters) {
        const count = data.rows.filter(row => row.rater === rater).length;
        const card = document.createElement('div'); card.className = 'metric';
        card.innerHTML = `<span>${rater}</span><strong>${count} / 24</strong><progress max="24" value="${count}" aria-label="${rater} 进度"></progress>`;
        $('metrics').appendChild(card);
      }
      for (let n=1;n<=24;n++) {
        const profile = `P${n}`; const tr = document.createElement('tr');
        const title = document.createElement('td'); title.textContent = profile; tr.appendChild(title);
        let count = 0;
        for (const rater of data.raters) {
          const row = data.rows.find(r => r.profile === profile && r.rater === rater);
          const td = document.createElement('td');
          if (row) { td.textContent = ['valence','arousal','dominance','confidence'].map(k=>row[k]).join(' / '); count++; }
          else { td.textContent = '未评价'; td.className = 'pending'; }
          tr.appendChild(td);
        }
        const total = document.createElement('td'); total.textContent = `${count} / 3`; tr.appendChild(total); $('rows').appendChild(tr);
      }
      $('status').textContent = `${mode === 'test' ? '测试' : '正式'}数据：${data.rows.length} / 72 份已保存`;
    } catch (error) { $('status').textContent = error.message; $('status').classList.add('error'); }
    finally { loading = false; $('refresh').disabled = false; $('mode').disabled = false; }
  }
  for(const [id,layout] of [['longExport','long'],['wideExport','wide']]){
    $(id).href='#';
    $(id).addEventListener('click',async event=>{
      event.preventDefault();
      try{
        const mode=$('mode').value;
        const response=await window.SketchAuth.fetch(`/api/export.csv?mode=${mode}&layout=${layout}`);
        if(!response.ok)throw new Error((await response.json()).error||'导出失败');
        const url=URL.createObjectURL(await response.blob());const link=document.createElement('a');
        link.href=url;link.download=`sketch_sam_${mode}_${layout}.csv`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
      }catch(error){$('status').textContent=error.message;$('status').classList.add('error');}
    });
  }
  $('mode').addEventListener('change',load); $('refresh').addEventListener('click',load);
  window.SketchAuth.ready.then(()=>{
    if(window.SketchAuth.role!=='ADMIN'){
      $('status').textContent='仅研究者可查看结果。请返回评分首页。';
      for(const id of ['longExport','wideExport','refresh','mode'])$(id).classList.add('hidden');return;
    }
    load();
  });
})();
