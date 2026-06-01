(function () {
  window.GAME_CONFIG = Object.assign({
    BACKEND_URL: 'https://chi-backend-jif6.onrender.com',
    CHAT_PATH: '/api/game/chat',
    NORSENSE_PATH: '/api/game/norsense/stream'
  }, window.GAME_CONFIG || {});
})();
