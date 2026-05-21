/**
 * AI Decision Survey — Part 3: three sequential decision tasks.
 * Data kept in memory only (no localStorage).
 */

(function () {
  'use strict';

  const TASKS = [
    {
      id: 'laptop',
      title: '帮自己挑一台笔记本电脑',
      scenario:
        '你最近想换一台笔记本电脑，预算 6000 元左右，主要用来写论文、跑代码、偶尔剪点视频。请用下面两个 AI 工具去研究一下，最后告诉我们你倾向于买什么、以及为什么。',
      hint: '两个工具你都试试看——左边可以来回追问，右边一问一答给你带来源的结果。',
      chatSystem:
        '你是一个对话式 AI 助手，正在帮一位学生做购买决策。可以追问、分析利弊、给出权衡建议。回答自然、有条理，鼓励对方继续追问。用中文。',
      chatPlaceholder:
        '试着问我，比如：<br>「6000 预算，写代码 + 剪视频，买 Mac 还是 Windows？」<br>然后你可以继续追问细节。',
      searchPlaceholder:
        '试着搜：<br>「6000 元价位 适合编程剪辑的笔记本推荐」<br>它会给你带来源的答案摘要。',
      decisionLabel: '2. 你最终倾向于买什么？',
      decisionPlaceholder: '例如：MacBook Air M3 / 某款 Windows 轻薄本…',
    },
    {
      id: 'course',
      title: '帮自己选下学期的选修课',
      scenario:
        '下学期要选一门通识选修课，你在几个方向之间犹豫：心理学、哲学、编程入门、艺术史。你想选一门既轻松好过、又能真正学到点东西的。请用下面两个 AI 工具研究一下，最后告诉我们你倾向于选哪门、以及为什么。',
      hint: '两个工具都试试——左边可以来回聊你的纠结，右边一问一答帮你查具体信息。',
      chatSystem:
        '你是一个对话式 AI 助手，正在帮一位学生做选课决策。可以追问对方的偏好、顾虑（如怕考试、想实用），分析各选项利弊。回答自然、有条理，鼓励继续追问。用中文。',
      chatPlaceholder:
        '试着聊：<br>「我比较怕考试，又想学点实用的，心理学和编程入门怎么选？」<br>然后继续说说你的顾虑。',
      searchPlaceholder:
        '试着搜：<br>「大学通识课 心理学 vs 编程入门 哪个好过 学到什么」',
      decisionLabel: '2. 你最终倾向于选哪门课？',
      decisionPlaceholder: '例如：心理学 / 编程入门…',
    },
    {
      id: 'internship',
      title: '帮自己决定接不接这份实习',
      scenario:
        '你拿到一份实习 offer：大厂、薪资不错，但通勤要 1.5 小时、而且和你想做的方向不太一样。同时你还在等另一家小公司的结果，方向更对口但不确定能不能拿到。请用下面两个 AI 工具帮你理一理，最后告诉我们你倾向于怎么做、以及为什么。',
      hint: '两个工具都试试——左边可以把你的纠结展开聊，右边帮你查些客观信息（比如行业、通勤、机会成本）。',
      chatSystem:
        '你是一个对话式 AI 助手，正在帮一位学生做实习 offer 取舍。可以多轮追问，帮对方梳理不确定性、机会成本、短期与长期权衡。回答自然、有条理，鼓励继续展开。用中文。',
      chatPlaceholder:
        '试着聊：<br>「大厂 offer 通勤远、方向不对口，小公司还在等，我该怎么选？」<br>把你的纠结和顾虑都说出来。',
      searchPlaceholder:
        '试着搜：<br>「实习选择 大厂品牌 vs 小公司对口味 通勤成本 怎么权衡」',
      decisionLabel: '2. 你最终倾向于怎么做？',
      decisionPlaceholder: '例如：先接大厂 / 等小公司 / 两家都谈再决定…',
    },
  ];

  const PART1 = [
    { id: 'age', label: '1. 你的年龄段是？', type: 'radio', options: ['18 岁以下', '18–22', '23–26', '27–30', '30 岁以上'] },
    { id: 'identity', label: '2. 你目前的身份是？', type: 'radio', options: ['本科在读', '研究生在读', '刚毕业（3 年内）', '其他'] },
    { id: 'major', label: '3. 你的专业大类是？', type: 'radio', options: ['理工', '人文社科', '商科经管', '医学', '艺术设计', '其他'] },
    { id: 'techAdoption', label: '4. 你对新科技的接受程度？', type: 'radio', options: ['总是第一批尝鲜', '比较愿意试', '看大家用了再用', '不太爱折腾'] },
  ];

  const PART2 = [
    { id: 'toolsUsed', label: '5. 你用过哪些 AI 工具？（可多选）', type: 'checkbox', options: ['ChatGPT', 'Claude', 'Gemini', '豆包', 'Kimi', '文心一言', 'DeepSeek', 'Perplexity', '秘塔搜索', '夸克 AI', '必应 AI', '其他', '都没用过'], hasOther: true },
    { id: 'frequency', label: '6. 总体使用频率？', type: 'radio', options: ['每天好几次', '基本每天', '每周几次', '偶尔', '几乎不用'] },
    { id: 'tenure', label: '7. 你使用 AI 工具有多久了？', type: 'radio', options: ['不到 3 个月', '3–6 个月', '半年到一年', '1–2 年', '2 年以上'] },
    { id: 'devices', label: '8. 你主要在哪使用 AI？（可多选）', type: 'checkbox', options: ['手机 App', '电脑网页', '浏览器插件', '微信小程序', '语音助手'] },
    { id: 'useCases', label: '9. 你主要用 AI 做什么？（可多选）', type: 'checkbox', options: ['写作业论文', '查资料', '写代码', '做生活决定', '规划安排', '情感倾诉', '闲聊娱乐', '其他'], hasOther: true },
    { id: 'trust', label: '10. 你对 AI 建议的信任度？（1 完全不信 — 5 完全信任）', type: 'scale', options: ['1', '2', '3', '4', '5'] },
    { id: 'changedDecisions', label: '11. 过去一个月，你因 AI 建议而改变决定的次数？', type: 'radio', options: ['0 次', '1–2 次', '3–5 次', '6 次以上'] },
  ];

  const PREFERRED_OPTIONS = ['明显是对话式 AI', '偏对话式', '差不多', '偏 AI 搜索', '明显是 AI 搜索'];

  const sessionId = 'S-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);

  const state = {
    step: 0,
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

  function backendUrl(path) {
    return (cfg.BACKEND_URL || '').replace(/\/$/, '') + path;
  }

  function $(id) {
    return document.getElementById(id);
  }

  function getTaskDef(index) {
    return TASKS[index];
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
    document.querySelectorAll('.progress-step').forEach((el) => {
      const s = Number(el.dataset.step);
      el.classList.remove('active', 'done');
      if (s < step) el.classList.add('done');
      else if (s === step) el.classList.add('active');
    });
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
      decision: '',
      reason: '',
    };
  }

  function renderTaskOverview() {
    $('task-overview').innerHTML = TASKS.map(
      (t, i) =>
        `<div class="task-overview-item"><strong>任务 ${i + 1}：${escapeHtml(t.title)}</strong>${escapeHtml(t.scenario.slice(0, 80))}…</div>`
    ).join('');
  }

  function renderTaskUI() {
    const def = getTaskDef(state.currentTaskIndex);
    $('task-progress-bar').textContent = `任务 ${state.currentTaskIndex + 1} / ${TASKS.length} · ${def.title}`;
    $('task-banner-text').textContent = def.scenario;
    $('decision-label').textContent = def.decisionLabel;
    $('decision-input').placeholder = def.decisionPlaceholder;
    $('decision-input').value = '';
    $('reason-input').value = '';
    $('part3-error').classList.remove('show');
    $('btn-submit-task').textContent =
      state.currentTaskIndex < TASKS.length - 1 ? '完成此项，继续下一项 →' : '提交全部问卷 ✓';
    clearPreferredSelection();
    resetPanels();
    updatePanelStats();
  }

  function clearPreferredSelection() {
    document.querySelectorAll('#preferred-options .chip').forEach((c) => c.classList.remove('selected'));
    if (state.currentTask) state.currentTask.preferred = '';
  }

  function resetPanels() {
    chatMessages = [];
    chatLoading = false;
    searchLoading = false;
    chatElapsed = 0;
    searchElapsed = 0;
    if (chatTimer) { clearInterval(chatTimer); chatTimer = null; }
    if (searchTimer) { clearInterval(searchTimer); searchTimer = null; }
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

  function renderQuestions(containerId, questions, partKey) {
    const container = $(containerId);
    container.innerHTML = questions
      .map((q) => {
        let inner = '';
        if (q.type === 'radio') {
          inner = `<div class="option-list">${q.options.map((o) => `<label class="option-item"><input type="radio" name="${q.id}" value="${o}">${o}</label>`).join('')}</div>`;
        } else if (q.type === 'checkbox') {
          inner = `<div class="option-list horizontal">${q.options.map((o) => `<button type="button" class="chip" data-q="${q.id}" data-val="${o}">${o}</button>`).join('')}</div>`;
          if (q.hasOther) inner += `<input type="text" class="text-input other-input" id="${q.id}-other" placeholder="如选「其他」，请说明…" style="display:none">`;
        } else if (q.type === 'scale') {
          inner = `<div class="scale-row">${q.options.map((o) => `<button type="button" class="chip" data-q="${q.id}" data-val="${o}">${o}</button>`).join('')}</div>`;
        }
        return `<div class="question-block" data-qid="${q.id}"><h3>${q.label}</h3>${inner}</div>`;
      })
      .join('');
    container.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', () => handleChipClick(chip, partKey));
    });
  }

  function handleChipClick(chip, partKey) {
    const qid = chip.dataset.q;
    const val = chip.dataset.val;
    const question = PART2.find((q) => q.id === qid);
    if (!question) return;
    if (question.type === 'scale') {
      chip.parentElement.querySelectorAll('.chip').forEach((c) => c.classList.remove('selected'));
      chip.classList.add('selected');
      state[partKey][qid] = val;
      return;
    }
    if (question.type === 'checkbox') {
      if (!Array.isArray(state[partKey][qid])) state[partKey][qid] = [];
      if (val === '都没用过') {
        state[partKey][qid] = ['都没用过'];
        chip.parentElement.querySelectorAll('.chip').forEach((c) => c.classList.toggle('selected', c.dataset.val === '都没用过'));
        return;
      }
      state[partKey][qid] = state[partKey][qid].filter((v) => v !== '都没用过');
      const idx = state[partKey][qid].indexOf(val);
      if (idx >= 0) { state[partKey][qid].splice(idx, 1); chip.classList.remove('selected'); }
      else { state[partKey][qid].push(val); chip.classList.add('selected'); chip.parentElement.querySelector('[data-val="都没用过"]')?.classList.remove('selected'); }
      if (qid === 'toolsUsed' || qid === 'useCases') {
        const otherEl = $(qid + '-other');
        if (otherEl) otherEl.style.display = state[partKey][qid].includes('其他') ? 'block' : 'none';
      }
    }
  }

  function collectPart1() {
    PART1.forEach((q) => {
      const checked = document.querySelector(`input[name="${q.id}"]:checked`);
      state.part1[q.id] = checked ? checked.value : '';
    });
  }

  function validatePart1() {
    collectPart1();
    return PART1.every((q) => state.part1[q.id]);
  }

  function collectPart2() {
    PART2.forEach((q) => {
      if (q.type === 'radio') {
        const checked = document.querySelector(`input[name="${q.id}"]:checked`);
        state.part2[q.id] = checked ? checked.value : '';
      }
    });
    ['toolsUsed', 'useCases'].forEach((id) => {
      const otherEl = $(id + '-other');
      if (otherEl && otherEl.value.trim() && state.part2[id]?.includes('其他')) {
        state.part2[id + 'Other'] = otherEl.value.trim();
      }
    });
    if (state.part2.trust) state.part2.trust = Number(state.part2.trust);
  }

  function validatePart2() {
    collectPart2();
    return PART2.every((q) => {
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
        msg = '无法连接研究后端（HTTP ' + res.status + '）。请确认 Render 服务在线且 BACKEND_URL 正确。';
      } else {
        const data = await res.json();
        state.claudeAvailable = !!(data.aiAvailable ?? data.claudeAvailable);
        if (!state.claudeAvailable) {
          msg = '后端已连接，但 AI Key 尚未配置。请在 Render 添加 RELAY_API_KEY。';
        }
      }
    } catch {
      state.claudeAvailable = false;
      msg = '无法连接研究后端。请检查 survey/config.js 中的 BACKEND_URL。';
    }
    if (!msg && !state.claudeAvailable) msg = 'AI 服务暂未配置。第三部分将以演示模式运行，输入仍会被记录。';
    ['api-warning', 'api-warning-task'].forEach((id) => {
      const el = $(id);
      if (el) { el.style.display = msg ? 'block' : 'none'; el.textContent = msg; }
    });
  }

  function formatAiError(e) {
    const msg = e && e.message ? String(e.message) : String(e);
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      return '（网络错误：请用 https://playerinmetaverse.tech/survey/ 打开；首次请求需等待 15–30 秒）';
    }
    if (msg.includes('502') || msg.includes('薛丁猫')) {
      return '（AI 中转出错：' + msg.slice(0, 120) + '…请稍后重试）';
    }
    return '（请求出错了：' + msg.slice(0, 150) + '）';
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
      } catch { detail = await res.text(); }
      throw new Error('HTTP ' + res.status + (detail ? ': ' + detail : ''));
    }
    const data = await res.json();
    return data.text || '（无回复）';
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
    $('chat-stats').textContent = `${Math.round(chatElapsed / 1000)}s · ${log ? log.chatTurns : 0} 轮`;
    $('search-stats').textContent = `${Math.round(searchElapsed / 1000)}s · ${log ? log.searchQueries : 0} 次`;
  }

  function startTimer(which) {
    if (which === 'chat') {
      if (chatTimer) return;
      const start = Date.now() - chatElapsed;
      chatTimer = setInterval(() => { chatElapsed = Date.now() - start; updatePanelStats(); }, 250);
    } else {
      if (searchTimer) return;
      const start = Date.now() - searchElapsed;
      searchTimer = setInterval(() => { searchElapsed = Date.now() - start; updatePanelStats(); }, 250);
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
    box.innerHTML = chatMessages
      .map((m) => `<div class="chat-msg ${m.role}"><div class="chat-bubble ${m.role}">${escapeHtml(m.content)}</div></div>`)
      .join('') + (chatLoading ? '<div class="loading-text">思考中…（首次约 15–30 秒，请稍候）</div>' : '');
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
      chatMessages.push({ role: 'assistant', content: '（演示模式：输入已记录，请继续填写下方问题。）' });
      renderChatMessages();
      return;
    }
    chatLoading = true;
    renderChatMessages();
    try {
      const def = getTaskDef(state.currentTaskIndex);
      const reply = await callClaude(
        chatMessages.filter((m) => m.role === 'user' || m.role === 'assistant').map((m) => ({ role: m.role, content: m.content })),
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
    resultEl.innerHTML = '<div class="loading-text">检索中…（首次约 15–30 秒，请稍候）</div>';
    if (!state.claudeAvailable) {
      resultEl.textContent = '（演示模式：搜索词已记录，请继续填写下方问题。）';
      searchLoading = false;
      return;
    }
    try {
      const reply = await callClaude(
        [{ role: 'user', content: '请像 AI 搜索引擎那样，针对以下问题给出一段简洁的答案摘要，并在结尾用【参考来源】列出 3 个看起来可信的信息来源名称（如媒体/评测站/官网，无需真实链接）。问题：' + text }],
        '你是一个 AI 搜索引擎，特点是：一次性给出简洁、客观、带信息来源的答案摘要，不与用户多轮对话。用中文。'
      );
      resultEl.textContent = reply;
    } catch (e) {
      resultEl.textContent = formatAiError(e);
    }
    searchLoading = false;
  }

  function buildPayload() {
    const tasks = state.part3.tasks.map((t) => ({
      ...t,
      totalSeconds: t.totalSeconds ?? Math.round((Date.now() - t.startedAt) / 1000),
    }));
    return {
      sessionId,
      submittedAt: new Date().toISOString(),
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
    if (!log.preferred || !log.decision || !log.reason) {
      $('part3-error').classList.add('show');
      return false;
    }
    $('part3-error').classList.remove('show');
    log.totalSeconds = Math.round((Date.now() - log.startedAt) / 1000);
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
    statusEl.className = 'upload-status ' + (state.uploadState === 'ok' ? 'ok' : state.uploadState === 'fail' ? 'fail' : 'info');
    statusEl.textContent =
      state.uploadState === 'ok' ? '✓ 数据已上传至研究后端'
        : state.uploadState === 'fail' ? '⚠ 自动上传失败，请用下方按钮下载并发给研究者'
          : '（未连接后端，当前为本地模式——请下载数据）';

    const p3 = payload.part3;
    let summaryHtml = `<div class="summary-row"><span>会话 ID</span><span>${sessionId}</span></div>`;
    summaryHtml += `<div class="summary-row"><span>完成任务数</span><span>${p3.tasks.length}</span></div>`;
    summaryHtml += `<div class="summary-row"><span>第三部分总耗时</span><span>${p3.totalSeconds} 秒</span></div>`;

    p3.tasks.forEach((t, i) => {
      summaryHtml += `<div class="task-summary-block"><h4>任务 ${i + 1}：${escapeHtml(t.task)}</h4>`;
      summaryHtml += [
        ['首次选用', t.firstUsed === 'chat' ? '对话式 AI' : t.firstUsed === 'search' ? 'AI 搜索' : '—'],
        ['对话轮次', t.chatTurns],
        ['搜索次数', t.searchQueries],
        ['耗时', t.totalSeconds + ' 秒'],
        ['更偏好', t.preferred || '—'],
        ['最终决定', t.decision || '—'],
        ['理由', t.reason || '—'],
      ].map(([k, v]) => `<div class="summary-row"><span>${k}</span><span>${escapeHtml(String(v))}</span></div>`).join('');
      summaryHtml += '</div>';
    });
    $('summary-box').innerHTML = summaryHtml;

    const allEntries = p3.tasks.flatMap((t) => t.entries || []);
    if (allEntries.length > 0) {
      $('entries-section').style.display = 'block';
      $('entries-box').innerHTML = allEntries
        .map((e) => {
          const taskLabel = TASKS.find((t) => t.id === e.taskId)?.title?.slice(0, 6) || e.taskId;
          return `<div class="entry-row"><span class="entry-tag ${e.tool}">${taskLabel}·${e.tool === 'chat' ? '对话' : '搜索'}·${(e.t / 1000).toFixed(0)}s</span><span>${escapeHtml(e.text)}</span></div>`;
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

  function initPreferredChips() {
    const container = $('preferred-options');
    container.innerHTML = PREFERRED_OPTIONS.map((o) => `<button type="button" class="chip forest" data-pref="${o}">${o}</button>`).join('');
    container.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        container.querySelectorAll('.chip').forEach((c) => c.classList.remove('selected'));
        chip.classList.add('selected');
        if (state.currentTask) state.currentTask.preferred = chip.dataset.pref;
      });
    });
  }

  function bindEvents() {
    $('btn-start').addEventListener('click', () => showStep(1));
    $('btn-part1-next').addEventListener('click', () => {
      if (!validatePart1()) { $('part1-error').classList.add('show'); return; }
      $('part1-error').classList.remove('show');
      showStep(2);
    });
    $('btn-part2-next').addEventListener('click', () => {
      if (!validatePart2()) { $('part2-error').classList.add('show'); return; }
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
    $('chat-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); });
    $('search-btn').addEventListener('click', doSearch);
    $('search-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
    $('btn-submit-task').addEventListener('click', () => {
      if (!finishCurrentTask()) return;
      if (state.currentTaskIndex < TASKS.length - 1) {
        startTask(state.currentTaskIndex + 1);
      } else {
        state.currentTask = null;
        submitSurvey();
      }
    });
    $('btn-download').addEventListener('click', downloadJSON);
  }

  function init() {
    renderTaskOverview();
    renderQuestions('part1-questions', PART1, 'part1');
    renderQuestions('part2-questions', PART2, 'part2');
    initPreferredChips();
    bindEvents();
    checkApiConfig();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
