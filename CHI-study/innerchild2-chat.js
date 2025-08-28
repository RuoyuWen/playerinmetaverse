class InnerChild2Chat {
  constructor() {
    this.messages = [];
    this.apiKey = '';
    this.currentProvider = 'xuedingmao';

    this.config = window.INNER_CHILD_CONFIG || {
      model: 'gpt-4.1',
      apiProviders: {},
      apiParams: { max_tokens: 1200, temperature: 0.8, top_p: 0.9 },
      ui: {
        welcomeMessage: '嗨～我是小时候的你（通用版）。我们可以聊聊吗？',
        userLabel: '玩家',
        assistantLabelDefault: '童年自我'
      }
    };

    this.elems = {
      chat: document.getElementById('ic-chat'),
      typing: document.getElementById('ic-typing'),
      input: document.getElementById('ic-input'),
      send: document.getElementById('ic-send'),
      endChat: document.getElementById('ic-end-chat'),
      apiKey: document.getElementById('ic-api-key'),
      apiProvider: document.getElementById('ic-api-provider'),
      apiKeyLabel: document.getElementById('ic-api-key-label'),
      name: document.getElementById('ic-name'),
      file: document.getElementById('ic-file'),
      rawText: document.getElementById('ic-raw-text'),
      genPrompt: document.getElementById('ic-generate-prompt-btn'),
      viewPrompt: document.getElementById('ic-view-prompt-btn'),
      previewCard: document.getElementById('ic-prompt-preview'),
      promptText: document.getElementById('ic-prompt-text'),
      copyLetter: document.getElementById('ic-copy-letter'),
      startChat: document.getElementById('ic-start-chat'),
      letterDisplay: document.getElementById('ic-letter-display'),
      letterContent: document.getElementById('ic-letter-content'),
      letterTyping: document.getElementById('ic-letter-typing')
    };

    this.assistantName = this.elems.name?.value?.trim() || this.config.ui?.assistantLabelDefault || '童年自我';
    this.avatarUrl = '../images/image1.png';

    this.bindEvents();
    this.restoreApiKey();
    this.initProvider();
    this.resetChat();
    this.updateSetupStatus();
  }

  initProvider() {
    this.currentProvider = localStorage.getItem('ic_api_provider') || this.config.defaultProvider || 'xuedingmao';
    if (this.elems.apiProvider) {
      this.elems.apiProvider.value = this.currentProvider;
      this.updateApiProviderUI();
    }
  }

  bindEvents() {
    this.elems.send?.addEventListener('click', () => this.onSend());
    this.elems.endChat?.addEventListener('click', () => this.endChatAndDownload());
    this.elems.input?.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.onSend(); }});

    this.elems.apiProvider?.addEventListener('change', (e) => {
      this.currentProvider = e.target.value;
      localStorage.setItem('ic_api_provider', this.currentProvider);
      this.updateApiProviderUI();
      this.restoreApiKey();
      this.updateSetupStatus();
    });

    this.elems.apiKey?.addEventListener('input', (e) => { this.apiKey = e.target.value.trim(); this.saveApiKey(); this.updateSetupStatus(); });
    this.elems.name?.addEventListener('input', (e) => { this.assistantName = e.target.value.trim() || '童年自我'; this.updateSetupStatus(); });
    this.elems.genPrompt?.addEventListener('click', () => this.generateGeneralPrompt());
    this.elems.viewPrompt?.addEventListener('click', () => this.togglePromptPreview(true));
    this.elems.startChat?.addEventListener('click', () => this.usePromptAndFocus());
    this.elems.copyLetter?.addEventListener('click', () => this.copyLetter());
  }

  updateApiProviderUI() {
    const providers = this.config.apiProviders || {};
    const provider = providers[this.currentProvider];
    if (provider && this.elems.apiKeyLabel && this.elems.apiKey) {
      this.elems.apiKeyLabel.textContent = `${provider.name} 密钥`;
      this.elems.apiKey.placeholder = provider.keyPlaceholder;
    }
  }

  restoreApiKey() {
    const keyName = `ic_api_key_${this.currentProvider}`;
    const k = localStorage.getItem(keyName);
    this.apiKey = k || '';
    if (this.elems.apiKey) this.elems.apiKey.value = this.apiKey;
  }

  saveApiKey() {
    const keyName = `ic_api_key_${this.currentProvider}`;
    localStorage.setItem(keyName, this.apiKey);
  }

  updateSetupStatus() {
    const hasApiKey = this.apiKey && this.apiKey.trim() !== '';
    const hasName = this.elems.name?.value?.trim() !== '';
    const hasPrompt = sessionStorage.getItem('ic2_system_prompt') && sessionStorage.getItem('ic2_system_prompt').trim() !== '';
    // 放宽条件：不强制要求信件已生成即可进入聊天
    const ready = hasApiKey && hasName && hasPrompt;

    const chatElems = [this.elems.chat, this.elems.typing, this.elems.input, this.elems.send, this.elems.endChat];
    chatElems.forEach(el => { if (el) el.style.display = ready ? 'block' : 'none'; });
    if (this.elems.input) {
      this.elems.input.disabled = !ready;
      this.elems.input.placeholder = ready ? '输入你的消息...' : '请先完成设置...';
    }

    const guide = document.getElementById('ic-setup-guide');
    if (guide) guide.style.display = ready ? 'none' : 'block';
  }

  resetChat() {
    this.messages = [];
    if (this.elems.chat) this.elems.chat.innerHTML = '';
  }

  togglePromptPreview(show) {
    if (this.elems.previewCard) this.elems.previewCard.style.display = show ? 'block' : 'none';
  }

  async generateGeneralPrompt() {
    if (!this.ensureApiKey()) return;
    const name = (this.elems.name?.value || '').trim() || '童年自我';

    // 使用原配置模板，但填充一个通用的profile
    const baseTemplate = (this.config.systemPromptTemplate || '').replaceAll('{{name}}', name);
    const generalProfile = `（控制组通用设定）
角色定位：过去的自己（不使用用户上传资料）
特点：天真、温柔、好奇，喜欢提问；谈及梦想、兴趣、友情、家庭的小片段与感受；避免具体个人经历细节
用词：自然口语化、简短，有时带点小表情
互动：常以“我记得…我喜欢…我有点害怕…”表达，并温柔反问`;

    const prompt = baseTemplate.replaceAll('{{profile}}', generalProfile);
    this.elems.promptText.textContent = prompt;
    sessionStorage.setItem('ic2_system_prompt', prompt);

    await this.generateGeneralLetter();
    this.updateSetupStatus();
  }

  async generateGeneralLetter() {
    const name = (this.elems.name?.value || '').trim() || '童年自我';
    const system = `你是用户童年时期的自己（控制组通用版）。不使用任何用户上传资料，只以普遍的童年视角写作。`;
    const instruction = `请给现在的自己写一封200-400字的通用信件：
- 语气温暖、真诚，带点好奇
- 提到童年常见的元素（如梦想、喜欢的事、朋友、家人、小小烦恼）
- 不包含具体个人隐私或过度细节
- 多用第一人称，适当提问现在的自己
- 结尾表达期待与祝福`;

    try {
      this.showLetterTyping(true);
      const letter = await this.rawOpenAI([
        { role: 'system', content: system },
        { role: 'user', content: instruction }
      ]);
      sessionStorage.setItem('ic2_letter_content', letter);
      this.showLetter(letter);
    } finally {
      this.showLetterTyping(false);
    }
  }

  showLetterTyping(show) { if (this.elems.letterTyping) this.elems.letterTyping.style.display = show ? 'block' : 'none'; }
  showLetter(content) {
    if (this.elems.letterContent) this.elems.letterContent.textContent = content;
    if (this.elems.letterDisplay) this.elems.letterDisplay.style.display = 'block';
  }
  copyLetter() {
    const txt = this.elems.letterContent?.textContent || '';
    if (!txt) return; navigator.clipboard.writeText(txt);
  }

  usePromptAndFocus() {
    // 使用 ic2 的存储键
    sessionStorage.setItem('ic2_system_prompt', this.elems.promptText?.textContent || '');
    if (this.config.ui?.welcomeMessage) {
      this.resetChat();
      this.addMessage(this.config.ui.welcomeMessage, 'ai');
    }
    // 若尚未生成信件，则后台生成（不阻塞对话）
    const hasLetter = sessionStorage.getItem('ic2_letter_content') && sessionStorage.getItem('ic2_letter_content').trim() !== '';
    if (!hasLetter) {
      this.generateGeneralLetter().catch(() => {});
    }
    this.updateSetupStatus();
    this.elems.input?.focus();
  }

  addMessage(text, who = 'ai') {
    const row = document.createElement('div');
    row.className = `message ${who === 'user' ? 'user' : 'ai'}`;
    const avatar = document.createElement('div'); avatar.className = 'avatar';
    const img = document.createElement('img'); img.src = who === 'user' ? '../images/default_user_avatar.png' : this.avatarUrl; img.alt = who; avatar.appendChild(img);
    const bubble = document.createElement('div'); bubble.className = 'bubble';
    const label = who === 'user' ? (this.config.ui?.userLabel || '玩家') : (this.assistantName || '童年自我');
    bubble.innerHTML = `<strong>${this.escape(label)}:</strong> ${this.format(text)}`;
    row.appendChild(avatar); row.appendChild(bubble);
    this.elems.chat.appendChild(row);
    setTimeout(() => { this.elems.chat.scrollTop = this.elems.chat.scrollHeight; }, 50);
  }

  escape(t){ const d=document.createElement('div'); d.textContent=t; return d.innerHTML; }
  format(t){ return this.escape(t).replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\*(.*?)\*/g,'<em>$1</em>').replace(/`(.*?)`/g,'<code>$1</code>').replace(/\n/g,'<br>'); }

  async onSend() {
    if (!this.ensureApiKey()) return;
    if (!this.isReady()) { alert('请先完成设置：API密钥、名字、生成通用人设与信件'); return; }
    const text = (this.elems.input?.value || '').trim(); if (!text) return; this.addMessage(text, 'user'); this.elems.input.value = '';
    try {
      this.showTyping(true);
      const reply = await this.callOpenAI(this.buildSystemPrompt(), text);
      this.addMessage(reply, 'ai');
    } finally { this.showTyping(false); }
  }

  isReady(){
    // 只要求密钥+名字+通用人设
    return Boolean(this.apiKey && (sessionStorage.getItem('ic2_system_prompt') || '').trim() && (this.elems.name?.value || '').trim());
  }

  showTyping(show){ if (this.elems.typing) this.elems.typing.style.display = show ? 'block' : 'none'; }

  buildSystemPrompt(){
    const name = (this.elems.name?.value || '').trim() || '童年自我';
    const stored = sessionStorage.getItem('ic2_system_prompt');
    let sys = stored && stored.trim() ? stored : (this.config.systemPromptTemplate || '').replaceAll('{{name}}', name).replaceAll('{{profile}}', '（控制组通用设定）');
    const letter = sessionStorage.getItem('ic2_letter_content');
    if (letter && letter.trim()) {
      sys += `\n\n【通用信件回忆】：你作为“过去的自己”已经写过一封通用的信，内容如下：\n"${letter}"\n请保持同样的情感基调与表达风格进行对话。`;
    }
    return sys;
  }

  async callOpenAI(systemPrompt, userText){
    const providers = this.config.apiProviders || {};
    const provider = providers[this.currentProvider] || { name: '薛定猫 API', endpoint: this.config.apiEndpoint, model: this.config.model };
    const body = {
      model: provider.model || this.config.model,
      messages: [ { role: 'system', content: systemPrompt }, ...this.messages, { role: 'user', content: userText } ],
      temperature: this.config.apiParams?.temperature ?? 0.8,
      top_p: this.config.apiParams?.top_p ?? 0.9,
      max_tokens: this.config.apiParams?.max_tokens ?? 1200,
      stream: false
    };
    const res = await fetch(provider.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` }, body: JSON.stringify(body) });
    if (!res.ok) { const err = await res.json().catch(()=>({})); throw new Error(err.error?.message || res.statusText); }
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    this.messages.push({ role: 'user', content: userText });
    this.messages.push({ role: 'assistant', content: text });
    if (this.messages.length > 24) this.messages = this.messages.slice(-24);
    return text;
  }

  ensureApiKey(){ if (!this.apiKey) { alert('请先输入 API 密钥'); return false; } return true; }

  endChatAndDownload(){
    if (!confirm('确定要结束对话并下载聊天记录吗？')) return;
    const name = this.assistantName || '童年自我(通用)';
    const date = new Date();
    let txt = `=== 控制组 通用 童年自我 聊天记录 ===\nAI 名字: ${name}\n导出时间: ${date.toLocaleString()}\n=================================\n\n`;
    if (this.messages.length === 0) txt += '暂无聊天内容\n'; else {
      this.messages.forEach((m,i)=>{ const who = m.role === 'user' ? '用户' : name; txt += `[${i+1}] ${who}:\n${m.content}\n\n`; });
    }
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `控制组_童年自我_${this.formatDate(date)}.txt`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    this.resetChat(); alert('聊天记录已下载，对话已重置');
  }

  formatDate(d){ const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; }
}

document.addEventListener('DOMContentLoaded', () => { window.innerChild2Chat = new InnerChild2Chat(); });


