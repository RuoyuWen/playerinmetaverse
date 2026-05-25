/**
 * AI Decision Survey — i18n (zh/en), three sequential tasks.
 */

(function () {
  'use strict';

  const I18n = window.SurveyI18n;
  const OPT = I18n.OPT;

  const sessionId = 'S-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);

  const state = {
    step: 0,
    lang: 'zh',
    part1: {},
    part2: {},
    part3: { startedAt: null, tasks: [] },
    currentTaskIndex: 0,
    currentTask: null,
    claudeAvailable: false,
    uploadState: null,
  };

  let chatMessages = [];
  let chatLoading = false;
  let searchLoading = false;
  let chatElapsed = 0;
  let searchElapsed = 0;
  let chatTimer = null;
  let searchTimer = null;

  const cfg = window.SURVEY_CONFIG || {};

  function t(key, vars) {
    return I18n.t(key, vars);
  }

  function backendUrl(path) {
    return (cfg.BACKEND_URL || '').replace(/\/$/, '') + path;
  }

  function $(id) {
    return document.getElementById(id);
  }

  function getTasks() {
    return I18n.getTasks();
  }

  function getTaskDef(index) {
    return I18n.getTaskByIndex(index);
  }

  function showStep(step) {
    state.step = step;
    document.querySelectorAll('.survey-section').forEach((el) => el.classList.remove('active'));
    const wrap = $('survey-root');
    if (step === 3 && state.currentTask) {
      $('step-3-task').classList.add('active');
      wrap.classList.add('wide');
    } else if (step === 3) {
      $('step-3-intro').classList.add('active');
      wrap.classList.remove('wide');
    } else {
      $('step-' + step).classList.add('active');
      wrap.classList.remove('wide');
    }
    updateProgress(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateProgress(step) {
    const labels = t('progress');
    document.querySelectorAll('.progress-step').forEach((el) => {
      const s = Number(el.dataset.step);
      el.classList.remove('active', 'done');
      if (s < step) el.classList.add('done');
      else if (s === step) el.classList.add('active');
      if (labels[s]) el.textContent = labels[s];
    });
  }

  function applyStaticUI() {
    $('header-title').textContent = t('headerTitle');
    $('lang-toggle').textContent = t('langSwitch');
    $('lang-toggle').setAttribute('aria-label', state.lang === 'zh' ? 'Switch to English' : '切换到中文');

    $('step0-label').textContent = t('welcomeLabel');
    $('step0-title').textContent = t('welcomeTitle');
    $('step0-desc').innerHTML = t('welcomeDesc');
    $('privacy-note').innerHTML = t('privacyNote');
    $('btn-start').textContent = t('btnStart');

    $('step1-label').textContent = t('part1Label');
    $('step1-title').textContent = t('part1Title');
    $('part1-error').textContent = t('part1Error');
    $('btn-part1-back').textContent = t('btnBack');
    $('btn-part1-next').textContent = t('btnNext');

    $('step2-label').textContent = t('part2Label');
    $('step2-title').textContent = t('part2Title');
    $('part2-error').textContent = t('part2Error');
    $('btn-part2-back').textContent = t('btnBack');
    $('btn-part2-next').textContent = t('btnNext');

    $('step3-label').textContent = t('part3Label');
    $('step3-title').textContent = t('part3Title');
    $('step3-desc').innerHTML = t('part3Desc');
    $('concept-chat-title').textContent = t('conceptChatTitle');
    $('concept-chat-desc').textContent = t('conceptChatDesc');
    $('concept-search-title').textContent = t('conceptSearchTitle');
    $('concept-search-desc').textContent = t('conceptSearchDesc');
    $('btn-part3-back').textContent = t('btnBack');
    $('btn-start-task').textContent = t('btnStartTask');

    $('task-banner-label').textContent = t('taskLabel');
    $('chat-title').textContent = t('chatTitle');
    $('chat-sub').textContent = t('chatSub');
    $('chat-input').placeholder = t('chatInputPh');
    $('chat-send').textContent = t('chatSend');
    $('search-title').textContent = t('searchTitle');
    $('search-sub').textContent = t('searchSub');
    $('search-input').placeholder = t('searchInputPh');
    $('search-btn').textContent = t('searchBtn');
    $('post-task-title').textContent = t('postTaskTitle');
    $('preferred-q').textContent = t('preferredQ');
    $('trust-chat-q').textContent = t('trustChatQ');
    $('trust-search-q').textContent = t('trustSearchQ');
    $('reason-q').textContent = t('reasonQ');
    $('part3-error').textContent = t('part3Error');

    $('step4-label').textContent = t('completeLabel');
    $('step4-title').textContent = t('completeTitle');
    $('entries-title').textContent = t('entriesTitle');
    $('btn-download').textContent = t('btnDownload');

    renderTaskOverview();
    if (state.currentTask) applyTaskUI(false);
    updatePanelStats();
  }

  function createTaskLog(taskDef) {
    return {
      taskId: taskDef.id,
      task: taskDef.title,
      firstUsed: null,
      chatTurns: 0,
      searchQueries: 0,
      sequence: [],
      entries: [],
      startedAt: Date.now(),
      preferred: '',
      trustChat: null,
      trustSearch: null,
      decision: '',
      reason: '',
    };
  }

  function renderTaskOverview() {
    const tasks = getTasks();
    $('task-overview').innerHTML = tasks
      .map(
        (task, i) =>
          `<div class="task-overview-item"><strong>${t('taskN')} ${i + 1}：${escapeHtml(task.title)}</strong>${escapeHtml(task.scenario.slice(0, 90))}…</div>`
      )
      .join('');
  }

  function applyTaskUI(resetInputs) {
    const def = getTaskDef(state.currentTaskIndex);
    const tasks = getTasks();
    $('task-progress-bar').textContent = `${t('taskN')} ${state.currentTaskIndex + 1} / ${tasks.length} · ${def.title}`;
    $('task-banner-text').textContent = def.scenario;
    $('decision-label').textContent = '4. ' + def.decisionLabel;
    $('decision-input').placeholder = def.decisionPlaceholder;
    $('btn-submit-task').textContent =
      state.currentTaskIndex < tasks.length - 1 ? t('btnNextTask') : t('btnSubmitAll');
    if (resetInputs) {
      $('decision-input').value = '';
      $('reason-input').value = '';
      $('part3-error').classList.remove('show');
      clearPreferredSelection();
      clearTrustSelection();
      resetPanels();
    } else {
      const ph = $('search-placeholder');
      if (ph) ph.innerHTML = def.searchPlaceholder;
      if (chatMessages.length === 0) renderChatMessages();
    }
    initPreferredChips();
    initTrustScales();
  }

  function renderTaskUI() {
    applyTaskUI(true);
  }

  function clearPreferredSelection() {
    document.querySelectorAll('#preferred-options .chip').forEach((c) => c.classList.remove('selected'));
  }

  function clearTrustSelection() {
    document.querySelectorAll('#trust-chat-options .chip, #trust-search-options .chip').forEach((c) => {
      c.classList.remove('selected');
    });
    if (state.currentTask) {
      state.currentTask.trustChat = null;
      state.currentTask.trustSearch = null;
    }
  }

  function resetPanels() {
    chatMessages = [];
    chatLoading = false;
    searchLoading = false;
    chatElapsed = 0;
    searchElapsed = 0;
    if (chatTimer) {
      clearInterval(chatTimer);
      chatTimer = null;
    }
    if (searchTimer) {
      clearInterval(searchTimer);
      searchTimer = null;
    }
    $('chat-input').value = '';
    $('search-input').value = '';
    $('search-result').style.display = 'none';
    $('search-result').textContent = '';
    const def = getTaskDef(state.currentTaskIndex);
    if ($('search-placeholder')) {
      $('search-placeholder').innerHTML = def.searchPlaceholder;
      $('search-placeholder').style.display = 'block';
    }
    renderChatMessages();
    $('chat-panel').classList.remove('focused');
    $('search-panel').classList.remove('focused');
  }

  function startTask(index) {
    if (!state.part3.startedAt) state.part3.startedAt = Date.now();
    state.currentTaskIndex = index;
    state.currentTask = createTaskLog(getTaskDef(index));
    renderTaskUI();
    showStep(3);
  }

  function optLabel(opt) {
    return I18n.label(opt);
  }

  function renderQuestions(containerId, questions, partKey) {
    const container = $(containerId);
    const saved = { ...state[partKey] };

    container.innerHTML = questions
      .map((q) => {
        let inner = '';
        if (q.type === 'radio') {
          inner = `<div class="option-list">${q.options
            .map((o) => {
              const v = o.value || o;
              const checked = saved[q.id] === v ? ' checked' : '';
              return `<label class="option-item"><input type="radio" name="${q.id}" value="${escapeAttr(v)}"${checked}>${escapeHtml(optLabel(o))}</label>`;
            })
            .join('')}</div>`;
        } else if (q.type === 'checkbox') {
          inner = `<div class="option-list horizontal">${q.options
            .map((o) => {
              const v = o.value || o;
              const sel = Array.isArray(saved[q.id]) && saved[q.id].includes(v) ? ' selected' : '';
              return `<button type="button" class="chip${sel}" data-q="${q.id}" data-val="${escapeAttr(v)}">${escapeHtml(optLabel(o))}</button>`;
            })
            .join('')}</div>`;
          if (q.hasOther) {
            const showOther = Array.isArray(saved[q.id]) && saved[q.id].includes(OPT.OTHER);
            inner += `<input type="text" class="text-input other-input" id="${q.id}-other" placeholder="${escapeAttr(t('otherPh'))}" style="display:${showOther ? 'block' : 'none'}">`;
          }
        } else if (q.type === 'scale') {
          inner = `<div class="scale-row">${q.options
            .map((o) => {
              const v = o.value || o;
              const sel = saved[q.id] === v ? ' selected' : '';
              return `<button type="button" class="chip${sel}" data-q="${q.id}" data-val="${escapeAttr(v)}">${escapeHtml(optLabel(o))}</button>`;
            })
            .join('')}</div>`;
        }
        return `<div class="question-block" data-qid="${q.id}"><h3>${q.label}</h3>${inner}</div>`;
      })
      .join('');

    container.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', () => handleChipClick(chip, partKey));
    });
  }

  function escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;');
  }

  function handleChipClick(chip, partKey) {
    const qid = chip.dataset.q;
    const val = chip.dataset.val;
    const question = I18n.getPart2().find((q) => q.id === qid);
    if (!question) return;

    if (question.type === 'scale') {
      chip.parentElement.querySelectorAll('.chip').forEach((c) => c.classList.remove('selected'));
      chip.classList.add('selected');
      state[partKey][qid] = val;
      return;
    }

    if (question.type === 'checkbox') {
      if (!Array.isArray(state[partKey][qid])) state[partKey][qid] = [];
      if (val === OPT.NONE) {
        state[partKey][qid] = [OPT.NONE];
        chip.parentElement.querySelectorAll('.chip').forEach((c) => {
          c.classList.toggle('selected', c.dataset.val === OPT.NONE);
        });
        return;
      }
      state[partKey][qid] = state[partKey][qid].filter((v) => v !== OPT.NONE);
      const idx = state[partKey][qid].indexOf(val);
      if (idx >= 0) {
        state[partKey][qid].splice(idx, 1);
        chip.classList.remove('selected');
      } else {
        state[partKey][qid].push(val);
        chip.classList.add('selected');
        chip.parentElement.querySelector(`[data-val="${OPT.NONE}"]`)?.classList.remove('selected');
      }
      if (question.hasOther) {
        const otherEl = $(qid + '-other');
        if (otherEl) otherEl.style.display = state[partKey][qid].includes(OPT.OTHER) ? 'block' : 'none';
      }
    }
  }

  function collectPart1() {
    I18n.getPart1().forEach((q) => {
      const checked = document.querySelector(`input[name="${q.id}"]:checked`);
      state.part1[q.id] = checked ? checked.value : '';
    });
  }

  function validatePart1() {
    collectPart1();
    return I18n.getPart1().every((q) => state.part1[q.id]);
  }

  function collectPart2() {
    I18n.getPart2().forEach((q) => {
      if (q.type === 'radio') {
        const checked = document.querySelector(`input[name="${q.id}"]:checked`);
        state.part2[q.id] = checked ? checked.value : '';
      }
    });
    ['toolsUsed', 'useCases'].forEach((id) => {
      const otherEl = $(id + '-other');
      if (otherEl && otherEl.value.trim() && state.part2[id]?.includes(OPT.OTHER)) {
        state.part2[id + 'Other'] = otherEl.value.trim();
      }
    });
    if (state.part2.trust) state.part2.trust = Number(state.part2.trust);
  }

  function validatePart2() {
    collectPart2();
    return I18n.getPart2().every((q) => {
      const v = state.part2[q.id];
      if (q.type === 'checkbox') return Array.isArray(v) && v.length > 0;
      if (q.type === 'scale') return v !== undefined && v !== '';
      return !!v;
    });
  }

  async function checkApiConfig() {
    let msg = '';
    try {
      const res = await fetch(backendUrl(cfg.CONFIG_PATH || '/api/survey/config'));
      if (!res.ok) {
        msg = t('apiBackendErr', { status: res.status });
      } else {
        const data = await res.json();
        state.claudeAvailable = !!(data.aiAvailable ?? data.claudeAvailable);
        if (!state.claudeAvailable) msg = t('apiKeyErr');
      }
    } catch {
      state.claudeAvailable = false;
      msg = t('apiConnectErr');
    }
    if (!msg && !state.claudeAvailable) msg = t('apiDemo');
    ['api-warning', 'api-warning-task'].forEach((id) => {
      const el = $(id);
      if (el) {
        el.style.display = msg ? 'block' : 'none';
        el.textContent = msg;
      }
    });
  }

  function formatAiError(e) {
    const msg = e && e.message ? String(e.message) : String(e);
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) return t('errNetwork');
    if (msg.includes('502') || msg.includes('Relay') || msg.includes('薛丁猫')) {
      return t('errRelay', { msg: msg.slice(0, 120) });
    }
    return t('errGeneric', { msg: msg.slice(0, 150) });
  }

  async function callClaude(messages, system) {
    const res = await fetch(backendUrl(cfg.CLAUDE_PATH || '/api/survey/claude'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, system }),
    });
    if (!res.ok) {
      let detail = '';
      try {
        const err = await res.json();
        detail = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail || err);
      } catch {
        detail = await res.text();
      }
      throw new Error('HTTP ' + res.status + (detail ? ': ' + detail : ''));
    }
    const data = await res.json();
    return data.text || t('noReply');
  }

  function onActivity(tool, text) {
    const log = state.currentTask;
    if (!log) return;
    if (!log.firstUsed) log.firstUsed = tool;
    log.sequence.push(tool);
    log.entries.push({ taskId: log.taskId, tool, text, t: Date.now() - log.startedAt });
    if (tool === 'chat') log.chatTurns += 1;
    else log.searchQueries += 1;
    updatePanelStats();
  }

  function updatePanelStats() {
    const log = state.currentTask;
    $('chat-stats').textContent = `${Math.round(chatElapsed / 1000)}s · ${log ? log.chatTurns : 0} ${t('chatTurns')}`;
    $('search-stats').textContent = `${Math.round(searchElapsed / 1000)}s · ${log ? log.searchQueries : 0} ${t('searchTimes')}`;
  }

  function startTimer(which) {
    if (which === 'chat') {
      if (chatTimer) return;
      const start = Date.now() - chatElapsed;
      chatTimer = setInterval(() => {
        chatElapsed = Date.now() - start;
        updatePanelStats();
      }, 250);
    } else {
      if (searchTimer) return;
      const start = Date.now() - searchElapsed;
      searchTimer = setInterval(() => {
        searchElapsed = Date.now() - start;
        updatePanelStats();
      }, 250);
    }
  }

  function setFocused(panel) {
    $('chat-panel').classList.toggle('focused', panel === 'chat');
    $('search-panel').classList.toggle('focused', panel === 'search');
    if (panel === 'chat') startTimer('chat');
    else if (panel === 'search') startTimer('search');
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function renderChatMessages() {
    const box = $('chat-messages');
    const def = getTaskDef(state.currentTaskIndex);
    if (chatMessages.length === 0) {
      box.innerHTML = `<div class="panel-placeholder" id="chat-placeholder">${def.chatPlaceholder}</div>`;
      return;
    }
    box.innerHTML =
      chatMessages
        .map(
          (m) =>
            `<div class="chat-msg ${m.role}"><div class="chat-bubble ${m.role}">${escapeHtml(m.content)}</div></div>`
        )
        .join('') + (chatLoading ? `<div class="loading-text">${t('thinking')}</div>` : '');
    box.scrollTop = box.scrollHeight;
  }

  async function sendChat() {
    const input = $('chat-input');
    const text = input.value.trim();
    if (!text || chatLoading) return;
    input.value = '';
    setFocused('chat');
    chatMessages.push({ role: 'user', content: text });
    onActivity('chat', text);
    renderChatMessages();

    if (!state.claudeAvailable) {
      chatMessages.push({ role: 'assistant', content: t('demoChat') });
      renderChatMessages();
      return;
    }

    chatLoading = true;
    renderChatMessages();
    try {
      const def = getTaskDef(state.currentTaskIndex);
      const reply = await callClaude(
        chatMessages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({ role: m.role, content: m.content })),
        def.chatSystem
      );
      chatMessages.push({ role: 'assistant', content: reply });
    } catch (e) {
      chatMessages.push({ role: 'assistant', content: formatAiError(e) });
    }
    chatLoading = false;
    renderChatMessages();
  }

  async function doSearch() {
    const input = $('search-input');
    const text = input.value.trim();
    if (!text || searchLoading) return;
    setFocused('search');
    onActivity('search', text);
    const placeholder = $('search-placeholder');
    const resultEl = $('search-result');
    placeholder.style.display = 'none';
    resultEl.style.display = 'block';
    searchLoading = true;
    resultEl.innerHTML = `<div class="loading-text">${t('searching')}</div>`;

    if (!state.claudeAvailable) {
      resultEl.textContent = t('demoSearch');
      searchLoading = false;
      return;
    }

    try {
      const reply = await callClaude(
        [{ role: 'user', content: t('searchUserPrefix') + text }],
        t('searchSystem')
      );
      resultEl.textContent = reply;
    } catch (e) {
      resultEl.textContent = formatAiError(e);
    }
    searchLoading = false;
  }

  function buildPayload() {
    const tasks = state.part3.tasks.map((task) => ({
      ...task,
      totalSeconds: task.totalSeconds ?? Math.round((Date.now() - task.startedAt) / 1000),
    }));
    return {
      sessionId,
      submittedAt: new Date().toISOString(),
      locale: state.lang,
      part1: { ...state.part1 },
      part2: { ...state.part2 },
      part3: {
        totalSeconds: state.part3.startedAt ? Math.round((Date.now() - state.part3.startedAt) / 1000) : 0,
        taskCount: tasks.length,
        tasks,
      },
    };
  }

  function finishCurrentTask() {
    const log = state.currentTask;
    log.decision = $('decision-input').value.trim();
    log.reason = $('reason-input').value.trim();
    if (!log.preferred || !log.trustChat || !log.trustSearch || !log.decision || !log.reason) {
      $('part3-error').classList.add('show');
      return false;
    }
    $('part3-error').classList.remove('show');
    log.totalSeconds = Math.round((Date.now() - log.startedAt) / 1000);
    log.task = getTaskDef(state.currentTaskIndex).title;
    state.part3.tasks.push({ ...log });
    return true;
  }

  async function submitSurvey() {
    const payload = buildPayload();
    try {
      const res = await fetch(backendUrl(cfg.SUBMIT_PATH || '/api/survey/submit'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      state.uploadState = res.ok ? 'ok' : 'fail';
    } catch {
      state.uploadState = 'fail';
    }
    showComplete(payload);
  }

  function showComplete(payload) {
    showStep(4);
    const statusEl = $('upload-status');
    statusEl.className =
      'upload-status ' +
      (state.uploadState === 'ok' ? 'ok' : state.uploadState === 'fail' ? 'fail' : 'info');
    statusEl.textContent =
      state.uploadState === 'ok' ? t('uploadOk') : state.uploadState === 'fail' ? t('uploadFail') : t('uploadLocal');

    const p3 = payload.part3;
    let summaryHtml = `<div class="summary-row"><span>${t('summarySession')}</span><span>${sessionId}</span></div>`;
    summaryHtml += `<div class="summary-row"><span>${t('summaryLocale')}</span><span>${state.lang === 'en' ? 'English' : '中文'}</span></div>`;
    summaryHtml += `<div class="summary-row"><span>${t('summaryTaskCount')}</span><span>${p3.tasks.length}</span></div>`;
    summaryHtml += `<div class="summary-row"><span>${t('summaryPart3Time')}</span><span>${p3.totalSeconds} ${t('summarySeconds')}</span></div>`;

    p3.tasks.forEach((task, i) => {
      summaryHtml += `<div class="task-summary-block"><h4>${t('taskN')} ${i + 1}：${escapeHtml(task.task)}</h4>`;
      summaryHtml += [
        [t('summaryFirstUsed'), task.firstUsed === 'chat' ? t('toolChat') : task.firstUsed === 'search' ? t('toolSearch') : t('dash')],
        [t('summaryChatTurns'), task.chatTurns],
        [t('summarySearchCount'), task.searchQueries],
        [t('summaryDuration'), task.totalSeconds + ' ' + t('summarySeconds')],
        [t('summaryPreferred'), I18n.preferredLabel(task.preferred) || t('dash')],
        [t('summaryTrustChat'), task.trustChat ?? t('dash')],
        [t('summaryTrustSearch'), task.trustSearch ?? t('dash')],
        [t('summaryDecision'), task.decision || t('dash')],
        [t('summaryReason'), task.reason || t('dash')],
      ]
        .map(
          ([k, v]) => `<div class="summary-row"><span>${k}</span><span>${escapeHtml(String(v))}</span></div>`
        )
        .join('');
      summaryHtml += '</div>';
    });
    $('summary-box').innerHTML = summaryHtml;

    const allEntries = p3.tasks.flatMap((task) => task.entries || []);
    if (allEntries.length > 0) {
      $('entries-section').style.display = 'block';
      $('entries-box').innerHTML = allEntries
        .map((e) => {
          const taskTitle = getTasks().find((x) => x.id === e.taskId)?.title?.slice(0, 8) || e.taskId;
          const toolLabel = e.tool === 'chat' ? t('toolChatShort') : t('toolSearchShort');
          return `<div class="entry-row"><span class="entry-tag ${e.tool}">${escapeHtml(taskTitle)}·${toolLabel}·${(e.t / 1000).toFixed(0)}s</span><span>${escapeHtml(e.text)}</span></div>`;
        })
        .join('');
    }
  }

  function downloadJSON() {
    const blob = new Blob([JSON.stringify(buildPayload(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = sessionId + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function initTrustScales() {
    const scales = ['1', '2', '3', '4', '5'];
    const chatVal = state.currentTask?.trustChat;
    const searchVal = state.currentTask?.trustSearch;

    const chatBox = $('trust-chat-options');
    chatBox.innerHTML = scales
      .map(
        (v) =>
          `<button type="button" class="chip forest${chatVal === Number(v) ? ' selected' : ''}" data-trust="chat" data-val="${v}">${v}</button>`
      )
      .join('');
    chatBox.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        chatBox.querySelectorAll('.chip').forEach((c) => c.classList.remove('selected'));
        chip.classList.add('selected');
        if (state.currentTask) state.currentTask.trustChat = Number(chip.dataset.val);
      });
    });

    const searchBox = $('trust-search-options');
    searchBox.innerHTML = scales
      .map(
        (v) =>
          `<button type="button" class="chip clay${searchVal === Number(v) ? ' selected' : ''}" data-trust="search" data-val="${v}">${v}</button>`
      )
      .join('');
    searchBox.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        searchBox.querySelectorAll('.chip').forEach((c) => c.classList.remove('selected'));
        chip.classList.add('selected');
        if (state.currentTask) state.currentTask.trustSearch = Number(chip.dataset.val);
      });
    });
  }

  function initPreferredChips() {
    const container = $('preferred-options');
    const current = state.currentTask?.preferred || '';
    container.innerHTML = I18n.getPreferred()
      .map(
        (o) =>
          `<button type="button" class="chip forest${current === o.value ? ' selected' : ''}" data-pref="${o.value}">${escapeHtml(o.label)}</button>`
      )
      .join('');
    container.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        container.querySelectorAll('.chip').forEach((c) => c.classList.remove('selected'));
        chip.classList.add('selected');
        if (state.currentTask) state.currentTask.preferred = chip.dataset.pref;
      });
    });
  }

  function switchLanguage() {
    I18n.toggleLang();
    state.lang = I18n.lang;
    applyStaticUI();
    renderQuestions('part1-questions', I18n.getPart1(), 'part1');
    renderQuestions('part2-questions', I18n.getPart2(), 'part2');
    if (state.currentTask) initTrustScales();
    checkApiConfig();
  }

  function bindEvents() {
    $('lang-toggle').addEventListener('click', switchLanguage);
    $('btn-start').addEventListener('click', () => showStep(1));
    $('btn-part1-next').addEventListener('click', () => {
      if (!validatePart1()) {
        $('part1-error').classList.add('show');
        return;
      }
      $('part1-error').classList.remove('show');
      showStep(2);
    });
    $('btn-part2-next').addEventListener('click', () => {
      if (!validatePart2()) {
        $('part2-error').classList.add('show');
        return;
      }
      $('part2-error').classList.remove('show');
      showStep(3);
    });
    document.querySelectorAll('[data-back]').forEach((btn) => {
      btn.addEventListener('click', () => showStep(Number(btn.dataset.back)));
    });
    $('btn-start-task').addEventListener('click', () => startTask(0));
    $('chat-panel').addEventListener('click', () => setFocused('chat'));
    $('search-panel').addEventListener('click', () => setFocused('search'));
    $('chat-send').addEventListener('click', sendChat);
    $('chat-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendChat();
    });
    $('search-btn').addEventListener('click', doSearch);
    $('search-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doSearch();
    });
    $('btn-submit-task').addEventListener('click', () => {
      if (!finishCurrentTask()) return;
      if (state.currentTaskIndex < getTasks().length - 1) {
        startTask(state.currentTaskIndex + 1);
      } else {
        state.currentTask = null;
        submitSurvey();
      }
    });
    $('btn-download').addEventListener('click', downloadJSON);
  }

  function init() {
    I18n.setLang('zh');
    state.lang = I18n.lang;
    applyStaticUI();
    renderQuestions('part1-questions', I18n.getPart1(), 'part1');
    renderQuestions('part2-questions', I18n.getPart2(), 'part2');
    bindEvents();
    checkApiConfig();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
