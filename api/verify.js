// ===== SOLARA AI - Auth Verify Endpoint =====
// Validates a shared password and issues a session token.

import crypto from 'crypto';

// In-memory failed attempt tracking (resets on cold start — good enough for Option A)
const attempts = new Map();
const MAX_ATTEMPTS = 3;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const authPassword = process.env.AUTH_PASSWORD;
  const authSecret = process.env.AUTH_SECRET;

  if (!authPassword || !authSecret) {
    return res.status(500).json({
      error: 'Auth is not configured. Set AUTH_PASSWORD and AUTH_SECRET in Vercel Environment Variables.',
    });
  }

  try {
    const { password } = req.body || {};

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required.' });
    }

    // Client IP for lockout tracking
    const clientIp =
      req.headers['x-forwarded-for']?.split(',')[0].trim() ||
      req.headers['x-real-ip'] ||
      'unknown';

    // Check lockout
    const record = attempts.get(clientIp);
    const now = Date.now();
    if (record && record.count >= MAX_ATTEMPTS && now < record.lockedUntil) {
      const remaining = Math.ceil((record.lockedUntil - now) / 1000);
      return res.status(429).json({
        error: `Too many failed attempts. Try again in ${Math.ceil(remaining / 60)} minute(s).`,
      });
    }

    // Timing-safe password comparison
    const expected = Buffer.from(authPassword);
    const provided = Buffer.from(password);
    const valid =
      expected.length === provided.length &&
      crypto.timingSafeEqual(expected, provided);

    if (!valid) {
      // Track failed attempt
      const prev = attempts.get(clientIp) || { count: 0, lockedUntil: 0 };
      const count = prev.count + 1;
      attempts.set(clientIp, {
        count,
        lockedUntil: count >= MAX_ATTEMPTS ? now + LOCKOUT_MS : 0,
      });

      const attemptsLeft = MAX_ATTEMPTS - count;
      return res.status(401).json({
        error:
          attemptsLeft > 0
            ? `Wrong password. ${attemptsLeft} attempt(s) left.`
            : `Too many failed attempts. Locked out for 5 minutes.`,
      });
    }

    // Success — reset lockout, issue token
    attempts.delete(clientIp);

    const expiresAt = now + SESSION_DURATION_MS;
    const token = signToken(expiresAt, authSecret);

    return res.status(200).json({
      token,
      expiresAt,
    });
  } catch (err) {
    console.error('Verify handler error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

// ===== TOKEN SIGNING =====
// Format: base64(expiresAt).base64(hmac(expiresAt, secret))
export function signToken(expiresAt, secret) {
  const payload = String(expiresAt);
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const encoded = Buffer.from(payload).toString('base64url');
  return `${encoded}.${sig}`;
}

export function verifyToken(token, secret) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  try {
    const payload = Buffer.from(parts[0], 'base64url').toString('utf8');
    const expiresAt = parseInt(payload, 10);
    if (!expiresAt || Date.now() > expiresAt) return false;

    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const providedSig = parts[1];

    if (expectedSig.length !== providedSig.length) return false;
    return crypto.timingSafeEqual(
      Buffer.from(expectedSig, 'hex'),
      Buffer.from(providedSig, 'hex')
    );
  } catch (e) {
    return false;
  }
}
