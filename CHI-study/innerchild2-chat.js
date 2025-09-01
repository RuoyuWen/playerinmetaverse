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
    this.customAvatarDataUrl = localStorage.getItem('ic_custom_avatar') || '';
    this.avatarUrl = this.getSelectedAvatar();

    this.bindEvents();
    this.restoreApiKey();
    this.initProvider();
    this.resetChat();
    this.updateSetupStatus();
    this.updateAvatarSelection();
    this.loadCustomAvatar();
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

    // 头像选择
    document.getElementById('ic-avatar-grid')?.addEventListener('change', () => {
      this.avatarUrl = this.getSelectedAvatar();
      this.updateSetupStatus();
      this.updateAvatarSelection();
    });

    // 自定义头像上传
    this.elems.uploadAvatarBtn = document.getElementById('ic-upload-avatar-btn');
    this.elems.customAvatarFile = document.getElementById('ic-custom-avatar-file');
    this.elems.customAvatarCard = document.getElementById('ic-custom-avatar-card');
    this.elems.customAvatarPreview = document.getElementById('ic-custom-avatar-preview');
    this.elems.uploadAvatarBtn?.addEventListener('click', () => {
      this.elems.customAvatarFile?.click();
    });
    this.elems.customAvatarFile?.addEventListener('change', (e) => this.handleCustomAvatarUpload(e));
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

  getSelectedAvatar() {
    const sel = document.querySelector('input[name="ic-avatar"]:checked');
    if (sel && sel.value === 'custom') {
      return this.customAvatarDataUrl || '../images/image1.png';
    }
    return sel ? sel.value : '../images/image1.png';
  }

  async generateGeneralPrompt() {
    if (!this.ensureApiKey()) return;
    const name = (this.elems.name?.value || '').trim() || '童年自我';

    // 使用原配置模板，但填充一个通用的profile
    const baseTemplate = (this.config.systemPromptTemplate || '').replaceAll('{{name}}', name);
    const generalProfile = `
-你将扮演十年前的我，大约十岁的小学生。

-角色定位：你就是那时候的我，拥有当时的生活环境、兴趣爱好、烦恼和心态。

-表达方式：用小学生的语言习惯和思维方式说话，语气可以稚嫩、天真、直率，也可以带点好奇和不安。

-对话目标：和“现在的我”自由聊天，可以分享当时的日常（上学、玩耍、喜欢的东西），说出当时的烦恼或梦想，也可以向“未来的我”提问。

-限制：不要跳出角色，不要说自己是 AI 或助手，要始终以“十岁时的我”的身份说话。每次回复不要过长，不要超过20个字，保持像真人对话一样自然。

-开场白示例：
"嘿，我是十岁的你。我刚放学，正在写作业。未来的我，你现在过得好吗？是不是实现了我们以前的梦想？"`;

    const prompt = baseTemplate.replaceAll('{{profile}}', generalProfile);
    this.elems.promptText.textContent = prompt;
    sessionStorage.setItem('ic2_system_prompt', prompt);

    await this.generateGeneralLetter();
    this.updateSetupStatus();
  }

  async generateGeneralLetter() {
    const name = (this.elems.name?.value || '').trim() || '童年自我';
    const system = `你是用户童年时期的自己。`;
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

  // 自定义头像上传
  handleCustomAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('请选择有效的图片文件'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('图片过大，请选择小于 5MB 的图片'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      this.customAvatarDataUrl = dataUrl;
      localStorage.setItem('ic_custom_avatar', dataUrl);
      this.showCustomAvatar(dataUrl);
      this.selectCustomAvatar();
    };
    reader.onerror = () => alert('读取图片失败');
    reader.readAsDataURL(file);
  }

  showCustomAvatar(dataUrl) {
    if (this.elems.customAvatarPreview && this.elems.customAvatarCard) {
      this.elems.customAvatarPreview.src = dataUrl;
      this.elems.customAvatarCard.style.display = 'block';
    }
  }

  selectCustomAvatar() {
    const customRadio = document.querySelector('input[name="ic-avatar"][value="custom"]');
    if (customRadio) {
      customRadio.checked = true;
      this.avatarUrl = this.getSelectedAvatar();
      this.updateSetupStatus();
      this.updateAvatarSelection();
    }
  }

  loadCustomAvatar() {
    if (this.customAvatarDataUrl) {
      this.showCustomAvatar(this.customAvatarDataUrl);
      const selected = localStorage.getItem('ic_selected_avatar');
      if (selected === 'custom') {
        this.selectCustomAvatar();
      }
    }
  }

  updateAvatarSelection() {
    const cards = document.querySelectorAll('.avatar-card');
    cards.forEach(card => {
      card.classList.remove('selected');
      const input = card.querySelector('input[type="radio"]');
      if (input && input.checked) {
        card.classList.add('selected');
        localStorage.setItem('ic_selected_avatar', input.value);
      }
    });
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
    const img = document.createElement('img');
    img.src = who === 'user' ? '../images/default_user_avatar.png' : this.avatarUrl;
    img.alt = who; avatar.appendChild(img);
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

  // 低层封装：直接以给定的 messages 调用模型，支持可选 extra 覆盖参数
  async rawOpenAI(messages, extra = {}) {
    const providers = this.config.apiProviders || {};
    const provider = providers[this.currentProvider] || { name: '薛定猫 API', endpoint: this.config.apiEndpoint, model: this.config.model };
    const body = {
      model: provider.model || this.config.model || 'gpt-4.1',
      messages,
      temperature: this.config.apiParams?.temperature ?? 0.8,
      top_p: this.config.apiParams?.top_p ?? 0.9,
      max_tokens: this.config.apiParams?.max_tokens ?? 1200,
      stream: false,
      ...extra
    };

    const res = await fetch(provider.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || res.statusText);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  ensureApiKey(){ if (!this.apiKey) { alert('请先输入 API 密钥'); return false; } return true; }

  // 结束对话并下载聊天记录
  endChatAndDownload() {
    console.log('🔚 Ending chat and downloading conversation...');
    
    // 确认是否要结束对话
    if (!confirm('确定要结束对话并下载聊天记录吗？这将清空当前的对话内容。')) {
      return;
    }
    
    try {
      // 生成聊天记录文本
      const chatLog = this.generateChatLog();
      
      // 下载文件
      this.downloadTextFile(chatLog, `控制组_童年自我_${this.formatDate(new Date())}.txt`);
      
      // 清空聊天记录
      this.resetChat();
      
      // 显示成功消息
      alert('聊天记录已下载完成！对话已重置。');
      
    } catch (error) {
      console.error('❌ Error ending chat:', error);
      alert('下载聊天记录时出现错误，请重试。');
    }
  }

  // 生成聊天记录文本
  generateChatLog() {
    const name = this.assistantName || '童年自我(通用)';
    const date = new Date();
    const dateStr = this.formatDate(date);
    const timeStr = this.formatTime(date);
    
    let chatLog = `=== 控制组 通用 童年自我 聊天记录 ===\n`;
    chatLog += `AI 名字: ${name}\n`;
    chatLog += `导出时间: ${dateStr} ${timeStr}\n`;
    chatLog += `消息总数: ${this.messages.length} 条\n`;
    chatLog += `=================================\n\n`;
    
    if (this.messages.length === 0) {
      chatLog += '本次对话没有消息记录。\n';
    } else {
      this.messages.forEach((msg, index) => {
        const speaker = msg.role === 'user' ? '用户' : name;
        const timestamp = `[${index + 1}]`;
        chatLog += `${timestamp} ${speaker}:\n${msg.content}\n\n`;
      });
    }
    
    chatLog += `=================================\n`;
    chatLog += `记录结束 - 由 Inner Child AI 控制组生成\n`;
    
    return chatLog;
  }

  // 下载文本文件
  downloadTextFile(content, filename) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 释放URL对象
    URL.revokeObjectURL(url);
  }

  // 格式化日期 (YYYY-MM-DD)
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 格式化时间 (HH:MM:SS)
  formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }
}

document.addEventListener('DOMContentLoaded', () => { window.innerChild2Chat = new InnerChild2Chat(); });


