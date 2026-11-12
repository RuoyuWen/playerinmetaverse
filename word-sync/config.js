// 本地调试（localhost）时走同源后端，线上走 Render 上的 chi-backend。
(function () {
  var local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  window.WORDSYNC_CONFIG = Object.assign({
    BACKEND_URL: local ? '' : 'https://chi-backend-jif6.onrender.com'
  }, window.WORDSYNC_CONFIG || {});
})();
