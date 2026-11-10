(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const cfg=window.StudyConfig||{},stage2=cfg.stage2===true&&!cfg.cohort,total=cfg.cohort?12:stage2?7:24;
  const audioVersion='none';
  const assetBase=cfg.cohort?'../sketch-sam/assets':'./assets';
  let prefetchedImage = null;
  const state = { mode: 'production', rater: null, protocol: null, sequence: [], completed: [], profile: null,
    answers: {}, viewMs: 0, viewingSince: null, busy: false, screen: 'home', loaded: false,
    trials:[],condition:'Sketch',contexts:{},explanationVersion:null };
  const stage2Entry=!cfg.cohort&&!stage2?document.createElement('section'):null;
  if(stage2Entry){stage2Entry.className='home-guide hidden';$('raterGrid').after(stage2Entry);}
  function secondStageUrl(rater){return `stage2.html?rater=${encodeURIComponent(rater)}&mode=${state.mode}`;}
  function updateFinish(){ $('finishView').disabled=!state.loaded; }
  const dimensions = [
    {key:'valence', label:'Valence · 愉悦度', description:'How positive or negative is the emotion expressed in this sketch?', captions:['Unhappy','','Neutral','','Happy']},
    {key:'arousal', label:'Arousal · 唤醒度', description:'How calm or activated is the emotion expressed in this sketch?', captions:['Calm','','Neutral','','Excited']},
    {key:'dominance', label:'Dominance · 控制感', description:'How much control does the person seem to feel in the emotional experience expressed by this sketch?', captions:['Low control','','Neutral','','High control']}
  ];
  const ratingContext=document.createElement('aside');ratingContext.className='rating-context';
  const ratingFigure=document.querySelector('.rating-sketch');ratingFigure.before(ratingContext);ratingContext.append(ratingFigure);
  const guide=document.createElement('section');guide.className='sam-guide';guide.id='samGuide';guide.setAttribute('aria-labelledby','samGuideTitle');
  guide.innerHTML=`<div class="eyebrow">HOW TO RATE / 填写指导</div><h2 id="samGuideTitle">先推断情绪，再选择分值</h2>
    <p class="guide-intro">观察图片，推断<strong>创作者想表达的情绪</strong>。评价的不是你此刻的心情，也不是作品是否好看。</p>
    <dl>
      <div><dt>愉悦度 <span>Valence · 1–9</span></dt><dd>这种情绪有多不愉快或愉快？<br><strong>1 很不愉快 · 5 中性 · 9 很愉快</strong></dd></div>
      <div><dt>唤醒度 <span>Arousal · 1–9</span></dt><dd>这种情绪有多平静或激动？<br><strong>1 很平静 · 5 中等 · 9 很激动</strong><small>高唤醒可以是兴奋，也可以是紧张；不等于开心。</small></dd></div>
      <div><dt>控制感 <span>Dominance · 1–9</span></dt><dd>创作者在这种情绪中有多被动或有掌控感？<br><strong>1 很无助／被支配 · 5 中等 · 9 很有掌控感</strong><small>不是你对图片、VR 或评分系统的操作能力。</small></dd></div>
      <div><dt>判断信心 <span>Confidence · 1–7</span></dt><dd>你对上述情绪推断有多确定？<br><strong>1 完全没把握 · 4 中等 · 7 非常有把握</strong><small>这是额外的信心题，不是 SAM 的第四个情绪维度。</small></dd></div>
    </dl><p class="guide-footer">每行选一个分值。SAM 小人从左到右对应 <strong>1、3、5、7、9</strong>；2、4、6、8 表示相邻两档之间，也可以选择。三项情绪维度分别判断；不确定时按最接近的判断作答，并在信心题如实反映，不要一律选中点。</p>`;
  ratingContext.append(guide);
  const explanationPanels=stage2?[document.createElement('section'),document.createElement('section')]:[];
  if(stage2){
    for(const panel of explanationPanels)panel.className='stage2-context';
    document.querySelector('.sketch-stage').after(explanationPanels[0]);
    ratingFigure.after(explanationPanels[1]);
  }
  const homeGuide=document.createElement('section');homeGuide.className='home-guide';homeGuide.setAttribute('aria-labelledby','homeGuideTitle');
  homeGuide.innerHTML='<h2 id="homeGuideTitle">开始前：你要推断谁的情绪？</h2><p>请通过图片推断<strong>创作者想表达的情绪</strong>，而不是报告你自己此刻的心情，也不是评价作品的美观程度。先形成整体判断，再分别填写 SAM 的愉悦度、唤醒度、控制感，以及额外的判断信心题。</p><p>每次评分时都会显示详细指导。没有预设答案，请独立判断，不需要让三个维度的分数保持一致。</p>';
  $('raterGrid').before(homeGuide);
  if(stage2)homeGuide.innerHTML='<h2>第二阶段：阅读解释，再独立复评</h2><p>这一阶段仅评价 7 份作品。每张将显示创作者的解释，以及<strong>你本人第一阶段的评分</strong>。阅读后，请重新判断作品所表达的情绪；你可以维持原判断，也可以调整。</p><p>三项 SAM 与判断信心均需重新选择。原评分仅供回顾，新的选择会单独保存。你可以随时暂停，下次继续。</p>';
  document.querySelector('.rating-instruction').textContent='先通过图片推断创作者表达的情绪，再逐项评分。不是评价你自己的心情或作品好不好看；每行选择一个分值。';
  if(stage2)document.querySelector('.rating-instruction').textContent='结合图片和创作者解释，重新判断作品表达的情绪。请独立选择全部四项；评分可以保持不变，也可以调整。';
  async function api(url, options) {
    if(stage2)url+=(url.includes('?')?'&':'?')+'stage=2';
    const response = await window.SketchAuth.fetch(url, options);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '请求失败');
    return data;
  }
  function status(id, message = '', error = false) { $(id).textContent = message; $(id).classList.toggle('error', error); }
  function stopClock() {
    if (state.viewingSince !== null) state.viewMs += performance.now() - state.viewingSince;
    state.viewingSince = null;
  }
  function clock() {
    stopClock();
    if (state.screen === 'view' && state.loaded && !document.hidden) state.viewingSince = performance.now();
  }
  document.addEventListener('visibilitychange', clock);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)persistDraft();});
  function show(name) {
    stopClock(); state.screen = name;
    for (const screen of ['home','view','rating','done']) $(screen).classList.toggle('hidden', screen !== name);
    $('testMode').disabled = name !== 'home';
    if (name === 'view') clock();
    window.scrollTo(0,0);
  }
  function draftKey() { return `sketch-sam:${state.protocol}:${audioVersion}:${state.mode}:${state.rater}:${state.profile}`; }
  function persistDraft() {
    try { localStorage.setItem(draftKey(), JSON.stringify({answers:state.answers,viewMs:Math.round(state.viewMs)})); }
    catch { /* Server-confirmed ratings remain durable even when browser storage is unavailable. */ }
  }
  function restoreDraft() {
    try {
      const draft = JSON.parse(localStorage.getItem(draftKey()) || 'null');
      if (draft) {
        for (const key of ['valence','arousal','dominance','confidence']) {
          const value = draft.answers?.[key];
          if (Number.isInteger(value) && value >= 1 && value <= (key === 'confidence' ? 7 : 9)) state.answers[key] = value;
        }
        if (Number.isFinite(draft.viewMs) && draft.viewMs >= 0) state.viewMs = Math.min(draft.viewMs,604800000);
      }
    } catch { /* An invalid local draft does not change server progress. */ }
  }
  function imageSource(profile, condition) {
    return condition === '2D' ? `../study-media/2d/${profile}.png` : `${assetBase}/sketches/${profile}.png`;
  }
  function clearPrefetch() {
    if (prefetchedImage) prefetchedImage.removeAttribute('src');
    prefetchedImage = null;
  }
  function preloadNextImage() {
    const profile = state.sequence.find(p => p !== state.profile && !state.completed.includes(p));
    if (!profile) { clearPrefetch(); return; }
    const condition = state.trials.find(t => t.profile === profile)?.condition || 'Sketch';
    const src = imageSource(profile, condition);
    if (prefetchedImage?.getAttribute('src') === src) return;
    clearPrefetch();
    // Fetch only the next original stimulus after the current one has loaded.
    // This detached image never changes presentation, answers or viewing time.
    prefetchedImage = new Image();
    prefetchedImage.fetchPriority = 'low';
    prefetchedImage.decoding = 'async';
    prefetchedImage.src = src;
  }
  async function home() {
    clearPrefetch();
    show('home'); state.busy = false; state.rater = null;
    $('raterGrid').replaceChildren(); status('homeStatus','正在读取已保存的进度…');
    if(stage2Entry){stage2Entry.replaceChildren();stage2Entry.classList.add('hidden');}
    const mode = state.mode;
    try {
      const data = await api(`/api/status?mode=${mode}`);
      if (mode !== state.mode || state.screen !== 'home') return;
      state.protocol = data.protocol;
      dimensions[2].captions = [data.dominance_low,'','Neutral','',data.dominance_high];
      for (const [index,rater] of data.raters.entries()) {
        const done = data.counts[rater];
        const button = document.createElement('button'); button.className = 'rater-card'; button.dataset.rater = rater;
        button.innerHTML = `<div class="rater-top"><span class="rater-number">${rater}</span><span aria-hidden="true">↗</span></div><h2>${cfg.cohort?'Participant':'Rater'} ${rater.slice(1)}</h2><p>${done} / ${total} 张已保存</p><progress max="${total}" value="${done}" aria-label="${rater} 已保存 ${done} 张"></progress><span class="card-action">${done === total ? '已完成 · 查看状态' : done ? '继续评价 →' : '开始评价 →'}</span>`;
        if(stage2&&!data.eligible[rater]){
          button.disabled=true;button.dataset.locked='true';
          button.querySelector('p').textContent=`第一阶段 ${data.first_stage_counts[rater]} / 24 张已保存`;
          button.querySelector('.card-action').textContent='完成第一阶段后解锁';
        }
        if(stage2Entry&&done===24){
          if(!stage2Entry.childElementCount){const title=document.createElement('h2');title.textContent='第二阶段评价';const note=document.createElement('p');note.textContent='阅读 7 位创作者的解释，并回顾你第一阶段的评分，然后再次评价。';stage2Entry.append(title,note);}
          const link=document.createElement('a');link.className='primary';link.href=secondStageUrl(rater);link.textContent=`${rater} · 进入第二阶段评价 →`;stage2Entry.append(link);stage2Entry.classList.remove('hidden');
        }
        button.addEventListener('click', () => select(rater)); $('raterGrid').appendChild(button);
      }
      status('homeStatus');
    } catch (error) { status('homeStatus', `无法读取进度：${error.message}。请检查网络后刷新。`, true); }
  }
  async function select(rater) {
    if (state.busy) return;
    state.busy = true; $('testMode').disabled = true;
    document.querySelectorAll('.rater-card').forEach(b => b.disabled = true);
    try {
      const data = await api(`/api/session?rater=${rater}&mode=${state.mode}`);
      state.rater = rater; state.sequence = data.sequence; state.completed = data.completed; state.protocol = data.protocol;
      state.trials=data.trials||data.sequence.map(profile=>({profile,condition:'Sketch'}));
      state.contexts=data.contexts||{};state.explanationVersion=data.explanation_version||null;
      next();
    } catch (error) { status('homeStatus', error.message, true); $('testMode').disabled = false; }
    finally { state.busy = false; document.querySelectorAll('.rater-card').forEach(b => b.disabled = b.dataset.locked==='true'); }
  }
  function tag() { return `${state.rater} · ${state.condition} · ${state.sequence.indexOf(state.profile)+1} / ${total}`; }
  function renderExplanation(){
    if(!stage2)return;
    const context=state.contexts[state.profile];
    for(const panel of explanationPanels){
      panel.replaceChildren();const title=document.createElement('h2');title.textContent=`${state.profile} · 创作者解释`;
      const quote=document.createElement('blockquote');quote.textContent=context.explanation;
      const label=document.createElement('h3');label.textContent='你在第一阶段的评分（只读）';
      const scores=document.createElement('dl');scores.className='baseline-scores';
      for(const [key,name] of [['valence','愉悦度'],['arousal','唤醒度'],['dominance','控制感'],['confidence','判断信心']]){
        const item=document.createElement('div'),term=document.createElement('dt'),value=document.createElement('dd');term.textContent=name;value.textContent=`${context.baseline[key]} / ${key==='confidence'?7:9}`;item.append(term,value);scores.append(item);
      }
      panel.append(title,quote,label,scores);
    }
  }
  function next() {
    state.profile = state.sequence.find(profile => !state.completed.includes(profile));
    if (!state.profile) { clearPrefetch(); $('doneMessage').textContent = `${state.rater} · ${total} / ${total} 张已完成`;const link=$('secondStageLink');if(link){link.href=secondStageUrl(state.rater);link.classList.remove('hidden');} show('done'); return; }
    state.condition=state.trials.find(t=>t.profile===state.profile)?.condition||'Sketch';
    state.answers = {}; state.viewMs = 0; state.loaded = false; restoreDraft();
    renderExplanation();
    $('viewTag').textContent = tag(); $('ratingTag').textContent = tag();
    $('finishView').disabled = true; $('imageLoading').classList.remove('hidden'); $('imageLoading').textContent = '正在加载图片…';
    const image = $('sketchImage');
    image.fetchPriority = 'high';
    image.alt=`待评价的 ${state.condition}`;
    image.onload = () => { state.loaded = true; updateFinish(); $('imageLoading').classList.add('hidden'); clock(); if (state.screen === 'view') preloadNextImage(); };
    image.onerror = () => { state.loaded = false; $('finishView').disabled = true; $('imageLoading').textContent = '图片加载失败，请返回首页后重试。'; stopClock(); };
    image.src = imageSource(state.profile, state.condition);
    status('viewStatus'); show('view');
  }
  function radio(key, value, label) {
    const cell = document.createElement('label'); cell.className = 'radio-cell';
    const input = document.createElement('input'); input.type = 'radio'; input.name = key; input.value = value;
    input.setAttribute('aria-label',`${label} ${value}`); input.checked = state.answers[key] === value;
    input.addEventListener('change', () => { state.answers[key] = value; persistDraft(); updateSubmit(); });
    const number = document.createElement('span'); number.textContent = value;
    cell.append(input,number); return cell;
  }
  function renderSam() {
    $('ratingSketchImage').src = $('sketchImage').src;
    const matrix = $('samMatrix'); matrix.replaceChildren();
    for (const dimension of dimensions) {
      const field = document.createElement('fieldset'); field.className = 'sam-dimension';
      const legend = document.createElement('legend'); legend.textContent = dimension.label;
      const description = document.createElement('p'); description.className = 'dimension-desc'; description.textContent = dimension.description;
      const help=document.createElement('p');help.className='dimension-help';help.id=`${dimension.key}-help`;help.textContent=dimension.help;field.setAttribute('aria-describedby',help.id);
      const images = document.createElement('div'); images.className = 'sam-images';
      const radios = document.createElement('div'); radios.className = 'sam-radios';
      for (let value=1; value<=9; value++) {
        const cell = document.createElement('div'); cell.className = 'sam-image-cell';
        if (value % 2) {
          const img = document.createElement('img'); img.src = `${assetBase}/sam/${dimension.key}${(value+1)/2}.png`;
          img.alt = `${dimension.label} ${value}`;
          const caption = document.createElement('span'); caption.className = 'caption'; caption.textContent = dimension.captions[(value-1)/2];
          cell.append(img,caption);
        }
        images.appendChild(cell); radios.appendChild(radio(dimension.key,value,dimension.key));
      }
      field.append(legend,description,help,images,radios); matrix.appendChild(field);
    }
    const confidence = document.createElement('fieldset'); confidence.className = 'sam-dimension';
    confidence.innerHTML = '<legend>Confidence · 判断信心</legend><p class="dimension-desc">How confident are you in your interpretation of the creator\'s emotional state?</p><p class="dimension-help" id="confidence-help">对刚才的情绪推断有多确定？1 = 完全没把握，4 = 中等，7 = 非常有把握。不是情绪强度。</p>';
    confidence.setAttribute('aria-describedby','confidence-help');
    const likert = document.createElement('div'); likert.className = 'likert';
    for (let value=1; value<=7; value++) likert.appendChild(radio('confidence',value,'Confidence'));
    const endpoints = document.createElement('div'); endpoints.className = 'endpoints'; endpoints.innerHTML = '<span>1 = Not at all confident</span><span>7 = Extremely confident</span>';
    confidence.append(likert,endpoints); matrix.appendChild(confidence);
    status('ratingStatus'); updateSubmit();
  }
  function updateSubmit() {
    const count = ['valence','arousal','dominance','confidence'].filter(k => state.answers[k] != null).length;
    $('answerCount').textContent = `已完成 ${count} / 4 项`;
    $('submit').disabled = count !== 4 || state.busy;
  }
  function lock(locked) {
    state.busy = locked;
    $('ratingForm').querySelectorAll('input,button').forEach(el => el.disabled = locked);
    updateSubmit();
  }
  $('ratingForm').addEventListener('submit', async event => {
    event.preventDefault(); if (state.busy || $('submit').disabled) return;
    lock(true); status('ratingStatus','正在保存…');
    try {
      await api('/api/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        mode:state.mode,rater:state.rater,profile:state.profile,protocol:state.protocol,
        ...state.answers,view_ms:Math.round(state.viewMs),audio_ms:0,audio_version:audioVersion,condition:state.condition,
        ...(stage2?{explanation_version:state.explanationVersion}:{})
      })});
      try { localStorage.removeItem(draftKey()); } catch {}
      state.completed.push(state.profile); next();
    } catch (error) { status('ratingStatus', `${error.message} 当前选择已保留，可重试。`, true); }
    finally { lock(false); }
  });
  $('finishView').addEventListener('click', () => { if (!state.loaded||$('finishView').disabled) return; stopClock(); persistDraft(); renderSam(); show('rating'); });
  $('review').addEventListener('click', () => show('view'));
  for (const id of ['pauseView','pauseRating']) $(id).addEventListener('click', () => { stopClock(); persistDraft(); home(); });
  $('backHome').addEventListener('click',home);
  $('testMode').addEventListener('change', () => { state.mode = $('testMode').checked ? 'test' : 'production'; $('testBanner').classList.toggle('hidden',state.mode !== 'test'); home(); });
  window.addEventListener('pagehide', () => { if (state.profile) { stopClock(); persistDraft(); } });
  dimensions[0].description='Infer how unpleasant or pleasant the creator’s expressed emotion is.';
  dimensions[0].help='情绪有多不愉快或愉快？1 = 很不愉快，5 = 中性，9 = 很愉快。不是你对作品的喜好。';
  dimensions[1].description='Infer how calm or activated the creator’s expressed emotion is.';
  dimensions[1].help='情绪有多平静或激动？1 = 很平静，5 = 中等，9 = 很激动。兴奋和紧张都可能是高唤醒。';
  dimensions[2].description='Infer how powerless or in control the creator seems to feel in that emotional experience.';
  dimensions[2].help='在这种情绪中有多无助或有掌控感？1 = 很无助／被支配，5 = 中等，9 = 很有掌控感。不是操作系统的能力。';
  window.SketchAuth.ready.then(() => {
    if(stage2&&new URLSearchParams(location.search).get('mode')==='test'){
      state.mode='test';$('testMode').checked=true;$('testBanner').classList.remove('hidden');
    }
    if(window.SketchAuth.role==='ADMIN'){
      state.mode='test';$('testMode').checked=true;$('testBanner').classList.remove('hidden');
    }
    home();
  });
})();
