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
      refreshConfig: document.getElementById('ic-refresh-config'),
      // 新增信件相关元素
      letterDisplay: document.getElementById('ic-letter-display'),
      letterContent: document.getElementById('ic-letter-content'),
      letterTyping: document.getElementById('ic-letter-typing'),
      copyLetter: document.getElementById('ic-copy-letter'),
      // 自定义头像相关元素
      customAvatarFile: document.getElementById('ic-custom-avatar-file'),
      customAvatarCard: document.getElementById('ic-custom-avatar-card'),
      customAvatarPreview: document.getElementById('ic-custom-avatar-preview'),
      uploadAvatarBtn: document.getElementById('ic-upload-avatar-btn')
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
    this.customAvatarDataUrl = localStorage.getItem('ic_custom_avatar') || '';

    try {
      this.bindEvents();
      this.restoreApiKey();
      this.resetChat();
      this.updateSetupStatus();
      this.updateAvatarSelection();
      this.loadCustomAvatar();
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
    const hasLetter = sessionStorage.getItem('ic_letter_content') && sessionStorage.getItem('ic_letter_content').trim() !== '';

    this.isSetupComplete = hasApiKey && hasName && hasAvatar && hasPrompt && hasLetter;
    
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
      
      if (sessionStorage.getItem('ic_letter_content') && sessionStorage.getItem('ic_letter_content').trim() !== '') {
        status.push('✅ 信件生成');
      } else {
        status.push('❌ 信件生成');
      }

      setupGuide.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #a0aec0;">
          <i class="fas fa-cog" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i>
          <h3>请先完成设置</h3>
          <div style="margin: 1rem 0; font-size: 0.9rem;">
            ${status.join('<br>')}
          </div>
          <p style="margin-top: 1rem; font-size: 0.85rem; color: #718096;">
            完成所有设置后，点击"开始对话"即可开始聊天
          </p>
        </div>
      `;
    }
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
    this.elems.copyLetter?.addEventListener('click', () => this.copyLetter());
    this.elems.startChat?.addEventListener('click', () => this.usePromptAndFocus());
    this.elems.refreshConfig?.addEventListener('click', () => this.refreshConfig());
    
    // 头像相关事件
    document.getElementById('ic-avatar-grid')?.addEventListener('change', () => {
      this.avatarUrl = this.getSelectedAvatar();
      this.updateSetupStatus();
      this.updateAvatarSelection();
    });
    
    // 自定义头像上传事件
    this.elems.uploadAvatarBtn?.addEventListener('click', () => {
      this.elems.customAvatarFile?.click();
    });
    
    this.elems.customAvatarFile?.addEventListener('change', (e) => {
      this.handleCustomAvatarUpload(e);
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
    if (sel && sel.value === 'custom') {
      return this.customAvatarDataUrl || '../images/image1.png';
    }
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

    // 第一步：提取基础资料要点
    const profileInstruction = `从以下"童年资料文本"中提炼一个不超过300字的"资料要点"，
并仅用JSON返回：{"profile":"..."}。资料文本：\n\n${profileNote}`;

    // 第二步：专门提取说话风格和语气特征
    const styleInstruction = `请仔细分析以下文本中"过去的自己会对现在的自己说什么"这类内容，提取说话风格特征：

分析要点：
1. 用词习惯（喜欢用什么词汇、口头禅）
2. 句式特点（短句/长句、问句/感叹句的使用）
3. 情感表达方式（如何表达关心、鼓励、担心）
4. 语气特色（活泼/温柔/直接/含蓄等）
5. 表达习惯（是否用表情符号、重复某些词汇等）

请用JSON格式返回：{"speaking_style":"详细的说话风格描述，包含具体的用词、句式、语气特征"}

资料文本：\n\n${profileNote}`;

    try {
      this.showTyping(true);
      
      // 并行提取资料要点和说话风格
      const [profileJsonStr, styleJsonStr] = await Promise.all([
        this.rawOpenAI([{ role: 'user', content: profileInstruction }], { response_format: { type: 'json_object' } }),
        this.rawOpenAI([{ role: 'user', content: styleInstruction }], { response_format: { type: 'json_object' } })
      ]);

      let profile = '';
      let speakingStyle = '';
      
      try { profile = JSON.parse(profileJsonStr).profile || ''; } catch { profile = ''; }
      try { speakingStyle = JSON.parse(styleJsonStr).speaking_style || ''; } catch { speakingStyle = ''; }

      // 将说话风格信息整合到资料中
      const enhancedProfile = profile + (speakingStyle ? `\n\n【说话风格特征】：${speakingStyle}` : '');

      const prompt = baseTemplate
        .replaceAll('{{name}}', name)
        .replaceAll('{{profile}}', enhancedProfile || profileNote);

      this.elems.promptText.textContent = prompt;
      
      // 存储系统提示词和说话风格
      sessionStorage.setItem('ic_system_prompt', prompt);
      sessionStorage.setItem('ic_speaking_style', speakingStyle);
      
      // 生成信件时传递说话风格信息
      await this.generateLetter(enhancedProfile || profileNote, speakingStyle);
      
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

  // 生成童年自我给用户的信件
  async generateLetter(profile, speakingStyle = '') {
    const name = (this.elems.name?.value || '').trim() || '童年自我';
    
    // 构建包含说话风格的系统提示词
    let styleGuidance = '';
    if (speakingStyle) {
      styleGuidance = `\n\n【重要】请严格按照以下说话风格特征来写信：
${speakingStyle}

请在信件中体现这些特征：
- 使用相同的用词习惯和口头禅
- 保持相同的句式特点和语气
- 采用相同的情感表达方式
- 如果原文有特殊的表达习惯（如表情符号、重复词汇），请在信件中体现`;
    }
    
    // 专门用于生成信件的系统提示词
    const letterSystemPrompt = `你是用户童年时期的自己，现在要给长大后的自己（用户）写一封信。

基于以下童年资料，以第一人称的童年视角写一封温暖、真诚的信：
${profile}${styleGuidance}

信件要求：
- 以童年的口吻和视角，充满天真和好奇
- 表达对未来的憧憬和梦想
- 询问现在的自己过得好不好，梦想实现了吗
- 分享一些童年的美好回忆或想法
- 语气温暖、充满爱意，但保持童年的纯真
- 字数控制在200-400字之间
- 不要使用过于成熟的词汇或概念
- 如果有提供说话风格特征，请严格按照这些特征来写信

请直接输出信件内容，不要添加格式标记或说明。`;

    const letterInstruction = speakingStyle ? 
      `请以童年自我的身份，严格按照提供的说话风格特征，给现在的自己写一封信。记住要模仿我在资料中"过去的自己会说什么"的语气和表达方式。` :
      `请以童年自我的身份，给现在的自己写一封信。`;

    try {
      this.showLetterTyping(true);
      const letterContent = await this.rawOpenAI([
        { role: 'system', content: letterSystemPrompt },
        { role: 'user', content: letterInstruction }
      ]);
      
      // 存储信件内容
      sessionStorage.setItem('ic_letter_content', letterContent);
      
      // 显示信件
      this.showLetter(letterContent);
      
    } catch (e) {
      console.error('生成信件失败:', e);
      alert('生成信件失败，请稍后重试');
    } finally {
      this.showLetterTyping(false);
    }
  }

  // 显示信件内容
  showLetter(content) {
    if (this.elems.letterContent) {
      this.elems.letterContent.textContent = content;
    }
    if (this.elems.letterDisplay) {
      this.elems.letterDisplay.style.display = 'block';
    }
    this.updateSetupStatus();
  }

  // 显示/隐藏信件生成中的提示
  showLetterTyping(show) {
    if (this.elems.letterTyping) {
      this.elems.letterTyping.style.display = show ? 'block' : 'none';
    }
  }

  // 复制信件内容
  copyLetter() {
    const txt = this.elems.letterContent?.textContent || '';
    if (!txt) return;
    navigator.clipboard.writeText(txt);
    // 可以添加复制成功的提示
    const btn = this.elems.copyLetter;
    if (btn) {
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-check"></i> 已复制';
      setTimeout(() => {
        btn.innerHTML = originalText;
      }, 2000);
    }
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
    const letterContent = sessionStorage.getItem('ic_letter_content');
    const speakingStyle = sessionStorage.getItem('ic_speaking_style');
    
    let systemPrompt = '';
    if (stored && stored.trim()) {
      systemPrompt = stored;
    } else {
      const fallbackProfile = '（用户未提供详细资料，仅以温柔、天真、好奇的童年口吻对话）';
      systemPrompt = (this.config.systemPromptTemplate || '')
        .replaceAll('{{name}}', name)
        .replaceAll('{{profile}}', fallbackProfile);
    }
    
    // 如果有说话风格信息，强化风格指导
    if (speakingStyle && speakingStyle.trim()) {
      systemPrompt += `\n\n【说话风格要求】：在整个对话中，你必须严格按照以下说话风格特征来回应：
${speakingStyle}

重要提醒：
- 每一条回复都要体现这些说话风格特征
- 使用相同的用词习惯、句式和语气
- 保持一致的情感表达方式
- 模仿用户在资料中"过去的自己会说什么"的具体表达方式
- 这是你作为用户童年自我的核心特征，不可改变`;
    }
    
    // 如果有信件内容，添加到系统提示词中
    if (letterContent && letterContent.trim()) {
      systemPrompt += `\n\n【信件回忆】：你作为用户的小时候已经给用户（长大后的你）写了一封信，信的内容是：
"${letterContent}"

在对话中：
- 你应该记住这封信的内容和写信时的心情
- 你们的聊天可能会围绕这封信展开
- 用户可能会回应信中的内容，或询问相关问题
- 保持与信件中相同的说话风格和情感表达`;
    }
    
    return systemPrompt;
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
    } else if (this.currentProvider === 'deepseek') {
      // DeepSeek API使用与OpenAI兼容的格式
      body.max_tokens = this.config.apiParams?.max_tokens ?? 1200;
      body.frequency_penalty = this.config.apiParams?.frequency_penalty ?? 0.0;
      body.presence_penalty = this.config.apiParams?.presence_penalty ?? 0.0;
    } else if (this.currentProvider === 'kimi') {
      // Kimi (Moonshot) API使用与OpenAI兼容的格式
      body.max_tokens = this.config.apiParams?.max_tokens ?? 1200;
      body.frequency_penalty = this.config.apiParams?.frequency_penalty ?? 0.0;
      body.presence_penalty = this.config.apiParams?.presence_penalty ?? 0.0;
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

  // 处理自定义头像上传
  handleCustomAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      alert('请选择有效的图片文件（JPG、PNG、GIF 等）');
      return;
    }

    // 验证文件大小（限制为 5MB）
    if (file.size > 5 * 1024 * 1024) {
      alert('图片文件过大，请选择小于 5MB 的图片');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      
      // 保存到本地存储
      this.customAvatarDataUrl = dataUrl;
      localStorage.setItem('ic_custom_avatar', dataUrl);
      
      // 显示自定义头像选项
      this.showCustomAvatar(dataUrl);
      
      // 自动选择自定义头像
      this.selectCustomAvatar();
    };
    
    reader.onerror = () => {
      alert('读取图片文件失败，请重试');
    };
    
    reader.readAsDataURL(file);
  }

  // 显示自定义头像
  showCustomAvatar(dataUrl) {
    if (this.elems.customAvatarPreview && this.elems.customAvatarCard) {
      this.elems.customAvatarPreview.src = dataUrl;
      this.elems.customAvatarCard.style.display = 'block';
    }
  }

  // 选择自定义头像
  selectCustomAvatar() {
    const customRadio = document.querySelector('input[name="ic-avatar"][value="custom"]');
    if (customRadio) {
      customRadio.checked = true;
      this.avatarUrl = this.getSelectedAvatar();
      this.updateSetupStatus();
      this.updateAvatarSelection();
    }
  }

  // 加载已保存的自定义头像
  loadCustomAvatar() {
    if (this.customAvatarDataUrl) {
      this.showCustomAvatar(this.customAvatarDataUrl);
      
      // 检查是否之前选择的是自定义头像
      const selectedAvatar = localStorage.getItem('ic_selected_avatar');
      if (selectedAvatar === 'custom') {
        this.selectCustomAvatar();
      }
    }
  }

  // 更新头像选择的高亮效果（重写以支持自定义头像）
  updateAvatarSelection() {
    const avatarCards = document.querySelectorAll('.avatar-card');
    avatarCards.forEach(card => {
      card.classList.remove('selected');
      const input = card.querySelector('input[type="radio"]');
      if (input && input.checked) {
        card.classList.add('selected');
        // 保存选择的头像类型
        localStorage.setItem('ic_selected_avatar', input.value);
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.innerChildChat = new InnerChildChat();
});
