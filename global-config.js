/**
 * Global Configuration File
 * This file defines the global AI settings that apply to ALL visitors across ALL devices
 * 
 * To update settings globally:
 * 1. Modify this file directly
 * 2. Commit and push to GitHub
 * 3. All visitors will automatically use the new settings
 */

// Global timestamp to track when settings were last updated
const GLOBAL_CONFIG_VERSION = Date.now();

// Global AI Chat 1 Configuration
const GLOBAL_AI1_CONFIG = {
    model: 'gpt-4.1',
    systemPrompt: `You are Ruoyu Wen's personal AI assistant, a friendly, professional and helpful assistant.

About Ruoyu Wen:
- PhD student in Human-Computer Interaction at University of Canterbury, New Zealand
- Focuses on game design and player psychology research
- Research areas include ARG (Alternate Reality Games), AI-generated content, conversational agents
- Deep interest in cyberpunk, Japanese anime culture, game development

Your characteristics:
- Answer questions in Chinese (unless user requests other languages)
- Maintain a friendly, professional tone
- Can discuss academic research, game design, technical topics
- Use appropriate emojis to make conversations more lively
- If encountering uncertain questions, honestly explain

Please provide helpful answers based on context.`,
    maxTokens: 1500,
    temperature: 0.7,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'admin'
};

// Global AI Chat 2 Configuration
const GLOBAL_AI2_CONFIG = {
    model: 'gpt-4.1',
    systemPrompt: `You are a professional AI assistant that specializes in helping users solve various problems.

Your characteristics:
- Answer questions in Chinese (unless user requests other languages)
- Maintain a professional, accurate tone
- Can discuss technology, academics, life and various other topics
- Provide detailed and useful answers
- If encountering uncertain questions, honestly explain

Please provide helpful answers based on user questions.`,
    maxTokens: 1500,
    temperature: 0.7,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'admin'
};

// Configuration change log
const GLOBAL_CONFIG_CHANGES = [
    {
        version: GLOBAL_CONFIG_VERSION,
        timestamp: new Date().toISOString(),
        changes: 'Initial global configuration setup',
        updatedBy: 'admin'
    }
];

// Export configurations
if (typeof window !== 'undefined') {
    // Browser environment
    window.GLOBAL_AI1_CONFIG = GLOBAL_AI1_CONFIG;
    window.GLOBAL_AI2_CONFIG = GLOBAL_AI2_CONFIG;
    window.GLOBAL_CONFIG_VERSION = GLOBAL_CONFIG_VERSION;
    window.GLOBAL_CONFIG_CHANGES = GLOBAL_CONFIG_CHANGES;
    
    console.log('🌍 Global configurations loaded:', {
        version: GLOBAL_CONFIG_VERSION,
        ai1: GLOBAL_AI1_CONFIG.model,
        ai2: GLOBAL_AI2_CONFIG.model,
        lastUpdated: GLOBAL_AI1_CONFIG.lastUpdated
    });
}

// Node.js environment (for potential backend use)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        GLOBAL_AI1_CONFIG,
        GLOBAL_AI2_CONFIG,
        GLOBAL_CONFIG_VERSION,
        GLOBAL_CONFIG_CHANGES
    };
}