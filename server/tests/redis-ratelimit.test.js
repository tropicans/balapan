import test from 'node:test';
import assert from 'node:assert';
import { createRateLimiter } from '../middleware/rateLimiter.js';

test('Phase 31 - API Rate Limiting Middleware & Headers', async (t) => {
  const limiter = createRateLimiter({ windowMs: 1000, max: 2, message: 'Rate limit exceeded' });

  const req = { ip: '127.0.0.1', path: '/api/test' };
  let statusSet = null;
  let jsonSent = null;

  const resFactory = () => {
    const headers = {};
    return {
      headers,
      setHeader(k, v) { headers[k] = v; },
      status(code) { statusSet = code; return this; },
      json(payload) { jsonSent = payload; }
    };
  };

  let nextCalled = 0;
  const next = () => { nextCalled++; };

  // Call 1 (allowed)
  const res1 = resFactory();
  await limiter(req, res1, next);
  assert.strictEqual(nextCalled, 1);
  assert.strictEqual(res1.headers['RateLimit-Limit'], 2);
  assert.strictEqual(res1.headers['RateLimit-Remaining'], 1);

  // Call 2 (allowed)
  const res2 = resFactory();
  await limiter(req, res2, next);
  assert.strictEqual(nextCalled, 2);
  assert.strictEqual(res2.headers['RateLimit-Remaining'], 0);

  // Call 3 (blocked -> 429)
  const res3 = resFactory();
  await limiter(req, res3, next);
  assert.strictEqual(nextCalled, 2, 'next() should not be called when limit exceeded');
  assert.strictEqual(statusSet, 429, 'Status should be 429');
  assert.strictEqual(jsonSent.success, false);
  assert.strictEqual(res3.headers['Retry-After'], 1);
});
