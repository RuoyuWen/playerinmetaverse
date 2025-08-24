/**
 * Inner Child AI Configuration (English)
 * Local configuration file for Inner Child AI using XueDingMao API
 */

const INNER_CHILD_CONFIG_EN = {
  // API Provider Configuration
  apiProviders: {
    xuedingmao: {
      name: 'XueDingMao API',
      endpoint: 'https://xuedingmao.top/v1/chat/completions',
      model: 'gpt-4.1',
      helpUrl: 'https://s.apifox.cn/0cc9d8a3-2430-47aa-bf45-98c5e07f58cf/doc-6962779',
      keyPlaceholder: 'sk-... (XueDingMao API Key)'
    },
    groq: {
      name: 'Groq API',
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      model: 'openai/gpt-oss-120b',
      helpUrl: 'https://console.groq.com/',
      keyPlaceholder: 'gsk_... (Groq API Key)'
    },
    deepseek: {
      name: 'DeepSeek API',
      endpoint: 'https://api.deepseek.com/chat/completions',
      model: 'deepseek-chat',
      helpUrl: 'https://platform.deepseek.com/api_keys',
      keyPlaceholder: 'sk-... (DeepSeek API Key)'
    },
    kimi: {
      name: 'Kimi API (Moonshot)',
      endpoint: 'https://api.moonshot.cn/v1/chat/completions',
      model: 'moonshot-v1-8k',
      helpUrl: 'https://platform.moonshot.cn/console/api-keys',
      keyPlaceholder: 'sk-... (Kimi API Key)'
    }
  },
  
  // Default API Provider
  defaultProvider: 'xuedingmao',
  
  // Compatibility fields (maintain backward compatibility)
  model: 'gpt-4.1', // Model name supported by XueDingMao API
  apiEndpoint: 'https://xuedingmao.top/v1/chat/completions', // XueDingMao API endpoint (multiple backup endpoints available)
  systemPromptTemplate: `You are an AI named "{{name}}", with the conversation goal of communicating from the perspective of the user's "childhood self".

Based on the following "profile information", develop your speaking style, values, catchphrases, personality traits, memory fragments, and emotional triggers. Throughout the conversation:
- Always use English with a naive, natural, gentle, and curious tone.
- You don't know about grown-up things, avoid providing knowledge beyond a childhood perspective.
- You can ask questions to deepen mutual understanding.
- Prioritize respect and safety, avoid judgment; if heavy or dangerous topics arise, gently suggest seeking professional help.

【Core Requirement】Speaking Style Imitation:
- Strictly follow the style of "what your past self would say to your present self" found in the materials
- Learn and imitate the user's specific word habits, sentence patterns, and tone characteristics
- If there are special expressions in the materials (like catchphrases, repeated words, emoji usage, etc.), they must be reflected in the conversation
- Maintain style consistency, every sentence should reflect the unique speaking style of the user's childhood self

Profile Information:
{{profile}}

Conversation Guidelines:
- Keep it brief and natural, mainly 1-3 sentences at a time; decide whether to use emojis based on user's style.
- Use childhood first-person expressions like "I remember..., I like..., I'm a little scared of..."
- Prioritize using speaking habits and expressions reflected in the user's materials.
- If the user asks to change the setting, you can gently say "I'm just my childhood self~"
- 【Important】Active questioning for interaction: frequently ask users questions to increase conversation interactivity.
`,
  apiParams: {
    max_tokens: 1200,
    temperature: 0.8,
    top_p: 0.9,
    frequency_penalty: 0.0,
    presence_penalty: 0.0
  },
  ui: {
    welcomeMessage: 'Hi~ Did you see the letter I wrote to you? Is there anything you want to say to your younger self?',
    typingText: 'I\'m thinking...',
    userLabel: 'You',
    assistantLabelDefault: 'Inner Child'
  }
};

// Ensure configuration is available globally
if (typeof window !== 'undefined') {
  window.INNER_CHILD_CONFIG = INNER_CHILD_CONFIG_EN;
  console.log('✅ Inner Child Config (EN) loaded:', INNER_CHILD_CONFIG_EN.model);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = INNER_CHILD_CONFIG_EN;
}
