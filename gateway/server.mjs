// Ark Community Node gateway.
// Serves the chat page to phones on the local network and forwards chat requests to a
// local OpenAI-compatible model server. No internet calls. No message content is logged.
// SPDX-License-Identifier: Apache-2.0
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { appendFileSync } from 'node:fs';
import { timingSafeEqual, createHash } from 'node:crypto';

export function config(env = process.env) {
  return {
    port: Number(env.PORT || 8088),
    host: env.HOST || '0.0.0.0',
    upstream: (env.UPSTREAM || 'http://127.0.0.1:8080').replace(/\/$/, ''),
    model: env.MODEL || '',
    accessCode: env.ACCESS_CODE || '',
    maxBodyBytes: Number(env.MAX_BODY_BYTES || 64 * 1024),
    maxQueue: Number(env.MAX_QUEUE || 8),
    logFile: env.LOG_FILE || '',
  };
}

const sha = (s) => createHash('sha256').update(String(s)).digest();
export function codeMatches(given, expected) {
  if (!expected) return true;
  return timingSafeEqual(sha(given || ''), sha(expected));
}

// One generation at a time: small hardware can't serve two answers at once.
export class Queue {
  constructor(max) { this.max = max; this.busy = false; this.waiting = []; }
  get length() { return this.waiting.length; }
  acquire() {
    if (!this.busy) { this.busy = true; return Promise.resolve(); }
    if (this.waiting.length >= this.max) return null;
    return new Promise((r) => this.waiting.push(r));
  }
  release() {
    const next = this.waiting.shift();
    if (next) next(); else this.busy = false;
  }
}

// Only pass through what the model needs; never let clients set arbitrary runtime params.
export function sanitize(body, model) {
  const msgs = Array.isArray(body?.messages) ? body.messages : null;
  if (!msgs || msgs.length === 0 || msgs.length > 40) throw new Error('messages must be 1-40 items');
  const clean = msgs.map((m) => {
    if (!['system', 'user', 'assistant'].includes(m?.role) || typeof m.content !== 'string') {
      throw new Error('each message needs role and string content');
    }
    return { role: m.role, content: m.content.slice(0, 8000) };
  });
  const out = { messages: clean, stream: true, max_tokens: Math.min(Number(body.max_tokens) || 512, 1024) };
  if (model) out.model = model;
  return out;
}

export function createServer(cfg = config()) {
  const queue = new Queue(cfg.maxQueue);
  const pagePath = new URL('./public/index.html', import.meta.url);
  const log = (rec) => { if (cfg.logFile) appendFileSync(cfg.logFile, JSON.stringify(rec) + '\n'); };

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://node');
    if (req.method === 'GET' && url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, queued: queue.length, busy: queue.busy }));
    }
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(await readFile(pagePath));
    }
    if (req.method === 'POST' && url.pathname === '/api/chat') {
      if (!codeMatches(req.headers['x-access-code'], cfg.accessCode)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'access code required' }));
      }
      let raw = '';
      for await (const c of req) {
        raw += c;
        if (raw.length > cfg.maxBodyBytes) { res.writeHead(413); return res.end('too large'); }
      }
      let payload;
      try { payload = sanitize(JSON.parse(raw), cfg.model); } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
      const slot = queue.acquire();
      if (!slot) { res.writeHead(503, { 'Retry-After': '10' }); return res.end('busy, try again shortly'); }
      await slot;
      const t0 = Date.now(); let first = 0, bytes = 0, status = 0;
      try {
        const up = await fetch(cfg.upstream + '/v1/chat/completions', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        });
        status = up.status;
        res.writeHead(up.status, { 'Content-Type': up.headers.get('content-type') || 'text/event-stream', 'Cache-Control': 'no-store' });
        for await (const chunk of up.body) { if (!first) first = Date.now(); bytes += chunk.length; res.write(chunk); }
        res.end();
      } catch (e) {
        status = 502;
        if (!res.headersSent) res.writeHead(502);
        res.end('model server unavailable');
      } finally {
        queue.release();
        // Timing only. Never prompt or answer content.
        log({ at: new Date().toISOString(), status, ttfbMs: first ? first - t0 : null, totalMs: Date.now() - t0, bytes });
      }
      return;
    }
    res.writeHead(404); res.end();
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const cfg = config();
  createServer(cfg).listen(cfg.port, cfg.host, () =>
    console.log(`Ark Community Node gateway on http://${cfg.host}:${cfg.port} -> ${cfg.upstream}`));
}
