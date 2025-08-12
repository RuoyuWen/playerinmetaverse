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

    // 确保在线配置激活
    ensureOnlineConfigActive() {
        console.log('🔧 确保在线配置激活...');
        
        // 等待在线配置加载完成
        const checkOnlineConfig = () => {
            if (window.onlineGlobalConfig && window.onlineGlobalConfig.currentConfig) {
                const onlineConfig = window.onlineGlobalConfig.getAI1Config();
                console.log('🎯 强制应用在线配置:', onlineConfig);
                
                // 强制应用在线配置
                if (onlineConfig.systemPrompt) {
                    this.config.systemPrompt = onlineConfig.systemPrompt;
                    console.log('✅ 系统提示词强制更新为:', this.config.systemPrompt);
                }
                if (onlineConfig.model) {
                    this.config.model = onlineConfig.model;
                }
                if (onlineConfig.apiParams) {
                    this.config.apiParams = { ...this.config.apiParams, ...onlineConfig.apiParams };
                }
                
                console.log('🚀 强制更新后的最终AI1配置:', this.config);
            } else {
                console.log('⏳ 在线配置未就绪，1秒后重试...');
                setTimeout(checkOnlineConfig, 1000);
            }
        };
        
        // 立即检查，如果不可用则每秒重试
        checkOnlineConfig();
        
        // 同时设置一个更长的超时，确保最终能加载到配置
        setTimeout(() => {
            if (!window.onlineGlobalConfig || !window.onlineGlobalConfig.currentConfig) {
                console.log('⚠️ 超时后在线配置仍未就绪，强制重新加载...');
                if (window.onlineGlobalConfig) {
                    window.onlineGlobalConfig.loadConfig().then(() => {
                        checkOnlineConfig();
                    }).catch(error => {
                        console.warn('重新加载在线配置失败:', error);
                    });
                }
            }
        }, 5000); // 5秒后强制重试
    }

    loadConfig() {
        // Load default config first
        let config = JSON.parse(JSON.stringify(window.AI1_CONFIG || {}));
        console.log('📋 加载默认 AI1 配置:', config);
        
        try {
            // PRIORITY 1: Use LOCAL CONFIG FILES (ai1-config.js) - Highest Priority
            if (window.AI1_CONFIG) {
                console.log('📁 使用本地 AI1 配置文件 (ai1-config.js)');
                // Local config is already loaded as default, no need to override
                console.log('✅ AI1 配置使用本地文件设置:', config);
                console.log('🕐 来源: 本地配置文件 (ai1-config.js)');
            }
            // PRIORITY 2: Check for ONLINE GLOBAL configuration (if local not available)
            else if (window.onlineGlobalConfig && window.onlineGlobalConfig.currentConfig) {
                const onlineConfig = window.onlineGlobalConfig.getAI1Config();
                console.log('☁️ 加载 ONLINE GLOBAL AI1 配置:', onlineConfig);
                
                if (onlineConfig.model) config.model = onlineConfig.model;
                if (onlineConfig.systemPrompt) {
                    config.systemPrompt = onlineConfig.systemPrompt;
                    console.log('✅ 使用来自在线管理员的 AI1 配置');
                }
                if (onlineConfig.apiParams) {
                    config.apiParams = { ...config.apiParams, ...onlineConfig.apiParams };
                }
                
                // 确保ui配置不被覆盖
                if (!config.ui) {
                    config.ui = window.AI1_CONFIG?.ui || {};
                }
                
                console.log('✅ AI1 配置已更新 (包含 ONLINE GLOBAL 设置):', config);
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
                console.log('🌍 加载 FILE-BASED GLOBAL AI1 配置:', globalConfig);
                
                if (globalConfig.model) config.model = globalConfig.model;
                if (globalConfig.systemPrompt) {
                    config.systemPrompt = globalConfig.systemPrompt;
                    console.log('✅ 使用全局配置');
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
                
                console.log('✅ AI1 配置已更新 (包含 TRUE GLOBAL 设置):', config);
                console.log('🕐 Global config version:', window.GLOBAL_CONFIG_VERSION);
            } else {
                // PRIORITY 2: Fallback to localStorage global config
                const globalConfigStr = localStorage.getItem('global_ai1_config');
                console.log('🌐 检查 localStorage global_ai1_config:', globalConfigStr);
                
                if (globalConfigStr) {
                    const parsed = JSON.parse(globalConfigStr);
                    console.log('🔧 加载 localStorage GLOBAL AI1 配置:', parsed);
                
                // Override specific settings
                if (parsed.model) config.model = parsed.model;
                if (parsed.systemPrompt) {
                    config.systemPrompt = parsed.systemPrompt;
                    console.log('✅ 使用旧版配置');
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
                
                    console.log('✅ AI1 配置已更新 (包含 localStorage GLOBAL 设置):', config);
                } else {
                    // PRIORITY 3: Fallback to legacy user-specific config
                    const customConfigStr = localStorage.getItem('ai1_custom_config');
                    console.log('🔍 检查 localStorage 中的 ai1_custom_config (旧版):', customConfigStr);
                    
                    if (customConfigStr) {
                        const parsed = JSON.parse(customConfigStr);
                        console.log('🔧 加载旧版自定义 AI1 配置:', parsed);
                        
                        // Override specific settings
                        if (parsed.model) config.model = parsed.model;
                        if (parsed.systemPrompt) {
                            config.systemPrompt = parsed.systemPrompt;
                            console.log('✅ 使用旧版配置');
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
                        
                        console.log('✅ AI1 配置已更新 (包含旧版自定义设置):', config);
                    } else {
                        console.log('ℹ️ 未找到自定义 AI1 配置，使用默认值');
                        // 确保ui配置存在
                        if (!config.ui) {
                            config.ui = window.AI1_CONFIG?.ui || {};
                        }
                    }
                }
            }
        } catch (error) {
            console.error('❌ 加载自定义 AI1 配置时出错:', error);
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
        console.log('🔄 刷新 AI1 配置...');
        this.config = this.loadConfig();
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
            this.sendBtn.innerHTML = `<i class="fas fa-paper-plane"></i> ${this.config.ui.sendButtonText || '发送'}`;
            this.typingText.textContent = this.config.ui.typingText || 'AI 正在思考...';
            
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
            this.showError('请先输入您的 API 密钥！');
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
                console.log(`🔗 尝试 API 端点: ${apiEndpoint}`);
                
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

                console.log(`✅ 成功使用 API 端点: ${apiEndpoint}`);
                return parsedResponse;
                
            } catch (error) {
                console.warn(`❌ 无法使用 API 端点 ${apiEndpoint}:`, error.message);
                lastError = error;
                continue;
            }
        }
        
        // 如果所有端点都失败了
        console.error('❌ 所有 API 端点都失败了');
        
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
        const userLabel = this.config.ui?.userLabel || '你';
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
        const finalErrorMessage = errorMessage || this.config.ui?.errorMessage || '抱歉，AI助手暂时无法使用。请检查您的API密钥或稍后再试。';
        contentDiv.innerHTML = `<strong>❌ 错误:</strong> ${finalErrorMessage}`;
        
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



    handleSuccessState() {
        console.log('🎉 游戏成功 - 触发成功状态');
        
        // Display success message
        this.addMessage('🎉 恭喜！游戏成功完成！', 'assistant');
        
        // Disable chat functionality
        this.chatInput.disabled = true;
        this.sendBtn.disabled = true;
        this.chatInput.placeholder = '任务完成 - 聊天已禁用';
        this.sendBtn.innerHTML = '<i class="fas fa-check"></i> 已完成';
        this.sendBtn.style.opacity = '0.5';
        
        // Automatically save the success result without showing completion button
        this.saveGameResult('success');
        
        this.scrollToBottom();
    }

    handleFailState() {
        console.log('💀 游戏结束 - 触发失败状态');
        
        // Display game over message
        this.addMessage('🎮 游戏结束', 'assistant');
        
        // Disable chat functionality
        this.chatInput.disabled = true;
        this.sendBtn.disabled = true;
        this.chatInput.placeholder = '游戏结束 - 聊天已禁用';
        this.sendBtn.innerHTML = '<i class="fas fa-ban"></i> 已禁用';
        this.sendBtn.style.opacity = '0.5';
        this.sendBtn.style.cursor = 'not-allowed';
        
        // Automatically save the fail result without showing completion button
        this.saveGameResult('fail');
        
        this.scrollToBottom();
    }

    showCompletionButton(gameResult) {
        // This function is no longer needed for automatic completion
        // But keeping it for potential future use
        console.log('Completion button function called but not needed for automatic completion');
        return;
    }

    saveGameResult(gameResult) {
        console.log(`💾 保存游戏结果: ${gameResult}`);
        
        // Generate unique ID
        const resultId = this.generateUniqueId();
        
        // Collect chat history
        const chatHistory = this.messages.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: new Date().toISOString()
        }));
        
        console.log('📝 正在保存的聊天历史:', chatHistory);
        console.log('💬 总消息数:', this.messages.length);
        
        const result = {
            id: resultId + 'ai1',
            gameResult: gameResult, // 'success' or 'fail'
            timestamp: new Date().toISOString(),
            task: 'ai_conversation_game',
            chatHistory: chatHistory,
            conversationRounds: 0,
            taskType: 'AI Chat 1 - 游戏模式',
            finalState: gameResult === 'success' ? '游戏胜利' : '游戏结束'
        };

        console.log('📊 完整结果对象:', result);

        // Save to localStorage
        const existingResults = JSON.parse(localStorage.getItem('airesults') || '[]');
        existingResults.push(result);
        localStorage.setItem('airesults', JSON.stringify(existingResults));
        
        console.log('💾 已保存到 localStorage. 所有结果:', existingResults);

        // Also save to central storage
        this.saveToCentralStorage(result);
        
        // Show completion message
        const statusMessage = gameResult === 'success' 
            ? '🎉 游戏成功完成！' 
            : '💀 游戏结束已记录！';
        this.addMessage(`✅ ${statusMessage} 您的结果 "${gameResult}" 已保存，ID为: ${result.id}`, 'assistant');
        
        // Show link to results page
        setTimeout(() => {
            this.addMessage('📊 查看所有结果: <a href="airesult.html" target="_blank" style="color: var(--secondary-color);">结果页面</a>', 'assistant');
        }, 1000);
    }



    generateUniqueId() {
        // Generate 6-digit sequential ID
        const existingResults = JSON.parse(localStorage.getItem('airesults') || '[]');
        return String(existingResults.length + 1).padStart(6, '0');
    }

    // 清除会话数据，确保每次刷新都是干净状态
    clearSessionData() {
        console.log('🧹 清除 AI1 会话数据，准备全新对话...');
        
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
            this.chatInput.placeholder = '输入您的消息...';
        }
        if (this.sendBtn) {
            this.sendBtn.disabled = false;
            this.sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 发送';
        }
        
        console.log('✅ AI1 会话数据已清除，准备全新对话');
        console.log('📝 消息数组已重置:', this.messages);
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

            console.log('🌐 尝试将结果保存到中央存储 (AI1):', enhancedResult);
            
            // Use the same central storage as AI Chat 1
            const centralResults = JSON.parse(localStorage.getItem('centralResults') || '[]');
            centralResults.push(enhancedResult);
            localStorage.setItem('centralResults', JSON.stringify(centralResults));
            
            console.log('📡 已保存到中央存储模拟 (AI1):', enhancedResult);
            
        } catch (error) {
            console.error('❌ 无法保存到中央存储 (AI1):', error);
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