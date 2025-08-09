/**
 * AI Chat Functionality - Version 2
 * ⚠️ 安全警告：这是演示代码，不应在生产环境中使用！
 * 在真实项目中，API key应该保存在后端服务器中。
 */

class AI1Chat {
    constructor() {
        this.apiKey = '';
        this.messages = [];
        this.isTyping = false;
        this.config = this.loadConfig();

        this.initializeElements();
        this.bindEvents();
        this.loadApiKey();
        
        // 确保每次页面刷新都是干净的状态
        this.clearSessionData();
        
        this.initializeUI();
        
        // 确保在线配置立即生效
        this.ensureOnlineConfigActive();
    }

    // 确保在线配置立即生效
    ensureOnlineConfigActive() {
        console.log('🔧 Ensuring online config is active for AI1...');
        
        // 等待在线配置加载完成
        const checkOnlineConfig = () => {
            if (window.onlineGlobalConfig && window.onlineGlobalConfig.currentConfig) {
                const onlineConfig = window.onlineGlobalConfig.getAI2Config();
                console.log('🎯 Forcing online config application for AI1 (using AI2 config):', onlineConfig);
                
                // 强制应用在线配置，但确保使用正确的配置
                if (onlineConfig.systemPrompt) {
                    // 检查是否是Lucy的配置，如果是则使用默认的Tom配置
                    const systemPrompt = onlineConfig.systemPrompt;
                    if (systemPrompt.includes('Lucy') || systemPrompt.includes('magician') || systemPrompt.includes('Ruoyu Wen') || systemPrompt.includes('"role": "Lucy"')) {
                        console.log('⚠️ Detected Lucy/Ruoyu config, using default Tom config instead');
                        this.config.systemPrompt = window.AI1_CONFIG?.systemPrompt || this.config.systemPrompt;
                    } else if (systemPrompt.includes('Jerry')) {
                        // 使用Jerry配置
                        console.log('✅ Using Jerry config from online admin (AI2)');
                        this.config.systemPrompt = onlineConfig.systemPrompt;
                    } else if (systemPrompt.includes('Tom')) {
                        // 使用Tom配置
                        console.log('✅ Using Tom config from online admin (AI2)');
                        this.config.systemPrompt = onlineConfig.systemPrompt;
                    } else {
                        // 检查是否是有效的配置（不是Lucy配置）
                        console.log('✅ Using valid config from online admin (AI2)');
                        this.config.systemPrompt = onlineConfig.systemPrompt;
                    }
                    console.log('✅ AI1 System prompt forcefully updated to:', this.config.systemPrompt);
                }
                if (onlineConfig.model) {
                    this.config.model = onlineConfig.model;
                }
                if (onlineConfig.apiParams) {
                    this.config.apiParams = { ...this.config.apiParams, ...onlineConfig.apiParams };
                }
                
                console.log('🚀 Final AI1 config after force update:', this.config);
            } else if (window.onlineGlobalConfig) {
                // 如果onlineGlobalConfig存在但没有currentConfig，尝试加载
                console.log('🔄 Online global config exists but no current config, trying to load...');
                window.onlineGlobalConfig.loadConfig().then(() => {
                    // 重新检查配置
                    setTimeout(checkOnlineConfig, 100);
                });
            } else {
                console.log('⏳ Online config not ready for AI1, retrying in 1 second...');
                setTimeout(checkOnlineConfig, 1000);
            }
        };
        
        // 立即检查，如果不可用则每秒重试
        checkOnlineConfig();
    }

    loadConfig() {
        // Load default config first
        let config = JSON.parse(JSON.stringify(window.AI1_CONFIG || {}));
        console.log('📋 Default AI1 config loaded:', config);
        
        try {
            // PRIORITY 1: Check for ONLINE GLOBAL configuration
            if (window.onlineGlobalConfig && window.onlineGlobalConfig.currentConfig) {
                const onlineConfig = window.onlineGlobalConfig.getAI2Config();
                console.log('☁️ Loading ONLINE GLOBAL AI1 config (using AI2 config):', onlineConfig);
                
                if (onlineConfig.model) config.model = onlineConfig.model;
                if (onlineConfig.systemPrompt) {
                    // 检查是否是Lucy的配置，如果是则使用默认的Tom配置
                    const systemPrompt = onlineConfig.systemPrompt;
                    if (systemPrompt.includes('Lucy') || systemPrompt.includes('magician') || systemPrompt.includes('Ruoyu Wen') || systemPrompt.includes('"role": "Lucy"')) {
                        console.log('⚠️ Detected Lucy/Ruoyu config in online config, using default Tom config instead');
                        config.systemPrompt = window.AI1_CONFIG?.systemPrompt || config.systemPrompt;
                    } else if (systemPrompt.includes('Jerry')) {
                        // 使用Jerry配置
                        console.log('✅ Using Jerry config from online admin (AI2)');
                        config.systemPrompt = onlineConfig.systemPrompt;
                    } else if (systemPrompt.includes('Tom')) {
                        // 使用Tom配置
                        console.log('✅ Using Tom config from online admin');
                        config.systemPrompt = onlineConfig.systemPrompt;
                    } else {
                        // 检查是否是有效的配置（不是Lucy配置）
                        console.log('✅ Using valid config from online admin');
                        config.systemPrompt = onlineConfig.systemPrompt;
                    }
                }
                if (onlineConfig.apiParams) {
                    config.apiParams = { ...config.apiParams, ...onlineConfig.apiParams };
                }
                
                // 确保ui配置不被覆盖
                if (!config.ui) {
                    config.ui = window.AI1_CONFIG?.ui || {};
                }
                
                console.log('✅ AI1 config updated with ONLINE GLOBAL settings (AI2 config):', config);
                console.log('🕐 Online config version:', window.onlineGlobalConfig.configVersion);
            } else if (window.onlineGlobalConfig) {
                // 如果onlineGlobalConfig存在但没有currentConfig，尝试加载
                console.log('🔄 Online global config exists but no current config, trying to load...');
                window.onlineGlobalConfig.loadConfig().then(() => {
                    // 重新加载配置
                    this.refreshConfig();
                });
            }
            // PRIORITY 2: Check for FILE-BASED GLOBAL configuration from global-config.js
            else if (window.GLOBAL_AI1_CONFIG) {
                const globalConfig = window.GLOBAL_AI1_CONFIG;
                console.log('🌍 Loading FILE-BASED GLOBAL AI1 config:', globalConfig);
                
                if (globalConfig.model) config.model = globalConfig.model;
                if (globalConfig.systemPrompt) {
                    // 检查是否是Lucy的配置，如果是则使用默认的Tom配置
                    const systemPrompt = globalConfig.systemPrompt;
                    if (systemPrompt.includes('Lucy') || systemPrompt.includes('magician') || systemPrompt.includes('Ruoyu Wen') || systemPrompt.includes('"role": "Lucy"')) {
                        console.log('⚠️ Detected Lucy/Ruoyu config in global config, using default Tom config instead');
                        config.systemPrompt = window.AI1_CONFIG?.systemPrompt || config.systemPrompt;
                    } else if (systemPrompt.includes('Jerry')) {
                        console.log('✅ Using Jerry config from global config');
                        config.systemPrompt = globalConfig.systemPrompt;
                    } else if (systemPrompt.includes('Tom')) {
                        console.log('✅ Using Tom config from global config');
                        config.systemPrompt = globalConfig.systemPrompt;
                    } else {
                        console.log('✅ Using valid config from global config');
                        config.systemPrompt = globalConfig.systemPrompt;
                    }
                }
                if (globalConfig.maxTokens) {
                    config.apiParams = config.apiParams || {};
                    config.apiParams.max_tokens = globalConfig.maxTokens;
                }
                if (globalConfig.temperature !== undefined) {
                    config.apiParams = config.apiParams || {};
                    config.apiParams.temperature = globalConfig.temperature;
                }
                
                // 确保ui配置不被覆盖
                if (!config.ui) {
                    config.ui = window.AI1_CONFIG?.ui || {};
                }
                
                console.log('✅ AI1 config updated with TRUE GLOBAL settings:', config);
                console.log('🕐 Global config version:', window.GLOBAL_CONFIG_VERSION);
            } else {
                // PRIORITY 2: Fallback to localStorage global config
                const globalConfigStr = localStorage.getItem('global_ai1_config');
                console.log('🌐 Checking for localStorage global_ai1_config:', globalConfigStr);
                
                if (globalConfigStr) {
                    const parsed = JSON.parse(globalConfigStr);
                    console.log('🔧 Loading localStorage GLOBAL AI1 config:', parsed);
                
                // Override specific settings
                if (parsed.model) config.model = parsed.model;
                if (parsed.systemPrompt) {
                    // 检查是否是Lucy的配置，如果是则使用默认的Tom配置
                    const systemPrompt = parsed.systemPrompt;
                    if (systemPrompt.includes('Lucy') || systemPrompt.includes('magician') || systemPrompt.includes('Ruoyu Wen') || systemPrompt.includes('"role": "Lucy"')) {
                        console.log('⚠️ Detected Lucy/Ruoyu config in localStorage, using default Tom config instead');
                        config.systemPrompt = window.AI1_CONFIG?.systemPrompt || config.systemPrompt;
                    } else if (systemPrompt.includes('Jerry')) {
                        console.log('✅ Using Jerry config from localStorage');
                        config.systemPrompt = parsed.systemPrompt;
                    } else if (systemPrompt.includes('Tom')) {
                        console.log('✅ Using Tom config from localStorage');
                        config.systemPrompt = parsed.systemPrompt;
                    } else {
                        console.log('✅ Using valid config from localStorage');
                        config.systemPrompt = parsed.systemPrompt;
                    }
                }
                if (parsed.maxTokens) {
                    config.apiParams = config.apiParams || {};
                    config.apiParams.max_tokens = parsed.maxTokens;
                }
                if (parsed.temperature !== undefined) {
                    config.apiParams = config.apiParams || {};
                    config.apiParams.temperature = parsed.temperature;
                }
                
                // 确保ui配置不被覆盖
                if (!config.ui) {
                    config.ui = window.AI1_CONFIG?.ui || {};
                }
                
                    console.log('✅ AI1 config updated with localStorage GLOBAL settings:', config);
                } else {
                    // PRIORITY 3: Fallback to legacy user-specific config
                    const customConfigStr = localStorage.getItem('ai1_custom_config');
                    console.log('🔍 Checking localStorage for ai1_custom_config (legacy):', customConfigStr);
                    
                    if (customConfigStr) {
                        const parsed = JSON.parse(customConfigStr);
                        console.log('🔧 Loading legacy custom AI1 config:', parsed);
                        
                        // Override specific settings
                        if (parsed.model) config.model = parsed.model;
                        if (parsed.systemPrompt) {
                            // 检查是否是Lucy的配置，如果是则使用默认的Tom配置
                            const systemPrompt = parsed.systemPrompt;
                            if (systemPrompt.includes('Lucy') || systemPrompt.includes('magician') || systemPrompt.includes('Ruoyu Wen') || systemPrompt.includes('"role": "Lucy"')) {
                                console.log('⚠️ Detected Lucy/Ruoyu config in legacy config, using default Tom config instead');
                                config.systemPrompt = window.AI1_CONFIG?.systemPrompt || config.systemPrompt;
                            } else if (systemPrompt.includes('Jerry')) {
                                console.log('✅ Using Jerry config from legacy config');
                                config.systemPrompt = parsed.systemPrompt;
                            } else if (systemPrompt.includes('Tom')) {
                                console.log('✅ Using Tom config from legacy config');
                                config.systemPrompt = parsed.systemPrompt;
                            } else {
                                console.log('✅ Using valid config from legacy config');
                                config.systemPrompt = parsed.systemPrompt;
                            }
                        }
                        if (parsed.maxTokens) {
                            config.apiParams = config.apiParams || {};
                            config.apiParams.max_tokens = parsed.maxTokens;
                        }
                        if (parsed.temperature !== undefined) {
                            config.apiParams = config.apiParams || {};
                            config.apiParams.temperature = parsed.temperature;
                        }
                        
                        // 确保ui配置不被覆盖
                        if (!config.ui) {
                            config.ui = window.AI1_CONFIG?.ui || {};
                        }
                        
                        console.log('✅ AI1 config updated with legacy custom settings:', config);
                    } else {
                        console.log('ℹ️ No custom AI1 config found, using defaults');
                        // 确保ui配置存在
                        if (!config.ui) {
                            config.ui = window.AI1_CONFIG?.ui || {};
                        }
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error loading custom AI1 config:', error);
            // 确保ui配置存在
            if (!config.ui) {
                config.ui = window.AI1_CONFIG?.ui || {};
            }
        }
        
        // Always use transit API endpoint regardless of other config
        config.apiEndpoint = 'https://xuedingmao.online/v1/chat/completions';
        
        return config;
    }

    // Add method to refresh config
    refreshConfig() {
        console.log('🔄 Refreshing AI1 configuration...');
        this.config = this.loadConfig();
        this.addMessage('🔄 Configuration refreshed! New settings will apply to future conversations.', 'assistant');
    }

    initializeElements() {
        this.chatContainer = document.getElementById('chat-container');
        this.chatInput = document.getElementById('chat-input');
        this.sendBtn = document.getElementById('send-btn');
        this.typingIndicator = document.getElementById('typing-indicator');
        this.typingText = document.getElementById('typing-text');
        this.apiKeyInput = document.getElementById('api-key');

    }

    bindEvents() {
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        this.apiKeyInput.addEventListener('input', (e) => {
            this.apiKey = e.target.value;
            localStorage.setItem('transit_api_key_v2', this.apiKey);
        });

        // Auto-resize textarea
        this.chatInput.addEventListener('input', () => {
            this.chatInput.style.height = 'auto';
            this.chatInput.style.height = this.chatInput.scrollHeight + 'px';
        });


    }

    loadApiKey() {
        const savedKey = localStorage.getItem('transit_api_key_v2');
        if (savedKey) {
            this.apiKey = savedKey;
            this.apiKeyInput.value = savedKey;
        }
    }

    initializeUI() {
        // 设置UI文本从配置文件
        if (this.config.ui) {
            this.apiKeyInput.placeholder = this.config.ui.apiKeyPlaceholder || 'sk-proj-...';
            this.sendBtn.innerHTML = `<i class="fas fa-paper-plane"></i> ${this.config.ui.sendButtonText || 'Send'}`;
            this.typingText.textContent = this.config.ui.typingText || 'AI is thinking...';
            
            // 添加欢迎消息（确保在清除会话数据后显示）
            if (this.config.ui.welcomeMessage && this.chatContainer.children.length === 0) {
                this.addMessage(this.config.ui.welcomeMessage, 'assistant');
            }
        }
    }

    async sendMessage() {
        const message = this.chatInput.value.trim();
        if (!message) return;



        if (!this.apiKey) {
            this.showError('Please enter your API Key first!');
            return;
        }

        if (this.isTyping) return;

        // Add user message to chat
        this.addMessage(message, 'user');
        this.chatInput.value = '';
        this.chatInput.style.height = 'auto';

        // Show typing indicator
        this.showTyping(true);

        try {
            // Call Transit API
            const response = await this.callOpenAI(message);
            
            // Handle different response classes
            const responseClass = response.class || 'none';
            const content = response.content || response;
            
            // Display the content as conversation
            this.addMessage(content, 'assistant');
            
            // Handle different response states
            if (responseClass === 'fail') {
                this.handleFailState();
                return;
            } else if (responseClass === 'success') {
                this.handleSuccessState();
                return;
            } else if (responseClass === 'none') {
                // Continue normal conversation
            }
        } catch (error) {
            console.error('AI Chat Error:', error);
            this.showError('抱歉，Tom暂时无法回应。请检查API Key或稍后重试。');
        } finally {
            this.showTyping(false);
        }
    }

    async callOpenAI(userMessage) {
        // Add current message to conversation history
        this.messages.push({ role: 'user', content: userMessage });

        // 从配置文件获取设置
        const model = this.config.model || 'gpt-4o';
        const systemPrompt = this.config.systemPrompt || '你是一个友好的助手。请用中文回答问题，保持礼貌和有帮助的态度。';
        const apiParams = this.config.apiParams || {};
        
        // 尝试多个API端点 - 根据薛定猫API官方文档
        const apiEndpoints = [
            'https://xuedingmao.online/v1/chat/completions',
            'https://xuedingmao.online/v1',
            'https://xuedingmao.online',
            'https://api.xuedingmao.com/v1/chat/completions' // 备用端点
        ];
        
        let lastError = null;
        
        for (const apiEndpoint of apiEndpoints) {
            try {
                console.log(`🔗 Trying API endpoint: ${apiEndpoint}`);
                
                const response = await fetch(apiEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [
                            {
                                role: 'system',
                                content: systemPrompt
                            },
                            ...this.messages
                        ],
                        max_tokens: apiParams.max_tokens || 1500,
                        temperature: apiParams.temperature || 0.7,
                        top_p: apiParams.top_p || 0.9,
                        frequency_penalty: apiParams.frequency_penalty || 0.0,
                        presence_penalty: apiParams.presence_penalty || 0.0,
                        stream: false,
                        response_format: { type: "json_object" }
                    })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(`API Error: ${error.error?.message || 'Unknown error'}`);
                }

                const data = await response.json();
                const assistantMessage = data.choices[0].message.content;
                
                // Parse JSON response
                let parsedResponse;
                try {
                    parsedResponse = JSON.parse(assistantMessage);
                } catch (error) {
                    console.error('Failed to parse JSON response:', error);
                    // Fallback to plain text if JSON parsing fails
                    parsedResponse = {
                        content: assistantMessage,
                        class: "none"
                    };
                }
                
                // Add assistant response to conversation history
                this.messages.push({ role: 'assistant', content: parsedResponse.content || assistantMessage });

                // Keep conversation history reasonable (从配置文件获取历史长度限制)
                const maxHistory = this.config.maxHistoryLength || 20;
                if (this.messages.length > maxHistory) {
                    this.messages = this.messages.slice(-maxHistory);
                }

                console.log(`✅ Successfully used API endpoint: ${apiEndpoint}`);
                return parsedResponse;
                
            } catch (error) {
                console.warn(`❌ Failed to use API endpoint ${apiEndpoint}:`, error.message);
                lastError = error;
                continue;
            }
        }
        
        // 如果所有端点都失败了
        console.error('❌ All API endpoints failed');
        
        // 检查是否是网络连接问题
        if (lastError && (lastError.message.includes('Failed to fetch') || lastError.message.includes('ERR_NAME_NOT_RESOLVED'))) {
            throw new Error('网络连接失败：无法连接到薛定猫API服务器。请检查网络连接或稍后重试。\n\n可能的解决方案：\n1. 检查网络连接\n2. 确认API密钥是否正确\n3. 稍后重试');
        }
        
        // 检查是否是API密钥问题
        if (lastError && (lastError.message.includes('401') || lastError.message.includes('Unauthorized'))) {
            throw new Error('API密钥无效：请检查您的薛定猫API密钥是否正确。');
        }
        
        // 其他错误
        throw new Error(`API调用失败：${lastError?.message || '未知错误'}`);
    }

    addMessage(message, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        // Create avatar
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';
        
        // Create content wrapper
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'message-wrapper';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // 从配置文件获取标签文本
        const userLabel = this.config.ui?.userLabel || 'You';
        const assistantLabel = this.config.ui?.assistantLabel || 'Tom';
        
        if (sender === 'user') {
            // User avatar - neutral
            avatarDiv.innerHTML = `<div class="avatar user-avatar">👤</div>`;
            contentDiv.innerHTML = `<strong>${userLabel}:</strong> ${this.escapeHtml(message)}`;
        } else {
            // AI Chat 1 - Male avatar
            avatarDiv.innerHTML = `<div class="avatar ai-avatar male-avatar">👨‍💻</div>`;
            contentDiv.innerHTML = `<strong>${assistantLabel}:</strong> ${this.formatMessage(message)}`;
        }
        
        contentWrapper.appendChild(contentDiv);
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentWrapper);
        this.chatContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    showError(errorMessage) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant';
        messageDiv.style.borderLeftColor = '#ff6b6b';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // 使用配置文件中的错误消息或默认消息
        const finalErrorMessage = errorMessage || this.config.ui?.errorMessage || 'Sorry, the AI assistant is temporarily unavailable. Please check your API Key or try again later.';
        contentDiv.innerHTML = `<strong>❌ Error:</strong> ${finalErrorMessage}`;
        
        messageDiv.appendChild(contentDiv);
        this.chatContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    showTyping(show) {
        this.isTyping = show;
        this.sendBtn.disabled = show;
        this.typingIndicator.style.display = show ? 'flex' : 'none';
        
        if (show) {
            this.scrollToBottom();
        }
    }

    scrollToBottom() {
        setTimeout(() => {
            this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
        }, 100);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatMessage(message) {
        // Basic markdown-like formatting
        return this.escapeHtml(message)
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code style="background: rgba(0,0,0,0.3); padding: 2px 4px; border-radius: 3px;">$1</code>')
            .replace(/\n/g, '<br>');
    }



    handleFailState() {
        console.log('💀 Game Over - Fail state triggered');
        
        // Display game over message
        this.addMessage('🎮 GAME OVER', 'assistant');
        
        // Disable chat functionality
        this.chatInput.disabled = true;
        this.sendBtn.disabled = true;
        this.chatInput.placeholder = 'Game Over - Chat disabled';
        this.sendBtn.innerHTML = '<i class="fas fa-ban"></i> Disabled';
        this.sendBtn.style.opacity = '0.5';
        this.sendBtn.style.cursor = 'not-allowed';
        

        
        // Create and show completion button for fail state
        this.showCompletionButton('fail');
        
        this.scrollToBottom();
    }

    handleSuccessState() {
        console.log('🎉 Game Success - Success state triggered');
        
        // Display success message
        this.addMessage('🎉 Congratulations! Game completed successfully!', 'assistant');
        
        // Disable chat functionality
        this.chatInput.disabled = true;
        this.sendBtn.disabled = true;
        this.chatInput.placeholder = 'Task completed - Chat disabled';
        this.sendBtn.innerHTML = '<i class="fas fa-check"></i> Completed';
        this.sendBtn.style.opacity = '0.5';
        
        // Create and show completion button for success state
        this.showCompletionButton('success');
        
        this.scrollToBottom();
    }

    showCompletionButton(gameResult) {
        // Remove any existing completion button
        const existingButton = document.getElementById('completion-button');
        if (existingButton) {
            existingButton.remove();
        }

        // Create completion button
        const completionButton = document.createElement('button');
        completionButton.id = 'completion-button';
        completionButton.textContent = 'Complete';
        completionButton.className = 'submit-btn';
        completionButton.style.margin = '10px auto';
        completionButton.style.display = 'block';
        completionButton.style.background = gameResult === 'success' 
            ? 'linear-gradient(135deg, #28a745, #20c997)' 
            : 'linear-gradient(135deg, #dc3545, #c82333)';
        
        completionButton.onclick = () => {
            this.saveGameResult(gameResult);
            completionButton.disabled = true;
            completionButton.textContent = 'Completed ✓';
            completionButton.style.opacity = '0.5';
        };
        
        // Add button to the chat container
        const chatContainer = document.getElementById('chat-container');
        
        if (chatContainer && chatContainer.parentNode) {
            chatContainer.parentNode.appendChild(completionButton);
        }
    }

    saveGameResult(gameResult) {
        console.log(`💾 Saving game result: ${gameResult}`);
        
        // Generate unique ID
        const resultId = this.generateUniqueId();
        
        // Collect chat history
        const chatHistory = this.messages.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: new Date().toISOString()
        }));
        
        console.log('📝 Chat history being saved:', chatHistory);
        console.log('💬 Total messages:', this.messages.length);
        
        const result = {
            id: resultId + 'ai1',
            gameResult: gameResult, // 'success' or 'fail'
            timestamp: new Date().toISOString(),
            task: 'ai_conversation_game',
            chatHistory: chatHistory,
            conversationRounds: 0,
            taskType: 'AI Chat 1 - Game Mode',
            finalState: gameResult === 'success' ? 'Game Won' : 'Game Over'
        };

        console.log('📊 Complete result object:', result);

        // Save to localStorage
        const existingResults = JSON.parse(localStorage.getItem('airesults') || '[]');
        existingResults.push(result);
        localStorage.setItem('airesults', JSON.stringify(existingResults));
        
        console.log('💾 Saved to localStorage. All results:', existingResults);

        // Also save to central storage
        this.saveToCentralStorage(result);
        
        // Show completion message
        const statusMessage = gameResult === 'success' 
            ? '🎉 Game completed successfully!' 
            : '💀 Game over recorded!';
        this.addMessage(`✅ ${statusMessage} Your result "${gameResult}" has been saved with ID: ${result.id}`, 'assistant');
        
        // Show link to results page
        setTimeout(() => {
            this.addMessage('📊 View all results at: <a href="airesult.html" target="_blank" style="color: var(--secondary-color);">Results Page</a>', 'assistant');
        }, 1000);
    }



    generateUniqueId() {
        // Generate 6-digit sequential ID
        const existingResults = JSON.parse(localStorage.getItem('airesults') || '[]');
        return String(existingResults.length + 1).padStart(6, '0');
    }

    // 清除会话数据，确保每次刷新都是干净状态
    clearSessionData() {
        console.log('🧹 Clearing AI1 session data for fresh start...');
        
        // 清除可能存在的会话相关数据
        localStorage.removeItem('sessionSeed');
        localStorage.removeItem('ai1_chat_messages');
        localStorage.removeItem('ai1_chat_state');
        localStorage.removeItem('ai1_conversation_history');
        localStorage.removeItem('ai1_chat_context');
        
        // 重置消息数组 - 这是关键！
        this.messages = [];
        
        // 清除聊天容器内容，但保留欢迎消息的位置
        if (this.chatContainer) {
            this.chatContainer.innerHTML = '';
        }
        
        // 重置聊天状态
        this.isTyping = false;
        
        // 确保输入框是启用状态
        if (this.chatInput) {
            this.chatInput.disabled = false;
            this.chatInput.placeholder = 'Type your message...';
        }
        if (this.sendBtn) {
            this.sendBtn.disabled = false;
            this.sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send';
        }
        
        console.log('✅ AI1 session data cleared, ready for fresh conversation');
        console.log('📝 Messages array reset:', this.messages);
    }



    // Save result to central storage (same as AI Chat 1)
    async saveToCentralStorage(result) {
        try {
            // Add session info for tracking
            const sessionSeed = localStorage.getItem('sessionSeed');
            const enhancedResult = {
                ...result,
                sessionSeed: sessionSeed,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString(),
                ipHash: await this.getSimpleFingerprint() // Simple fingerprint for tracking
            };

            console.log('🌐 Attempting to save to central storage (AI1):', enhancedResult);
            
            // Use the same central storage as AI Chat 1
            const centralResults = JSON.parse(localStorage.getItem('centralResults') || '[]');
            centralResults.push(enhancedResult);
            localStorage.setItem('centralResults', JSON.stringify(centralResults));
            
            console.log('📡 Saved to central storage simulation (AI1):', enhancedResult);
            
        } catch (error) {
            console.error('❌ Failed to save to central storage (AI1):', error);
        }
    }

    // Generate simple fingerprint for user tracking (same as AI Chat 1)
    async getSimpleFingerprint() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Fingerprint test', 2, 2);
        const fingerprint = canvas.toDataURL();
        
        // Simple hash
        let hash = 0;
        for (let i = 0; i < fingerprint.length; i++) {
            const char = fingerprint.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16);
    }
}

// Initialize AI Chat when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.ai1ChatInstance = new AI1Chat();
});