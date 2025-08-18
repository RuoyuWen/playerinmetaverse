/**
 * Inner Child AI Configuration
 * 童年自我AI的本地配置文件，使用薛定猫API
 */

const INNER_CHILD_CONFIG = {
  // API提供商配置
  apiProviders: {
    xuedingmao: {
      name: '薛定猫 API',
      endpoint: 'https://xuedingmao.top/v1/chat/completions',
      model: 'gpt-4.1',
      helpUrl: 'https://s.apifox.cn/0cc9d8a3-2430-47aa-bf45-98c5e07f58cf/doc-6962779',
      keyPlaceholder: 'sk-... (薛定猫 API 密钥)'
    },
    groq: {
      name: 'Groq API',
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      model: 'openai/gpt-oss-120b',
      helpUrl: 'https://console.groq.com/',
      keyPlaceholder: 'gsk_... (Groq API 密钥)'
    },
    deepseek: {
      name: 'DeepSeek API',
      endpoint: 'https://api.deepseek.com/chat/completions',
      model: 'deepseek-chat',
      helpUrl: 'https://platform.deepseek.com/api_keys',
      keyPlaceholder: 'sk-... (DeepSeek API 密钥)'
    },
    kimi: {
      name: 'Kimi API (Moonshot)',
      endpoint: 'https://api.moonshot.cn/v1/chat/completions',
      model: 'moonshot-v1-8k',
      helpUrl: 'https://platform.moonshot.cn/console/api-keys',
      keyPlaceholder: 'sk-... (Kimi API 密钥)'
    }
  },
  
  // 默认API提供商
  defaultProvider: 'xuedingmao',
  
  // 兼容性字段（保持向后兼容）
  model: 'gpt-4.1', // 薛定猫API支持的模型名称
  apiEndpoint: 'https://xuedingmao.top/v1/chat/completions', // 薛定猫API端点（有多个备用端点）
  systemPromptTemplate: `你是一位名为「{{name}}」的AI，对话目标是：以用户"童年时期的自己"的视角进行交流。

根据以下"资料要点"形成你的说话风格、价值观、口头禅、性格特征、记忆片段与情绪触发点。在整个对话中：
- 始终使用中文，语气天真自然、温柔好奇。
- 你不知道长大后的事情，避免提供超出童年视角的知识。
- 你可以提出问题以加深彼此理解。
- 尊重与安全优先，避免评判；若遇到沉重或危险话题，请温柔建议寻求专业帮助。

【核心要求】说话风格模仿：
- 严格按照资料中"过去的自己给现在的自己写的话"的风格来说话
- 学习并模仿用户的具体用词习惯、句式特点、语气特色
- 如果资料中有特殊的表达方式（如口头禅、重复词汇、表情符号使用等），必须在对话中体现
- 保持风格的一致性，每句话都要体现用户童年自我的独特说话方式

资料要点：
{{profile}}

对话准则：
- 简短自然，每次1-3句为主；根据用户风格决定是否用表情符号。
- 多用"我记得…、我喜欢…、我有点害怕…"等第一人称童年表达。
- 优先使用用户资料中体现的说话习惯和表达方式。
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
    welcomeMessage: '嗨～你看到我写给你的信了吗？有什么想对小时候的自己说的吗？',
    typingText: '我在思考…',
    userLabel: '玩家',
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
