// ===== SOLARA AI - Frontend Logic =====

// ===== STATE =====
const state = {
  messages: [],
  chats: JSON.parse(localStorage.getItem('solara_chats') || '[]'),
  currentChatId: null,
  currentModel: localStorage.getItem('solara_model') || 'deepseek',
  currentPreset: localStorage.getItem('solara_preset') || 'general',
  isLoading: false,
};

// ===== DOM ELEMENTS =====
const els = {
  sidebar: document.getElementById('sidebar'),
  sidebarOverlay: document.getElementById('sidebarOverlay'),
  menuBtn: document.getElementById('menuBtn'),
  sidebarClose: document.getElementById('sidebarClose'),
  newChatBtn: document.getElementById('newChatBtn'),
  chatList: document.getElementById('chatList'),
  modelSelect: document.getElementById('modelSelect'),
  modelBadge: document.getElementById('modelBadge'),
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
};

// ===== SVG ICONS =====
const ICONS = {
  user: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  assistant: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  chat: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`,
  copy: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`,
  check: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  trash: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>`,
};

// ===== MARKED CONFIG (Markdown Renderer) =====
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

// ===== MODEL LABELS =====
const MODEL_LABELS = {
  deepseek: 'DeepSeek V3',
  gemini: 'Gemini 2.0 Flash',
};

// ===== SYSTEM PROMPT PRESETS =====
const PRESET_LABELS = {
  general: 'General',
  react: 'React Expert',
  debugger: 'Debugger',
  explainer: 'Explainer',
  reviewer: 'Code Reviewer',
};

// ===== INIT =====
function init() {
  els.modelSelect.value = state.currentModel;
  els.modelBadge.textContent = MODEL_LABELS[state.currentModel];
  els.presetSelect.value = state.currentPreset;
  els.presetBadge.textContent = PRESET_LABELS[state.currentPreset];
  renderChatList();
  attachEventListeners();
  autoResizeTextarea();
}

// ===== EVENT LISTENERS =====
function attachEventListeners() {
  // Sidebar toggle (mobile)
  els.menuBtn.addEventListener('click', openSidebar);
  els.sidebarClose.addEventListener('click', closeSidebar);
  els.sidebarOverlay.addEventListener('click', closeSidebar);

  // New chat
  els.newChatBtn.addEventListener('click', () => {
    startNewChat();
    if (window.innerWidth <= 768) closeSidebar();
  });

  // Delete current chat entirely (from view + history)
  els.clearBtn.addEventListener('click', () => {
    if (state.messages.length === 0 && !state.currentChatId) return;
    if (confirm('Delete this chat? This cannot be undone.')) {
      if (state.currentChatId) {
        state.chats = state.chats.filter((c) => c.id !== state.currentChatId);
        localStorage.setItem('solara_chats', JSON.stringify(state.chats));
      }
      startNewChat();
    }
  });

  // Export chat as Markdown
  els.exportBtn.addEventListener('click', exportChatAsMarkdown);

  // Model switcher
  els.modelSelect.addEventListener('change', (e) => {
    state.currentModel = e.target.value;
    localStorage.setItem('solara_model', state.currentModel);
    els.modelBadge.textContent = MODEL_LABELS[state.currentModel];
  });

  // Preset switcher
  els.presetSelect.addEventListener('change', (e) => {
    state.currentPreset = e.target.value;
    localStorage.setItem('solara_preset', state.currentPreset);
    els.presetBadge.textContent = PRESET_LABELS[state.currentPreset];
  });

  // Chat form
  els.chatForm.addEventListener('submit', handleSubmit);

  // Textarea auto-resize + Enter to send
  els.userInput.addEventListener('input', autoResizeTextarea);
  els.userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      els.chatForm.dispatchEvent(new Event('submit'));
    }
  });

  // Suggestion cards
  document.querySelectorAll('.suggestion-card').forEach((card) => {
    card.addEventListener('click', () => {
      const prompt = card.getAttribute('data-prompt');
      els.userInput.value = prompt;
      autoResizeTextarea();
      els.chatForm.dispatchEvent(new Event('submit'));
    });
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

  if (!state.currentChatId) {
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
    els.chatList.innerHTML = '<div class="chat-item-empty">No recent chats</div>';
    return;
  }

  els.chatList.innerHTML = state.chats
    .map(
      (chat) => `
    <div class="chat-item ${chat.id === state.currentChatId ? 'active' : ''}" data-id="${chat.id}">
      ${ICONS.chat}
      <span class="chat-item-title">${escapeHtml(chat.title)}</span>
      <button class="chat-item-delete" data-delete-id="${chat.id}" aria-label="Delete chat" title="Delete chat">
        ${ICONS.trash}
      </button>
    </div>
  `
    )
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
  if (!confirm('Delete this chat? This cannot be undone.')) return;
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
  els.userInput.value = '';
  autoResizeTextarea();

  const typingId = showTypingIndicator();

  state.isLoading = true;
  els.sendBtn.disabled = true;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: state.messages,
        model: state.currentModel,
        preset: state.currentPreset,
      }),
    });

    removeTypingIndicator(typingId);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const reply = data.reply || data.message || '';

    if (!reply) {
      throw new Error('No response received from the AI.');
    }

    addMessage('assistant', reply);
    saveCurrentChat();
  } catch (err) {
    removeTypingIndicator(typingId);
    showError('Error: ' + err.message + '\n\nNote: The backend and API keys still need to be set up on Vercel.');
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
  msgEl.className = `message ${role}`;

  const avatarIcon = role === 'user' ? ICONS.user : ICONS.assistant;
  const roleName = role === 'user' ? 'You' : MODEL_LABELS[state.currentModel];

  const renderedContent =
    role === 'assistant'
      ? renderMarkdown(content)
      : `<p>${escapeHtml(content).replace(/\n/g, '<br>')}</p>`;

  msgEl.innerHTML = `
    <div class="avatar">${avatarIcon}</div>
    <div class="message-content">
      <div class="message-role">${roleName}</div>
      <div class="message-text">${renderedContent}</div>
    </div>
  `;

  els.messages.appendChild(msgEl);

  msgEl.querySelectorAll('pre').forEach(enhanceCodeBlock);
}

function renderMarkdown(text) {
  try {
    return marked.parse(text);
  } catch (e) {
    return `<p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>`;
  }
}

function enhanceCodeBlock(pre) {
  const code = pre.querySelector('code');
  if (!code) return;

  const lang = (code.className.match(/language-(\w+)/) || [])[1] || 'code';

  const wrapper = document.createElement('div');
  wrapper.className = 'code-block-wrapper';

  const header = document.createElement('div');
  header.className = 'code-block-header';
  header.innerHTML = `
    <span class="code-lang">${lang}</span>
    <button class="copy-btn" type="button">
      ${ICONS.copy}
      <span>Copy</span>
    </button>
  `;

  pre.parentNode.insertBefore(wrapper, pre);
  wrapper.appendChild(header);
  wrapper.appendChild(pre);

  const copyBtn = header.querySelector('.copy-btn');
  copyBtn.addEventListener('click', () => {
    const text = code.textContent;
    navigator.clipboard.writeText(text).then(() => {
      copyBtn.classList.add('copied');
      copyBtn.innerHTML = `${ICONS.check}<span>Copied</span>`;
      setTimeout(() => {
        copyBtn.classList.remove('copied');
        copyBtn.innerHTML = `${ICONS.copy}<span>Copy</span>`;
      }, 2000);
    });
  });
}

// ===== EXPORT CHAT AS MARKDOWN =====
function exportChatAsMarkdown() {
  if (state.messages.length === 0) {
    alert('No messages to export yet. Start a conversation first.');
    return;
  }

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const timeStr = now.toTimeString().slice(0, 5); // HH:MM
  const modelName = MODEL_LABELS[state.currentModel];

  // Build Markdown content
  let md = `# Solara AI Chat Export\n\n`;
  md += `- **Date:** ${dateStr} ${timeStr}\n`;
  md += `- **Model:** ${modelName}\n`;
  md += `- **Messages:** ${state.messages.length}\n\n`;
  md += `---\n\n`;

  state.messages.forEach((msg, i) => {
    const role = msg.role === 'user' ? 'You' : modelName;
    md += `## ${role}\n\n`;
    md += `${msg.content}\n\n`;
    if (i < state.messages.length - 1) {
      md += `---\n\n`;
    }
  });

  md += `\n---\n\n_Exported from Solara AI · ${dateStr}_\n`;

  // Trigger download
  const filename = `solara-chat-${dateStr}-${timeStr.replace(':', '')}.md`;
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
  msgEl.innerHTML = `
    <div class="avatar">${ICONS.assistant}</div>
    <div class="message-content">
      <div class="message-role">${MODEL_LABELS[state.currentModel]}</div>
      <div class="message-text">
        <div class="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    </div>
  `;
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

// ===== START =====
init();
