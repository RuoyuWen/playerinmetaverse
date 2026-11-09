const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function transport(fetch, timers = {}) {
  const context = {window: {}, fetch, AbortController, setTimeout, clearTimeout, ...timers};
  vm.runInNewContext(fs.readFileSync(__dirname + '/transport.js', 'utf8'), context);
  return context.window.SamApi;
}
const json = (data, status = 200) => new Response(JSON.stringify(data), {status, headers: {'Content-Type': 'application/json'}});

test('healthy primary uses one request; normal authorization failures do not switch hosts', async () => {
  for (const status of [200, 401, 403, 503]) {
    const calls = [];
    const api = transport(async (url, options) => {calls.push({url, options}); return json({status}, status);});
    const response = await api.request('/api/cohort/auth', {headers: {Authorization: 'Bearer test-only'}});
    assert.equal(response.status, status);assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://sam-api.playerinmetaverse.tech/api/cohort/auth');
  }
});

test('network failure retries the exact join token and body once on the fixed ingress', async () => {
  const calls = [], body = JSON.stringify({token: 'test-token'.padEnd(32, 'x')});
  const api = transport(async (url, options) => {
    calls.push({url, options});if (calls.length === 1) throw new TypeError('Failed to fetch');
    return json({ok: true});
  });
  assert.equal((await api.request('/api/cohort/join', {method: 'POST', headers: {'Content-Type': 'application/json'}, body})).status, 200);
  assert.equal(calls.length, 2);assert.equal(calls[0].options.body, body);assert.equal(calls[1].options.body, body);
  assert.equal(calls[1].url, 'https://chi-backend-jif6.onrender.com/api/cohort/join');
  assert(!calls.some(c => c.url.includes('test-token')));
});

test('rating retry preserves authorization and all submitted scores', async () => {
  const calls = [], body = JSON.stringify({rater: 'S03', valence: 5, audio_version: 'none', audio_ms: 0});
  const api = transport(async (url, options) => {
    calls.push(options);if (calls.length === 1) throw new TypeError('Load failed');return json({ok: true, already_saved: true});
  });
  await api.request('/api/cohort/submit', {method: 'POST', headers: {Authorization: 'Bearer test-only'}, body});
  assert.equal(calls.length, 2);assert.equal(calls[1].headers.Authorization, 'Bearer test-only');assert.equal(calls[1].body, body);
});

test('an HTML provider block switches to the same protected API on the alternate ingress', async () => {
  let calls = 0;
  const api = transport(async () => ++calls === 1 ? new Response('blocked', {status: 403, headers: {'Content-Type': 'text/html'}}) : json({ok: true}));
  assert.equal((await api.request('/api/cohort/status')).status, 200);assert.equal(calls, 2);
});

test('a stalled primary times out before trying the alternate ingress', async () => {
  let calls = 0;
  const api = transport(async (_, {signal}) => {
    if (++calls === 2) return json({ok: true});
    return new Promise((_, reject) => signal.addEventListener('abort', () => reject(Object.assign(new Error('timeout'), {name: 'AbortError'})), {once: true}));
  }, {setTimeout: (fn, ms) => {if (ms === 8000) queueMicrotask(fn); return 0;}, clearTimeout: () => {}});
  assert.equal((await api.request('/api/cohort/status')).status, 200);assert.equal(calls, 2);
});

test('caller cancellation and programming errors are not retried', async () => {
  const controller = new AbortController();controller.abort();let calls = 0;
  const api = transport(async () => {calls++;throw Object.assign(new Error('cancelled'), {name: 'AbortError'});});
  await assert.rejects(api.request('/api/cohort/status', {signal: controller.signal}));assert.equal(calls, 1);
  calls = 0;
  const broken = transport(async () => {calls++;throw new Error('programming error');});
  await assert.rejects(broken.request('/api/cohort/status'), /programming error/);assert.equal(calls, 1);
});

test('invalid paths are rejected and alternate failures stop after two attempts', async () => {
  let calls = 0;
  const api = transport(async () => {calls++;throw new TypeError('network unavailable');});
  await assert.rejects(api.request('https://untrusted.example'), /Invalid study API path/);assert.equal(calls, 0);
  await assert.rejects(api.request('/api/cohort/status'), /network unavailable/);assert.equal(calls, 2);
});
