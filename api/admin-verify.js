// ===== SOLARA ADMIN VERIFY =====
// Login endpoint for the admin dashboard

import crypto from 'crypto';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authSecret = process.env.AUTH_SECRET;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!authSecret || !adminPassword) {
    return res.status(500).json({ error: 'Admin auth not configured' });
  }

  const { password } = req.body || {};
  if (!password || password !== adminPassword) {
    return res.status(401).json({ error: 'Invalid admin password' });
  }

  // Issue admin token (valid for 24 hours)
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  const payload = Buffer.from(String(expiresAt)).toString('base64url');
  const sig = crypto.createHmac('sha256', authSecret + '_admin').update(payload).digest('hex');
  const token = payload + '.' + sig;

  return res.status(200).json({ token, expiresAt });
}
