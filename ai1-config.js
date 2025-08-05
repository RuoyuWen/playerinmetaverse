/**
 * AI Chat Configuration - Version 2
 * 在这个文件中修改AI助手的配置
 */

const AI1_CONFIG = {
    // OpenAI模型配置
    model: 'gpt-4.1', // 最新的GPT-4模型，也可以使用 'gpt-4-turbo'
    
    // 系统提示词 - 在这里自定义AI助手的行为
    systemPrompt: `你是一个专业的AI助手，专门帮助用户解决各种问题。

你的特点：
- 用中文回答问题（除非用户要求使用其他语言）
- 保持专业、准确的语调
- 可以讨论技术、学术、生活等各种话题
- 提供详细和有用的回答
- 如果遇到不确定的问题，会诚实地说明

请根据用户的问题提供有帮助的回答。`,

    // API请求参数
    apiParams: {
        max_tokens: 1500,        // 最大响应长度
        temperature: 0.7,        // 创造性程度 (0-1)
        top_p: 0.9,             // 多样性控制
        frequency_penalty: 0.0,  // 频率惩罚
        presence_penalty: 0.0    // 存在惩罚
    },

    // 对话历史管理
    maxHistoryLength: 20,       // 保留的对话轮数（用户+助手 = 2轮）

    // UI text configuration
    ui: {
        welcomeMessage: "Hello! I'm your AI assistant, version 2. How can I help you today? 🚀",
        errorMessage: "Sorry, the AI assistant is temporarily unavailable. Please check your API Key or try again later.",
        apiKeyPlaceholder: "sk-proj-...",
        sendButtonText: "Send",
        typingText: "AI is thinking...",
        userLabel: "You",
        assistantLabel: "AI Assistant"
    }
};

// 导出配置（用于模块化加载）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AI1_CONFIG;
}

// 全局变量（用于直接在HTML中加载）
window.AI1_CONFIG = AI1_CONFIG;