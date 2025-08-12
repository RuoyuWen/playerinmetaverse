class InnerChildChat {
  constructor() {
    console.log('🚀 Initializing InnerChildChat...');
    
    this.messages = [];
    this.apiKey = '';
    
    try {
      this.config = this.loadConfig();
      console.log('✅ Config loaded successfully');
    } catch (e) {
      console.error('❌ Failed to load config:', e);
      this.config = {
        model: 'gpt-4.1',
        systemPromptTemplate: '你是一位名为「{{name}}」的AI，以用户"童年时期的自己"的视角进行交流。',
        apiParams: { max_tokens: 1200, temperature: 0.8, top_p: 0.9 },
        ui: { welcomeMessage: '嗨，我是你的小时候～可以和我聊聊天吗？' }
      };
    }
    
    this.isSetupComplete = false;

    // 检查所有必需的元素
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
      copyPrompt: document.getElementById('ic-copy-prompt'),
      startChat: document.getElementById('ic-start-chat'),
      refreshConfig: document.getElementById('ic-refresh-config')
    };

    // 初始化API提供商
    this.currentProvider = localStorage.getItem('ic_api_provider') || this.config.defaultProvider || 'xuedingmao';
    if (this.elems.apiProvider) {
      this.elems.apiProvider.value = this.currentProvider;
      this.updateApiProviderUI();
    }

    // 检查元素加载状态
    const missingElements = Object.entries(this.elems)
      .filter(([key, elem]) => !elem)
      .map(([key]) => key);
    
    if (missingElements.length > 0) {
      console.warn('⚠️ Missing elements:', missingElements);
    } else {
      console.log('✅ All elements found');
    }

    this.avatarUrl = this.getSelectedAvatar();
    this.assistantName = this.elems.name?.value?.trim() || this.config.ui?.assistantLabelDefault || '童年自我';

    try {
      this.bindEvents();
      this.restoreApiKey();
      this.resetChat();
      this.updateSetupStatus();
      this.updateAvatarSelection();
      console.log('✅ InnerChildChat initialized successfully');
    } catch (e) {
      console.error('❌ Error during initialization:', e);
    }
  }

  loadConfig() {
    // 确保基础配置存在
    if (!window.INNER_CHILD_CONFIG) {
      console.error('❌ INNER_CHILD_CONFIG not found, using fallback');
      return {
        model: 'gpt-4.1',
        systemPromptTemplate: '你是一位名为「{{name}}」的AI，以用户"童年时期的自己"的视角进行交流。',
        apiParams: { max_tokens: 1200, temperature: 0.8, top_p: 0.9 },
        ui: { welcomeMessage: '嗨，我是你的小时候～可以和我聊聊天吗？' }
      };
    }
    
    const base = JSON.parse(JSON.stringify(window.INNER_CHILD_CONFIG));
    console.log('✅ Base config loaded:', base.model);
    
    try {
      // 尝试加载全局配置
      if (window.GLOBAL_AI2_CONFIG) {
        console.log('✅ Loading global config...');
        const g = window.GLOBAL_AI2_CONFIG;
        if (g.model) base.model = g.model;
        base.apiParams = base.apiParams || {};
        if (g.maxTokens) base.apiParams.max_tokens = g.maxTokens;
        if (g.temperature !== undefined) base.apiParams.temperature = g.temperature;
      }
      
      // 尝试加载本地配置
      const local = localStorage.getItem('inner_child_config');
      if (local) {
        console.log('✅ Loading local config...');
        const parsed = JSON.parse(local);
        if (parsed.model) base.model = parsed.model;
        if (parsed.maxTokens) base.apiParams.max_tokens = parsed.maxTokens;
        if (parsed.temperature !== undefined) base.apiParams.temperature = parsed.temperature;
        if (parsed.systemPromptTemplate) base.systemPromptTemplate = parsed.systemPromptTemplate;
      }
    } catch (e) {
      console.warn('⚠️ Config loading error:', e);
    }
    
    console.log('✅ Final config:', base.model, base.apiParams);
    return base;
  }

  refreshConfig() {
    this.config = this.loadConfig();
  }

  // 检查设置是否完成
  updateSetupStatus() {
    const hasApiKey = this.apiKey && this.apiKey.trim() !== '';
    const hasName = this.elems.name?.value?.trim() !== '';
    const hasAvatar = this.avatarUrl && this.avatarUrl !== '';
    const hasPrompt = sessionStorage.getItem('ic_system_prompt') && sessionStorage.getItem('ic_system_prompt').trim() !== '';

    this.isSetupComplete = hasApiKey && hasName && hasAvatar && hasPrompt;
    
    // 更新UI状态
    this.updateUIState();
  }

  // 更新UI状态
  updateUIState() {
    // 获取聊天相关的所有元素
    const chatElements = [
      this.elems.chat,
      this.elems.typing,
      this.elems.input,
      this.elems.send,
      this.elems.endChat
    ];

    if (this.isSetupComplete) {
      // 设置完成，显示聊天界面
      chatElements.forEach(elem => {
        if (elem) elem.style.display = 'block';
      });
      
      if (this.elems.input) {
        this.elems.input.disabled = false;
        this.elems.input.placeholder = '输入你的消息...';
      }
      
      if (this.elems.send) {
        this.elems.send.disabled = false;
      }
    } else {
      // 设置未完成，隐藏聊天界面
      chatElements.forEach(elem => {
        if (elem) elem.style.display = 'none';
      });
    }

    // 更新设置指导显示
    this.updateSetupGuide();
  }

  // 更新设置指导
  updateSetupGuide() {
    const setupGuide = document.getElementById('ic-setup-guide');
    if (!setupGuide) return;

    if (this.isSetupComplete) {
      setupGuide.style.display = 'none';
    } else {
      setupGuide.style.display = 'block';
      
      // 显示当前设置状态
      const status = [];
      if (this.apiKey && this.apiKey.trim() !== '') status.push('✅ API密钥');
      else status.push('❌ API密钥');
      
      if (this.elems.name?.value?.trim() !== '') status.push('✅ AI名字');
      else status.push('❌ AI名字');
      
      if (this.avatarUrl && this.avatarUrl !== '') status.push('✅ 头像选择');
      else status.push('❌ 头像选择');
      
      if (sessionStorage.getItem('ic_system_prompt') && sessionStorage.getItem('ic_system_prompt').trim() !== '') {
        status.push('✅ 人设生成');
      } else {
        status.push('❌ 人设生成');
      }

      setupGuide.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #a0aec0;">
          <i class="fas fa-cog" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i>
          <h3>请先完成设置</h3>
          <div style="margin: 1rem 0; font-size: 0.9rem;">
            ${status.join('<br>')}
          </div>
          <p style="margin-top: 1rem; font-size: 0.85rem; color: #718096;">
            完成所有设置后，点击"用此设定开始聊天"即可开始对话
          </p>
        </div>
      `;
    }
  }

  // 更新头像选择的高亮效果
  updateAvatarSelection() {
    const avatarCards = document.querySelectorAll('.avatar-card');
    avatarCards.forEach(card => {
      card.classList.remove('selected');
      const input = card.querySelector('input[type="radio"]');
      if (input && input.checked) {
        card.classList.add('selected');
      }
    });
  }

  bindEvents() {
    this.elems.send?.addEventListener('click', () => this.onSend());
    this.elems.endChat?.addEventListener('click', () => this.endChatAndDownload());
    this.elems.input?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.onSend();
      }
    });
    this.elems.apiKey?.addEventListener('input', (e) => {
      this.apiKey = e.target.value.trim();
      this.saveApiKey();
      this.updateSetupStatus();
    });
    
    // API提供商切换
    this.elems.apiProvider?.addEventListener('change', (e) => {
      this.currentProvider = e.target.value;
      localStorage.setItem('ic_api_provider', this.currentProvider);
      this.updateApiProviderUI();
      this.restoreApiKey(); // 重新加载对应的API密钥
      this.updateSetupStatus();
    });
    this.elems.name?.addEventListener('input', (e) => {
      // 实时更新AI名字
      this.assistantName = e.target.value.trim() || this.config.ui?.assistantLabelDefault || '童年自我';
      this.updateSetupStatus();
    });
    this.elems.genPrompt?.addEventListener('click', () => this.generatePrompt());
    this.elems.viewPrompt?.addEventListener('click', () => this.togglePromptPreview(true));
    this.elems.copyPrompt?.addEventListener('click', () => this.copyPrompt());
    this.elems.startChat?.addEventListener('click', () => this.usePromptAndFocus());
    this.elems.refreshConfig?.addEventListener('click', () => this.refreshConfig());
    document.getElementById('ic-avatar-grid')?.addEventListener('change', () => {
      this.avatarUrl = this.getSelectedAvatar();
      this.updateSetupStatus();
      this.updateAvatarSelection();
    });
  }

  restoreApiKey() {
    const keyName = `ic_api_key_${this.currentProvider}`;
    const k = localStorage.getItem(keyName);
    if (k) {
      this.apiKey = k;
      if (this.elems.apiKey) this.elems.apiKey.value = k;
    } else {
      this.apiKey = '';
      if (this.elems.apiKey) this.elems.apiKey.value = '';
    }
  }

  saveApiKey() {
    const keyName = `ic_api_key_${this.currentProvider}`;
    localStorage.setItem(keyName, this.apiKey);
  }

  updateApiProviderUI() {
    const providers = this.config.apiProviders || {};
    const provider = providers[this.currentProvider];
    
    if (provider && this.elems.apiKeyLabel && this.elems.apiKey) {
      this.elems.apiKeyLabel.textContent = `${provider.name} 密钥`;
      this.elems.apiKey.placeholder = provider.keyPlaceholder;
    }
  }

  getSelectedAvatar() {
    const sel = document.querySelector('input[name="ic-avatar"]:checked');
    return sel ? sel.value : '../images/image1.png';
  }

  resetChat() {
    this.messages = [];
    if (this.elems.chat) this.elems.chat.innerHTML = '';
  }

  addMessage(text, who = 'ai') {
    // 如果设置未完成，不允许添加消息
    if (!this.isSetupComplete && who === 'user') {
      return;
    }

    const row = document.createElement('div');
    row.className = `message ${who === 'user' ? 'user' : 'ai'}`;

    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    const img = document.createElement('img');
    
    // 使用默认用户头像，而不是个人照片
    if (who === 'user') {
      img.src = '../images/default_user_avatar.png'; // 默认用户头像
      img.onerror = () => {
        // 如果默认头像不存在，使用一个简单的占位符
        img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM2NjY2NjYiLz4KPHN2ZyB4PSIxMCIgeT0iMTIiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDIwIDIwIiBmaWxsPSJub25lIj4KPHBhdGggZD0iTTEwIDEyQzEyLjIwOTEgMTIgMTQgMTAuMjA5MSAxNCA4QzE0IDUuNzkwODYgMTIuMjA5MSA0IDEwIDRDNy43OTA4NiA0IDYgNS43OTA4NiA2IDhDNiAxMC4yMDkxIDcuNzkwODYgMTIgMTAgMTJaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTAgMTZDMTIuMjA5MSAxNiAxNCAxNC4yMDkxIDE0IDEyQzE0IDkuNzkwODYgMTIuMjA5MSA4IDEwIDhDNy43OTA4NiA4IDYgOS43OTA4NiA2IDEyQzYgMTQuMjA5MSA3Ljc5MDg2IDE2IDEwIDE2WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cjwvc3ZnPgo=';
      };
    } else {
      img.src = this.avatarUrl;
    }
    
    img.alt = who;
    avatar.appendChild(img);

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    
    // 动态显示玩家设定的名字或默认标签
    const label = who === 'user' ? 
      (this.config.ui?.userLabel || '玩家') : 
      (this.assistantName || this.config.ui?.assistantLabelDefault || '童年自我');
    
    bubble.innerHTML = `<strong>${this.escape(label)}:</strong> ${this.format(text)}`;

    row.appendChild(avatar);
    row.appendChild(bubble);
    this.elems.chat.appendChild(row);
    this.scrollToBottom();
  }

  showTyping(show) {
    if (!this.elems.typing) return;
    this.elems.typing.style.display = show ? 'block' : 'none';
  }

  scrollToBottom() {
    setTimeout(() => {
      this.elems.chat.scrollTop = this.elems.chat.scrollHeight;
    }, 50);
  }

  escape(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
  format(t) {
    return this.escape(t)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  async onSend() {
    // 检查设置是否完成
    if (!this.isSetupComplete) {
      alert('请先完成所有设置：API密钥、AI名字、头像选择、生成人设');
      return;
    }

    const text = (this.elems.input?.value || '').trim();
    if (!text) return;
    if (!this.ensureApiKey()) return;

    this.addMessage(text, 'user');
    this.elems.input.value = '';

    try {
      this.showTyping(true);
      const sys = this.buildSystemPrompt();
      const reply = await this.callOpenAI(sys, text);
      this.addMessage(reply, 'ai');
    } catch (e) {
      this.addMessage('抱歉，暂时无法回复，请稍后重试。', 'ai');
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      this.showTyping(false);
    }
  }

  ensureApiKey() {
    if (!this.apiKey) {
      alert('请先输入 OpenAI API 密钥');
      return false;
    }
    return true;
  }

  getUploadText() {
    return new Promise((resolve) => {
      const f = this.elems.file?.files?.[0];
      const pasted = (this.elems.rawText?.value || '').trim();
      if (pasted) return resolve(pasted);
      if (!f) return resolve('');
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => resolve('');
      reader.readAsText(f, 'utf-8');
    });
  }

  async generatePrompt() {
    if (!this.ensureApiKey()) return;
    const name = (this.elems.name?.value || '').trim() || '童年自我';
    const baseTemplate = this.config.systemPromptTemplate || '';
    const raw = await this.getUploadText();
    const profileNote = raw ? raw.slice(0, 8000) : '（用户未提供详细资料，仅以温柔、天真、好奇的童年口吻对话）';

    const instruction = `从以下"童年资料文本"中提炼一个不超过300字的"资料要点"，
并仅用JSON返回：{"profile":"..."}。资料文本：\n\n${profileNote}`;

    try {
      this.showTyping(true);
      const jsonStr = await this.rawOpenAI([{ role: 'user', content: instruction }], { response_format: { type: 'json_object' } });
      let profile = '';
      try { profile = JSON.parse(jsonStr).profile || ''; } catch { profile = ''; }

      const prompt = baseTemplate
        .replaceAll('{{name}}', name)
        .replaceAll('{{profile}}', profile || profileNote);

      this.elems.promptText.textContent = prompt;
      this.togglePromptPreview(true);
    } catch (e) {
      alert('生成失败，请稍后重试');
    } finally {
      this.showTyping(false);
    }
  }

  togglePromptPreview(show) {
    if (this.elems.previewCard) this.elems.previewCard.style.display = show ? 'block' : 'none';
  }

  copyPrompt() {
    const txt = this.elems.promptText?.textContent || '';
    if (!txt) return;
    navigator.clipboard.writeText(txt);
  }

  usePromptAndFocus() {
    // Store prompt in session for this page usage
    sessionStorage.setItem('ic_system_prompt', this.elems.promptText?.textContent || '');
    this.togglePromptPreview(false);
    
    // 更新设置状态
    this.updateSetupStatus();
    
    // 如果设置完成，显示欢迎消息
    if (this.isSetupComplete) {
      this.resetChat();
      if (this.config.ui?.welcomeMessage) {
        this.addMessage(this.config.ui.welcomeMessage, 'ai');
      }
    }
    
    this.elems.input?.focus();
  }

  buildSystemPrompt() {
    const name = (this.elems.name?.value || '').trim() || '童年自我';
    const stored = sessionStorage.getItem('ic_system_prompt');
    if (stored && stored.trim()) return stored;
    const fallbackProfile = '（用户未提供详细资料，仅以温柔、天真、好奇的童年口吻对话）';
    return (this.config.systemPromptTemplate || '')
      .replaceAll('{{name}}', name)
      .replaceAll('{{profile}}', fallbackProfile);
  }

  async callOpenAI(systemPrompt, userText) {
    const msgs = [
      { role: 'system', content: systemPrompt },
      ...this.messages,
      { role: 'user', content: userText }
    ];
    const text = await this.rawOpenAI(msgs);
    // maintain brief history
    this.messages.push({ role: 'user', content: userText });
    this.messages.push({ role: 'assistant', content: text });
    if (this.messages.length > 24) this.messages = this.messages.slice(-24);
    return text;
  }

  async rawOpenAI(messages, extra = {}) {
    // 获取当前API提供商配置
    const providers = this.config.apiProviders || {};
    const provider = providers[this.currentProvider];
    
    if (!provider) {
      throw new Error(`未找到API提供商配置: ${this.currentProvider}`);
    }

    // 基础请求体
    let body = {
      model: provider.model || this.config.model || 'gpt-4.1',
      messages,
      temperature: this.config.apiParams?.temperature ?? 0.8,
      top_p: this.config.apiParams?.top_p ?? 0.9,
      stream: false,
      ...extra
    };

    // 根据不同API提供商调整请求参数
    if (this.currentProvider === 'xuedingmao') {
      body.max_tokens = this.config.apiParams?.max_tokens ?? 1200;
      body.frequency_penalty = this.config.apiParams?.frequency_penalty ?? 0.0;
      body.presence_penalty = this.config.apiParams?.presence_penalty ?? 0.0;
    } else if (this.currentProvider === 'groq') {
      // Groq的特殊参数
      body.max_completion_tokens = this.config.apiParams?.max_tokens ?? 1200;
      body.reasoning_effort = "medium";
      body.stop = null;
    }

    console.log(`🔗 使用 ${provider.name} API: ${provider.endpoint}`);
    
    try {
      const res = await fetch(provider.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(`API Error: ${errorData.error?.message || res.statusText}`);
      }

      const data = await res.json();
      console.log(`✅ ${provider.name} API 调用成功!`);
      return data.choices?.[0]?.message?.content || '';
      
    } catch (error) {
      console.error(`❌ ${provider.name} API 调用失败:`, error.message);
      
      // 检查是否是网络连接问题
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_NAME_NOT_RESOLVED')) {
        throw new Error(`网络连接失败：无法连接到${provider.name}服务器。请检查网络连接或稍后重试。`);
      }
      
      // 检查是否是API密钥问题
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        throw new Error(`API密钥无效：请检查您的${provider.name} API密钥是否正确。`);
      }
      
      throw error;
    }
  }

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
      this.downloadTextFile(chatLog, `童年自我聊天记录_${this.formatDate(new Date())}.txt`);
      
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
    const name = this.assistantName || '童年自我';
    const date = new Date();
    const dateStr = this.formatDate(date);
    const timeStr = this.formatTime(date);
    
    let chatLog = `=== 童年自我 AI 聊天记录 ===\n`;
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
    chatLog += `记录结束 - 由 Inner Child AI 生成\n`;
    
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

document.addEventListener('DOMContentLoaded', () => {
  window.innerChildChat = new InnerChildChat();
});
