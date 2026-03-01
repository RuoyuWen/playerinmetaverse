class InnerChildChatEN {
  constructor() {
    console.log('🚀 Initializing InnerChildChat (English)...');
    
    this.messages = [];
    this.apiKey = '';
    
    try {
      this.config = this.loadConfig();
      console.log('✅ Config loaded successfully');
    } catch (e) {
      console.error('❌ Failed to load config:', e);
      this.config = {
        model: 'gpt-4.1',
        systemPromptTemplate: 'You are an AI named "{{name}}", communicating from the perspective of the user\'s "childhood self".',
        apiParams: { max_tokens: 1200, temperature: 0.8, top_p: 0.9 },
        ui: { welcomeMessage: 'Hi, I\'m your younger self~ Can we have a chat?' }
      };
    }
    
    this.isSetupComplete = false;

    // Check all required elements
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
      // Letter-related elements
      letterDisplay: document.getElementById('ic-letter-display'),
      letterContent: document.getElementById('ic-letter-content'),
      letterTyping: document.getElementById('ic-letter-typing'),
      copyLetter: document.getElementById('ic-copy-letter'),
      // Custom avatar elements
      customAvatarFile: document.getElementById('ic-custom-avatar-file'),
      customAvatarCard: document.getElementById('ic-custom-avatar-card'),
      customAvatarPreview: document.getElementById('ic-custom-avatar-preview'),
      uploadAvatarBtn: document.getElementById('ic-upload-avatar-btn')
    };

    // Initialize API provider
    this.currentProvider = localStorage.getItem('ic_api_provider_en') || this.config.defaultProvider || 'xuedingmao';
    if (this.elems.apiProvider) {
      this.elems.apiProvider.value = this.currentProvider;
      this.updateApiProviderUI();
    }

    // Check element loading status
    const missingElements = Object.entries(this.elems)
      .filter(([key, elem]) => !elem)
      .map(([key]) => key);
    
    if (missingElements.length > 0) {
      console.warn('⚠️ Missing elements:', missingElements);
    } else {
      console.log('✅ All elements found');
    }

    this.avatarUrl = this.getSelectedAvatar();
    this.assistantName = this.elems.name?.value?.trim() || this.config.ui?.assistantLabelDefault || 'Inner Child';
    this.customAvatarDataUrl = localStorage.getItem('ic_custom_avatar_en') || '';

    try {
      this.bindEvents();
      this.restoreApiKey();
      this.resetChat();
      this.updateSetupStatus();
      this.updateAvatarSelection();
      this.loadCustomAvatar();
      console.log('✅ InnerChildChat (EN) initialized successfully');
    } catch (e) {
      console.error('❌ Error during initialization:', e);
    }
  }

  loadConfig() {
    // Ensure basic configuration exists
    if (!window.INNER_CHILD_CONFIG) {
      console.error('❌ INNER_CHILD_CONFIG not found, using fallback');
      return {
        model: 'gpt-4.1',
        systemPromptTemplate: 'You are an AI named "{{name}}", communicating from the perspective of the user\'s "childhood self".',
        apiParams: { max_tokens: 1200, temperature: 0.8, top_p: 0.9 },
        ui: { welcomeMessage: 'Hi, I\'m your younger self~ Can we have a chat?' }
      };
    }
    
    const base = JSON.parse(JSON.stringify(window.INNER_CHILD_CONFIG));
    console.log('✅ Base config loaded:', base.model);
    
    try {
      // Try loading global configuration
      if (window.GLOBAL_AI2_CONFIG) {
        console.log('✅ Loading global config...');
        const g = window.GLOBAL_AI2_CONFIG;
        if (g.model) base.model = g.model;
        base.apiParams = base.apiParams || {};
        if (g.maxTokens) base.apiParams.max_tokens = g.maxTokens;
        if (g.temperature !== undefined) base.apiParams.temperature = g.temperature;
      }
      
      // Try loading local configuration
      const local = localStorage.getItem('inner_child_config_en');
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

  // Check if setup is complete
  updateSetupStatus() {
    const hasApiKey = this.apiKey && this.apiKey.trim() !== '';
    const hasName = this.elems.name?.value?.trim() !== '';
    const hasAvatar = this.avatarUrl && this.avatarUrl !== '';
    const hasPrompt = sessionStorage.getItem('ic_system_prompt_en') && sessionStorage.getItem('ic_system_prompt_en').trim() !== '';
    const hasLetter = sessionStorage.getItem('ic_letter_content_en') && sessionStorage.getItem('ic_letter_content_en').trim() !== '';

    this.isSetupComplete = hasApiKey && hasName && hasAvatar && hasPrompt && hasLetter;
    
    // Update UI state
    this.updateUIState();
  }

  // Update UI state
  updateUIState() {
    // Get all chat-related elements
    const chatElements = [
      this.elems.chat,
      this.elems.typing,
      this.elems.input,
      this.elems.send,
      this.elems.endChat
    ];

    if (this.isSetupComplete) {
      // Setup complete, show chat interface
      chatElements.forEach(elem => {
        if (elem) elem.style.display = 'block';
      });
      
      if (this.elems.input) {
        this.elems.input.disabled = false;
        this.elems.input.placeholder = 'Type your message...';
      }
      
      if (this.elems.send) {
        this.elems.send.disabled = false;
      }
    } else {
      // Setup incomplete, hide chat interface
      chatElements.forEach(elem => {
        if (elem) elem.style.display = 'none';
      });
    }

    // Update setup guide display
    this.updateSetupGuide();
  }

  // Update setup guide
  updateSetupGuide() {
    const setupGuide = document.getElementById('ic-setup-guide');
    if (!setupGuide) return;

    if (this.isSetupComplete) {
      setupGuide.style.display = 'none';
    } else {
      setupGuide.style.display = 'block';
      
      // Show current setup status
      const status = [];
      if (this.apiKey && this.apiKey.trim() !== '') status.push('✅ API Key');
      else status.push('❌ API Key');
      
      if (this.elems.name?.value?.trim() !== '') status.push('✅ AI Name');
      else status.push('❌ AI Name');
      
      if (this.avatarUrl && this.avatarUrl !== '') status.push('✅ Avatar Selection');
      else status.push('❌ Avatar Selection');
      
      if (sessionStorage.getItem('ic_system_prompt_en') && sessionStorage.getItem('ic_system_prompt_en').trim() !== '') {
        status.push('✅ Personality Generated');
      } else {
        status.push('❌ Personality Generation');
      }
      
      if (sessionStorage.getItem('ic_letter_content_en') && sessionStorage.getItem('ic_letter_content_en').trim() !== '') {
        status.push('✅ Letter Generated');
      } else {
        status.push('❌ Letter Generation');
      }

      setupGuide.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #a0aec0;">
          <i class="fas fa-cog" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i>
          <h3>Please Complete Setup First</h3>
          <div style="margin: 1rem 0; font-size: 0.9rem;">
            ${status.join('<br>')}
          </div>
          <p style="margin-top: 1rem; font-size: 0.85rem; color: #718096;">
            After completing all setup, click "Start Chat" to begin chatting
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
    
    // API provider switching
    this.elems.apiProvider?.addEventListener('change', (e) => {
      this.currentProvider = e.target.value;
      localStorage.setItem('ic_api_provider_en', this.currentProvider);
      this.updateApiProviderUI();
      this.restoreApiKey(); // Reload corresponding API key
      this.updateSetupStatus();
    });
    this.elems.name?.addEventListener('input', (e) => {
      // Real-time update AI name
      this.assistantName = e.target.value.trim() || this.config.ui?.assistantLabelDefault || 'Inner Child';
      this.updateSetupStatus();
    });
    this.elems.genPrompt?.addEventListener('click', () => this.generatePrompt());
    this.elems.viewPrompt?.addEventListener('click', () => this.togglePromptPreview(true));
    this.elems.copyPrompt?.addEventListener('click', () => this.copyPrompt());
    this.elems.copyLetter?.addEventListener('click', () => this.copyLetter());
    this.elems.startChat?.addEventListener('click', () => this.usePromptAndFocus());
    this.elems.refreshConfig?.addEventListener('click', () => this.refreshConfig());
    
    // Avatar-related events
    document.getElementById('ic-avatar-grid')?.addEventListener('change', () => {
      this.avatarUrl = this.getSelectedAvatar();
      this.updateSetupStatus();
      this.updateAvatarSelection();
    });
    
    // Custom avatar upload events
    this.elems.uploadAvatarBtn?.addEventListener('click', () => {
      this.elems.customAvatarFile?.click();
    });
    
    this.elems.customAvatarFile?.addEventListener('change', (e) => {
      this.handleCustomAvatarUpload(e);
    });
  }

  restoreApiKey() {
    const keyName = `ic_api_key_en_${this.currentProvider}`;
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
    const keyName = `ic_api_key_en_${this.currentProvider}`;
    localStorage.setItem(keyName, this.apiKey);
  }

  updateApiProviderUI() {
    const providers = this.config.apiProviders || {};
    const provider = providers[this.currentProvider];
    
    if (provider && this.elems.apiKeyLabel && this.elems.apiKey) {
      this.elems.apiKeyLabel.textContent = `${provider.name} Key`;
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
    // Don't allow adding messages if setup is incomplete
    if (!this.isSetupComplete && who === 'user') {
      return;
    }

    const row = document.createElement('div');
    row.className = `message ${who === 'user' ? 'user' : 'ai'}`;

    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    const img = document.createElement('img');
    
    // Use default user avatar instead of personal photo
    if (who === 'user') {
      img.src = '../images/default_user_avatar.png'; // Default user avatar
      img.onerror = () => {
        // If default avatar doesn't exist, use a simple placeholder
        img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM2NjY2NjYiLz4KPHN2ZyB4PSIxMCIgeT0iMTIiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDIwIDIwIiBmaWxsPSJub25lIj4KPHBhdGggZD0iTTEwIDEyQzEyLjIwOTEgMTIgMTQgMTAuMjA5MSAxNCA4QzE0IDUuNzkwODYgMTIuMjA5MSA0IDEwIDRDNy43OTA4NiA0IDYgNS43OTA4NiA2IDhDNiAxMC4yMDkxIDcuNzkwODYgMTIgMTAgMTJaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTAgMTZDMTIuMjA5MSAxNiAxNCAxNC4yMDkxIDE0IDEyQzE0IDkuNzkwODYgMTIuMjA5MSA4IDEwIDhDNy43OTA4NiA4IDYgOS43OTA4NiA2IDEyQzYgMTQuMjA5MSA3Ljc5MDg2IDE2IDEwIDE2WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cjwvc3ZnPgo=';
      };
    } else {
      img.src = this.avatarUrl;
    }
    
    img.alt = who;
    avatar.appendChild(img);

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    
    // Dynamically display player-set name or default label
    const label = who === 'user' ? 
      (this.config.ui?.userLabel || 'You') : 
      (this.assistantName || this.config.ui?.assistantLabelDefault || 'Inner Child');
    
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
    // Check if setup is complete
    if (!this.isSetupComplete) {
      alert('Please complete all setup first: API key, AI name, avatar selection, and personality generation');
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
      this.addMessage('Sorry, I can\'t reply right now. Please try again later.', 'ai');
      console.error(e);
    } finally {
      this.showTyping(false);
    }
  }

  ensureApiKey() {
    if (!this.apiKey) {
      alert('Please enter your OpenAI API key first');
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
    const name = (this.elems.name?.value || '').trim() || 'Inner Child';
    const baseTemplate = this.config.systemPromptTemplate || '';
    const raw = await this.getUploadText();
    const profileNote = raw ? raw.slice(0, 8000) : '(User has not provided detailed information, only speak with gentle, innocent, and curious childhood tone)';

    // Step 1: Extract basic profile information
    const profileInstruction = `Extract a profile summary of no more than 300 words from the following "childhood materials text", 
and return only in JSON format: {"profile":"..."}. Materials text:\n\n${profileNote}`;

    // Step 2: Specifically extract speaking style and tone characteristics
    const styleInstruction = `Please carefully analyze the following text for content like "what the past self would say to the present self", and extract speaking style characteristics:

Analysis points:
1. Word usage habits (preferred vocabulary, catchphrases)
2. Sentence patterns (short/long sentences, question/exclamation usage)
3. Emotional expression methods (how to express care, encouragement, worry)
4. Tone characteristics (lively/gentle/direct/subtle, etc.)
5. Expression habits (use of emojis, repeated words, etc.)

Please return in JSON format: {"speaking_style":"detailed speaking style description, including specific vocabulary, sentence patterns, tone characteristics"}

Materials text:\n\n${profileNote}`;

    try {
      this.showTyping(true);
      
      // Extract profile information and speaking style in parallel
      const [profileJsonStr, styleJsonStr] = await Promise.all([
        this.rawOpenAI([{ role: 'user', content: profileInstruction }], { response_format: { type: 'json_object' } }),
        this.rawOpenAI([{ role: 'user', content: styleInstruction }], { response_format: { type: 'json_object' } })
      ]);

      let profile = '';
      let speakingStyle = '';
      
      try { profile = JSON.parse(profileJsonStr).profile || ''; } catch { profile = ''; }
      try { speakingStyle = JSON.parse(styleJsonStr).speaking_style || ''; } catch { speakingStyle = ''; }

      // Integrate speaking style information into profile
      const enhancedProfile = profile + (speakingStyle ? `\n\n【Speaking Style Characteristics】: ${speakingStyle}` : '');

      const prompt = baseTemplate
        .replaceAll('{{name}}', name)
        .replaceAll('{{profile}}', enhancedProfile || profileNote);

      this.elems.promptText.textContent = prompt;
      
      // Store system prompt and speaking style
      sessionStorage.setItem('ic_system_prompt_en', prompt);
      sessionStorage.setItem('ic_speaking_style_en', speakingStyle);
      
      // Generate letter with speaking style information
      await this.generateLetter(enhancedProfile || profileNote, speakingStyle);
      
    } catch (e) {
      alert('Generation failed, please try again later');
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

  // Generate letter from inner child to user
  async generateLetter(profile, speakingStyle = '') {
    const name = (this.elems.name?.value || '').trim() || 'Inner Child';
    
    // Build system prompt including speaking style
    let styleGuidance = '';
    if (speakingStyle) {
      styleGuidance = `\n\n【Important】Please write the letter strictly according to the following speaking style characteristics:
${speakingStyle}

Please reflect these characteristics in the letter:
- Use the same word habits and catchphrases
- Maintain the same sentence patterns and tone
- Adopt the same emotional expression methods
- If the original text has special expression habits (like emojis, repeated words), please reflect them in the letter`;
    }
    
    // System prompt specifically for generating letters
    const letterSystemPrompt = `You are the user's childhood self, now writing a letter to your grown-up self (the user).

Based on the following childhood information, write a warm and sincere letter from a first-person childhood perspective:
${profile}${styleGuidance}

Letter requirements:
- Use a childhood tone and perspective, full of innocence and curiosity
- Express hopes and dreams for the future
- Ask how your present self is doing, if dreams have come true
- Share some beautiful childhood memories or thoughts
- Tone should be warm and loving, but maintain childhood innocence
- Keep it between 200-400 words
- Don't use overly mature vocabulary or concepts
- If speaking style characteristics are provided, strictly follow these characteristics when writing the letter

Please output the letter content directly, without adding format markers or explanations.`;

    const letterInstruction = speakingStyle ? 
      `Please write a letter to your present self as your childhood self, strictly following the provided speaking style characteristics. Remember to imitate the tone and expression style from "what your past self would say" in the materials.` :
      `Please write a letter to your present self as your childhood self.`;

    try {
      this.showLetterTyping(true);
      const letterContent = await this.rawOpenAI([
        { role: 'system', content: letterSystemPrompt },
        { role: 'user', content: letterInstruction }
      ]);
      
      // Store letter content
      sessionStorage.setItem('ic_letter_content_en', letterContent);
      
      // Show letter
      this.showLetter(letterContent);
      
    } catch (e) {
      console.error('Letter generation failed:', e);
      alert('Letter generation failed, please try again later');
    } finally {
      this.showLetterTyping(false);
    }
  }

  // Show letter content
  showLetter(content) {
    if (this.elems.letterContent) {
      this.elems.letterContent.textContent = content;
    }
    if (this.elems.letterDisplay) {
      this.elems.letterDisplay.style.display = 'block';
    }
    this.updateSetupStatus();
  }

  // Show/hide letter generation progress
  showLetterTyping(show) {
    if (this.elems.letterTyping) {
      this.elems.letterTyping.style.display = show ? 'block' : 'none';
    }
  }

  // Copy letter content
  copyLetter() {
    const txt = this.elems.letterContent?.textContent || '';
    if (!txt) return;
    navigator.clipboard.writeText(txt);
    // Add copy success feedback
    const btn = this.elems.copyLetter;
    if (btn) {
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-check"></i> Copied';
      setTimeout(() => {
        btn.innerHTML = originalText;
      }, 2000);
    }
  }

  usePromptAndFocus() {
    // Store prompt in session for this page usage
    sessionStorage.setItem('ic_system_prompt_en', this.elems.promptText?.textContent || '');
    this.togglePromptPreview(false);
    
    // Update setup status
    this.updateSetupStatus();
    
    // If setup is complete, show welcome message
    if (this.isSetupComplete) {
      this.resetChat();
      if (this.config.ui?.welcomeMessage) {
        this.addMessage(this.config.ui.welcomeMessage, 'ai');
      }
    }
    
    this.elems.input?.focus();
  }

  buildSystemPrompt() {
    const name = (this.elems.name?.value || '').trim() || 'Inner Child';
    const stored = sessionStorage.getItem('ic_system_prompt_en');
    const letterContent = sessionStorage.getItem('ic_letter_content_en');
    const speakingStyle = sessionStorage.getItem('ic_speaking_style_en');
    
    let systemPrompt = '';
    if (stored && stored.trim()) {
      systemPrompt = stored;
    } else {
      const fallbackProfile = '(User has not provided detailed information, only speak with gentle, innocent, and curious childhood tone)';
      systemPrompt = (this.config.systemPromptTemplate || '')
        .replaceAll('{{name}}', name)
        .replaceAll('{{profile}}', fallbackProfile);
    }
    
    // If there's speaking style information, strengthen style guidance
    if (speakingStyle && speakingStyle.trim()) {
      systemPrompt += `\n\n【Speaking Style Requirements】: Throughout the conversation, you must strictly follow these speaking style characteristics when responding:
${speakingStyle}

Important reminders:
- Every response must reflect these speaking style characteristics
- Use the same word habits, sentence patterns, and tone
- Maintain consistent emotional expression methods
- Imitate the specific expression style from "what your past self would say" in the user's materials
- This is your core characteristic as the user's childhood self and cannot be changed`;
    }
    
    // If there's letter content, add it to the system prompt
    if (letterContent && letterContent.trim()) {
      systemPrompt += `\n\n【Letter Memory】: As the user's childhood self, you have already written a letter to the user (your grown-up self), the letter content is:
"${letterContent}"

In conversation:
- You should remember the content of this letter and the mood when writing it
- Your chat might revolve around this letter
- The user might respond to the letter content or ask related questions
- Maintain the same speaking style and emotional expression as in the letter`;
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
    // Get current API provider configuration
    const providers = this.config.apiProviders || {};
    const provider = providers[this.currentProvider];
    
    if (!provider) {
      throw new Error(`API provider configuration not found: ${this.currentProvider}`);
    }

    // Basic request body
    let body = {
      model: provider.model || this.config.model || 'gpt-4.1',
      messages,
      temperature: this.config.apiParams?.temperature ?? 0.8,
      top_p: this.config.apiParams?.top_p ?? 0.9,
      stream: false,
      ...extra
    };

    // Adjust request parameters for different API providers
    if (this.currentProvider === 'xuedingmao') {
      body.max_tokens = this.config.apiParams?.max_tokens ?? 1200;
      body.frequency_penalty = this.config.apiParams?.frequency_penalty ?? 0.0;
      body.presence_penalty = this.config.apiParams?.presence_penalty ?? 0.0;
    } else if (this.currentProvider === 'groq') {
      // Groq special parameters
      body.max_completion_tokens = this.config.apiParams?.max_tokens ?? 1200;
      body.reasoning_effort = "medium";
      body.stop = null;
    } else if (this.currentProvider === 'deepseek') {
      // DeepSeek API uses OpenAI-compatible format
      body.max_tokens = this.config.apiParams?.max_tokens ?? 1200;
      body.frequency_penalty = this.config.apiParams?.frequency_penalty ?? 0.0;
      body.presence_penalty = this.config.apiParams?.presence_penalty ?? 0.0;
    } else if (this.currentProvider === 'kimi') {
      // Kimi (Moonshot) API uses OpenAI-compatible format
      body.max_tokens = this.config.apiParams?.max_tokens ?? 1200;
      body.frequency_penalty = this.config.apiParams?.frequency_penalty ?? 0.0;
      body.presence_penalty = this.config.apiParams?.presence_penalty ?? 0.0;
    }

    console.log(`🔗 Using ${provider.name} API: ${provider.endpoint}`);
    
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
      console.log(`✅ ${provider.name} API call successful!`);
      return data.choices?.[0]?.message?.content || '';
      
    } catch (error) {
      console.error(`❌ ${provider.name} API call failed:`, error.message);
      
      // Check if it's a network connection issue
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_NAME_NOT_RESOLVED')) {
        throw new Error(`Network connection failed: Unable to connect to ${provider.name} server. Please check your network connection or try again later.`);
      }
      
      // Check if it's an API key issue
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        throw new Error(`Invalid API key: Please check if your ${provider.name} API key is correct.`);
      }
      
      throw error;
    }
  }

  // End chat and download conversation log
  endChatAndDownload() {
    console.log('🔚 Ending chat and downloading conversation...');
    
    // Confirm ending chat
    if (!confirm('Are you sure you want to end the conversation and download the chat log? This will clear the current conversation.')) {
      return;
    }
    
    try {
      // Generate chat log text
      const chatLog = this.generateChatLog();
      
      // Download file
      this.downloadTextFile(chatLog, `Inner_Child_Chat_Log_${this.formatDate(new Date())}.txt`);
      
      // Clear chat log
      this.resetChat();
      
      // Show success message
      alert('Chat log downloaded successfully! Conversation has been reset.');
      
    } catch (error) {
      console.error('❌ Error ending chat:', error);
      alert('Error downloading chat log, please try again.');
    }
  }

  // Generate chat log text
  generateChatLog() {
    const name = this.assistantName || 'Inner Child';
    const date = new Date();
    const dateStr = this.formatDate(date);
    const timeStr = this.formatTime(date);
    
    let chatLog = `=== Inner Child AI Chat Log ===\n`;
    chatLog += `AI Name: ${name}\n`;
    chatLog += `Export Time: ${dateStr} ${timeStr}\n`;
    chatLog += `Total Messages: ${this.messages.length}\n`;
    chatLog += `=================================\n\n`;
    
    if (this.messages.length === 0) {
      chatLog += 'No message records in this conversation.\n';
    } else {
      this.messages.forEach((msg, index) => {
        const speaker = msg.role === 'user' ? 'User' : name;
        const timestamp = `[${index + 1}]`;
        chatLog += `${timestamp} ${speaker}:\n${msg.content}\n\n`;
      });
    }
    
    chatLog += `=================================\n`;
    chatLog += `End of Log - Generated by Inner Child AI\n`;
    
    return chatLog;
  }

  // Download text file
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
    
    // Release URL object
    URL.revokeObjectURL(url);
  }

  // Format date (YYYY-MM-DD)
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Format time (HH:MM:SS)
  formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  // Handle custom avatar upload
  handleCustomAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG, PNG, GIF, etc.)');
      return;
    }

    // Validate file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image file is too large, please select an image smaller than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      
      // Save to local storage
      this.customAvatarDataUrl = dataUrl;
      localStorage.setItem('ic_custom_avatar_en', dataUrl);
      
      // Show custom avatar option
      this.showCustomAvatar(dataUrl);
      
      // Auto-select custom avatar
      this.selectCustomAvatar();
    };
    
    reader.onerror = () => {
      alert('Failed to read image file, please try again');
    };
    
    reader.readAsDataURL(file);
  }

  // Show custom avatar
  showCustomAvatar(dataUrl) {
    if (this.elems.customAvatarPreview && this.elems.customAvatarCard) {
      this.elems.customAvatarPreview.src = dataUrl;
      this.elems.customAvatarCard.style.display = 'block';
    }
  }

  // Select custom avatar
  selectCustomAvatar() {
    const customRadio = document.querySelector('input[name="ic-avatar"][value="custom"]');
    if (customRadio) {
      customRadio.checked = true;
      this.avatarUrl = this.getSelectedAvatar();
      this.updateSetupStatus();
      this.updateAvatarSelection();
    }
  }

  // Load saved custom avatar
  loadCustomAvatar() {
    if (this.customAvatarDataUrl) {
      this.showCustomAvatar(this.customAvatarDataUrl);
      
      // Check if custom avatar was previously selected
      const selectedAvatar = localStorage.getItem('ic_selected_avatar_en');
      if (selectedAvatar === 'custom') {
        this.selectCustomAvatar();
      }
    }
  }

  // Update avatar selection highlight effect (rewritten to support custom avatar)
  updateAvatarSelection() {
    const avatarCards = document.querySelectorAll('.avatar-card');
    avatarCards.forEach(card => {
      card.classList.remove('selected');
      const input = card.querySelector('input[type="radio"]');
      if (input && input.checked) {
        card.classList.add('selected');
        // Save selected avatar type
        localStorage.setItem('ic_selected_avatar_en', input.value);
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.innerChildChatEN = new InnerChildChatEN();
});
