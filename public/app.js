// ===== SOLARA AI - Frontend Logic v8 =====
// AI Model selector removed - backend auto-rotates through all providers

// ===== STATE =====
const state = {
  messages: [],
  chats: JSON.parse(localStorage.getItem('solara_chats') || '[]'),
  currentChatId: null,
  currentModel: 'gemini', // hardcoded - backend auto-rotates all providers anyway
  currentPreset: localStorage.getItem('solara_preset') || 'general',
  isLoading: false,
  authToken: localStorage.getItem('solara_token') || null,
  authExpiresAt: parseInt(localStorage.getItem('solara_expires') || '0', 10),
  stats: JSON.parse(localStorage.getItem('solara_stats') || '{}'),
  dashboardExpanded: localStorage.getItem('solara_dash') === '1',
};

// ===== DOM ELEMENTS =====
const els = {
  sidebar: document.getElementById('sidebar'),
  sidebarOverlay: document.getElementById('sidebarOverlay'),
  menuBtn: document.getElementById('menuBtn'),
  sidebarClose: document.getElementById('sidebarClose'),
  newChatBtn: document.getElementById('newChatBtn'),
  chatList: document.getElementById('chatList'),
  presetSelect: document.getElementById('presetSelect'),
  presetBadge: document.getElementById('presetBadge'),
  clearBtn: document.getElementById('clearBtn'),
  exportBtn: document.getElementById('exportBtn'),
  chatContainer: document.getElementById('chatContainer'),
  welcomeScreen: document.getElementById('welcomeScreen'),
  messages: document.getElementById('messages'),
  chatForm: document.getElementById('chatForm'),
  userInput: document.getElementById('userInput'),
  sendBtn: document.getElementById('sendBtn'),
  loginModal: document.getElementById('loginModal'),
  loginForm: document.getElementById('loginForm'),
  loginPassword: document.getElementById('loginPassword'),
  loginBtn: document.getElementById('loginBtn'),
  loginError: document.getElementById('loginError'),
  logoutBtn: document.getElementById('logoutBtn'),

  // Playground
  openPlaygroundBtn: document.getElementById('openPlaygroundBtn'),
  playgroundModal: document.getElementById('playgroundModal'),
  playgroundCloseBtn: document.getElementById('playgroundCloseBtn'),
  playgroundRunBtn: document.getElementById('playgroundRunBtn'),
  playgroundResetBtn: document.getElementById('playgroundResetBtn'),
  pgHtml: document.getElementById('pgHtml'),
  pgCss: document.getElementById('pgCss'),
  pgJs: document.getElementById('pgJs'),
  pgPreview: document.getElementById('pgPreview'),

  // Explain
  openExplainBtn: document.getElementById('openExplainBtn'),
  explainModal: document.getElementById('explainModal'),
  explainCloseBtn: document.getElementById('explainCloseBtn'),
  explainInput: document.getElementById('explainInput'),
  explainSubmitBtn: document.getElementById('explainSubmitBtn'),
  explainClearBtn: document.getElementById('explainClearBtn'),

  // Dashboard
  dashboardPanel: document.getElementById('dashboardPanel'),
  dashboardToggle: document.getElementById('dashboardToggle'),
  statChats: document.getElementById('statChats'),
  statMessages: document.getElementById('statMessages'),
  statCode: document.getElementById('statCode'),
  statStreak: document.getElementById('statStreak'),
  statFavMode: document.getElementById('statFavMode'),
};

// ===== SVG ICONS =====
const ICONS = {
  user: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  assistant: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
  chat: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
  copy: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
  check: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  trash: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>',
  play: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
};

// ===== MARKED CONFIG =====
marked.setOptions({
  breaks: true,
  gfm: true,
  highlight: function (code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value;
      } catch (e) {}
    }
    return hljs.highlightAuto(code).value;
  },
});

// ===== LABELS =====
const PRESET_LABELS = {
  general: 'General',
  react: 'React Expert',
  debugger: 'Debugger',
  explainer: 'Explainer',
  reviewer: 'Code Reviewer',
  'explain-code': 'Explain Code',
};

// ===== INIT =====
function init() {
  els.presetSelect.value = state.currentPreset;
  els.presetBadge.textContent = PRESET_LABELS[state.currentPreset];
  renderChatList();
  attachEventListeners();
  attachAuthListeners();
  attachPlaygroundListeners();
  attachExplainListeners();
  attachDashboardListeners();
  autoResizeTextarea();
  updateStreak();
  renderDashboard();
  cleanupOldStorage();
  checkAuth();
}

// One-time cleanup of the old model preference key
function cleanupOldStorage() {
  localStorage.removeItem('solara_model');
}

// ===== AUTH =====
function checkAuth() {
  if (!state.authToken || !state.authExpiresAt || Date.now() > state.authExpiresAt) {
    showLoginModal();
  } else {
    hideLoginModal();
  }
}

function showLoginModal() {
  document.body.classList.add('locked');
  els.loginModal.classList.add('active');
  els.loginError.textContent = '';
  els.loginPassword.value = '';
  setTimeout(() => els.loginPassword.focus(), 100);
}

function hideLoginModal() {
  document.body.classList.remove('locked');
  els.loginModal.classList.remove('active');
  els.userInput.focus();
}

function logout() {
  if (!confirm('Sign out of Solara?')) return;
  state.authToken = null;
  state.authExpiresAt = 0;
  localStorage.removeItem('solara_token');
  localStorage.removeItem('solara_expires');
  showLoginModal();
}

async function handleLogin(e) {
  e.preventDefault();
  const password = els.loginPassword.value.trim();
  if (!password) return;

  els.loginBtn.disabled = true;
  els.loginBtn.innerHTML = '<div class="login-spinner"></div><span class="login-btn-text">Signing in...</span>';
  els.loginError.textContent = '';

  try {
    const response = await fetch('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'HTTP ' + response.status);
    }

    if (!data.token || !data.expiresAt) {
      throw new Error('Invalid response from server.');
    }

    state.authToken = data.token;
    state.authExpiresAt = data.expiresAt;
    localStorage.setItem('solara_token', data.token);
    localStorage.setItem('solara_expires', String(data.expiresAt));

    hideLoginModal();
  } catch (err) {
    els.loginError.textContent = err.message || 'Sign in failed.';
    els.loginPassword.select();
  } finally {
    els.loginBtn.disabled = false;
    els.loginBtn.innerHTML = '<span class="login-btn-text">Sign In</span>';
  }
}

function attachAuthListeners() {
  els.loginForm.addEventListener('submit', handleLogin);
  els.logoutBtn.addEventListener('click', logout);
}

// ===== EVENT LISTENERS =====
function attachEventListeners() {
  els.menuBtn.addEventListener('click', openSidebar);
  els.sidebarClose.addEventListener('click', closeSidebar);
  els.sidebarOverlay.addEventListener('click', closeSidebar);

  els.newChatBtn.addEventListener('click', () => {
    startNewChat();
    if (window.innerWidth <= 768) closeSidebar();
  });

  els.clearBtn.addEventListener('click', () => {
    if (state.messages.length === 0 && !state.currentChatId) return;
    if (confirm('Delete this conversation? This cannot be undone.')) {
      if (state.currentChatId) {
        state.chats = state.chats.filter((c) => c.id !== state.currentChatId);
        localStorage.setItem('solara_chats', JSON.stringify(state.chats));
      }
      startNewChat();
    }
  });

  els.exportBtn.addEventListener('click', exportChatAsMarkdown);

  els.presetSelect.addEventListener('change', (e) => {
    state.currentPreset = e.target.value;
    localStorage.setItem('solara_preset', state.currentPreset);
    els.presetBadge.textContent = PRESET_LABELS[state.currentPreset];
    trackPresetUse(state.currentPreset);
  });

  els.chatForm.addEventListener('submit', handleSubmit);

  els.userInput.addEventListener('input', autoResizeTextarea);
  els.userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      els.chatForm.dispatchEvent(new Event('submit'));
    }
  });

  document.querySelectorAll('.suggestion-card').forEach((card) => {
    card.addEventListener('click', () => {
      const prompt = card.getAttribute('data-prompt');
      els.userInput.value = prompt;
      autoResizeTextarea();
      els.chatForm.dispatchEvent(new Event('submit'));
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (els.playgroundModal.classList.contains('active')) closePlayground();
      if (els.explainModal.classList.contains('active')) closeExplain();
    }
  });
}

// ===== SIDEBAR (MOBILE) =====
function openSidebar() {
  els.sidebar.classList.add('open');
  els.sidebarOverlay.classList.add('active');
}

function closeSidebar() {
  els.sidebar.classList.remove('open');
  els.sidebarOverlay.classList.remove('active');
}

// ===== TEXTAREA AUTO-RESIZE =====
function autoResizeTextarea() {
  els.userInput.style.height = 'auto';
  els.userInput.style.height = Math.min(els.userInput.scrollHeight, 200) + 'px';
}

// ===== CHAT MANAGEMENT =====
function startNewChat() {
  state.messages = [];
  state.currentChatId = null;
  els.messages.innerHTML = '';
  els.welcomeScreen.style.display = 'flex';
  els.userInput.value = '';
  autoResizeTextarea();
  els.userInput.focus();
  renderChatList();
}

function loadChat(chatId) {
  const chat = state.chats.find((c) => c.id === chatId);
  if (!chat) return;

  state.currentChatId = chatId;
  state.messages = [...chat.messages];
  els.messages.innerHTML = '';
  els.welcomeScreen.style.display = 'none';

  state.messages.forEach((msg) => {
    appendMessageToDOM(msg.role, msg.content);
  });

  renderChatList();
  scrollToBottom();

  if (window.innerWidth <= 768) closeSidebar();
}

function saveCurrentChat() {
  if (state.messages.length === 0) return;

  const isNewChat = !state.currentChatId;

  if (isNewChat) {
    state.currentChatId = 'chat_' + Date.now();
    const firstUserMsg = state.messages.find((m) => m.role === 'user');
    const title = firstUserMsg
      ? firstUserMsg.content.slice(0, 40) + (firstUserMsg.content.length > 40 ? '...' : '')
      : 'New chat';

    state.chats.unshift({
      id: state.currentChatId,
      title,
      messages: state.messages,
      updatedAt: Date.now(),
    });
    trackChatCreated();
  } else {
    const chat = state.chats.find((c) => c.id === state.currentChatId);
    if (chat) {
      chat.messages = state.messages;
      chat.updatedAt = Date.now();
    }
  }

  state.chats = state.chats.slice(0, 20);
  localStorage.setItem('solara_chats', JSON.stringify(state.chats));
  renderChatList();
}

function renderChatList() {
  if (state.chats.length === 0) {
    els.chatList.innerHTML = '<div class="chat-item-empty">No recent conversations</div>';
    return;
  }

  els.chatList.innerHTML = state.chats
    .map((chat) => (
      '<div class="chat-item ' + (chat.id === state.currentChatId ? 'active' : '') + '" data-id="' + chat.id + '">' +
        ICONS.chat +
        '<span class="chat-item-title">' + escapeHtml(chat.title) + '</span>' +
        '<button class="chat-item-delete" data-delete-id="' + chat.id + '" aria-label="Delete chat" title="Delete chat">' +
          ICONS.trash +
        '</button>' +
      '</div>'
    ))
    .join('');

  els.chatList.querySelectorAll('.chat-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.chat-item-delete')) return;
      loadChat(item.getAttribute('data-id'));
    });
  });

  els.chatList.querySelectorAll('.chat-item-delete').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const chatId = btn.getAttribute('data-delete-id');
      deleteChat(chatId);
    });
  });
}

function deleteChat(chatId) {
  if (!confirm('Delete this conversation? This cannot be undone.')) return;
  state.chats = state.chats.filter((c) => c.id !== chatId);
  localStorage.setItem('solara_chats', JSON.stringify(state.chats));
  if (state.currentChatId === chatId) {
    startNewChat();
  } else {
    renderChatList();
  }
}

// ===== MESSAGE HANDLING =====
async function handleSubmit(e) {
  e.preventDefault();

  const text = els.userInput.value.trim();
  if (!text || state.isLoading) return;

  els.welcomeScreen.style.display = 'none';

  addMessage('user', text);
  trackQuestionAsked();
  els.userInput.value = '';
  autoResizeTextarea();

  const typingId = showTypingIndicator();

  state.isLoading = true;
  els.sendBtn.disabled = true;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + (state.authToken || ''),
      },
      body: JSON.stringify({
        messages: state.messages,
        model: state.currentModel,
        preset: state.currentPreset,
      }),
    });

    removeTypingIndicator(typingId);

    if (response.status === 401) {
      state.authToken = null;
      state.authExpiresAt = 0;
      localStorage.removeItem('solara_token');
      localStorage.removeItem('solara_expires');
      showLoginModal();
      throw new Error('Your session expired. Please sign in again.');
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'HTTP ' + response.status);
    }

    const data = await response.json();
    const reply = data.reply || data.message || '';

    if (!reply) {
      throw new Error('No response received from the AI.');
    }

    addMessage('assistant', reply);
    trackCodeBlocks(reply);
    trackPresetUse(state.currentPreset);
    saveCurrentChat();
    renderDashboard();
  } catch (err) {
    removeTypingIndicator(typingId);
    showError('Error: ' + err.message);
  } finally {
    state.isLoading = false;
    els.sendBtn.disabled = false;
    els.userInput.focus();
  }
}

function addMessage(role, content) {
  state.messages.push({ role, content });
  appendMessageToDOM(role, content);
  scrollToBottom();
}

function appendMessageToDOM(role, content) {
  const msgEl = document.createElement('div');
  msgEl.className = 'message ' + role;

  const avatarIcon = role === 'user' ? ICONS.user : ICONS.assistant;
  const roleName = role === 'user' ? 'You' : 'Solara';

  const renderedContent =
    role === 'assistant'
      ? renderMarkdown(content)
      : '<p>' + escapeHtml(content).replace(/\n/g, '<br>') + '</p>';

  msgEl.innerHTML =
    '<div class="avatar">' + avatarIcon + '</div>' +
    '<div class="message-content">' +
      '<div class="message-role">' + roleName + '</div>' +
      '<div class="message-text">' + renderedContent + '</div>' +
    '</div>';

  els.messages.appendChild(msgEl);

  msgEl.querySelectorAll('pre').forEach(enhanceCodeBlock);
}

function renderMarkdown(text) {
  try {
    return marked.parse(text);
  } catch (e) {
    return '<p>' + escapeHtml(text).replace(/\n/g, '<br>') + '</p>';
  }
}

function enhanceCodeBlock(pre) {
  const code = pre.querySelector('code');
  if (!code) return;

  const lang = (code.className.match(/language-(\w+)/) || [])[1] || 'code';
  const langLower = lang.toLowerCase();
  const isRunnable = ['html', 'css', 'js', 'javascript'].includes(langLower);

  const wrapper = document.createElement('div');
  wrapper.className = 'code-block-wrapper';

  const header = document.createElement('div');
  header.className = 'code-block-header';

  const actions = isRunnable
    ? (
        '<div class="code-block-actions">' +
          '<button class="playground-btn" type="button" title="Open in Playground">' +
            ICONS.play +
            '<span>Playground</span>' +
          '</button>' +
          '<button class="copy-btn" type="button">' +
            ICONS.copy +
            '<span>Copy</span>' +
          '</button>' +
        '</div>'
      )
    : (
        '<div class="code-block-actions">' +
          '<button class="copy-btn" type="button">' +
            ICONS.copy +
            '<span>Copy</span>' +
          '</button>' +
        '</div>'
      );

  header.innerHTML = '<span class="code-lang">' + lang + '</span>' + actions;

  pre.parentNode.insertBefore(wrapper, pre);
  wrapper.appendChild(header);
  wrapper.appendChild(pre);

  const copyBtn = header.querySelector('.copy-btn');
  copyBtn.addEventListener('click', () => {
    const text = code.textContent;
    navigator.clipboard.writeText(text).then(() => {
      copyBtn.classList.add('copied');
      copyBtn.innerHTML = ICONS.check + '<span>Copied</span>';
      setTimeout(() => {
        copyBtn.classList.remove('copied');
        copyBtn.innerHTML = ICONS.copy + '<span>Copy</span>';
      }, 2000);
    });
  });

  if (isRunnable) {
    const pgBtn = header.querySelector('.playground-btn');
    pgBtn.addEventListener('click', () => {
      openPlaygroundWithCode(langLower, code.textContent);
    });
  }
}

// ===== EXPORT CHAT AS MARKDOWN =====
function exportChatAsMarkdown() {
  if (state.messages.length === 0) {
    alert('No messages to export yet. Start a conversation first.');
    return;
  }

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5);

  let md = '# Solara AI Conversation Export\n\n';
  md += '- Date: ' + dateStr + ' ' + timeStr + '\n';
  md += '- Messages: ' + state.messages.length + '\n\n';
  md += '---\n\n';

  state.messages.forEach((msg, i) => {
    const role = msg.role === 'user' ? 'You' : 'Solara';
    md += '## ' + role + '\n\n';
    md += msg.content + '\n\n';
    if (i < state.messages.length - 1) {
      md += '---\n\n';
    }
  });

  md += '\n---\n\n_Exported from Solara AI on ' + dateStr + '_\n';

  const filename = 'solara-chat-' + dateStr + '-' + timeStr.replace(':', '') + '.md';
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ===== TYPING INDICATOR =====
function showTypingIndicator() {
  const id = 'typing_' + Date.now();
  const msgEl = document.createElement('div');
  msgEl.className = 'message assistant';
  msgEl.id = id;
  msgEl.innerHTML =
    '<div class="avatar">' + ICONS.assistant + '</div>' +
    '<div class="message-content">' +
      '<div class="message-role">Solara</div>' +
      '<div class="message-text">' +
        '<div class="typing-indicator">' +
          '<div class="typing-dot"></div>' +
          '<div class="typing-dot"></div>' +
          '<div class="typing-dot"></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  els.messages.appendChild(msgEl);
  scrollToBottom();
  return id;
}

function removeTypingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// ===== ERROR =====
function showError(message) {
  const errEl = document.createElement('div');
  errEl.className = 'error-message';
  errEl.textContent = message;
  els.messages.appendChild(errEl);
  scrollToBottom();
}

// ===== UTILITIES =====
function scrollToBottom() {
  requestAnimationFrame(() => {
    els.chatContainer.scrollTop = els.chatContainer.scrollHeight;
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===== LIVE CODE PLAYGROUND =====
const PG_STORAGE_KEY = 'solara_playground';

function attachPlaygroundListeners() {
  els.openPlaygroundBtn.addEventListener('click', () => {
    openPlayground();
    if (window.innerWidth <= 768) closeSidebar();
  });
  els.playgroundCloseBtn.addEventListener('click', closePlayground);
  els.playgroundRunBtn.addEventListener('click', runPlayground);
  els.playgroundResetBtn.addEventListener('click', resetPlayground);

  document.querySelectorAll('.playground-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      switchPlaygroundTab(tab.getAttribute('data-tab'));
    });
  });

  [els.pgHtml, els.pgCss, els.pgJs].forEach((editor) => {
    editor.addEventListener('input', savePlaygroundState);
    editor.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        runPlayground();
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        editor.value = editor.value.substring(0, start) + '  ' + editor.value.substring(end);
        editor.selectionStart = editor.selectionEnd = start + 2;
        savePlaygroundState();
      }
    });
  });

  restorePlaygroundState();
}

function openPlayground() {
  els.playgroundModal.classList.add('active');
  setTimeout(() => runPlayground(), 100);
}

function closePlayground() {
  els.playgroundModal.classList.remove('active');
}

function openPlaygroundWithCode(lang, code) {
  openPlayground();
  if (lang === 'html') {
    els.pgHtml.value = code;
    switchPlaygroundTab('html');
  } else if (lang === 'css') {
    els.pgCss.value = code;
    switchPlaygroundTab('css');
  } else if (lang === 'js' || lang === 'javascript') {
    els.pgJs.value = code;
    switchPlaygroundTab('js');
  }
  savePlaygroundState();
  setTimeout(() => runPlayground(), 100);
}

function switchPlaygroundTab(tabName) {
  document.querySelectorAll('.playground-tab').forEach((t) => {
    t.classList.toggle('active', t.getAttribute('data-tab') === tabName);
  });
  document.querySelectorAll('.playground-editor').forEach((e) => {
    e.classList.toggle('active', e.getAttribute('data-tab') === tabName);
  });
}

function runPlayground() {
  const html = els.pgHtml.value || '';
  const css = els.pgCss.value || '';
  const js = els.pgJs.value || '';

  const combined =
    '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><style>' + css + '</style></head><body>' +
    html +
    '<script>try{' + js + '}catch(err){document.body.innerHTML+=\'<div style="background:#fee;color:#c00;padding:10px;margin:10px 0;border-radius:6px;font-family:monospace;font-size:12px;border:1px solid #fcc;">Error: \'+err.message+\'</div>\';}<\/script>' +
    '</body></html>';

  els.pgPreview.srcdoc = combined;
}

function resetPlayground() {
  if (!confirm('Reset all playground code? This will delete what you have written.')) return;
  els.pgHtml.value = '';
  els.pgCss.value = '';
  els.pgJs.value = '';
  savePlaygroundState();
  runPlayground();
}

function savePlaygroundState() {
  const s = {
    html: els.pgHtml.value,
    css: els.pgCss.value,
    js: els.pgJs.value,
  };
  try {
    localStorage.setItem(PG_STORAGE_KEY, JSON.stringify(s));
  } catch (e) {}
}

function restorePlaygroundState() {
  try {
    const saved = JSON.parse(localStorage.getItem(PG_STORAGE_KEY) || '{}');
    if (saved.html) els.pgHtml.value = saved.html;
    if (saved.css) els.pgCss.value = saved.css;
    if (saved.js) els.pgJs.value = saved.js;
  } catch (e) {}
}

// ===== EXPLAIN CODE =====
function attachExplainListeners() {
  els.openExplainBtn.addEventListener('click', () => {
    openExplain();
    if (window.innerWidth <= 768) closeSidebar();
  });
  els.explainCloseBtn.addEventListener('click', closeExplain);
  els.explainClearBtn.addEventListener('click', () => {
    els.explainInput.value = '';
    els.explainInput.focus();
  });
  els.explainSubmitBtn.addEventListener('click', submitExplainRequest);

  els.explainInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      submitExplainRequest();
    }
  });
}

function openExplain() {
  els.explainModal.classList.add('active');
  setTimeout(() => els.explainInput.focus(), 100);
}

function closeExplain() {
  els.explainModal.classList.remove('active');
}

async function submitExplainRequest() {
  const code = els.explainInput.value.trim();
  if (!code) {
    els.explainInput.focus();
    return;
  }

  closeExplain();

  const originalPreset = state.currentPreset;
  state.currentPreset = 'explain-code';

  startNewChat();

  const userMessage = 'Please explain this code line-by-line:\n\n\`\`\`\n' + code + '\n\`\`\`';
  els.userInput.value = userMessage;
  els.welcomeScreen.style.display = 'none';

  els.chatForm.dispatchEvent(new Event('submit'));

  setTimeout(() => {
    state.currentPreset = originalPreset;
    els.presetSelect.value = originalPreset;
    els.presetBadge.textContent = PRESET_LABELS[originalPreset];
  }, 500);

  els.explainInput.value = '';
}

// ===== PROGRESS DASHBOARD =====
function attachDashboardListeners() {
  els.dashboardToggle.addEventListener('click', toggleDashboard);
  if (state.dashboardExpanded) {
    els.dashboardPanel.classList.add('expanded');
  }
}

function toggleDashboard() {
  els.dashboardPanel.classList.toggle('expanded');
  state.dashboardExpanded = els.dashboardPanel.classList.contains('expanded');
  localStorage.setItem('solara_dash', state.dashboardExpanded ? '1' : '0');
}

function getStats() {
  if (!state.stats || typeof state.stats !== 'object') {
    state.stats = {};
  }
  return {
    chatsCreated: state.stats.chatsCreated || 0,
    questionsAsked: state.stats.questionsAsked || 0,
    codeBlocksSeen: state.stats.codeBlocksSeen || 0,
    streakDays: state.stats.streakDays || 0,
    lastActiveDate: state.stats.lastActiveDate || null,
    presetUsage: state.stats.presetUsage || {},
  };
}

function saveStats(stats) {
  state.stats = stats;
  localStorage.setItem('solara_stats', JSON.stringify(stats));
}

function trackChatCreated() {
  const stats = getStats();
  stats.chatsCreated += 1;
  saveStats(stats);
  renderDashboard();
}

function trackQuestionAsked() {
  const stats = getStats();
  stats.questionsAsked += 1;
  saveStats(stats);
  renderDashboard();
}

function trackCodeBlocks(replyText) {
  const matches = replyText.match(/```[\s\S]*?```/g) || [];
  if (matches.length === 0) return;
  const stats = getStats();
  stats.codeBlocksSeen += matches.length;
  saveStats(stats);
  renderDashboard();
}

function trackPresetUse(preset) {
  const stats = getStats();
  if (!stats.presetUsage) stats.presetUsage = {};
  stats.presetUsage[preset] = (stats.presetUsage[preset] || 0) + 1;
  saveStats(stats);
  renderDashboard();
}

function updateStreak() {
  const stats = getStats();
  const today = new Date().toISOString().slice(0, 10);

  if (!stats.lastActiveDate) {
    stats.streakDays = 1;
    stats.lastActiveDate = today;
    saveStats(stats);
    return;
  }

  if (stats.lastActiveDate === today) return;

  const lastDate = new Date(stats.lastActiveDate);
  const todayDate = new Date(today);
  const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    stats.streakDays += 1;
  } else if (diffDays > 1) {
    stats.streakDays = 1;
  }

  stats.lastActiveDate = today;
  saveStats(stats);
}

function getFavoriteMode() {
  const stats = getStats();
  const usage = stats.presetUsage || {};
  const entries = Object.entries(usage);
  if (entries.length === 0) return 'None yet';
  entries.sort((a, b) => b[1] - a[1]);
  return PRESET_LABELS[entries[0][0]] || entries[0][0];
}

function renderDashboard() {
  const stats = getStats();
  els.statChats.textContent = stats.chatsCreated;
  els.statMessages.textContent = stats.questionsAsked;
  els.statCode.textContent = stats.codeBlocksSeen;
  els.statStreak.textContent = stats.streakDays;
  els.statFavMode.textContent = getFavoriteMode();
}



// =====================================================
// ===== SUPPORT CHAT WIDGET =====
// =====================================================

const supportState = {
  isOpen: false,
  userId: localStorage.getItem('solara_support_user_id') || null,
  userName: localStorage.getItem('solara_support_user_name') || null,
  messages: [],
  pollTimer: null,
  lastMessageId: null,
  unreadCount: 0,
};

const supportEls = {
  widget: document.getElementById('supportWidget'),
  bubble: document.getElementById('supportBubble'),
  badge: document.getElementById('supportBadge'),
  window: document.getElementById('supportWindow'),
  namePrompt: document.getElementById('supportNamePrompt'),
  nameForm: document.getElementById('supportNameForm'),
  nameInput: document.getElementById('supportNameInput'),
  chat: document.getElementById('supportChat'),
  messages: document.getElementById('supportMessages'),
  inputForm: document.getElementById('supportInputForm'),
  input: document.getElementById('supportInput'),
};

function initSupport() {
  if (!supportEls.widget) return;

  supportEls.bubble.addEventListener('click', toggleSupport);
  supportEls.nameForm.addEventListener('submit', handleNameSubmit);
  supportEls.inputForm.addEventListener('submit', handleSupportSend);
  supportEls.input.addEventListener('input', autoResizeSupport);
  supportEls.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      supportEls.inputForm.dispatchEvent(new Event('submit'));
    }
  });

  // Show correct screen based on state
  if (supportState.userId && supportState.userName) {
    supportEls.namePrompt.style.display = 'none';
    supportEls.chat.style.display = 'flex';
  } else {
    supportEls.namePrompt.style.display = 'flex';
    supportEls.chat.style.display = 'none';
  }

  // Start polling for unread messages in background
  if (supportState.userId) {
    startSupportPolling();
  }
}

function toggleSupport() {
  supportState.isOpen = !supportState.isOpen;
  supportEls.window.classList.toggle('open', supportState.isOpen);
  supportEls.bubble.classList.toggle('open', supportState.isOpen);

  if (supportState.isOpen && supportState.userId) {
    loadSupportMessages();
    supportEls.input.focus();
    // Clear unread badge when opened
    supportState.unreadCount = 0;
    updateBadge();
  }
}

async function handleNameSubmit(e) {
  e.preventDefault();
  const name = supportEls.nameInput.value.trim();
  if (!name) return;

  // Generate user ID
  const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

  try {
    const response = await fetch('/api/chat-support?action=register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + (state.authToken || ''),
      },
      body: JSON.stringify({ user_id: userId, user_name: name }),
    });

    if (!response.ok) throw new Error('Registration failed');

    supportState.userId = userId;
    supportState.userName = name;
    localStorage.setItem('solara_support_user_id', userId);
    localStorage.setItem('solara_support_user_name', name);

    supportEls.namePrompt.style.display = 'none';
    supportEls.chat.style.display = 'flex';
    supportEls.input.focus();

    startSupportPolling();
    loadSupportMessages();
  } catch (err) {
    alert('Could not start chat. Please try again.');
  }
}

async function handleSupportSend(e) {
  e.preventDefault();
  const content = supportEls.input.value.trim();
  if (!content || !supportState.userId) return;

  supportEls.input.value = '';
  autoResizeSupport();

  // Optimistic
  const optimistic = {
    id: 'tmp_' + Date.now(),
    sender: 'user',
    content,
    created_at: new Date().toISOString(),
  };
  supportState.messages.push(optimistic);
  renderSupportMessages();

  try {
    await fetch('/api/chat-support?action=send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + (state.authToken || ''),
      },
      body: JSON.stringify({
        user_id: supportState.userId,
        user_name: supportState.userName,
        content,
      }),
    });

    await loadSupportMessages();
  } catch (err) {
    supportState.messages = supportState.messages.filter(m => m.id !== optimistic.id);
    renderSupportMessages();
    alert('Failed to send. Please try again.');
  }
}

async function loadSupportMessages() {
  if (!supportState.userId) return;

  try {
    const response = await fetch('/api/chat-support?action=list', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + (state.authToken || ''),
      },
      body: JSON.stringify({ user_id: supportState.userId }),
    });

    const data = await response.json();
    const newMessages = data.messages || [];
    const prevCount = supportState.messages.length;

    supportState.messages = newMessages;
    renderSupportMessages();

    // Check for new admin messages while closed
    if (!supportState.isOpen && newMessages.length > prevCount) {
      const newFromAdmin = newMessages.slice(prevCount).filter(m => m.sender === 'admin').length;
      if (newFromAdmin > 0) {
        supportState.unreadCount += newFromAdmin;
        updateBadge();
      }
    }

    // Mark as read if chat is open
    if (supportState.isOpen) {
      await markSupportRead();
    }
  } catch (err) {
    console.error('Support load failed:', err);
  }
}

async function markSupportRead() {
  try {
    await fetch('/api/chat-support?action=mark-read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + (state.authToken || ''),
      },
      body: JSON.stringify({ user_id: supportState.userId }),
    });
  } catch (err) {}
}

function renderSupportMessages() {
  if (supportState.messages.length === 0) {
    supportEls.messages.innerHTML = '<div class="support-msg-empty">Send a message to start the conversation.</div>';
    return;
  }

  supportEls.messages.innerHTML = supportState.messages.map(msg => {
    const cls = msg.sender === 'user' ? 'mine' : 'theirs';
    return '<div class="support-msg ' + cls + '">' + escapeHtml(msg.content) + '</div>';
  }).join('');

  requestAnimationFrame(() => {
    supportEls.messages.scrollTop = supportEls.messages.scrollHeight;
  });
}

function updateBadge() {
  if (supportState.unreadCount > 0) {
    supportEls.badge.textContent = supportState.unreadCount > 9 ? '9+' : supportState.unreadCount;
    supportEls.badge.style.display = 'flex';
  } else {
    supportEls.badge.style.display = 'none';
  }
}

function autoResizeSupport() {
  supportEls.input.style.height = 'auto';
  supportEls.input.style.height = Math.min(supportEls.input.scrollHeight, 80) + 'px';
}

function startSupportPolling() {
  if (supportState.pollTimer) clearInterval(supportState.pollTimer);
  supportState.pollTimer = setInterval(() => {
    if (supportState.userId) {
      loadSupportMessages();
    }
  }, 5000); // every 5 seconds
}

// Initialize after main init runs
setTimeout(initSupport, 100);

// ===== START =====
init();
