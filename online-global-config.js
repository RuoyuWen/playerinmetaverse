/**
 * Online Global Configuration System
 * This system enables real-time global configuration updates without manual file deployment
 * Uses external cloud storage for true cross-device configuration synchronization
 */

class OnlineGlobalConfig {
    constructor() {
        this.configEndpoint = 'https://api.jsonbin.io/v3/b/6892ab887b4b8670d8ae42df'; // Your JSONBin ID
        this.apiKey = '$2a$10$XIZ3tMFNAQ56XbxSVUR2NeboaNtWqUvRveuIUkDQ1ceUUjPgHQzBq'; // Your correct JSONBin API key
        this.fallbackConfig = null; // Will be set after DOM is ready
        this.currentConfig = null;
        this.configVersion = null;
        
        // Wait for DOM to be ready before loading configs
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.fallbackConfig = this.getDefaultConfig();
                this.loadConfig();
            });
        } else {
            this.fallbackConfig = this.getDefaultConfig();
            this.loadConfig();
        }
    }

    // Default configuration fallback - Now uses local config files
    getDefaultConfig() {
        console.log('🔧 Getting default config from local files...');
        
        // PRIORITY 1: Try to use local config files first
        if (window.AI1_CONFIG && window.AI_CONFIG) {
            console.log('✅ Local config files found, using them as default');
            return {
                version: Date.now(),
                lastUpdated: new Date().toISOString(),
                ai1: {
                    model: window.AI1_CONFIG.model || 'gpt-4o',
                    systemPrompt: window.AI1_CONFIG.systemPrompt || 'Default AI1 prompt',
                    maxTokens: window.AI1_CONFIG.apiParams?.max_tokens || 1500,
                    temperature: window.AI1_CONFIG.apiParams?.temperature || 0.7
                },
                ai2: {
                    model: window.AI_CONFIG.model || 'gpt-4.1',
                    systemPrompt: window.AI_CONFIG.systemPrompt || 'Default AI2 prompt',
                    maxTokens: window.AI_CONFIG.apiParams?.max_tokens || 1500,
                    temperature: window.AI_CONFIG.apiParams?.temperature || 0.7
                },
                results: []
            };
        }
        
        // PRIORITY 2: Fallback to hardcoded defaults (only if local files not available)
        console.log('⚠️ Local config files not available, using hardcoded defaults');
        return {
            version: Date.now(),
            lastUpdated: new Date().toISOString(),
            ai1: {
                model: 'gpt-4o',
                systemPrompt: 'Default AI1 prompt',
                maxTokens: 1500,
                temperature: 0.7
            },
            ai2: {
                model: 'gpt-4.1',
                systemPrompt: 'Default AI2 prompt',
                maxTokens: 1500,
                temperature: 0.7
            },
            results: []
        };
    }

    // Load configuration - NOW DISABLED: Always returns local configs
    async loadConfig() {
        console.log('🚫 Online configuration loading DISABLED - using local configs only');
        
        // Always use local config files, never fetch from cloud
        if (window.AI1_CONFIG && window.AI_CONFIG) {
            console.log('✅ Using local config files directly');
            this.currentConfig = {
                version: Date.now(),
                lastUpdated: new Date().toISOString(),
                ai1: {
                    model: window.AI1_CONFIG.model || 'gpt-4o',
                    systemPrompt: window.AI1_CONFIG.systemPrompt || 'Default AI1 prompt',
                    maxTokens: window.AI1_CONFIG.apiParams?.max_tokens || 1500,
                    temperature: window.AI1_CONFIG.apiParams?.temperature || 0.7
                },
                ai2: {
                    model: window.AI_CONFIG.model || 'gpt-4.1',
                    systemPrompt: window.AI_CONFIG.systemPrompt || 'Default AI2 prompt',
                    maxTokens: window.AI_CONFIG.apiParams?.max_tokens || 1500,
                    temperature: window.AI_CONFIG.apiParams?.temperature || 0.7
                },
                results: []
            };
            this.configVersion = this.currentConfig.version;
            return this.currentConfig;
        }
        
        // Fallback to default if local files not available
        if (!this.fallbackConfig) {
            this.fallbackConfig = this.getDefaultConfig();
        }
        this.currentConfig = this.fallbackConfig;
        this.configVersion = this.fallbackConfig.version;
        console.log('⚙️ Using fallback default config');
        return this.currentConfig;
    }

    // Validate config structure
    validateConfigStructure(config) {
        return config && 
               typeof config === 'object' && 
               config.ai1 && 
               config.ai2 && 
               Array.isArray(config.results);
    }

    // Get AI1 configuration - NOW DISABLED: Always returns local AI1 config
    getAI1Config() {
        console.log('🚫 Online AI1 config disabled - using local config');
        if (window.AI1_CONFIG) {
            return {
                model: window.AI1_CONFIG.model,
                systemPrompt: window.AI1_CONFIG.systemPrompt,
                apiParams: window.AI1_CONFIG.apiParams
            };
        }
        return this.fallbackConfig?.ai1 || {};
    }

    // Get AI2 configuration - NOW DISABLED: Always returns local AI2 config
    getAI2Config() {
        console.log('🚫 Online AI2 config disabled - using local config');
        if (window.AI_CONFIG) {
            return {
                model: window.AI_CONFIG.model,
                systemPrompt: window.AI_CONFIG.systemPrompt,
                apiParams: window.AI_CONFIG.apiParams
            };
        }
        return this.fallbackConfig?.ai2 || {};
    }

    // Save configuration - NOW DISABLED: Does nothing
    async saveConfig(config) {
        console.log('🚫 Online config saving DISABLED - config not saved to cloud');
        return false;
    }

    // Get cached config - NOW DISABLED: Always returns local configs
    getCachedConfig() {
        console.log('🚫 Online config cache disabled - using local configs');
        if (window.AI1_CONFIG && window.AI_CONFIG) {
            return {
                version: Date.now(),
                lastUpdated: new Date().toISOString(),
                ai1: {
                    model: window.AI1_CONFIG.model || 'gpt-4o',
                    systemPrompt: window.AI1_CONFIG.systemPrompt || 'Default AI1 prompt',
                    maxTokens: window.AI1_CONFIG.apiParams?.max_tokens || 1500,
                    temperature: window.AI1_CONFIG.apiParams?.temperature || 0.7
                },
                ai2: {
                    model: window.AI_CONFIG.model || 'gpt-4.1',
                    systemPrompt: window.AI_CONFIG.systemPrompt || 'Default AI2 prompt',
                    maxTokens: window.AI_CONFIG.apiParams?.max_tokens || 1500,
                    temperature: window.AI_CONFIG.apiParams?.temperature || 0.7
                },
                results: []
            };
        }
        
        if (!this.fallbackConfig) {
            this.fallbackConfig = this.getDefaultConfig();
        }
        return this.fallbackConfig;
    }

    // Auto-update - NOW DISABLED: Does nothing
    startAutoUpdate() {
        console.log('🚫 Auto-update DISABLED - no online config updates');
    }

    stopAutoUpdate() {
        console.log('🚫 Auto-update already disabled');
    }
}

// Initialize the disabled online global config
window.onlineGlobalConfig = new OnlineGlobalConfig();