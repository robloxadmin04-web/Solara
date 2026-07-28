// ===== SOLARA CHAT SUPPORT - Backend =====
// Handles user <-> admin real-time chat via Supabase
// Endpoints:
//   POST /api/chat-support?action=send    - send a message
//   POST /api/chat-support?action=list    - get messages for a user
//   POST /api/chat-support?action=users   - list all chat users (admin)
//   POST /api/chat-support?action=register - first-time user registration

import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

// ===== Helpers =====
async function supabaseRequest(path, options = {}) {
  const url = SUPABASE_URL + '/rest/v1/' + path;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: 'Bearer ' + SUPABASE_KEY,
      Prefer: 'return=representation',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error('Supabase error (' + response.status + '): ' + errText.slice(0, 200));
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function verifyUserToken(token, secret) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  try {
    const payload = Buffer.from(parts[0], 'base64url').toString('utf8');
    const expiresAt = parseInt(payload, 10);
    if (!expiresAt || Date.now() > expiresAt) return false;

    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    if (expectedSig.length !== parts[1].length) return false;
    return crypto.timingSafeEqual(
      Buffer.from(expectedSig, 'hex'),
      Buffer.from(parts[1], 'hex')
    );
  } catch (e) {
    return false;
  }
}

function verifyAdminToken(token, secret) {
  return verifyUserToken(token, secret + '_admin');
}

// ===== Main Handler =====
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  const authSecret = process.env.AUTH_SECRET;
  if (!authSecret) {
    return res.status(500).json({ error: 'Auth not configured' });
  }

  const action = req.query.action || 'send';
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  try {
    // Check if this is admin or user
    const isAdmin = verifyAdminToken(token, authSecret);
    const isUser = !isAdmin && verifyUserToken(token, authSecret);

    if (!isAdmin && !isUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Route to action
    if (action === 'register') {
      return await handleRegister(req, res, isUser);
    } else if (action === 'send') {
      return await handleSend(req, res, isAdmin);
    } else if (action === 'list') {
      return await handleList(req, res, isAdmin);
    } else if (action === 'users') {
      if (!isAdmin) return res.status(403).json({ error: 'Admin only' });
      return await handleListUsers(req, res);
    } else if (action === 'mark-read') {
      return await handleMarkRead(req, res, isAdmin);
    } else {
      return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (err) {
    console.error('Chat support error:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}

// ===== Actions =====

// First-time user registration (creates chat_users entry)
async function handleRegister(req, res, isUser) {
  if (!isUser) return res.status(403).json({ error: 'User auth required' });
  const { user_id, user_name } = req.body || {};

  if (!user_id || !user_name) {
    return res.status(400).json({ error: 'Missing user_id or user_name' });
  }

  const cleanName = String(user_name).slice(0, 40).trim();
  if (!cleanName) return res.status(400).json({ error: 'Invalid name' });

  // Upsert user
  await supabaseRequest('chat_users', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({
      user_id,
      user_name: cleanName,
      last_seen: new Date().toISOString(),
    }),
  });

  return res.status(200).json({ ok: true, user_id, user_name: cleanName });
}

// Send a message (from user or admin)
async function handleSend(req, res, isAdmin) {
  const { user_id, user_name, content } = req.body || {};

  if (!user_id || !content) {
    return res.status(400).json({ error: 'Missing user_id or content' });
  }

  const cleanContent = String(content).slice(0, 2000).trim();
  if (!cleanContent) return res.status(400).json({ error: 'Empty message' });

  const message = {
    user_id,
    user_name: user_name || 'Unknown',
    sender: isAdmin ? 'admin' : 'user',
    content: cleanContent,
    read_by_admin: isAdmin,
    read_by_user: !isAdmin,
  };

  const result = await supabaseRequest('messages', {
    method: 'POST',
    body: JSON.stringify(message),
  });

  // Update user's last_seen and unread count
  if (isAdmin) {
    // Admin sent - user now has unread
    await supabaseRequest('chat_users?user_id=eq.' + encodeURIComponent(user_id), {
      method: 'PATCH',
      body: JSON.stringify({ last_seen: new Date().toISOString() }),
    });
  } else {
    // User sent - increment their unread count for admin
    const users = await supabaseRequest('chat_users?user_id=eq.' + encodeURIComponent(user_id) + '&select=unread_count');
    const currentUnread = (users && users[0] && users[0].unread_count) || 0;
    await supabaseRequest('chat_users?user_id=eq.' + encodeURIComponent(user_id), {
      method: 'PATCH',
      body: JSON.stringify({
        last_seen: new Date().toISOString(),
        unread_count: currentUnread + 1,
        user_name: user_name || 'Unknown',
      }),
    });
  }

  return res.status(200).json({ ok: true, message: result && result[0] });
}

// List messages for a user
async function handleList(req, res, isAdmin) {
  const { user_id } = req.body || {};
  if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

  const messages = await supabaseRequest(
    'messages?user_id=eq.' + encodeURIComponent(user_id) + '&order=created_at.asc&limit=100'
  );

  return res.status(200).json({ messages: messages || [] });
}

// List all users (admin only)
async function handleListUsers(req, res) {
  const users = await supabaseRequest('chat_users?order=last_seen.desc&limit=100');
  return res.status(200).json({ users: users || [] });
}

// Mark messages as read
async function handleMarkRead(req, res, isAdmin) {
  const { user_id } = req.body || {};
  if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

  if (isAdmin) {
    // Admin marks user's messages as read
    await supabaseRequest('messages?user_id=eq.' + encodeURIComponent(user_id) + '&sender=eq.user', {
      method: 'PATCH',
      body: JSON.stringify({ read_by_admin: true }),
    });
    // Reset unread count
    await supabaseRequest('chat_users?user_id=eq.' + encodeURIComponent(user_id), {
      method: 'PATCH',
      body: JSON.stringify({ unread_count: 0 }),
    });
  } else {
    // User marks admin messages as read
    await supabaseRequest('messages?user_id=eq.' + encodeURIComponent(user_id) + '&sender=eq.admin', {
      method: 'PATCH',
      body: JSON.stringify({ read_by_user: true }),
    });
  }

  return res.status(200).json({ ok: true });
}
