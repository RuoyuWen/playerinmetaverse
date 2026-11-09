(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const cfg=window.StudyConfig||{},total=cfg.cohort?12:24;
  const audioVersion='matched-sound-effect-v1';
  const assetBase=cfg.cohort?'../sketch-sam/assets':'./assets';
  const state = { mode: 'production', rater: null, protocol: null, sequence: [], completed: [], profile: null,
    answers: {}, viewMs: 0, viewingSince: null, busy: false, screen: 'home', loaded: false,
    trials:[],condition:'Sketch',audioMs:0,audioSince:null };
  const audio=document.createElement('audio');audio.id='stimulusAudio';audio.loop=true;audio.preload='auto';audio.controls=true;
  const audioPanel=document.createElement('div');audioPanel.className='audio-panel';
  const playAudio=document.createElement('button');playAudio.type='button';playAudio.id='playAudio';playAudio.className='primary';playAudio.textContent='播放 / 继续音效';
  const audioStatus=document.createElement('span');audioStatus.id='audioStatus';audioStatus.setAttribute('role','status');
  audioPanel.append(playAudio,audio,audioStatus);document.querySelector('.sketch-stage').after(audioPanel);
  const note=document.createElement('p');note.className='muted';note.textContent='请戴耳机并确认音量，点击播放后观察图片、聆听音效。进入评分页会暂停声音；可返回查看并继续播放。';audioPanel.before(note);
  function stopAudioClock(){if(state.audioSince!==null)state.audioMs+=performance.now()-state.audioSince;state.audioSince=null;}
  function audioClock(){stopAudioClock();if(state.screen==='view'&&!document.hidden&&!audio.paused&&!audio.muted&&audio.volume>0&&audio.readyState>=3)state.audioSince=performance.now();}
  function pauseAudio(){stopAudioClock();audio.pause();}
  function updateFinish(){const heard=state.audioMs+(state.audioSince===null?0:performance.now()-state.audioSince);$('finishView').disabled=!state.loaded||heard<1;}
  for(const event of ['playing','pause','waiting','volumechange','ended'])audio.addEventListener(event,()=>{audioClock();updateFinish();});
  audio.addEventListener('timeupdate',()=>{updateFinish();if(!audio.paused)audioStatus.textContent=audio.muted||audio.volume===0?'请取消静音并调高音量':'音效播放中 · 循环';});
  audio.addEventListener('error',()=>{pauseAudio();audioStatus.textContent='音效加载失败，请点击播放重试，或返回首页重试。';});
  playAudio.onclick=async()=>{try{if(audio.error)audio.load();audio.muted=false;if(audio.volume===0)audio.volume=1;await audio.play();audioStatus.textContent='音效播放中 · 循环';}catch{audioStatus.textContent='播放失败，请检查网络和声音设置后再次点击。';}};
  const dimensions = [
    {key:'valence', label:'Valence · 愉悦度', description:'How positive or negative is the emotion expressed in this sketch?', captions:['Unhappy','','Neutral','','Happy']},
    {key:'arousal', label:'Arousal · 唤醒度', description:'How calm or activated is the emotion expressed in this sketch?', captions:['Calm','','Neutral','','Excited']},
    {key:'dominance', label:'Dominance · 控制感', description:'How much control does the person seem to feel in the emotional experience expressed by this sketch?', captions:['Low control','','Neutral','','High control']}
  ];
  async function api(url, options) {
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
  document.addEventListener('visibilitychange',()=>{if(document.hidden){pauseAudio();persistDraft();}else if(state.screen==='view')audioStatus.textContent='请点击播放继续聆听';});
  function show(name) {
    stopClock(); state.screen = name;
    if(name!=='view')pauseAudio();
    for (const screen of ['home','view','rating','done']) $(screen).classList.toggle('hidden', screen !== name);
    $('testMode').disabled = name !== 'home';
    if (name === 'view') clock();
    window.scrollTo(0,0);
  }
  function draftKey() { return `sketch-sam:${state.protocol}:${audioVersion}:${state.mode}:${state.rater}:${state.profile}`; }
  function persistDraft() {
    try { localStorage.setItem(draftKey(), JSON.stringify({answers:state.answers,viewMs:Math.round(state.viewMs),audioMs:Math.round(state.audioMs)})); }
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
        if(Number.isFinite(draft.audioMs)&&draft.audioMs>=0)state.audioMs=Math.min(draft.audioMs,604800000);
      }
    } catch { /* An invalid local draft does not change server progress. */ }
  }
  async function home() {
    show('home'); state.busy = false; state.rater = null;
    $('raterGrid').replaceChildren(); status('homeStatus','正在读取已保存的进度…');
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
      next();
    } catch (error) { status('homeStatus', error.message, true); $('testMode').disabled = false; }
    finally { state.busy = false; document.querySelectorAll('.rater-card').forEach(b => b.disabled = false); }
  }
  function tag() { return `${state.rater} · ${state.condition} · ${state.sequence.indexOf(state.profile)+1} / ${total}`; }
  function next() {
    state.profile = state.sequence.find(profile => !state.completed.includes(profile));
    pauseAudio();
    if (!state.profile) { $('doneMessage').textContent = `${state.rater} · ${total} / ${total} 张已完成`; show('done'); return; }
    state.condition=state.trials.find(t=>t.profile===state.profile)?.condition||'Sketch';
    state.answers = {}; state.viewMs = 0; state.audioMs=0;state.loaded = false; restoreDraft();
    audio.src=`../study-media/audio/${state.profile}.mp3`;audio.load();audioStatus.textContent='请点击播放音效';
    $('viewTag').textContent = tag(); $('ratingTag').textContent = tag();
    $('finishView').disabled = true; $('imageLoading').classList.remove('hidden'); $('imageLoading').textContent = '正在加载 Sketch…';
    $('imageLoading').textContent='正在加载图片…';
    const image = $('sketchImage');
    image.alt=`待评价的 ${state.condition}`;
    image.onload = () => { state.loaded = true; updateFinish(); $('imageLoading').classList.add('hidden'); clock(); };
    image.onerror = () => { state.loaded = false; $('finishView').disabled = true; $('imageLoading').textContent = '图片加载失败，请返回首页后重试。'; stopClock(); };
    image.src = state.condition==='2D'?`../study-media/2d/${state.profile}.png`:`${assetBase}/sketches/${state.profile}.png`;
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
      field.append(legend,description,images,radios); matrix.appendChild(field);
    }
    const confidence = document.createElement('fieldset'); confidence.className = 'sam-dimension';
    confidence.innerHTML = '<legend>Confidence · 判断信心</legend><p class="dimension-desc">How confident are you in your interpretation of the participant\'s emotional state?</p>';
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
        ...state.answers,view_ms:Math.round(state.viewMs),audio_ms:Math.round(state.audioMs),audio_version:audioVersion,condition:state.condition
      })});
      try { localStorage.removeItem(draftKey()); } catch {}
      state.completed.push(state.profile); next();
    } catch (error) { status('ratingStatus', `${error.message} 当前选择已保留，可重试。`, true); }
    finally { lock(false); }
  });
  $('finishView').addEventListener('click', () => { if (!state.loaded||$('finishView').disabled) return; stopClock(); pauseAudio();persistDraft(); renderSam(); show('rating'); });
  $('review').addEventListener('click', () => show('view'));
  for (const id of ['pauseView','pauseRating']) $(id).addEventListener('click', () => { stopClock();pauseAudio(); persistDraft(); home(); });
  $('backHome').addEventListener('click',home);
  $('testMode').addEventListener('change', () => { state.mode = $('testMode').checked ? 'test' : 'production'; $('testBanner').classList.toggle('hidden',state.mode !== 'test'); home(); });
  window.addEventListener('pagehide', () => { if (state.profile) { stopClock();pauseAudio(); persistDraft(); } });
  dimensions[0].description='How positive or negative is the emotion expressed by this environment and its sound?';
  dimensions[1].description='How calm or activated is the emotion expressed by this environment and its sound?';
  dimensions[2].description='How much control does the person seem to feel in the emotional experience expressed by this environment and its sound?';
  window.SketchAuth.ready.then(() => {
    if(window.SketchAuth.role==='ADMIN'){
      state.mode='test';$('testMode').checked=true;$('testBanner').classList.remove('hidden');
    }
    home();
  });
})();
