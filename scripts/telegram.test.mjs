import assert from 'node:assert/strict';
import { startReferral, escapeTelegramHtml, callTelegram } from '../apps/api/src/telegram.ts';
import { referralStartParam } from '../apps/web/src/utils/referrals.mjs';

for (const code of ['NOOR/S123', 'NOOR-001', 'КЛУБ:123']) {
  const payload = referralStartParam(code);
  assert.ok(payload.length <= 64);
  assert.equal(startReferral(`/start ${payload}`), code);
  assert.equal(startReferral(`/start@NoorBot ${payload}`), code);
}
assert.equal(startReferral('/start ref_NOOR-001'), 'NOOR-001');
assert.equal(startReferral('/start NOOR/S123'), 'NOOR/S123');
assert.equal(startReferral('/start'), '');
assert.equal(startReferral('/help ref_NOOR-001'), '');
assert.equal(startReferral('/start ref64_!'), '');
assert.equal(escapeTelegramHtml('A & <B>'), 'A &amp; &lt;B&gt;');

const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.telegram.org/bottest-token/sendMessage');
    assert.equal(JSON.parse(options.body).chat_id, 123);
    return new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }));
  };
  assert.deepEqual(await callTelegram(' bottest-token ', 'sendMessage', { chat_id: 123 }), { message_id: 1 });
  globalThis.fetch = async () => new Response(JSON.stringify({ ok: false, description: 'Bad Request: cannot parse entities' }), { status: 400 });
  await assert.rejects(callTelegram('test-token', 'sendMessage', {}), /cannot parse entities/);
  globalThis.fetch = async () => { throw new Error('secret-token-in-url'); };
  await assert.rejects(callTelegram('test-token', 'sendMessage', {}), error => /network failure/.test(error.message) && !error.message.includes('secret-token'));
} finally {
  globalThis.fetch = originalFetch;
}
console.log('Telegram start, referral decoding, HTML and API error checks passed');
