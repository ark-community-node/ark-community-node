import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer, config, sanitize, codeMatches, Queue } from '../server.mjs';

test('sanitize strips unknown fields and caps tokens', () => {
  const out = sanitize({ messages: [{ role: 'user', content: 'habari', extra: 1 }], max_tokens: 99999, temperature: 9 }, 'm');
  assert.deepEqual(out, { messages: [{ role: 'user', content: 'habari' }], stream: true, max_tokens: 1024, model: 'm' });
});

test('sanitize rejects bad roles', () => {
  assert.throws(() => sanitize({ messages: [{ role: 'tool', content: 'x' }] }));
  assert.throws(() => sanitize({}));
});

test('access code check', () => {
  assert.equal(codeMatches(undefined, ''), true);
  assert.equal(codeMatches('abc', 'abc'), true);
  assert.equal(codeMatches('abd', 'abc'), false);
  assert.equal(codeMatches(undefined, 'abc'), false);
});

test('queue serialises and caps', async () => {
  const q = new Queue(1);
  await q.acquire();
  const second = q.acquire();
  assert.ok(second);
  assert.equal(q.acquire(), null);
  q.release(); await second; q.release();
  assert.equal(q.busy, false);
});

test('end to end: streams from fake upstream, enforces code, logs no content', async () => {
  let seen;
  const fake = http.createServer(async (req, res) => {
    let b = ''; for await (const c of req) b += c; seen = JSON.parse(b);
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    res.end('data: {"choices":[{"delta":{"content":"Jambo"}}]}\n\ndata: [DONE]\n\n');
  }).listen(0);
  const logFile = join(mkdtempSync(join(tmpdir(), 'acn-')), 'req.log');
  const cfg = { ...config({}), upstream: `http://127.0.0.1:${fake.address().port}`, accessCode: 'pilot', logFile };
  const gw = createServer(cfg).listen(0);
  const base = `http://127.0.0.1:${gw.address().port}`;
  const body = JSON.stringify({ messages: [{ role: 'user', content: 'secret question' }] });

  const denied = await fetch(base + '/api/chat', { method: 'POST', body });
  assert.equal(denied.status, 401);

  const ok = await fetch(base + '/api/chat', { method: 'POST', body, headers: { 'x-access-code': 'pilot' } });
  assert.equal(ok.status, 200);
  assert.match(await ok.text(), /Jambo/);
  assert.equal(seen.stream, true);
  const logged = readFileSync(logFile, 'utf8');
  assert.match(logged, /ttfbMs/);
  assert.doesNotMatch(logged, /secret question|Jambo/);

  const page = await fetch(base + '/');
  assert.equal(page.status, 200);
  assert.equal((await fetch(base + '/health')).status, 200);
  gw.close(); fake.close();
});
