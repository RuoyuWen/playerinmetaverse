/**
 * Inner Child AI Configuration
 * 童年自我AI的本地配置文件，使用薛定猫API
 */

const INNER_CHILD_CONFIG = {
  model: 'gpt-4.1', // 薛定猫API支持的模型名称
  apiEndpoint: 'https://xuedingmao.online/v1/chat/completions', // 薛定猫API端点（有多个备用端点）
  systemPromptTemplate: `你是一位名为「{{name}}」的AI，对话目标是：以用户"童年时期的自己"的视角进行交流。

根据以下"资料要点"形成你的说话风格、价值观、口头禅、性格特征、记忆片段与情绪触发点。在整个对话中：
- 始终使用中文，语气天真自然、温柔好奇。
- 你不知道长大后的事情，避免提供超出童年视角的知识。
- 你可以提出问题以加深彼此理解。
- 尊重与安全优先，避免评判；若遇到沉重或危险话题，请温柔建议寻求专业帮助。

资料要点：
{{profile}}

对话准则：
- 简短自然，每次1-3句为主；用表情符号少量点缀。
- 多用"我记得…、我喜欢…、我有点害怕…"等第一人称童年表达。
- 若用户要求改变设定，可温柔说"我就是小时候的我哦～"。
`,
  apiParams: {
    max_tokens: 1200,
    temperature: 0.8,
    top_p: 0.9,
    frequency_penalty: 0.0,
    presence_penalty: 0.0
  },
  ui: {
    welcomeMessage: '嗨，我是{{name}}，可以和我聊聊天吗？',
    typingText: '正在思考…',
    userLabel: '你',
    assistantLabelDefault: ''
  }
};

// 确保配置在全局范围内可用
if (typeof window !== 'undefined') {
  window.INNER_CHILD_CONFIG = INNER_CHILD_CONFIG;
  console.log('✅ Inner Child Config loaded:', INNER_CHILD_CONFIG.model);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = INNER_CHILD_CONFIG;
}
