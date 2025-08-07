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
        
        // Gift selection options
        this.giftOptions = [
            'Adjustable brightness reading lamp',
            'Creative portable water bottle', 
            'Desktop mini plant (easy-care cactus)',
            'Vintage style notebook',
            'Scented candle gift box'
        ];
        
        this.optionMapping = {}; // Will store A->actual option mapping
        
        this.initializeElements();
        this.bindEvents();
        this.loadApiKey();
        this.initializeUI();
        this.randomizeOptions();
        
        // 确保在线配置立即生效
        this.ensureOnlineConfigActive();
    }

    // 确保在线配置立即生效
    ensureOnlineConfigActive() {
        console.log('🔧 Ensuring online config is active...');
        
        // 等待在线配置加载完成
        const checkOnlineConfig = () => {
            if (window.onlineGlobalConfig && window.onlineGlobalConfig.currentConfig) {
                const onlineConfig = window.onlineGlobalConfig.getAI1Config();
                console.log('🎯 Forcing online config application:', onlineConfig);
                
                // 强制应用在线配置
                if (onlineConfig.systemPrompt) {
                    this.config.systemPrompt = onlineConfig.systemPrompt;
                    console.log('✅ System prompt forcefully updated to:', this.config.systemPrompt);
                }
                if (onlineConfig.model) {
                    this.config.model = onlineConfig.model;
                }
                if (onlineConfig.apiParams) {
                    this.config.apiParams = { ...this.config.apiParams, ...onlineConfig.apiParams };
                }
                
                console.log('🚀 Final AI1 config after force update:', this.config);
            } else {
                console.log('⏳ Online config not ready, retrying in 1 second...');
                setTimeout(checkOnlineConfig, 1000);
            }
        };
        
        // 立即检查，如果不可用则每秒重试
        checkOnlineConfig();
    }

    loadConfig() {
        // Load default config first
        let config = JSON.parse(JSON.stringify(window.AI_CONFIG || {}));
        console.log('📋 Default AI1 config loaded:', config);
        
        try {
            // PRIORITY 1: Check for ONLINE GLOBAL configuration
            if (window.onlineGlobalConfig) {
                const onlineConfig = window.onlineGlobalConfig.getAI1Config();
                console.log('☁️ Loading ONLINE GLOBAL AI1 config:', onlineConfig);
                
                if (onlineConfig.model) config.model = onlineConfig.model;
                if (onlineConfig.systemPrompt) config.systemPrompt = onlineConfig.systemPrompt;
                if (onlineConfig.apiParams) {
                    config.apiParams = { ...config.apiParams, ...onlineConfig.apiParams };
                }
                
                console.log('✅ AI1 config updated with ONLINE GLOBAL settings:', config);
                console.log('🕐 Online config version:', window.onlineGlobalConfig.configVersion);
            }
            // PRIORITY 2: Check for FILE-BASED GLOBAL configuration from global-config.js
            else if (window.GLOBAL_AI1_CONFIG) {
                const globalConfig = window.GLOBAL_AI1_CONFIG;
                console.log('🌍 Loading FILE-BASED GLOBAL AI1 config:', globalConfig);
                
                if (globalConfig.model) config.model = globalConfig.model;
                if (globalConfig.systemPrompt) config.systemPrompt = globalConfig.systemPrompt;
                if (globalConfig.maxTokens) {
                    config.apiParams = config.apiParams || {};
                    config.apiParams.max_tokens = globalConfig.maxTokens;
                }
                if (globalConfig.temperature !== undefined) {
                    config.apiParams = config.apiParams || {};
                    config.apiParams.temperature = globalConfig.temperature;
                }
                
                console.log('✅ AI1 config updated with FILE-BASED GLOBAL settings:', config);
                console.log('🕐 Global config version:', window.GLOBAL_CONFIG_VERSION);
            } else {
                // PRIORITY 3: Fallback to localStorage global config
                const globalConfigStr = localStorage.getItem('global_ai1_config');
                console.log('🌐 Checking for localStorage global_ai1_config:', globalConfigStr);
                
                if (globalConfigStr) {
                    const parsed = JSON.parse(globalConfigStr);
                    console.log('🔧 Loading localStorage GLOBAL AI config:', parsed);
                
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
                
                    console.log('✅ AI1 config updated with localStorage GLOBAL settings:', config);
                } else {
                    // PRIORITY 4: Fallback to legacy user-specific config
                    const customConfigStr = localStorage.getItem('ai1_custom_config');
                    console.log('🔍 Checking localStorage for ai1_custom_config (legacy):', customConfigStr);
                    
                    if (customConfigStr) {
                        const parsed = JSON.parse(customConfigStr);
                        console.log('🔧 Loading legacy custom AI1 config:', parsed);
                        
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
                        
                        console.log('✅ AI1 config updated with legacy custom settings:', config);
                    } else {
                        console.log('ℹ️ No custom AI1 config found, using defaults');
                    }
                }
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

        // Check if chat is disabled after task submission
        if (this.chatInput.disabled) {
            this.showError('Chat has been disabled after task submission.');
            return;
        }

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
        
        // Also disable task if enabled
        if (this.taskInput) {
            this.taskInput.disabled = true;
        }
        if (this.submitBtn) {
            this.submitBtn.disabled = true;
        }
        
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
        
        // Add button to the task section or chat container
        const taskSection = document.getElementById('task-section');
        const chatContainer = document.getElementById('chat-container');
        
        if (taskSection) {
            taskSection.appendChild(completionButton);
        } else if (chatContainer && chatContainer.parentNode) {
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
            id: resultId + 'ai',
            gameResult: gameResult, // 'success' or 'fail'
            timestamp: new Date().toISOString(),
            task: 'ai_conversation_game',
            chatHistory: chatHistory,
            conversationRounds: this.conversationRounds,
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
        
        console.log('📝 Chat history being saved:', chatHistory);
        console.log('💬 Total messages:', this.messages.length);
        
        const result = {
            id: resultId + 'ai',
            answer: answer,
            answerContent: this.optionMapping[answer], // Store the actual content
            timestamp: new Date().toISOString(),
            task: 'gift_selection',
            chatHistory: chatHistory,
            conversationRounds: this.conversationRounds,
            taskType: 'AI Chat 1',
            optionMapping: this.optionMapping // Store full mapping for reference
        };

        console.log('📊 Complete result object:', result);

        // Save to localStorage
        const existingResults = JSON.parse(localStorage.getItem('airesults') || '[]');
        existingResults.push(result);
        localStorage.setItem('airesults', JSON.stringify(existingResults));
        
        console.log('💾 Saved to localStorage. All results:', existingResults);

        // Also save to central storage
        this.saveToCentralStorage(result);

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

    // Generate seeded random number
    seededRandom(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    // Shuffle array with seed for consistent randomization
    shuffleWithSeed(array, seed) {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(this.seededRandom(seed + i) * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }

    // Randomize gift options and update DOM
    randomizeOptions() {
        // Generate a unique session seed for this visitor
        const sessionSeed = Date.now() + Math.random() * 1000;
        localStorage.setItem('sessionSeed', sessionSeed.toString());
        
        // Shuffle the gift options using the session seed
        const shuffled = this.shuffleWithSeed(this.giftOptions, sessionSeed);
        const letters = ['A', 'B', 'C', 'D', 'E'];
        
        // Create mapping
        letters.forEach((letter, index) => {
            this.optionMapping[letter] = shuffled[index];
        });
        
        // Update DOM
        const taskOptions = document.querySelector('.task-options');
        if (taskOptions) {
            const optionElements = taskOptions.querySelectorAll('.option');
            optionElements.forEach((element, index) => {
                const letter = letters[index];
                element.innerHTML = `<span class="option-label">${letter}.</span> ${shuffled[index]}`;
            });
        }
        
        console.log('🎲 Gift options randomized with seed:', sessionSeed, this.optionMapping);
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
            const RESULTS_ENDPOINT = 'https://api.jsonbin.io/v3/b/6892ab887b4b8670d8ae42e0'; // Results storage bin
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