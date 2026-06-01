(function () {
  window.GAME_CONFIG = Object.assign({
    BACKEND_URL: 'https://chi-backend-jif6.onrender.com',
    CHAT_PATH: '/api/survey/claude',
    NORSENSE_PATH: '/api/game/norsense/stream',
    CHAT_FORMAT: 'surveyClaude'
  }, window.GAME_CONFIG || {});
})();
