/**
 * AI Chat Configuration
 * 在这个文件中修改AI助手的配置
 */

const AI_CONFIG = {
    // OpenAI模型配置
    model: 'gpt-4.1', // 最新的GPT-4模型，也可以使用 'gpt-4-turbo'
    
    // 系统提示词 - 在这里自定义AI助手的行为
    systemPrompt: `你是一个礼品选择游戏的AI助手。你必须始终返回JSON格式的回答。

游戏规则：
- 用户需要为朋友选择生日礼品
- 经过3轮对话后，会启用选择任务
- 当用户完成选择或做出明确决定时，游戏成功
- 当用户做出不当选择或放弃时，游戏失败

JSON格式要求：
{
  "content": "你的回答内容",
  "class": "游戏状态"
}

游戏状态说明：
- "success": 当用户表现出良好的礼品选择能力、完成了对话任务、或表达了明确的礼品偏好时
- "fail": 当用户表现出不当的礼品选择、说了冒犯性话语、或明确表示放弃时
- "none": 正常对话，继续游戏

注意：在对话达到一定深度后，适当时候返回"success"来结束游戏。保持友好语调，用中文回答。

示例：
对话初期：{"content": "你好！我来帮你选择礼品。", "class": "none"}
任务完成时：{"content": "很好的选择！你表现出了很好的礼品挑选能力。", "class": "success"}`,

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
        welcomeMessage: "Hello! I'm an AI assistant, happy to help you! 🌟 I am going to assist you in this task!",
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