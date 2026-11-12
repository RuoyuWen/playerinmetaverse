(function () {
  'use strict';

  const API = (window.WORDSYNC_CONFIG.BACKEND_URL || '') + '/api/wordsync/admin';
  const $ = (id) => document.getElementById(id);
  let password = '';
  let sessions = [];

  async function api(path, options = {}) {
    const response = await fetch(API + path, {
      method: options.method || 'GET',
      headers: Object.assign({ 'X-Admin-Password': password }, options.body ? { 'Content-Type': 'application/json' } : {}),
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: 'no-store',
    });
    let data = null;
    try { data = await response.json(); } catch (error) { /* non-JSON error page */ }
    if (!response.ok) {
      const failure = new Error((data && typeof data.detail === 'string' && data.detail) || '请求失败');
      failure.status = response.status;
      throw failure;
    }
    return data;
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  let aiDefaults = null;

  function fillAi(data) {
    const ai = data.settings.ai;
    if (data.aiDefaults) aiDefaults = data.aiDefaults;
    if (data.modelSuggestions) {
      const list = $('ai-models');
      list.textContent = '';
      for (const model of data.modelSuggestions) list.append(Object.assign(document.createElement('option'), { value: model }));
    }
    if (data.transcribeSuggestions) {
      const list = $('ai-transcribe-models');
      list.textContent = '';
      for (const model of data.transcribeSuggestions) list.append(Object.assign(document.createElement('option'), { value: model }));
    }
    $('ai-transcribe').checked = !!ai.transcribe;
    $('ai-transcribe-model').value = ai.transcribeModel || '';
    $('ai-enabled').checked = ai.enabled;
    $('ai-key').value = '';
    $('ai-clear-key').checked = false;
    $('ai-key-state').textContent = ai.apiKeySet ? `（已保存 ${ai.apiKeyHint}）` : '（还没有保存）';
    $('ai-model').value = ai.model;
    $('ai-base').value = ai.baseUrl;
    $('ai-prompt').value = ai.prompt;
    $('ai-schema').value = JSON.stringify(ai.schema, null, 2);
  }

  function fillSettings(data, keepAiForm) {
    const settings = data.settings;
    if (!keepAiForm) fillAi(data);  // saving the game rules must not wipe unsaved AI edits
    for (const key of ['lives', 'thinkSeconds', 'inputSeconds']) $(key).value = settings[key];
    $('noRepeat').checked = settings.noRepeat;
    $('requireSpeech').checked = settings.requireSpeech;
    $('customWords').value = settings.customWords.join('\n');
    $('customWordsEn').value = (settings.customWordsEn || []).join('\n');
    if (data.builtinWordCountEn) $('builtin-count-en').textContent = data.builtinWordCountEn;
    if (data.builtinWordCount) $('builtin-count').textContent = data.builtinWordCount;
    if (data.storage) {
      $('storage-note').textContent = data.storage === 'postgres'
        ? '记录保存在 PostgreSQL 数据库中。'
        : '注意：记录目前保存在服务器本地磁盘上，Render 免费实例重启或重新部署后会丢失。请及时导出，或给后端配置 WORDSYNC_DATABASE_URL 以长期保存。';
    }
  }

  const duration = (session) => (session.durationMs != null ? session.durationMs
    : session.endedAt ? new Date(session.endedAt) - new Date(session.startedAt) : null);
  const guesses = (session) => (session.guesses != null ? session.guesses : session.rounds.length);
  function clock(ms) {
    if (ms == null) return '—';
    const seconds = Math.round(ms / 1000);
    return Math.floor(seconds / 60) + ' 分 ' + String(seconds % 60).padStart(2, '0') + ' 秒';
  }

  function renderStats() {
    const done = sessions.filter((session) => session.result === 'won' || session.result === 'lost');
    const won = done.filter((session) => session.result === 'won');
    const mean = (list) => (list.length ? list.reduce((sum, value) => sum + value, 0) / list.length : null);
    const tiles = [
      ['打完的对局', done.length],
      ['获胜', done.length ? `${won.length}（${Math.round(won.length / done.length * 100)}%）` : '—'],
      ['平均猜测次数', done.length ? mean(done.map(guesses)).toFixed(1) : '—'],
      ['获胜局平均猜测次数', won.length ? mean(won.map(guesses)).toFixed(1) : '—'],
      ['平均用时', clock(mean(done.map(duration).filter((value) => value != null)))],
    ];
    const root = $('stats');
    root.textContent = '';
    for (const [label, value] of tiles) {
      const tile = element('div', 'stat');
      tile.append(element('p', 'hint', label), element('p', 'stat-value', value));
      root.append(tile);
    }
  }

  const said = (segments) => (segments || []).map((segment) => segment.text).join(' ');
  const hq = (round, index) => (round.transcriptsHq && round.transcriptsHq[index]) || null;
  const hqText = (round, index) => (hq(round, index) ? hq(round, index).text || '' : '');
  const localTime = (iso) => (iso ? new Date(iso).toLocaleString('zh-CN', { hour12: false }) : '');

  function renderSessions() {
    const root = $('sessions');
    root.textContent = '';
    $('session-count').textContent = `（${sessions.length} 局）`;
    renderStats();
    if (!sessions.length) root.append(element('p', 'hint', '还没有对局记录。'));
    for (const session of sessions) {
      const details = element('details', 'session');
      const summary = element('summary');
      const label = session.result === 'won' ? '获胜' : session.result === 'lost' ? '失败'
        : session.result === 'ai_error' ? 'AI 出错' : session.result === 'quit' ? `${session.quitBy || '有人'} 中途退出` : '未完成';
      summary.append(
        element('b', '', session.players.join(' × ')),
        element('span', 'tag ' + (session.result || ''), label),
        element('span', 'tag', session.lang === 'en' ? 'English' : '中文'),
        ...(session.opponent === 'ai' ? [element('span', 'tag', 'AI · ' + (session.aiModel || ''))] : []),
        element('span', 'metric', `猜了 ${guesses(session)} 次`),
        element('span', 'metric', `用时 ${clock(duration(session))}`),
        element('span', 'hint', `房间 ${session.code} · ${session.startWord ? `起始词「${session.startWord}」` : '不给起始词'} · 剩 ${session.livesLeft}/${session.settings.lives} 血 · ${localTime(session.startedAt)}`));
      const body = element('div', 'session-body');
      if (session.aiError) body.append(element('p', 'error', 'AI 出错：' + session.aiError));
      const rounds = session.rounds.slice();
      if (session.unfinishedRound) rounds.push(Object.assign({ words: ['', ''], unfinished: true }, session.unfinishedRound));
      for (const round of rounds) {
        const block = element('div', 'round');
        block.append(element('p', 'hint', `第 ${round.round} 轮 · 看到的词：${round.prompt.join(' / ') || '（无）'}` +
          (round.unfinished ? ' · 未完成' : round.matched ? ' · 对上了' : ' · 没对上') +
          (round.durationMs != null ? ` · 本轮用时 ${clock(round.durationMs)}` : '') +
          (round.aiInspiration ? ` · 给 AI 的随机联想词：${round.aiInspiration}` : '')));
        const columns = element('div', 'round-cols');
        session.players.forEach((name, index) => {
          const column = element('div');
          column.append(
            element('p', 'hint', name),
            element('p', 'word', round.unfinished ? '—' : round.words[index] || '（没写）'),
            element('p', 'said', said(round.transcripts[index]) || '（没有转写文字）'));
          const precise = hq(round, index);
          if (precise) column.append(element('p', 'said hq', precise.error ? `高精度转写失败：${precise.error}` : `高精度（${precise.model}）：${precise.text || '（没有识别到内容）'}`));
          columns.append(column);
        });
        block.append(columns);
        body.append(block);
      }
      const remove = element('button', 'link', '删除这局记录');
      remove.type = 'button';
      remove.addEventListener('click', async () => {
        if (!confirm('确定删除这局记录吗？删除后无法恢复。')) return;
        try { await api('/sessions/' + session.id, { method: 'DELETE' }); await loadSessions(); }
        catch (error) { alert(error.message); }
      });
      body.append(remove);
      details.append(summary, body);
      root.append(details);
    }
  }

  async function loadSessions() {
    sessions = (await api('/sessions')).sessions;
    renderSessions();
  }

  function download(name, text, type) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([text], { type }));
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  // A leading apostrophe keeps spreadsheet apps from treating player text as a formula.
  function csv(rows) {
    const cell = (value) => {
      let text = String(value == null ? '' : value);
      if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
      return '"' + text.replace(/"/g, '""') + '"';
    };
    return '﻿' + rows.map((row) => row.map(cell).join(',')).join('\r\n');
  }

  function sessionsCsv() {
    const rows = [['session_id', 'room_code', 'language', 'started_at', 'ended_at', 'result', 'player_1', 'player_2', 'opponent', 'ai_model', 'word_given', 'start_word',
      'guesses', 'duration_seconds', 'lives_total', 'lives_left', 'final_word', 'quit_by', 'think_aloud_player_1', 'think_aloud_player_2', 'think_aloud_hq_player_1', 'think_aloud_hq_player_2']];
    for (const session of sessions) {
      const last = session.rounds[session.rounds.length - 1];
      const all = (index) => session.rounds.map((round) => `[第${round.round}轮] ` + said(round.transcripts[index])).join('\n');
      const allHq = (index) => session.rounds.map((round) => `[第${round.round}轮] ` + hqText(round, index)).join('\n');
      const ms = duration(session);
      rows.push([session.id, session.code, session.lang || 'zh', session.startedAt, session.endedAt || '', session.result || 'unfinished',
        session.players[0], session.players[1], session.opponent || 'human', session.aiModel || '', session.giveWord === false ? 'no' : 'yes', session.startWord || '', guesses(session), ms == null ? '' : (ms / 1000).toFixed(1),
        session.settings.lives, session.livesLeft, session.result === 'won' && last ? last.words[0] : '', session.quitBy || '', all(0), all(1), allHq(0), allHq(1)]);
    }
    return csv(rows);
  }

  function toCsv() {
    const rows = [['session_id', 'room_code', 'started_at', 'result', 'start_word', 'round', 'player_index', 'player', 'saw',
      'word', 'matched', 'submitted_ms', 'round_duration_ms', 'lives_after', 'think_aloud', 'think_aloud_hq']];
    for (const session of sessions) {
      for (const round of session.rounds) {
        session.players.forEach((name, index) => rows.push([session.id, session.code, session.startedAt, session.result || '',
          session.startWord, round.round, index + 1, name, round.prompt.join(' / '), round.words[index], round.matched,
          round.submittedMs[index] == null ? '' : round.submittedMs[index],
          round.durationMs == null ? '' : round.durationMs, round.livesAfter, said(round.transcripts[index]), hqText(round, index)]));
      }
    }
    return csv(rows);
  }

  async function enter() {
    fillSettings(await api('/settings'));
    $('login').hidden = true;
    $('panel').hidden = false;
    try { sessionStorage.setItem('wordsync-admin', password); } catch (error) { /* optional */ }
    await loadSessions();
  }

  $('login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    password = $('password').value;
    $('login-error').textContent = '';
    try { await enter(); }
    catch (error) { $('login-error').textContent = error.status ? error.message : '连不上服务器（免费实例唤醒可能要近一分钟），请稍后重试'; }
  });

  $('settings-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = {
      lives: Number($('lives').value), thinkSeconds: Number($('thinkSeconds').value), inputSeconds: Number($('inputSeconds').value),
      noRepeat: $('noRepeat').checked, requireSpeech: $('requireSpeech').checked,
      customWords: $('customWords').value.split(/[\s,，、;；]+/).filter(Boolean),
      customWordsEn: $('customWordsEn').value.split(/[\n,;]+/).map((word) => word.trim()).filter(Boolean),
    };
    try {
      fillSettings(await api('/settings', { method: 'PUT', body }), true);
      $('settings-note').textContent = '已保存 ' + new Date().toLocaleTimeString('zh-CN', { hour12: false });
    } catch (error) { $('settings-note').textContent = '保存失败：' + error.message; }
  });

  $('ai-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    let schema;
    try { schema = JSON.parse($('ai-schema').value); }
    catch (error) { $('ai-note').textContent = '保存失败：JSON Schema 不是合法的 JSON'; return; }
    const ai = {
      enabled: $('ai-enabled').checked, model: $('ai-model').value, baseUrl: $('ai-base').value,
      prompt: $('ai-prompt').value, schema, apiKey: $('ai-key').value, clearApiKey: $('ai-clear-key').checked,
      transcribe: $('ai-transcribe').checked, transcribeModel: $('ai-transcribe-model').value,
    };
    try {
      fillAi(await api('/settings', { method: 'PUT', body: { ai } }));
      $('ai-note').textContent = '已保存 ' + new Date().toLocaleTimeString('zh-CN', { hour12: false });
    } catch (error) { $('ai-note').textContent = '保存失败：' + error.message; }
  });

  $('ai-reset').addEventListener('click', () => {
    if (!aiDefaults) return;
    $('ai-prompt').value = aiDefaults.prompt;
    $('ai-schema').value = JSON.stringify(aiDefaults.schema, null, 2);
    $('ai-note').textContent = '已填入默认内容，点“保存 AI 设置”后生效';
  });

  $('ai-test').addEventListener('click', async () => {
    const box = $('ai-result');
    box.hidden = false;
    box.textContent = '正在用已保存的设置调用模型…（改动要先保存才会生效）';
    try {
      const result = await api('/ai-test', { method: 'POST' });
      box.textContent = result.ok
        ? `调用成功（${result.latencyMs} 毫秒）\n\nthink：${result.think}\nresponse：${result.response}\n\n发给模型的局面：\n${JSON.stringify(result.sent, null, 2)}\n\n模型原始回复：\n${result.raw}`
        : `调用失败：${result.error}`;
    } catch (error) { box.textContent = '调用失败：' + error.message; }
  });

  $('refresh').addEventListener('click', () => loadSessions().catch((error) => alert(error.message)));
  $('export-json').addEventListener('click', () => download('wordsync-sessions.json', JSON.stringify(sessions, null, 2), 'application/json'));
  $('export-sessions-csv').addEventListener('click', () => download('wordsync-sessions.csv', sessionsCsv(), 'text/csv'));
  $('export-csv').addEventListener('click', () => download('wordsync-rounds.csv', toCsv(), 'text/csv'));
  $('logout').addEventListener('click', () => {
    try { sessionStorage.removeItem('wordsync-admin'); } catch (error) { /* optional */ }
    location.reload();
  });

  try { password = sessionStorage.getItem('wordsync-admin') || ''; } catch (error) { /* ask again */ }
  if (password) enter().catch(() => { password = ''; });
})();
