(function () {
  'use strict';

  const API = (window.WORDSYNC_CONFIG.BACKEND_URL || '') + '/api/wordsync';
  const POLL_MS = 800;
  const $ = (id) => document.getElementById(id);
  const T = (source, values) => window.Lang.tr(source, values);

  let session = null;      // { code, token }
  let state = null;        // latest server state
  let config = null;       // public settings, for the lobby
  let clockOffset = 0;     // server seconds minus local seconds
  let pollTimer = null;
  let polling = false;
  let failures = 0;
  let toastTimer = null;

  // Think-aloud text for the round being played.
  let segments = [];
  let interim = '';
  let sentCount = 0;
  let roundKey = '';
  let timeUpPolled = false;
  let speechStatus = 'idle'; // idle | testing | ok | denied | error | unsupported
  let speechTesting = false;
  let heard = '';

  // ------------------------------------------------------------ language

  let chosenLang = 'zh';  // what this player picked on the join screen
  try {
    chosenLang = localStorage.getItem('wordsync-lang') || (/^zh/i.test(navigator.language || 'zh') ? 'zh' : 'en');
  } catch (error) { /* keep the default */ }

  let chosenOpponent = 'human';  // 'ai' plays against the model instead of entering a room code
  let aiAvailable = false;

  function showOpponent() {
    if (!aiAvailable) chosenOpponent = 'human';
    const ai = chosenOpponent === 'ai';
    $('opponent-field').hidden = !aiAvailable;
    document.querySelectorAll('.segment[data-opponent]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.opponent === chosenOpponent));
    });
    $('code-field').hidden = ai;
    $('join-hint').textContent = T(ai ? '和 AI 一起玩，不需要房间号。' : '和同伴输入相同的房间号就能匹配到一起。');
    if (!$('join-button').disabled) $('join-button').textContent = T(ai ? '开始和 AI 对局' : '进入房间');
  }

  let chosenGive = true;  // whether a room this player creates gets a start word
  try { chosenGive = localStorage.getItem('wordsync-give') !== 'no'; } catch (error) { /* keep the default */ }

  function useLanguage(lang) {
    window.Lang.set(lang);
    document.querySelectorAll('.segment[data-lang]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.lang === chosenLang));
    });
    document.querySelectorAll('.segment[data-give]').forEach((button) => {
      button.setAttribute('aria-pressed', String((button.dataset.give === 'yes') === chosenGive));
    });
    $('word-input').maxLength = window.Lang.current === 'en' ? 30 : 12;
    showOpponent();
  }

  document.querySelectorAll('.segment[data-opponent]').forEach((button) => {
    button.addEventListener('click', () => {
      chosenOpponent = button.dataset.opponent;
      $('join-error').textContent = '';
      showOpponent();
    });
  });

  document.querySelectorAll('.segment[data-give]').forEach((button) => {
    button.addEventListener('click', () => {
      chosenGive = button.dataset.give === 'yes';
      try { localStorage.setItem('wordsync-give', chosenGive ? 'yes' : 'no'); } catch (error) { /* optional */ }
      useLanguage(chosenLang);
    });
  });

  document.querySelectorAll('.segment[data-lang]').forEach((button) => {
    button.addEventListener('click', () => {
      chosenLang = button.dataset.lang;
      try { localStorage.setItem('wordsync-lang', chosenLang); } catch (error) { /* optional */ }
      $('join-error').textContent = '';
      useLanguage(chosenLang);
    });
  });

  // ------------------------------------------------------------ helpers

  async function api(path, options = {}) {
    const query = options.query ? '?' + new URLSearchParams(options.query) : '';
    const response = await fetch(API + path + query, {
      method: options.method || 'GET',
      headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: 'no-store',
    });
    let data = null;
    try { data = await response.json(); } catch (error) { /* non-JSON error page */ }
    if (!response.ok) {
      const failure = new Error(window.Lang.error(data && data.detail));
      failure.status = response.status;
      throw failure;
    }
    return data;
  }

  function serverNow() { return Date.now() / 1000 + clockOffset; }

  function toast(message) {
    const node = $('toast');
    node.textContent = message;
    node.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { node.hidden = true; }, 2600);
  }

  function show(screen) {
    for (const name of ['join', 'lobby', 'game', 'end']) $('screen-' + name).hidden = name !== screen;
  }

  function saveSession() {
    try {
      if (session) sessionStorage.setItem('wordsync-session', JSON.stringify(session));
      else sessionStorage.removeItem('wordsync-session');
    } catch (error) { /* storage unavailable: refresh will just ask to join again */ }
  }

  // ------------------------------------------------------------ speech to text

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const speech = {
    recognizer: null,
    wanted: false,
    start() {
      if (!Recognition || this.wanted) return;
      this.wanted = true;
      this.spawn();
    },
    stop() {
      this.wanted = false;
      if (this.recognizer) { try { this.recognizer.stop(); } catch (error) { /* already stopped */ } }
    },
    spawn() {
      const recognizer = new Recognition();
      recognizer.lang = window.Lang.current === 'en' ? 'en-US' : 'zh-CN';
      recognizer.continuous = true;
      recognizer.interimResults = true;
      recognizer.onresult = (event) => {
        let pending = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const text = event.results[i][0].transcript;
          if (event.results[i].isFinal) onSpeech(text.trim(), true);
          else pending += text;
        }
        onSpeech(pending, false);
      };
      recognizer.onerror = (event) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          this.wanted = false;
          speechStatus = 'denied';
        } else if (event.error === 'network' || event.error === 'audio-capture') {
          speechStatus = 'error';
        }
        render();
      };
      recognizer.onend = () => {
        this.recognizer = null;
        // Browsers end recognition after a pause; keep listening for the whole round.
        if (this.wanted) setTimeout(() => { if (this.wanted && !this.recognizer) this.spawn(); }, 250);
      };
      this.recognizer = recognizer;
      try { recognizer.start(); } catch (error) { this.recognizer = null; }
    },
  };
  if (!Recognition) speechStatus = 'unsupported';

  function onSpeech(text, isFinal) {
    if (text) { speechStatus = 'ok'; heard = text; }
    const playing = state && (state.phase === 'think' || state.phase === 'input') && !state.me.submitted;
    if (playing) {
      if (isFinal) {
        if (text) segments.push({ t: Math.max(0, Math.round((serverNow() - state.roundStartedAt) * 1000)), text });
        interim = '';
      } else {
        interim = text;
      }
    }
    if (speechTesting && isFinal && text) { speechTesting = false; syncListening(); }
    render();
  }

  function currentSegments() {
    const list = segments.slice();
    if (interim.trim()) list.push({ t: Math.max(0, Math.round((serverNow() - state.roundStartedAt) * 1000)), text: interim.trim() });
    return list;
  }

  function syncListening() {
    const playing = state && (state.phase === 'think' || state.phase === 'input') && !state.me.submitted;
    const allowed = speechStatus !== 'denied' && speechStatus !== 'unsupported';
    if ((playing || speechTesting) && allowed) speech.start();
    else speech.stop();
  }

  async function flushTranscript() {
    if (!session || !state || !(state.phase === 'think' || state.phase === 'input') || state.me.submitted) return;
    if (segments.length === sentCount) return;
    const count = segments.length;
    try {
      await api('/transcript', { method: 'POST', body: { ...session, round: state.round, segments } });
      sentCount = count;
    } catch (error) { /* retried on the next tick */ }
  }

  // ------------------------------------------------------------ server sync

  async function poll() {
    if (!session || polling) return;
    polling = true;
    clearTimeout(pollTimer);
    try {
      apply(await api('/state', { query: session }));
      failures = 0;
    } catch (error) {
      if (error.status === 404 || error.status === 403) { leaveLocally(error.message); return; }
      failures += 1;
    } finally {
      polling = false;
      $('net-banner').hidden = failures < 3;
      if (session) pollTimer = setTimeout(poll, POLL_MS);
    }
  }

  function apply(next) {
    const previous = state;
    clockOffset = next.serverNow - Date.now() / 1000;
    state = next;
    if (next.lang !== window.Lang.current) {  // the room's language wins over the one picked on the join screen
      useLanguage(next.lang);
      roundKey = '';  // redraw the word cards in the new language
    }
    const playing = next.phase === 'think' || next.phase === 'input';
    const key = playing ? next.sessionId + ':' + next.round : '';
    if (key !== roundKey) {
      roundKey = key;
      segments = []; interim = ''; sentCount = 0; timeUpPolled = false;
      $('word-input').value = '';
      $('word-error').textContent = '';
      if (playing) {
        renderPrompt();
        if (!next.me.submitted) setTimeout(() => $('word-input').focus({ preventScroll: true }), 50);
        if (next.round > 1 && previous && previous.round === next.round - 1) toast(T('没对上，扣一格血'));
      }
    }
    if (previous && previous.partner && !next.partner && next.phase === 'lobby') toast(T('对方离开了房间'));
    if (next.phase !== 'lobby') speechTesting = false;
    syncListening();
    render();
  }

  function leaveLocally(message) {
    session = null; state = null; roundKey = '';
    useLanguage(chosenLang);
    saveSession();
    clearTimeout(pollTimer);
    speechTesting = false;
    speech.stop();
    $('net-banner').hidden = true;
    $('join-error').textContent = message || '';
    show('join');
  }

  // ------------------------------------------------------------ rendering

  function wordCard(who, word, extra) {
    const card = document.createElement('div');
    card.className = 'word-card' + (extra ? ' ' + extra : '');
    const label = document.createElement('p');
    label.className = 'who';
    label.textContent = who;
    const text = document.createElement('p');
    text.className = 'word';
    text.textContent = word || T('（没写）');
    card.append(label, text);
    return card;
  }

  function renderPrompt() {
    const prompt = $('prompt');
    prompt.textContent = '';
    if (state.round === 1) {
      prompt.append(state.startWord
        ? wordCard(T('起始词'), state.startWord, 'solo')
        : wordCard(T('没有起始词'), '?', 'solo blank'));
    } else {
      prompt.append(
        wordCard(T('你上一轮写的'), state.prompt.mine, state.prompt.mine ? '' : 'blank'),
        wordCard(T('{name} 写的', { name: state.partner ? state.partner.name : T('对方') }), state.prompt.theirs, state.prompt.theirs ? '' : 'blank'));
    }
  }

  function renderHistory(list, rounds, partnerName) {
    list.textContent = '';
    for (const round of rounds.slice().reverse()) {
      const item = document.createElement('li');
      if (round.matched) item.className = 'matched';
      const number = document.createElement('span');
      number.className = 'n';
      number.textContent = T('第{n}轮', { n: round.round });
      item.append(number);
      for (const [who, word] of [[T('你'), round.mine], [partnerName, round.theirs]]) {
        const cell = document.createElement('span');
        cell.className = 'w';
        const small = document.createElement('small');
        small.textContent = who;
        cell.append(small, word || T('（没写）'));
        item.append(cell);
      }
      list.append(item);
    }
  }

  function renderLobby() {
    $('lobby-eyebrow').textContent = state.ai ? '' : T('房间号');
    $('lobby-code').hidden = state.ai;
    $('lobby-code').textContent = state.ai ? '' : state.code;
    $('lobby-share').textContent = T(state.ai ? '与 AI 对局' : '把这个号码告诉同伴');
    const seats = [[$('seat-me'), state.me, T('（你）')], [$('seat-partner'), state.partner, '']];
    for (const [seat, player, suffix] of seats) {
      seat.className = 'seat' + (player ? (player.ready ? ' ready' : '') : ' empty');
      seat.querySelector('.seat-name').textContent = player ? player.name + suffix : T('等待同伴加入…');
      seat.querySelector('.seat-status').textContent = !player ? T('把房间号发给对方')
        : player.online === false ? T('掉线了') : player.ready ? T('已准备') : T('未准备');
    }

    const messages = {
      idle: T('点击“开始检测”，允许使用麦克风，然后随便说一句话。'),
      testing: T('正在听…请对着麦克风说一句话。'),
      ok: T('语音识别正常。'),
      denied: T('麦克风权限被拒绝了。请在浏览器地址栏里允许使用麦克风，然后刷新页面。'),
      error: T('语音识别服务连不上。请检查麦克风和网络，或换用 Chrome / Edge / Safari。'),
      unsupported: T('这个浏览器不支持语音识别，请换用 Chrome、Edge 或 Safari。'),
    };
    const status = speechTesting && speechStatus !== 'denied' && speechStatus !== 'error' && speechStatus !== 'ok' ? 'testing' : speechStatus;
    $('speech-status').textContent = messages[status];
    $('speech-heard').hidden = !heard;
    $('speech-heard').textContent = heard ? T('听到：{text}', { text: heard }) : '';
    $('speech-test').hidden = speechStatus === 'unsupported';
    $('speech-test').textContent = speechTesting ? T('停止检测') : speechStatus === 'ok' ? T('再测一次') : T('开始检测');

    const needSpeech = !config || config.requireSpeech;
    const ready = state.me.ready;
    const button = $('ready-button');
    button.disabled = !ready && needSpeech && speechStatus !== 'ok';
    button.textContent = ready ? T('已准备 · 点击取消') : needSpeech && speechStatus !== 'ok' ? T('先完成语音识别检测') : T('准备');
    button.classList.toggle('is-ready', ready);
    if (config) {
      $('lobby-rules').textContent = T('本局规则：{lives} 格血，每轮思考 {think} 秒{input}{repeat}。两人都准备后自动开始。', {
        lives: config.lives, think: config.thinkSeconds,
        input: config.inputSeconds ? T('，输入限时 {seconds} 秒', { seconds: config.inputSeconds }) : '',
        repeat: config.noRepeat ? T('，不能用出现过的词') : '',
      }) + (state.giveWord === false ? ' ' + T('本局不给起始词，第一轮各自随便想一个词。') : '');
    }
  }

  function renderGame() {
    $('round-label').textContent = T('第 {n} 轮', { n: state.round });
    $('lives-label').textContent = T('剩余 {lives} / {max} 格血', { lives: state.lives, max: state.maxLives });
    const hearts = $('hearts');
    if (hearts.children.length !== state.maxLives) {
      hearts.textContent = '';
      for (let i = 0; i < state.maxLives; i++) hearts.append(document.createElement('i'));
    }
    Array.from(hearts.children).forEach((heart, i) => heart.classList.toggle('gone', i >= state.lives));

    const thinking = state.phase === 'think';
    const submitted = state.me.submitted;
    $('think-instruction').textContent = state.round === 1 ? T(state.startWord ? '由这个词想到下一个词，把你的思路说出来' : '随便想一个词，把你的思路说出来') : T('猜猜你们会想到哪个共同的词，把思路说出来');
    $('word-form').hidden = submitted;
    $('wait-panel').hidden = !submitted;
    $('my-word-line').textContent = T('你写的是「{word}」', { word: state.me.word || '' });
    $('input-instruction').textContent = thinking ? T('想好了随时可以提交，不用等倒计时') : T('时间到了，请输入你想到的词');

    const listening = !submitted && speech.wanted;
    $('mic-dot').classList.toggle('live', listening);
    $('mic-label').textContent = submitted ? T('本轮已提交') : listening ? T('正在听你说（只保存文字，不保存录音）')
      : speechStatus === 'unsupported' ? T('此浏览器不支持语音识别') : speechStatus === 'denied' ? T('麦克风权限被拒绝，无法转写') : T('语音识别未启动');
    const text = $('transcript-text');
    text.textContent = segments.map((segment) => segment.text).join(' ');
    if (interim) {
      const span = document.createElement('span');
      span.className = 'interim';
      span.textContent = ' ' + interim;
      text.append(span);
    }
    text.scrollTop = text.scrollHeight;

    const partner = state.partner;
    $('partner-line').textContent = !partner ? '' : partner.online === false ? T('{name} 掉线了，等待重连…', { name: partner.name })
      : partner.submitted ? T('{name} 已经提交了', { name: partner.name }) : thinking ? '' : T('{name} 还没提交…', { name: partner.name });
    renderHistory($('history'), state.history, partner ? partner.name : T('对方'));
    renderTimer();
  }

  function renderTimer() {
    if (!state || !(state.phase === 'think' || state.phase === 'input')) return;
    const thinking = state.phase === 'think';
    const timed = state.phaseEndsAt != null;
    const submitted = state.me.submitted;
    $('think-panel').hidden = submitted || !(thinking || timed);
    if (!timed) return;
    const total = thinking ? state.settings.thinkSeconds : state.settings.inputSeconds;
    const left = Math.max(0, state.phaseEndsAt - serverNow());
    $('timer-number').textContent = Math.ceil(left);
    $('timer-number').parentElement.classList.toggle('urgent', left <= 5);
    $('timer-fill').style.transform = 'scaleX(' + Math.min(1, left / total) + ')';
    if (!thinking) $('think-instruction').textContent = T('时间到之前提交你的词');
    if (left <= 0 && !timeUpPolled) { timeUpPolled = true; poll(); }
  }

  function renderEnd() {
    const won = state.phase === 'won';
    const quit = state.phase === 'quit';
    const last = state.history[state.history.length - 1];
    $('end-seal').classList.toggle('lost', !won);
    $('end-seal').textContent = won ? T('灵犀') : quit ? T('散场') : T('可惜');
    $('end-title').textContent = won ? T('心有灵犀！') : quit ? T('对局已结束') : T('血量耗尽');
    $('end-detail').textContent = won
      ? T('你们在第 {round} 轮同时想到了「{word}」，还剩 {lives} 格血。', { round: last.round, word: last.mine, lives: state.lives })
      : state.aiFailed ? T('AI 没能给出回复，本局提前结束。')
      : quit ? T('{name} 退出了房间，本局提前结束。', { name: state.quitBy || T('对方') })
      : T('{max} 格血用完了，这次没能想到一起。', { max: state.maxLives });
    $('again-button').textContent = state.partner && state.partner.left ? T('回到房间等新同伴') : T('再来一局');
    renderHistory($('end-history'), state.history, state.partner ? state.partner.name : T('对方'));
  }

  function render() {
    if (!session || !state) return;
    if (state.phase === 'lobby') { show('lobby'); renderLobby(); }
    else if (state.phase === 'won' || state.phase === 'lost' || state.phase === 'quit') { show('end'); renderEnd(); }
    else { show('game'); renderGame(); }
  }

  // ------------------------------------------------------------ actions

  async function join(code, name, token) {
    const button = $('join-button');
    button.disabled = true;
    button.textContent = T('正在连接…');
    const slow = setTimeout(() => { button.textContent = T('服务器正在启动，首次可能要等近一分钟…'); }, 4000);
    try {
      const result = code === null
        ? await api('/solo', { method: 'POST', body: { name, lang: chosenLang, giveWord: chosenGive } })
        : await api('/join', { method: 'POST', body: { code, name, token, lang: chosenLang, giveWord: chosenGive } });
      session = { code: code === null ? result.code : code, token: result.token };
      saveSession();
      $('join-error').textContent = '';
      api('/config').then((value) => { config = value; render(); }).catch(() => {});
      apply(result.state);
      pollTimer = setTimeout(poll, POLL_MS);
    } catch (error) {
      session = null;
      saveSession();
      $('join-error').textContent = error.status ? error.message : T('连不上服务器，请检查网络后重试');
      show('join');
    } finally {
      clearTimeout(slow);
      button.disabled = false;
      showOpponent();
    }
  }

  $('join-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const name = $('name-input').value.trim();
    try { localStorage.setItem('wordsync-name', name); } catch (error) { /* optional */ }
    if (chosenOpponent === 'ai') { join(null, name, null); return; }
    const code = $('code-input').value.trim();
    if (!/^\d{4}$/.test(code)) { $('join-error').textContent = T('房间号必须是 4 位数字'); return; }
    join(code, name, null);
  });

  $('code-input').addEventListener('input', (event) => {
    event.target.value = event.target.value.replace(/\D/g, '').slice(0, 4);
  });

  $('random-code').addEventListener('click', () => {
    $('code-input').value = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  });

  $('speech-test').addEventListener('click', () => {
    speechTesting = !speechTesting;
    if (speechTesting && speechStatus !== 'ok') { speechStatus = 'idle'; heard = ''; }
    syncListening();
    render();
  });

  $('ready-button').addEventListener('click', async () => {
    try { apply(await api('/ready', { method: 'POST', body: { ...session, ready: !state.me.ready } })); }
    catch (error) { toast(error.message); }
  });

  async function leave() {
    const current = session;
    leaveLocally('');
    try { await api('/leave', { method: 'POST', body: current }); } catch (error) { /* room expires on its own */ }
  }
  $('leave-button').addEventListener('click', leave);
  $('exit-button').addEventListener('click', leave);
  $('quit-button').addEventListener('click', async () => {
    if (!confirm(T('退出后本局会立刻结束，对方也会看到对局结束。确定退出吗？'))) return;
    await flushTranscript(); // save what was said so far before the round is closed
    leave();
  });

  $('word-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (event.isComposing) return;
    const word = $('word-input').value.trim();
    if (!word) { $('word-error').textContent = T('请输入一个词'); return; }
    const button = event.target.querySelector('button');
    button.disabled = true;
    try {
      apply(await api('/submit', { method: 'POST', body: { ...session, round: state.round, word, segments: currentSegments() } }));
    } catch (error) {
      $('word-error').textContent = error.status ? error.message : T('提交失败，请重试');
      if (error.status === 409) poll();
    } finally {
      button.disabled = false;
    }
  });

  $('again-button').addEventListener('click', async () => {
    try { apply(await api('/restart', { method: 'POST', body: session })); }
    catch (error) { toast(error.message); }
  });

  setInterval(renderTimer, 200);
  setInterval(flushTranscript, 3000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });

  // ------------------------------------------------------------ boot

  useLanguage(chosenLang);
  api('/config').then((value) => { config = value; aiAvailable = !!value.aiAvailable; showOpponent(); }).catch(() => {});
  try { $('name-input').value = localStorage.getItem('wordsync-name') || ''; } catch (error) { /* optional */ }
  let saved = null;
  try { saved = JSON.parse(sessionStorage.getItem('wordsync-session')); } catch (error) { /* start fresh */ }
  if (saved && saved.code && saved.token) {
    $('code-input').value = saved.code;
    join(saved.code, $('name-input').value.trim(), saved.token);
  }
})();
