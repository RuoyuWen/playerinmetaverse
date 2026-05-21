/**
 * Survey backend configuration.
 * AI calls go through the server proxy — never expose keys in the frontend.
 *
 * Server-side provider (Render env):
 *   SURVEY_AI_PROVIDER=auto|anthropic|relay
 *   RELAY_API_KEY          — 薛丁猫令牌 (https://xuedingmao.top)
 *   RELAY_BASE_URL         — default https://xuedingmao.top/v1
 *   RELAY_MODEL            — OpenAI 模型，默认 gpt-5.4-mini（见薛丁猫「支持模型」）
 *   ANTHROPIC_API_KEY      — Anthropic 直连（保留）
 *   ANTHROPIC_MODEL        — default claude-sonnet-4-20250514
 */
const SURVEY_CONFIG = {
  // 必须与 Render 控制台显示的 chi-backend 地址一致
  BACKEND_URL: 'https://chi-backend-jif6.onrender.com',
  CLAUDE_PATH: '/api/survey/claude',
  SUBMIT_PATH: '/api/survey/submit',
  CONFIG_PATH: '/api/survey/config',
};

if (typeof window !== 'undefined') {
  window.SURVEY_CONFIG = SURVEY_CONFIG;
}
