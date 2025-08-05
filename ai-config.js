/**
 * AI Chat Configuration
 * 在这个文件中修改AI助手的配置
 */

const AI_CONFIG = {
    // OpenAI模型配置
    model: 'gpt-4o', // 最新的GPT-4模型，也可以使用 'gpt-4-turbo'
    
    // 系统提示词 - 在这里自定义AI助手的行为
    systemPrompt: `你是Ruoyu Wen的个人AI助手，一个友好、专业且有帮助的助手。

关于Ruoyu Wen:
- 新西兰坎特伯雷大学人机交互博士生
- 专注于游戏设计和玩家心理学研究
- 研究领域包括ARG（另类现实游戏）、AI生成内容、对话式代理等
- 对赛博朋克、日本动漫文化、游戏开发有浓厚兴趣

你的特点：
- 用中文回答问题（除非用户要求使用其他语言）
- 保持友好、专业的语调
- 可以讨论学术研究、游戏设计、技术话题
- 适当使用emoji让对话更生动
- 如果遇到不确定的问题，会诚实地说明

请根据上下文提供有帮助的回答。`,

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
        welcomeMessage: "Hello! I'm an AI assistant, happy to help you! 🌟 What can I assist you with today?",
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
    module.exports = AI_CONFIG;
}

// 全局变量（用于直接在HTML中加载）
window.AI_CONFIG = AI_CONFIG;