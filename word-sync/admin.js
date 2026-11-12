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

  function fillSettings(data) {
    const settings = data.settings;
    for (const key of ['lives', 'thinkSeconds', 'inputSeconds']) $(key).value = settings[key];
    $('noRepeat').checked = settings.noRepeat;
    $('requireSpeech').checked = settings.requireSpeech;
    $('customWords').value = settings.customWords.join('\n');
    if (data.builtinWordCount) $('builtin-count').textContent = data.builtinWordCount;
    if (data.storage) {
      $('storage-note').textContent = data.storage === 'postgres'
        ? '记录保存在 PostgreSQL 数据库中。'
        : '注意：记录目前保存在服务器本地磁盘上，Render 免费实例重启或重新部署后会丢失。请及时导出，或给后端配置 WORDSYNC_DATABASE_URL 以长期保存。';
    }
  }

  const said = (segments) => (segments || []).map((segment) => segment.text).join(' ');
  const localTime = (iso) => (iso ? new Date(iso).toLocaleString('zh-CN', { hour12: false }) : '');

  function renderSessions() {
    const root = $('sessions');
    root.textContent = '';
    $('session-count').textContent = `（${sessions.length} 局）`;
    if (!sessions.length) root.append(element('p', 'hint', '还没有对局记录。'));
    for (const session of sessions) {
      const details = element('details', 'session');
      const summary = element('summary');
      const label = session.result === 'won' ? '获胜' : session.result === 'lost' ? '失败' : '未完成';
      summary.append(
        element('b', '', session.players.join(' × ')),
        element('span', 'tag ' + (session.result || ''), label),
        element('span', 'hint', `房间 ${session.code} · 起始词「${session.startWord}」 · ${session.rounds.length} 轮 · 剩 ${session.livesLeft}/${session.settings.lives} 血 · ${localTime(session.startedAt)}`));
      const body = element('div', 'session-body');
      const rounds = session.rounds.slice();
      if (session.unfinishedRound) rounds.push(Object.assign({ words: ['', ''], unfinished: true }, session.unfinishedRound));
      for (const round of rounds) {
        const block = element('div', 'round');
        block.append(element('p', 'hint', `第 ${round.round} 轮 · 看到的词：${round.prompt.join(' / ')}` +
          (round.unfinished ? ' · 未完成' : round.matched ? ' · 对上了' : ' · 没对上')));
        const columns = element('div', 'round-cols');
        session.players.forEach((name, index) => {
          const column = element('div');
          column.append(
            element('p', 'hint', name),
            element('p', 'word', round.unfinished ? '—' : round.words[index] || '（没写）'),
            element('p', 'said', said(round.transcripts[index]) || '（没有转写文字）'));
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

  function toCsv() {
    const rows = [['session_id', 'room_code', 'started_at', 'result', 'start_word', 'round', 'player_index', 'player', 'saw',
      'word', 'matched', 'submitted_ms', 'lives_after', 'think_aloud']];
    for (const session of sessions) {
      for (const round of session.rounds) {
        session.players.forEach((name, index) => rows.push([session.id, session.code, session.startedAt, session.result || '',
          session.startWord, round.round, index + 1, name, round.prompt.join(' / '), round.words[index], round.matched,
          round.submittedMs[index] == null ? '' : round.submittedMs[index], round.livesAfter, said(round.transcripts[index])]));
      }
    }
    // A leading apostrophe keeps spreadsheet apps from treating player text as a formula.
    const cell = (value) => {
      let text = String(value == null ? '' : value);
      if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
      return '"' + text.replace(/"/g, '""') + '"';
    };
    return '﻿' + rows.map((row) => row.map(cell).join(',')).join('\r\n');
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
    };
    try {
      fillSettings(await api('/settings', { method: 'PUT', body }));
      $('settings-note').textContent = '已保存 ' + new Date().toLocaleTimeString('zh-CN', { hour12: false });
    } catch (error) { $('settings-note').textContent = '保存失败：' + error.message; }
  });

  $('refresh').addEventListener('click', () => loadSessions().catch((error) => alert(error.message)));
  $('export-json').addEventListener('click', () => download('wordsync-sessions.json', JSON.stringify(sessions, null, 2), 'application/json'));
  $('export-csv').addEventListener('click', () => download('wordsync-rounds.csv', toCsv(), 'text/csv'));
  $('logout').addEventListener('click', () => {
    try { sessionStorage.removeItem('wordsync-admin'); } catch (error) { /* optional */ }
    location.reload();
  });

  try { password = sessionStorage.getItem('wordsync-admin') || ''; } catch (error) { /* ask again */ }
  if (password) enter().catch(() => { password = ''; });
})();
