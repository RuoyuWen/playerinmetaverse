(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const cfg=window.StudyConfig||{},stage2=cfg.stage2===true;
  let total=stage2?8:24;
  const audioVersion='none';
  const intendedKeys=['intended_valence','intended_arousal','intended_dominance'];
  const atmosphereKeys=['atmosphere_valence','atmosphere_arousal','atmosphere_dominance'];

  const numericKeys=[...intendedKeys,'confidence',...(stage2?[]:[...atmosphereKeys,'atmosphere_confidence'])];
  const answerKeys=numericKeys;
  const assetBase=cfg.cohort?'../sketch-sam/assets':'./assets';
  let prefetchedImage = null;
  const state = { mode: 'production', rater: null, protocol: null, sequence: [], completed: [], profile: null,
    answers: {}, viewMs: 0, viewingSince: null, busy: false, screen: 'home', loaded: false,
    trials:[],condition:'2D',contexts:{},explanationVersion:null,questionOrders:{},groupStep:0 };
  const stage2Entry=!cfg.cohort&&!stage2?document.createElement('section'):null;
  if(stage2Entry){stage2Entry.className='home-guide hidden';$('raterGrid').after(stage2Entry);}
  function secondStageUrl(rater){return `stage2.html?rater=${encodeURIComponent(rater)}&mode=${state.mode}`;}
  function updateFinish(){ $('finishView').disabled=!state.loaded; }
  const dimensions = [
    {key:'valence',label:'愉悦度',english:'Valence',captions:['不愉快','','中性','','愉快'],englishCaptions:['Unhappy','','Neutral','','Happy']},
    {key:'arousal',label:'唤醒度',english:'Arousal',captions:['平静','','中等','','激动'],englishCaptions:['Calm','','Neutral','','Excited']},
    {key:'dominance',label:'控制感',english:'Dominance',captions:['低控制感','','中等','','高控制感'],englishCaptions:['Low control','','Neutral','','High control']}
  ];
  function bilingual(element,chinese,english){
    element.textContent=chinese;
    const secondary=document.createElement('span');secondary.className='english-secondary';secondary.lang='en';secondary.textContent=english;element.append(secondary);return element;
  }
  function firstGroupKeys(){return state.questionOrders[state.profile]==='atmosphere_first'?[...atmosphereKeys,'atmosphere_confidence']:[...intendedKeys,'confidence'];}
  const ratingContext=document.createElement('aside');ratingContext.className='rating-context';
  const ratingFigure=document.querySelector('.rating-sketch');ratingFigure.before(ratingContext);ratingContext.append(ratingFigure);
  const guide=document.createElement('section');guide.className='sam-guide';guide.id='samGuide';guide.setAttribute('aria-labelledby','samGuideTitle');
  guide.innerHTML=`<div class="eyebrow">填写指导</div><h2 id="samGuideTitle">分别判断三个情绪维度</h2><dl>
    <div><dt>愉悦度<span class="english-secondary" lang="en">Valence</span></dt><dd>1 很不愉快 · 5 中性 · 9 很愉快</dd></div>
    <div><dt>唤醒度<span class="english-secondary" lang="en">Arousal</span></dt><dd>1 很平静 · 5 中等 · 9 很激动<small>兴奋和紧张都可能是高唤醒。</small></dd></div>
    <div><dt>控制感<span class="english-secondary" lang="en">Dominance</span></dt><dd>1 很无助／被支配 · 5 中等 · 9 很有掌控感<small>判断情绪中的控制感，不是操作系统的能力。</small></dd></div>
    </dl><p class="guide-footer">请根据当前显示的问题独立判断。小人对应 1、3、5、7、9；中间分值 2、4、6、8 也可选择。所有评分均不预填。</p>`;
  ratingContext.append(guide);
  const explanationPanels=stage2?[document.createElement('section'),document.createElement('section')]:[];
  if(stage2){
    for(const panel of explanationPanels)panel.className='stage2-context';
    document.querySelector('.sketch-stage').after(explanationPanels[0]);
    ratingFigure.after(explanationPanels[1]);
  }
  const homeGuide=document.createElement('section');homeGuide.className='home-guide';homeGuide.setAttribute('aria-labelledby','homeGuideTitle');
  homeGuide.innerHTML='<h2 id="homeGuideTitle">每张图片：两组情绪与信心评价</h2><p>分别判断场景本身传达的情绪氛围，以及创作者希望表达的情绪。两组问题分步显示，请根据当前问题独立作答。每组均填写愉悦度、唤醒度、控制感（1–9），以及对本组判断的信心（1–7）。</p><p>两组信心分别作答，没有预设答案。每张提交后保存，可暂停续填。</p>';
  $('raterGrid').before(homeGuide);
  if(stage2)homeGuide.innerHTML='<h2>阅读解释后，重新判断创作者意图</h2><p>本阶段包含 8 份作品。阅读创作者解释，回顾你本人第一阶段对创作者意图的评分，然后重新填写 愉悦度、唤醒度、控制感（1–9）和判断信心（1–7）。</p><p>四项均需重新选择，可以保持或调整原判断。新评分单独保存。</p>';
  document.querySelector('.rating-instruction').textContent=stage2?'阅读解释后，重新判断创作者希望表达的情绪。四项均需重新选择。':'请分别完成两组情绪评分和各自的判断信心。';
  async function api(url, options) {
    url+=(url.includes('?')?'&':'?')+'instrument=expert-2d-dual-v1';
    if(stage2)url+=(url.includes('?')?'&':'?')+'stage=2';
    const response = await window.SketchAuth.fetch(url, options);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '请求失败');
    if((options?.method||'GET')==='GET'&&(data.instrument!=='expert-2d-dual-v1'||data.condition!=='2D'||(!stage2&&data.protocol!=='2d-expert-atmosphere-intention-v2')))throw new Error('问卷版本正在更新，请稍后刷新。');
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
    try { localStorage.setItem(draftKey(), JSON.stringify({answers:state.answers,viewMs:Math.round(state.viewMs),groupStep:state.groupStep})); }
    catch { /* Server-confirmed ratings remain durable even when browser storage is unavailable. */ }
  }
  function restoreDraft() {
    try {
      const previousKey=draftKey().replace('2d-expert-atmosphere-intention-v2','2d-expert-atmosphere-intention-v1');
      const draft = JSON.parse(localStorage.getItem(draftKey()) || (!stage2?localStorage.getItem(previousKey):null) || 'null');
      if (draft) {
        for (const key of numericKeys) {
          const value = draft.answers?.[key];
          if (Number.isInteger(value) && value >= 1 && value <= (key.endsWith('confidence') ? 7 : 9)) state.answers[key] = value;
        }

        state.groupStep=draft.groupStep===1?1:0;
        if(!stage2&&state.groupStep===1&&!firstGroupKeys().every(k=>state.answers[k]!=null))state.groupStep=0;
        if (Number.isFinite(draft.viewMs) && draft.viewMs >= 0) state.viewMs = Math.min(draft.viewMs,604800000);
      }
    } catch { /* An invalid local draft does not change server progress. */ }
  }
  function imageSource(profile, condition) {
    return `../study-media/2d/${profile}.png`;
  }
  function clearPrefetch() {
    if (prefetchedImage) prefetchedImage.removeAttribute('src');
    prefetchedImage = null;
  }
  function preloadNextImage() {
    const profile = state.sequence.find(p => p !== state.profile && !state.completed.includes(p));
    if (!profile) { clearPrefetch(); return; }
    const condition = state.trials.find(t => t.profile === profile)?.condition || '2D';
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
      state.protocol = data.protocol; total=data.total;

      for (const [index,rater] of data.raters.entries()) {
        const done = data.counts[rater];
        const button = document.createElement('button'); button.className = 'rater-card'; button.dataset.rater = rater;
        button.innerHTML = `<div class="rater-top"><span class="rater-number">${rater}</span><span aria-hidden="true">↗</span></div><h2>评价者 ${rater.slice(1)}<span class="english-secondary" lang="en">Rater ${rater.slice(1)}</span></h2><p>${done} / ${total} 张已保存</p><progress max="${total}" value="${done}" aria-label="${rater} 已保存 ${done} 张"></progress><span class="card-action">${done === total ? '已完成 · 查看状态' : done ? '继续评价 →' : '开始评价 →'}</span>`;
        if(stage2&&!data.eligible[rater]){
          button.disabled=true;button.dataset.locked='true';
          button.querySelector('p').textContent=`第一阶段 ${data.first_stage_counts[rater]} / 24 张已保存`;
          button.querySelector('.card-action').textContent='完成第一阶段后解锁';
        }
        if(stage2Entry&&done===24){
          if(!stage2Entry.childElementCount){const title=document.createElement('h2');title.textContent='第二阶段评价';const note=document.createElement('p');note.textContent='阅读 8 位创作者的解释，并回顾你第一阶段的评分，然后再次评价。';stage2Entry.append(title,note);}
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
      state.trials=data.trials||data.sequence.map(profile=>({profile,condition:'2D'}));
      state.questionOrders=data.question_orders||{};
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
      const label=document.createElement('h3');label.textContent='你在第一阶段对创作者意图的评分（只读）';
      const scores=document.createElement('dl');scores.className='baseline-scores';
      for(const [key,name] of [['intended_valence','意图 · 愉悦度'],['intended_arousal','意图 · 唤醒度'],['intended_dominance','意图 · 控制感'],['confidence','判断信心']]){
        const item=document.createElement('div'),term=document.createElement('dt'),value=document.createElement('dd');term.textContent=name;value.textContent=`${context.baseline[key]} / ${key==='confidence'?7:9}`;item.append(term,value);scores.append(item);
      }
      panel.append(title,quote,label,scores);
    }
  }
  function next() {
    state.profile = state.sequence.find(profile => !state.completed.includes(profile));
    if (!state.profile) { clearPrefetch(); $('doneMessage').textContent = `${state.rater} · ${total} / ${total} 张已完成`;const link=$('secondStageLink');if(link){link.href=secondStageUrl(state.rater);link.classList.remove('hidden');} show('done'); return; }
    state.condition=state.trials.find(t=>t.profile===state.profile)?.condition||'2D';
    state.answers = {}; state.groupStep=0; state.viewMs = 0; state.loaded = false; restoreDraft();
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
  function dimensionField(dimension, group) {
    const key=`${group}_${dimension.key}`;
    const field=document.createElement('fieldset');field.className='sam-dimension';
    const legend=document.createElement('legend');bilingual(legend,dimension.label,dimension.english);
    const description=document.createElement('p');description.className='dimension-desc english-secondary';description.lang='en';
    const subject=group==='atmosphere'?'the emotional atmosphere':'the emotion the creator intended to express';
    description.textContent={valence:`How unpleasant or pleasant is ${subject}?`,arousal:`How calm or activated is ${subject}?`,dominance:group==='atmosphere'?'How powerless or in control does the emotional atmosphere conveyed by this landscape feel?':'In the intended emotional experience, how powerless or in control does the creator seem to feel?'}[dimension.key];
    const help=document.createElement('p');help.className='dimension-help';help.id=key+'-help';help.textContent=dimension.help;field.setAttribute('aria-describedby',help.id);
    const images=document.createElement('div');images.className='sam-images';
    const radios=document.createElement('div');radios.className='sam-radios';
    for(let value=1;value<=9;value++){
      const cell=document.createElement('div');cell.className='sam-image-cell';
      if(value%2){const img=document.createElement('img');img.src=`${assetBase}/sam/${dimension.key}${(value+1)/2}.png`;img.alt=`${dimension.label} ${value}`;const caption=document.createElement('span');caption.className='caption';bilingual(caption,dimension.captions[(value-1)/2],dimension.englishCaptions[(value-1)/2]);cell.append(img,caption);}
      images.append(cell);radios.append(radio(key,value,dimension.label));
    }
    field.append(legend,help,description,images,radios);return field;
  }
  function confidenceField(group){
    const atmosphere=group==='atmosphere',key=atmosphere?'atmosphere_confidence':'confidence';
    const label=atmosphere?'场景情绪判断信心':'创作者意图判断信心';
    const field=document.createElement('fieldset');field.className='sam-dimension confidence-dimension';
    const legend=bilingual(document.createElement('legend'),label,atmosphere?'Confidence in the emotional atmosphere':"Confidence in the creator's intended emotion");
    const question=bilingual(document.createElement('p'),atmosphere?'你对场景情绪氛围的判断有多大把握？':'你对创作者希望表达的情绪判断有多大把握？',atmosphere?'How confident are you in your interpretation of the emotional atmosphere?':"How confident are you in your interpretation of the creator's intended emotion?");
    question.className='confidence-question';
    const help=document.createElement('p');help.className='dimension-help';help.id=key+'-help';help.textContent='1 = 完全没把握，4 = 中等，7 = 非常有把握。';field.setAttribute('aria-describedby',help.id);
    const likert=document.createElement('div');likert.className='likert';for(let value=1;value<=7;value++)likert.append(radio(key,value,label));
    const ends=document.createElement('div');ends.className='endpoints';ends.append(bilingual(document.createElement('span'),'1 = 完全没把握','Not at all confident'),bilingual(document.createElement('span'),'7 = 非常有把握','Extremely confident'));
    field.append(legend,question,help,likert,ends);return field;
  }
  function renderSam() {
    $('ratingSketchImage').src=$('sketchImage').src;
    const matrix=$('samMatrix');matrix.replaceChildren();
    const groups=stage2?['intended']:(state.questionOrders[state.profile]==='atmosphere_first'?['atmosphere','intended']:['intended','atmosphere']);
    for(const [index,group]of groups.entries()){
      const section=document.createElement('section');section.className='expert-group';section.dataset.step=index;
      const title=document.createElement('h2');bilingual(title,group==='atmosphere'?'场景本身的情绪':'创作者希望表达的情绪',group==='atmosphere'?'Emotional atmosphere':'Intended emotion');
      const question=document.createElement('p');question.className='expert-question';
      const englishQuestion=stage2?"After reading the creator's explanation, what emotion do you think the creator intended to express?":group==='atmosphere'?'What emotional atmosphere does this landscape convey to you?':'What emotion do you think the creator intended to express through this landscape?';
      bilingual(question,stage2?'阅读创作者的解释后，你认为创作者希望表达怎样的情绪？':group==='atmosphere'?'这个场景向你传达了怎样的情绪氛围？':'你认为创作者希望通过这个场景表达怎样的情绪？',englishQuestion);
      const intro=document.createElement('p');intro.className='muted';intro.textContent=group==='atmosphere'?'请判断场景传达的情绪氛围。':'请推断创作者希望通过场景表达的情绪。';
      section.append(title,question,intro);for(const dimension of dimensions)section.append(dimensionField(dimension,group));section.append(confidenceField(group));matrix.append(section);
    }
    if(!stage2){const navigation=document.createElement('div');navigation.className='expert-navigation';const back=document.createElement('button');back.id='previousGroup';back.type='button';back.className='secondary';back.textContent='← 返回上一组';back.onclick=()=>{state.groupStep=0;persistDraft();updateSubmit();matrix.scrollIntoView({block:'start'});};const next=document.createElement('button');next.id='nextGroup';next.type='button';next.className='primary';next.textContent='完成本组，进入下一组 →';next.onclick=()=>{state.groupStep=1;persistDraft();updateSubmit();matrix.scrollIntoView({block:'start'});};const progress=document.createElement('span');progress.id='groupProgress';progress.className='muted';navigation.append(back,progress,next);matrix.append(navigation);}
    status('ratingStatus');updateSubmit();
  }
  function updateSubmit() {
    const answered=key=>Number.isInteger(state.answers[key])&&state.answers[key]>=1&&state.answers[key]<=(key.endsWith('confidence')?7:9);
    const count=answerKeys.filter(answered).length;
    $('answerCount').textContent=`已完成 ${count} / ${answerKeys.length} 项`;
    $('submit').disabled=count!==answerKeys.length||state.busy||(!stage2&&state.groupStep!==1);
    if(!stage2&&$('nextGroup')){
      const first=firstGroupKeys();
      document.querySelectorAll('.expert-group').forEach(section=>section.classList.toggle('hidden',Number(section.dataset.step)!==state.groupStep));
      $('nextGroup').classList.toggle('hidden',state.groupStep===1);$('nextGroup').disabled=state.busy||!first.every(answered);
      $('previousGroup').classList.toggle('hidden',state.groupStep===0);$('groupProgress').textContent=`SAM 组 ${state.groupStep+1} / 2`;
    }
  }
  function lock(locked) {
    state.busy = locked;
    $('ratingForm').querySelectorAll('input,button,textarea').forEach(el => el.disabled = locked);
    updateSubmit();
  }
  $('ratingForm').addEventListener('submit', async event => {
    event.preventDefault(); if (state.busy || $('submit').disabled) return;
    lock(true); status('ratingStatus','正在保存…');
    try {
      await api('/api/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        mode:state.mode,rater:state.rater,profile:state.profile,protocol:state.protocol,
        ...state.answers,view_ms:Math.round(state.viewMs),audio_ms:0,audio_version:audioVersion,condition:state.condition,
        ...(stage2?{explanation_version:state.explanationVersion}:{question_order:state.questionOrders[state.profile]})
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

  dimensions[0].help='情绪有多不愉快或愉快？1 = 很不愉快，5 = 中性，9 = 很愉快。不是你对作品的喜好。';

  dimensions[1].help='情绪有多平静或激动？1 = 很平静，5 = 中等，9 = 很激动。兴奋和紧张都可能是高唤醒。';

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
