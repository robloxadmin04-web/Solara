// ===== ADMIN DASHBOARD LOGIC v2 - Mobile Fixed =====

const state = {
  adminToken: localStorage.getItem('solara_admin_token') || null,
  adminExpiresAt: parseInt(localStorage.getItem('solara_admin_expires') || '0', 10),
  users: [],
  currentUserId: null,
  currentUserName: null,
  messages: [],
  pollTimer: null,
};

const els = {
  loginScreen: document.getElementById('adminLogin'),
  loginForm: document.getElementById('adminLoginForm'),
  passwordInput: document.getElementById('adminPassword'),
  loginBtn: document.getElementById('adminLoginBtn'),
  loginError: document.getElementById('adminLoginError'),
  app: document.getElementById('adminApp'),
  logoutBtn: document.getElementById('adminLogoutBtn'),
  usersList: document.getElementById('usersList'),
  userSearch: document.getElementById('userSearch'),
  emptyState: document.getElementById('emptyState'),
  chat: document.getElementById('adminChat'),
  chatBackBtn: document.getElementById('chatBackBtn'),
  chatAvatar: document.getElementById('chatAvatar'),
  chatUserName: document.getElementById('chatUserName'),
  chatUserStatus: document.getElementById('chatUserStatus'),
  chatMessages: document.getElementById('chatMessages'),
  chatForm: document.getElementById('chatForm'),
  chatInput: document.getElementById('chatInput'),
  sendBtn: document.getElementById('adminSendBtn'),
};

function init() {
  els.loginForm.addEventListener('submit', handleAdminLogin);
  els.logoutBtn.addEventListener('click', handleLogout);
  els.chatForm.addEventListener('submit', handleSendMessage);
  els.userSearch.addEventListener('input', filterUsers);
  els.chatBackBtn.addEventListener('click', closeChat);
  els.chatInput.addEventListener('input', autoResize);
  els.chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      els.chatForm.dispatchEvent(new Event('submit'));
    }
  });

  checkAuth();
}

function checkAuth() {
  if (state.adminToken && state.adminExpiresAt > Date.now()) {
    showDashboard();
  } else {
    showLogin();
  }
}

function showLogin() {
  els.loginScreen.style.display = 'flex';
  els.app.style.display = 'none';
  setTimeout(() => els.passwordInput.focus(), 100);
}

function showDashboard() {
  els.loginScreen.style.display = 'none';
  els.app.style.display = 'flex';
  loadUsers();
  startPolling();
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const password = els.passwordInput.value.trim();
  if (!password) return;

  els.loginBtn.disabled = true;
  els.loginError.textContent = '';

  try {
    const response = await fetch('/api/admin-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Login failed');

    state.adminToken = data.token;
    state.adminExpiresAt = data.expiresAt;
    localStorage.setItem('solara_admin_token', data.token);
    localStorage.setItem('solara_admin_expires', String(data.expiresAt));

    showDashboard();
  } catch (err) {
    els.loginError.textContent = err.message;
  } finally {
    els.loginBtn.disabled = false;
  }
}

function handleLogout(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  if (!confirm('Sign out?')) return;
  state.adminToken = null;
  state.adminExpiresAt = 0;
  localStorage.removeItem('solara_admin_token');
  localStorage.removeItem('solara_admin_expires');
  stopPolling();
  showLogin();
}

function startPolling() {
  stopPolling();
  state.pollTimer = setInterval(() => {
    loadUsers(true);
    if (state.currentUserId) {
      loadMessages(state.currentUserId, true);
    }
  }, 3000);
}

function stopPolling() {
  if (state.pollTimer) {
    clearInterval(state.pollTimer);
    state.pollTimer = null;
  }
}

async function loadUsers(silent = false) {
  try {
    const response = await fetch('/api/chat-support?action=users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + state.adminToken,
      },
      body: JSON.stringify({}),
    });

    if (response.status === 401) {
      handleLogout();
      return;
    }

    const data = await response.json();
    state.users = data.users || [];
    renderUsers();
  } catch (err) {
    if (!silent) console.error('Failed to load users:', err);
  }
}

function renderUsers() {
  const searchTerm = els.userSearch.value.toLowerCase().trim();
  const filtered = searchTerm
    ? state.users.filter(u => u.user_name.toLowerCase().includes(searchTerm))
    : state.users;

  if (filtered.length === 0) {
    els.usersList.innerHTML = '<div class="admin-empty">No users yet</div>';
    return;
  }

  els.usersList.innerHTML = filtered.map(user => {
    const initial = user.user_name.charAt(0).toUpperCase();
    const isActive = user.user_id === state.currentUserId;
    const unread = user.unread_count || 0;
    const timeAgo = formatTimeAgo(user.last_seen);

    return (
      '<div class="admin-user-item ' + (isActive ? 'active' : '') + '" data-user-id="' + escapeAttr(user.user_id) + '" data-user-name="' + escapeAttr(user.user_name) + '">' +
        '<div class="admin-user-avatar">' + escapeHtml(initial) + '</div>' +
        '<div class="admin-user-info">' +
          '<div class="admin-user-name">' + escapeHtml(user.user_name) + '</div>' +
          '<div class="admin-user-time">' + timeAgo + '</div>' +
        '</div>' +
        (unread > 0 ? '<div class="admin-user-badge">' + unread + '</div>' : '') +
      '</div>'
    );
  }).join('');

  els.usersList.querySelectorAll('.admin-user-item').forEach(item => {
    item.addEventListener('click', () => {
      selectUser(item.dataset.userId, item.dataset.userName);
    });
  });
}

function filterUsers() {
  renderUsers();
}

async function selectUser(userId, userName) {
  state.currentUserId = userId;
  state.currentUserName = userName;

  els.emptyState.style.display = 'none';
  els.chat.style.display = 'flex';
  els.chatAvatar.textContent = userName.charAt(0).toUpperCase();
  els.chatUserName.textContent = userName;

  // Mobile: slide to chat view
  els.app.classList.add('chat-open');

  renderUsers();
  await loadMessages(userId);
  await markAsRead(userId);
}

function closeChat() {
  state.currentUserId = null;
  state.currentUserName = null;
  els.app.classList.remove('chat-open');
  els.chat.style.display = 'none';
  els.emptyState.style.display = 'flex';
  renderUsers();
}

async function loadMessages(userId, silent = false) {
  try {
    const response = await fetch('/api/chat-support?action=list', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + state.adminToken,
      },
      body: JSON.stringify({ user_id: userId }),
    });

    const data = await response.json();
    const newMessages = data.messages || [];

    if (newMessages.length !== state.messages.length ||
        (newMessages.length > 0 && state.messages.length > 0 &&
         newMessages[newMessages.length - 1].id !== state.messages[state.messages.length - 1].id)) {
      state.messages = newMessages;
      renderMessages();
    }
  } catch (err) {
    if (!silent) console.error('Failed to load messages:', err);
  }
}

function renderMessages() {
  if (state.messages.length === 0) {
    els.chatMessages.innerHTML = '<div class="admin-empty">No messages yet</div>';
    return;
  }

  els.chatMessages.innerHTML = state.messages.map(msg => {
    const fromClass = msg.sender === 'admin' ? 'from-admin' : 'from-user';
    const time = formatTime(msg.created_at);
    return (
      '<div class="msg-bubble ' + fromClass + '">' + escapeHtml(msg.content) + '</div>' +
      '<div class="msg-time ' + fromClass + '">' + time + '</div>'
    );
  }).join('');

  requestAnimationFrame(() => {
    els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
  });
}

async function markAsRead(userId) {
  try {
    await fetch('/api/chat-support?action=mark-read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + state.adminToken,
      },
      body: JSON.stringify({ user_id: userId }),
    });
  } catch (err) {
    console.error('Mark read failed:', err);
  }
}

async function handleSendMessage(e) {
  e.preventDefault();
  const content = els.chatInput.value.trim();
  if (!content || !state.currentUserId) return;

  els.sendBtn.disabled = true;
  els.chatInput.value = '';
  autoResize();

  const optimistic = {
    id: 'tmp_' + Date.now(),
    sender: 'admin',
    content,
    created_at: new Date().toISOString(),
  };
  state.messages.push(optimistic);
  renderMessages();

  try {
    await fetch('/api/chat-support?action=send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + state.adminToken,
      },
      body: JSON.stringify({
        user_id: state.currentUserId,
        user_name: state.currentUserName,
        content,
      }),
    });

    await loadMessages(state.currentUserId);
  } catch (err) {
    console.error('Send failed:', err);
    state.messages = state.messages.filter(m => m.id !== optimistic.id);
    renderMessages();
    alert('Failed to send message. Please try again.');
  } finally {
    els.sendBtn.disabled = false;
    els.chatInput.focus();
  }
}

function autoResize() {
  els.chatInput.style.height = 'auto';
  els.chatInput.style.height = Math.min(els.chatInput.scrollHeight, 120) + 'px';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

function escapeAttr(text) {
  return String(text).replace(/"/g, '&quot;');
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatTimeAgo(iso) {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return Math.floor(diffSec / 60) + 'm ago';
  if (diffSec < 86400) return Math.floor(diffSec / 3600) + 'h ago';
  return Math.floor(diffSec / 86400) + 'd ago';
}

init();
