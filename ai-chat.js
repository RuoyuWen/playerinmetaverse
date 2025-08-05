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
        this.config = this.loadConfig();
        this.conversationRounds = 0;
        this.taskEnabled = false;
        
        this.initializeElements();
        this.bindEvents();
        this.loadApiKey();
        this.initializeUI();
    }

    loadConfig() {
        // Load default config first
        let config = JSON.parse(JSON.stringify(window.AI_CONFIG || {}));
        console.log('📋 Default AI1 config loaded:', config);
        
        try {
            // Load custom config from localStorage if exists
            const customConfigStr = localStorage.getItem('ai1_custom_config');
            console.log('🔍 Checking localStorage for ai1_custom_config:', customConfigStr);
            
            if (customConfigStr) {
                const parsed = JSON.parse(customConfigStr);
                console.log('🔧 Loading custom AI1 config:', parsed);
                
                // Override specific settings
                if (parsed.model) config.model = parsed.model;
                if (parsed.systemPrompt) config.systemPrompt = parsed.systemPrompt;
                if (parsed.maxTokens) {
                    config.apiParams = config.apiParams || {};
                    config.apiParams.max_tokens = parsed.maxTokens;
                }
                if (parsed.temperature !== undefined) {
                    config.apiParams = config.apiParams || {};
                    config.apiParams.temperature = parsed.temperature;
                }
                
                console.log('✅ AI1 config updated with custom settings:', config);
            } else {
                console.log('ℹ️ No custom AI1 config found, using defaults');
            }
        } catch (error) {
            console.error('❌ Error loading custom AI1 config:', error);
        }
        
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
        this.taskSection = document.getElementById('task-section');
        this.taskInput = document.getElementById('task-answer');
        this.submitBtn = document.getElementById('submit-task');
        this.taskHint = document.getElementById('task-hint');
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

        // Task-related event listeners
        this.taskInput.addEventListener('input', (e) => {
            const value = e.target.value.toUpperCase();
            if (['A', 'B', 'C', 'D', 'E'].includes(value)) {
                this.submitBtn.style.display = 'block';
            } else {
                this.submitBtn.style.display = 'none';
            }
        });

        this.submitBtn.addEventListener('click', () => this.submitTask());
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
            this.addMessage(response, 'assistant');
            
            // Increment conversation rounds AFTER successful AI response
            this.conversationRounds++;
            console.log(`💬 Round ${this.conversationRounds} completed`);
            
            // Check if task should be enabled after AI responds
            if (this.conversationRounds >= 3 && !this.taskEnabled) {
                console.log('✅ 3 rounds reached - enabling task!');
                setTimeout(() => {
                    this.enableTask();
                }, 500); // Small delay to ensure message is displayed first
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
                stream: false
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`API Error: ${error.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        const assistantMessage = data.choices[0].message.content;
        
        // Add assistant response to conversation history
        this.messages.push({ role: 'assistant', content: assistantMessage });

        // Keep conversation history reasonable (从配置文件获取历史长度限制)
        const maxHistory = this.config.maxHistoryLength || 20;
        if (this.messages.length > maxHistory) {
            this.messages = this.messages.slice(-maxHistory);
        }

        return assistantMessage;
    }

    addMessage(message, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // 从配置文件获取标签文本
        const userLabel = this.config.ui?.userLabel || '您';
        const assistantLabel = this.config.ui?.assistantLabel || 'AI助手';
        
        if (sender === 'user') {
            contentDiv.innerHTML = `<strong>${userLabel}:</strong> ${this.escapeHtml(message)}`;
        } else {
            contentDiv.innerHTML = `<strong>${assistantLabel}:</strong> ${this.formatMessage(message)}`;
        }
        
        messageDiv.appendChild(contentDiv);
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

    enableTask() {
        console.log('🎯 Enabling task - 3 rounds completed!');
        
        this.taskEnabled = true;
        
        if (this.taskInput) {
            this.taskInput.disabled = false;
            this.taskInput.placeholder = 'Enter A, B, C, D, or E';
            // Add visual indication that task is now enabled
            this.taskInput.style.borderColor = '#9d4edd';
            this.taskInput.style.opacity = '1';
            this.taskInput.style.background = 'rgba(0, 0, 0, 0.3)';
            this.taskInput.style.boxShadow = '0 0 10px rgba(157, 78, 221, 0.3)';
        }
        
        // Hide the hint message
        if (this.taskHint) {
            this.taskHint.style.display = 'none';
        }
        
        // Add a message about task activation
        this.addMessage('🎯 Great! You\'ve had a good conversation. Now you can complete the task below:', 'assistant');
        this.scrollToBottom();
    }

    submitTask() {
        const answer = this.taskInput.value.toUpperCase();
        if (!['A', 'B', 'C', 'D', 'E'].includes(answer)) {
            alert('Please enter a valid choice: A, B, C, D, or E');
            return;
        }

        // Generate unique ID and record the result
        const resultId = this.generateUniqueId();
        
        // 收集聊天记录
        const chatHistory = this.messages.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: new Date().toISOString()
        }));
        
        const result = {
            id: resultId + 'ai',
            answer: answer,
            timestamp: new Date().toISOString(),
            task: 'gift_selection',
            chatHistory: chatHistory,
            conversationRounds: this.conversationRounds,
            taskType: 'AI Chat 1'
        };

        // Save to localStorage
        const existingResults = JSON.parse(localStorage.getItem('airesults') || '[]');
        existingResults.push(result);
        localStorage.setItem('airesults', JSON.stringify(existingResults));

        // Disable task section and show confirmation
        this.taskInput.disabled = true;
        this.submitBtn.disabled = true;
        this.submitBtn.textContent = 'Submitted ✓';
        
        // Disable chat functionality after task submission
        this.chatInput.disabled = true;
        this.sendBtn.disabled = true;
        this.chatInput.placeholder = 'Chat disabled after task submission';
        this.sendBtn.innerHTML = '<i class="fas fa-ban"></i> Disabled';
        
        this.addMessage(`✅ Task completed! Your answer "${answer}" has been recorded with ID: ${result.id}`, 'assistant');
        this.addMessage('🔒 Chat functionality has been disabled after task submission.', 'assistant');
        
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
}

// Initialize AI Chat when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.aiChatInstance = new AIChat();
});