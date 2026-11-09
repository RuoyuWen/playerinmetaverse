(() => {
  'use strict';
  // Both destinations reach the same data service and use the same invitation keys.
  const origins = ['https://sam-api.playerinmetaverse.tech', 'https://chi-backend-jif6.onrender.com'];
  window.SamApi = {
    async request(path, options = {}) {
      if (typeof path !== 'string' || !path.startsWith('/api/')) throw new Error('Invalid study API path');
      for (let i = 0; i < origins.length; i++) {
        const controller = new AbortController();
        const abort = () => controller.abort();
        if (options.signal?.aborted) controller.abort();
        else options.signal?.addEventListener('abort', abort, {once: true});
        const timeout = setTimeout(abort, i === 0 ? 8000 : 60000);
        try {
          const response = await fetch(origins[i] + path, {...options, signal: controller.signal});
          // Provider block pages are HTML; normal API authorization errors stay unchanged.
          if (i === 0 && response.headers.get('content-type')?.toLowerCase().includes('text/html')) {
            try { await response.body?.cancel(); } catch {}
            continue;
          }
          return response;
        } catch (error) {
          if (options.signal?.aborted || i === origins.length - 1 ||
              !['TypeError', 'NetworkError', 'AbortError', 'TimeoutError'].includes(error.name)) throw error;
          // Reuse the exact token/body. The existing service makes joins and ratings idempotent.
        } finally {
          clearTimeout(timeout);
          options.signal?.removeEventListener('abort', abort);
        }
      }
    }
  };
})();
