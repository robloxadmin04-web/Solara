// ===== SOLARA AI - Frontend Logic =====

// ===== STATE =====
const state = {
  messages: [],
  chats: JSON.parse(localStorage.getItem('solara_chats') || '[]'),
  currentChatId: null,
  currentModel: localStorage.getItem('solara_model') || 'deepseek',
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
  clearBtn: document.getElementById('clearBtn'),
  chatContainer: document.getElementById('chatContainer'),
  welcomeScreen: document.getElementById('welcomeScreen'),
  messages: document.getElementById('messages'),
  chatForm: document.getElementById('chatForm'),
  userInput: document.getElementById('userInput'),
  sendBtn: document.getElementById('sendBtn'),
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

// ===== INIT =====
function init() {
  els.modelSelect.value = state.currentModel;
  els.modelBadge.textContent = MODEL_LABELS[state.currentModel];
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

  // Clear current chat
  els.clearBtn.addEventListener('click', () => {
    if (state.messages.length === 0) return;
    if (confirm('Sigurado ka bang i-clear ang chat na ito?')) {
      startNewChat();
    }
  });

  // Model switcher
  els.modelSelect.addEventListener('change', (e) => {
    state.currentModel = e.target.value;
    localStorage.setItem('solara_model', state.currentModel);
    els.modelBadge.textContent = MODEL_LABELS[state.currentModel];
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
    // New chat - create entry
    state.currentChatId = 'chat_' + Date.now();
    const firstUserMsg = state.messages.find((m) => m.role === 'user');
    const title = firstUserMsg
      ? firstUserMsg.content.slice(0, 40) + (firstUserMsg.content.length > 40 ? '...' : '')
      : 'New Chat';

    state.chats.unshift({
      id: state.currentChatId,
      title,
      messages: state.messages,
      updatedAt: Date.now(),
    });
  } else {
    // Update existing
    const chat = state.chats.find((c) => c.id === state.currentChatId);
    if (chat) {
      chat.messages = state.messages;
      chat.updatedAt = Date.now();
    }
  }

  // Keep only last 20 chats
  state.chats = state.chats.slice(0, 20);
  localStorage.setItem('solara_chats', JSON.stringify(state.chats));
  renderChatList();
}

function deleteChat(chatId, event) {
  event.stopPropagation();
  if (!confirm('Delete this chat?')) return;

  state.chats = state.chats.filter((c) => c.id !== chatId);
  localStorage.setItem('solara_chats', JSON.stringify(state.chats));

  if (state.currentChatId === chatId) {
    startNewChat();
  } else {
    renderChatList();
  }
}

function renderChatList() {
  if (state.chats.length === 0) {
    els.chatList.innerHTML = '<div class="chat-item-empty">Wala pang chat history</div>';
    return;
  }

  els.chatList.innerHTML = state.chats
    .map(
      (chat) => `
    <div class="chat-item ${chat.id === state.currentChatId ? 'active' : ''}" data-id="${chat.id}">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
      <span style="flex:1; overflow:hidden; text-overflow:ellipsis">${escapeHtml(chat.title)}</span>
    </div>
  `
    )
    .join('');

  els.chatList.querySelectorAll('.chat-item').forEach((item) => {
    item.addEventListener('click', () => loadChat(item.getAttribute('data-id')));
  });
}

// ===== MESSAGE HANDLING =====
async function handleSubmit(e) {
  e.preventDefault();

  const text = els.userInput.value.trim();
  if (!text || state.isLoading) return;

  // Hide welcome screen
  els.welcomeScreen.style.display = 'none';

  // Add user message
  addMessage('user', text);
  els.userInput.value = '';
  autoResizeTextarea();

  // Show typing indicator
  const typingId = showTypingIndicator();

  // Call backend
  state.isLoading = true;
  els.sendBtn.disabled = true;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: state.messages,
        model: state.currentModel,
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
      throw new Error('Walang natanggap na sagot mula sa AI.');
    }

    addMessage('assistant', reply);
    saveCurrentChat();
  } catch (err) {
    removeTypingIndicator(typingId);
    showError('May error: ' + err.message + '\n\nNote: Kailangan pa ma-setup ang backend at API keys sa Vercel.');
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

  const avatar = role === 'user' ? 'You' : '✦';
  const roleName = role === 'user' ? 'You' : MODEL_LABELS[state.currentModel];

  const renderedContent =
    role === 'assistant' ? renderMarkdown(content) : `<p>${escapeHtml(content).replace(/\n/g, '<br>')}</p>`;

  msgEl.innerHTML = `
    <div class="avatar">${avatar}</div>
    <div class="message-content">
      <div class="message-role">${roleName}</div>
      <div class="message-text">${renderedContent}</div>
    </div>
  `;

  els.messages.appendChild(msgEl);

  // Enhance code blocks with copy buttons
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

  // Create wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'code-block-wrapper';

  const header = document.createElement('div');
  header.className = 'code-block-header';
  header.innerHTML = `
    <span class="code-lang">${lang}</span>
    <button class="copy-btn" type="button">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2"/>
        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
      </svg>
      Copy
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
      copyBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
        Copied!
      `;
      setTimeout(() => {
        copyBtn.classList.remove('copied');
        copyBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2"/>
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
          </svg>
          Copy
        `;
      }, 2000);
    });
  });
}

// ===== TYPING INDICATOR =====
function showTypingIndicator() {
  const id = 'typing_' + Date.now();
  const msgEl = document.createElement('div');
  msgEl.className = 'message assistant';
  msgEl.id = id;
  msgEl.innerHTML = `
    <div class="avatar">✦</div>
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
