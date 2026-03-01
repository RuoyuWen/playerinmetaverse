/**
 * AI Chat Functionality
 * ⚠️ 安全警告：这是演示代码，不应在生产环境中使用！
 * 在真实项目中，API key应该保存在后端服务器中。
 */

class AIChat {
    constructor() {
        this.apiKey = '';
        this.messages = [];
        this.isTyping = false;
        this.config = {};
        this.loadConfig();

        this.initializeElements();
        this.bindEvents();
        this.loadApiKey();
        
        // 确保每次页面刷新都是干净的状态
        this.clearSessionData();
        
        this.initializeUI();
    }

    loadConfig() {
        // Load default config first (which is now AI_CONFIG from local file)
        let config = JSON.parse(JSON.stringify(window.AI_CONFIG || {}));
        console.log('📋 Default AI2 config loaded:', config);
        
        try {
            // PRIORITY 1: Use LOCAL CONFIG FILES (ai-config.js) - Highest Priority
            if (window.AI_CONFIG) {
                console.log('📁 Using LOCAL AI2 config from ai-config.js');
                // Local config is already loaded as default, no need to override
                console.log('✅ AI2 config using LOCAL FILE settings:', config);
                console.log('🕐 Source: Local config file (ai-config.js)');
            }
            // PRIORITY 2: Check for FILE-BASED GLOBAL configuration from global-config.js
            else if (window.globalConfig) {
                console.log('📁 Loading FILE-BASED GLOBAL AI2 config');
                const globalConfig = window.globalConfig.getAI2Config();
                
                if (globalConfig.model) config.model = globalConfig.model;
                if (globalConfig.systemPrompt) config.systemPrompt = globalConfig.systemPrompt;
                if (globalConfig.apiParams) {
                    config.apiParams = { ...config.apiParams, ...globalConfig.apiParams };
                }
                
                console.log('✅ AI2 config updated with FILE-BASED GLOBAL settings:', config);
                console.log('🕐 Source: global-config.js');
            }
            // PRIORITY 3: Check for LOCALSTORAGE GLOBAL configuration
            else if (localStorage.getItem('globalConfig')) {
                try {
                    const storedConfig = JSON.parse(localStorage.getItem('globalConfig'));
                    const ai2Config = storedConfig.ai2 || storedConfig;
                    console.log('💾 Loading LOCALSTORAGE GLOBAL AI2 config:', ai2Config);
                    
                    if (ai2Config.model) config.model = ai2Config.model;
                    if (ai2Config.systemPrompt) config.systemPrompt = ai2Config.systemPrompt;
                    if (ai2Config.apiParams) {
                        config.apiParams = { ...config.apiParams, ...ai2Config.apiParams };
                    }
                    
                    console.log('✅ AI2 config updated with LOCALSTORAGE GLOBAL settings:', config);
                    console.log('🕐 Source: localStorage');
                } catch (error) {
                    console.warn('⚠️ Failed to parse localStorage global config:', error);
                }
            }
            // PRIORITY 4: Check for LEGACY USER-SPECIFIC configuration
            else if (localStorage.getItem('ai2Config')) {
                try {
                    const storedConfig = JSON.parse(localStorage.getItem('ai2Config'));
                    console.log('💾 Loading LEGACY USER-SPECIFIC AI2 config:', storedConfig);
                    
                    if (storedConfig.model) config.model = storedConfig.model;
                    if (storedConfig.systemPrompt) config.systemPrompt = storedConfig.systemPrompt;
                    if (storedConfig.apiParams) {
                        config.apiParams = { ...config.apiParams, ...storedConfig.apiParams };
                    }
                    
                    console.log('✅ AI2 config updated with LEGACY USER-SPECIFIC settings:', config);
                    console.log('🕐 Source: localStorage (legacy)');
                } catch (error) {
                    console.warn('⚠️ Failed to parse legacy user-specific config:', error);
                }
            }
            
            // Apply the final configuration
            this.config = config;
            console.log('🎯 Final AI2 configuration applied:', this.config);
            
        } catch (error) {
            console.error('❌ Error loading AI2 configuration:', error);
            // Use the default config that was loaded at the beginning
            this.config = config;
        }
    }

    // Add method to refresh config
    refreshConfig() {
        console.log('🔄 Refreshing AI2 configuration...');
        this.loadConfig();
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
            localStorage.setItem('openai_api_key', this.apiKey);
        });

        // Auto-resize textarea
        this.chatInput.addEventListener('input', () => {
            this.chatInput.style.height = 'auto';
            this.chatInput.style.height = this.chatInput.scrollHeight + 'px';
        });


    }

    loadApiKey() {
        const savedKey = localStorage.getItem('openai_api_key');
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
            this.typingText.textContent = this.config.ui.typingText || 'AI正在思考中...';
            
            // 添加欢迎消息
            if (this.config.ui.welcomeMessage) {
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
            // Call OpenAI API
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
            this.showError('抱歉，AI助手暂时无法回应。请检查API Key或稍后重试。');
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

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
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

        return parsedResponse;
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
        const assistantLabel = this.config.ui?.assistantLabel || 'Lucy';
        
        if (sender === 'user') {
            // User avatar - neutral
            avatarDiv.innerHTML = `<div class="avatar user-avatar">👤</div>`;
            contentDiv.innerHTML = `<strong>${userLabel}:</strong> ${this.escapeHtml(message)}`;
        } else {
            // AI Chat 1 - Female avatar
            avatarDiv.innerHTML = `<div class="avatar ai-avatar female-avatar">👩‍💼</div>`;
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
        
        // Automatically save the success result without showing completion button
        this.saveGameResult('success');
        
        this.scrollToBottom();
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
            id: resultId + 'ai',
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
        console.log('🧹 Clearing session data for fresh start...');
        
        // 清除可能存在的会话相关数据
        localStorage.removeItem('sessionSeed');
        localStorage.removeItem('ai_chat_messages');
        localStorage.removeItem('ai_chat_state');
        localStorage.removeItem('ai_conversation_history');
        localStorage.removeItem('ai_chat_context');
        
        // 重置消息数组 - 这是关键！
        this.messages = [];
        
        // 清除聊天容器内容
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
        
        console.log('✅ Session data cleared, ready for fresh conversation');
        console.log('📝 Messages array reset:', this.messages);
    }



    // Save result to central storage (Cloud-based using JSONBin)
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

            console.log('🌐 Attempting to save to central cloud storage:', enhancedResult);
            
            // Try to save to cloud storage (using same system as global config)
            const cloudSaved = await this.saveToCloudStorage(enhancedResult);
            
            if (cloudSaved) {
                console.log('☁️ Successfully saved to cloud storage');
            } else {
                console.log('⚠️ Cloud save failed, using localStorage backup');
            }
            
            // Always save to localStorage as backup
            const centralResults = JSON.parse(localStorage.getItem('centralResults') || '[]');
            centralResults.push(enhancedResult);
            localStorage.setItem('centralResults', JSON.stringify(centralResults));
            
            console.log('📡 Saved to central storage (local backup):', enhancedResult);
            
        } catch (error) {
            console.error('❌ Failed to save to central storage:', error);
        }
    }

    // Save individual result to cloud storage
    async saveToCloudStorage(result) {
        try {
            // Use a dedicated JSONBin for storing chat results
            const RESULTS_ENDPOINT = 'https://api.jsonbin.io/v3/b/6892ab887b4b8670d8ae42df'; // Results storage bin (same as config)
            const API_KEY = '$2a$10$XIZ3tMFNAQ56XbxSVUR2NeboaNtWqUvRveuIUkDQ1ceUUjPgHQzBq'; // Same API key as config
            
            // Get existing results from cloud
            let existingResults = [];
            try {
                const getResponse = await fetch(`${RESULTS_ENDPOINT}/latest`, {
                    method: 'GET',
                    headers: {
                        'X-Master-Key': API_KEY
                    }
                });
                
                if (getResponse.ok) {
                    const data = await getResponse.json();
                    existingResults = data.record?.results || [];
                }
            } catch (e) {
                console.log('📋 No existing results found, starting fresh');
            }
            
            // Add new result
            existingResults.push(result);
            
            // Save updated results back to cloud
            const saveData = {
                version: Date.now(),
                lastUpdated: new Date().toISOString(),
                results: existingResults
            };
            
            const response = await fetch(RESULTS_ENDPOINT, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': API_KEY
                },
                body: JSON.stringify(saveData)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const responseData = await response.json();
            console.log('✅ Result saved to cloud successfully:', responseData);
            return true;
            
        } catch (error) {
            console.error('❌ Failed to save result to cloud:', error);
            return false;
        }
    }

    // Generate simple fingerprint for user tracking
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
    window.aiChatInstance = new AIChat();
});