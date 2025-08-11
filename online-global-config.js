/**
 * Online Global Configuration System
 * This system enables real-time global configuration updates without manual file deployment
 * Uses external cloud storage for true cross-device configuration synchronization
 */

class OnlineGlobalConfig {
    constructor() {
        this.configEndpoint = 'https://api.jsonbin.io/v3/b/6892ab887b4b8670d8ae42df'; // Your JSONBin ID
        this.apiKey = '$2a$10$XIZ3tMFNAQ56XbxSVUR2NeboaNtWqUvRveuIUkDQ1ceUUjPgHQzBq'; // Your correct JSONBin API key
        this.fallbackConfig = this.getDefaultConfig();
        this.currentConfig = null;
        this.configVersion = null;
        
        // Try to load config immediately
        this.loadConfig();
    }

    // Default configuration fallback
    getDefaultConfig() {
        return {
            version: Date.now(),
            lastUpdated: new Date().toISOString(),
            ai1: {
                model: 'gpt-4o',
                systemPrompt: `你是Tom，一个需要帮助做决定的AI助手。你必须始终返回JSON格式的回答。

你的角色：
- 你是Tom，一个友好的男性AI助手
- 你需要用户帮助你做各种决定
- 保持友好、有帮助的语调，用中文回答问题

JSON格式要求：
{
  "content": "你的回答内容",
  "class": "游戏状态"
}

游戏状态说明：
- "success": 当用户给出了很好的建议、帮助解决了问题、或完成了帮助任务时
- "fail": 当用户给出了不当的建议、说了冒犯性话语、或拒绝帮助时
- "none": 正常对话，继续寻求帮助

注意：在对话达到一定深度后，适当时候返回"success"来结束游戏。

示例：
对话初期：{"content": "谢谢你的帮助！", "class": "none"}
任务完成时：{"content": "太棒了！你的建议真的帮了我很多。", "class": "success"}`,
                maxTokens: 1500,
                temperature: 0.7
            },
            ai2: {
                model: 'gpt-4.1',
                systemPrompt: `你是Lucy，一个需要帮助做决定的AI助手。你必须始终返回JSON格式的回答。

你的角色：
- 你是Lucy，一个友好的女性AI助手
- 你需要用户帮助你做各种决定
- 保持友好、有帮助的语调，用中文回答问题

JSON格式要求：
{
  "content": "你的回答内容",
  "class": "游戏状态"
}

游戏状态说明：
- "success": 当用户给出了很好的建议、帮助解决了问题、或完成了帮助任务时
- "fail": 当用户给出了不当的建议、说了冒犯性话语、或拒绝帮助时
- "none": 正常对话，继续寻求帮助

注意：在对话达到一定深度后，适当时候返回"success"来结束游戏。

示例：
对话初期：{"content": "谢谢你的帮助！", "class": "none"}
任务完成时：{"content": "太棒了！你的建议真的帮了我很多。", "class": "success"}`,
                maxTokens: 1500,
                temperature: 0.7
            },
            results: [] // Add results array to match cloud structure
        };
    }

    // Load configuration from cloud storage
    async loadConfig() {
        try {
            console.log('🌐 Loading online global configuration...');
            
            // Try to load from cloud storage
            const cloudConfig = await this.fetchFromCloud();
            if (cloudConfig) {
                // Validate cloud config structure
                if (this.validateConfigStructure(cloudConfig)) {
                    this.currentConfig = cloudConfig;
                    this.configVersion = cloudConfig.version;
                    console.log('✅ Online global config loaded:', cloudConfig);
                    return cloudConfig;
                } else {
                    console.warn('⚠️ Cloud config has invalid structure, using fallback');
                }
            }
            
            // Fallback to local storage cache
            const cachedConfig = this.loadFromCache();
            if (cachedConfig && this.validateConfigStructure(cachedConfig)) {
                this.currentConfig = cachedConfig;
                this.configVersion = cachedConfig.version;
                console.log('📦 Using cached global config:', cachedConfig);
                return cachedConfig;
            }
            
            // Final fallback to default
            this.currentConfig = this.fallbackConfig;
            this.configVersion = this.fallbackConfig.version;
            console.log('⚙️ Using default global config');
            return this.fallbackConfig;
            
        } catch (error) {
            console.error('❌ Error loading global config:', error);
            
            // Use cached or default config
            const cachedConfig = this.loadFromCache();
            if (cachedConfig && this.validateConfigStructure(cachedConfig)) {
                this.currentConfig = cachedConfig;
                this.configVersion = cachedConfig.version;
                return cachedConfig;
            }
            
            this.currentConfig = this.fallbackConfig;
            this.configVersion = this.fallbackConfig.version;
            return this.fallbackConfig;
        }
    }

    // Validate configuration structure
    validateConfigStructure(config) {
        return config && 
               config.ai1 && 
               config.ai2 && 
               typeof config.ai1.model === 'string' &&
               typeof config.ai2.model === 'string';
    }

    // Fetch configuration from cloud storage
    async fetchFromCloud() {
        try {
            // Using JSONBin.io as example (free service for JSON storage)
            const response = await fetch(`${this.configEndpoint}/latest`, {
                method: 'GET',
                headers: {
                    'X-Master-Key': this.apiKey
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const responseData = await response.json();
            
            // JSONBin returns data in a "record" wrapper for private bins
            const config = responseData.record || responseData;
            
            // Cache the config locally for offline use
            this.saveToCache(config);
            
            return config;
        } catch (error) {
            console.warn('🔄 Cloud config fetch failed:', error.message);
            return null;
        }
    }

    // Save configuration to cloud storage
    async saveToCloud(config) {
        try {
            console.log('💾 Saving global config to cloud...');
            console.log('🔗 Endpoint:', this.configEndpoint);
            console.log('🔑 API Key (first 10 chars):', this.apiKey ? this.apiKey.substring(0, 10) + '...' : 'NOT SET');
            
            const response = await fetch(this.configEndpoint, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': this.apiKey
                },
                body: JSON.stringify(config)
            });

            console.log('📊 Response status:', response.status);
            console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                // Try to get more error details
                let errorDetails = 'Unknown error';
                try {
                    const errorResponse = await response.text();
                    console.log('❌ Error response body:', errorResponse);
                    errorDetails = errorResponse;
                } catch (e) {
                    console.log('❌ Could not parse error response');
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}. Details: ${errorDetails}`);
            }

            const result = await response.json();
            
            // Update local cache
            this.saveToCache(config);
            this.currentConfig = config;
            this.configVersion = config.version;
            
            console.log('✅ Global config saved to cloud successfully');
            return result;
            
        } catch (error) {
            console.error('❌ Failed to save config to cloud:', error);
            throw error;
        }
    }

    // Cache configuration locally
    saveToCache(config) {
        try {
            localStorage.setItem('online_global_config_cache', JSON.stringify(config));
            localStorage.setItem('online_global_config_timestamp', Date.now().toString());
        } catch (error) {
            console.warn('⚠️ Failed to cache config locally:', error);
        }
    }

    // Load configuration from local cache
    loadFromCache() {
        try {
            const cached = localStorage.getItem('online_global_config_cache');
            const timestamp = localStorage.getItem('online_global_config_timestamp');
            
            if (cached && timestamp) {
                const cacheAge = Date.now() - parseInt(timestamp);
                // Use cache if less than 1 hour old
                if (cacheAge < 3600000) {
                    return JSON.parse(cached);
                }
            }
            return null;
        } catch (error) {
            console.warn('⚠️ Failed to load cached config:', error);
            return null;
        }
    }

    // Get current configuration
    getConfig() {
        return this.currentConfig || this.fallbackConfig;
    }

    // Get AI1 configuration
    getAI1Config() {
        const config = this.getConfig();
        return {
            model: config.ai1.model,
            systemPrompt: config.ai1.systemPrompt,
            apiParams: {
                max_tokens: config.ai1.maxTokens,
                temperature: config.ai1.temperature
            }
        };
    }

    // Get AI2 configuration
    getAI2Config() {
        const config = this.getConfig();
        return {
            model: config.ai2.model,
            systemPrompt: config.ai2.systemPrompt,
            apiParams: {
                max_tokens: config.ai2.maxTokens,
                temperature: config.ai2.temperature
            }
        };
    }

    // Update configuration (admin function)
    async updateConfig(newConfig) {
        try {
            const updatedConfig = {
                ...newConfig,
                version: Date.now(),
                lastUpdated: new Date().toISOString()
            };

            await this.saveToCloud(updatedConfig);
            
            // Notify all listeners about config change
            this.notifyConfigChange(updatedConfig);
            
            return updatedConfig;
        } catch (error) {
            console.error('❌ Failed to update global config:', error);
            throw error;
        }
    }

    // Notify about configuration changes
    notifyConfigChange(newConfig) {
        // Dispatch custom event for other parts of the application
        const event = new CustomEvent('globalConfigChanged', {
            detail: { config: newConfig, version: newConfig.version }
        });
        window.dispatchEvent(event);
        
        console.log('📢 Global config change notification sent');
    }

    // Check for configuration updates
    async checkForUpdates() {
        try {
            const cloudConfig = await this.fetchFromCloud();
            if (cloudConfig && cloudConfig.version > this.configVersion) {
                console.log('🔄 New global config version available');
                this.currentConfig = cloudConfig;
                this.configVersion = cloudConfig.version;
                this.notifyConfigChange(cloudConfig);
                return true;
            }
            return false;
        } catch (error) {
            console.warn('⚠️ Failed to check for config updates:', error);
            return false;
        }
    }

    // Start automatic update checking
    startAutoUpdate(intervalMinutes = 5) {
        setInterval(() => {
            this.checkForUpdates();
        }, intervalMinutes * 60 * 1000);
        
        console.log(`🔄 Auto-update started (every ${intervalMinutes} minutes)`);
    }
}

// Global instance
window.onlineGlobalConfig = new OnlineGlobalConfig();

// Auto-start update checking
window.onlineGlobalConfig.startAutoUpdate(5);

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OnlineGlobalConfig;
}