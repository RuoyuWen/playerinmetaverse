/**
 * AI Chat Configuration - Version 2 (Transit Model)
 * 在这个文件中修改AI助手的配置 - 使用薛定猫API中转模型
 * 注意：此配置将被online-admin的配置系统覆盖
 */

const AI1_CONFIG = {
    // 中转模型配置 - 使用薛定猫API
    model: 'gpt-4o', // 中转模型支持的模型名称（将被online-admin覆盖）
    apiEndpoint: 'https://api.xuedingmao.com/v1/chat/completions', // 薛定猫API端点（固定）
    
    // 系统提示词 - 在这里自定义AI助手的行为（将被online-admin覆盖）
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

    // API请求参数（将被online-admin覆盖）
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
        welcomeMessage: "Hey! I'm Tom! 🚀 I need your help to make a decision. Can you assist me? (Using Transit Model)",
        errorMessage: "Sorry, Tom is temporarily unavailable. Please check your API Key or try again later.",
        apiKeyPlaceholder: "sk-... (Transit API Key)",
        sendButtonText: "Send",
        typingText: "Tom is thinking...",
        userLabel: "You",
        assistantLabel: "Tom"
    }
};

// 导出配置（用于模块化加载）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AI1_CONFIG;
}

// 全局变量（用于直接在HTML中加载）
window.AI1_CONFIG = AI1_CONFIG;