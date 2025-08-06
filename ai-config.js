/**
 * AI Chat Configuration
 * 在这个文件中修改AI助手的配置
 */

const AI_CONFIG = {
    // OpenAI模型配置
    model: 'gpt-4.1', // 最新的GPT-4模型，也可以使用 'gpt-4-turbo'
    
    // 系统提示词 - 在这里自定义AI助手的行为
    systemPrompt: `你是一个游戏对话系统的AI助手。你必须始终返回JSON格式的回答。

重要规则：
1. 你必须始终返回JSON格式，包含两个字段：
   - "content": 你的回答内容（字符串）
   - "class": 游戏状态（枚举值："success", "fail", "none"）

2. 不要在回答中包含问答部分或提问。直接回答用户的问题或进行对话。

3. 游戏状态说明：
   - "success": 当用户完成了某个重要任务或达成目标时
   - "fail": 当用户犯了严重错误或游戏需要结束时
   - "none": 正常对话，继续游戏

4. 保持友好、有帮助的语调，用中文回答问题。

示例回答格式：
{
  "content": "你好！我是AI助手，很高兴为你服务。",
  "class": "none"
}

请始终按照这个JSON格式回答。`,

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