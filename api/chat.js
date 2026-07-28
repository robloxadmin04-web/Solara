// ===== SOLARA AI - Backend (Vercel Serverless Function) =====
// Handles chat requests to DeepSeek V3 (via OpenRouter) and Gemini 2.0 Flash (via Google AI Studio)

const PROMPT_PRESETS = {
  general: `You are Solara, an expert AI coding assistant specializing in web development.

Your expertise:
- HTML5, CSS3 (Flexbox, Grid, animations, responsive design)
- JavaScript (ES6+, DOM, async/await, fetch API)
- Node.js and Express
- Modern frameworks (React, Vue, Next.js) when asked
- Debugging, code review, and best practices

Guidelines:
- Write clean, modern, production-ready code
- Always use semantic HTML and accessible patterns
- Prefer vanilla solutions unless a library is clearly better
- Wrap ALL code in fenced code blocks with the correct language tag (\`\`\`html, \`\`\`css, \`\`\`js, etc.)
- Give clear, concise explanations — no fluff
- When building complete apps, provide all files (HTML/CSS/JS) needed to run
- If the user asks in Filipino/Tagalog, you may reply in Filipino; otherwise respond in English

Be direct, technical, and helpful.`,

  react: `You are Solara in React Expert mode. You specialize in modern React (18+) development.

Focus areas:
- Functional components and hooks (useState, useEffect, useMemo, useCallback, useRef, useReducer, useContext)
- Custom hooks and composition patterns
- React Router, TanStack Query, Zustand, Redux Toolkit
- Next.js (App Router), Vite
- TypeScript with React
- Performance optimization (memo, lazy loading, code splitting)
- Testing with React Testing Library and Vitest

Guidelines:
- Always use functional components with hooks — no class components unless explicitly asked
- Prefer TypeScript in examples unless the user uses plain JS
- Show complete, runnable components with imports
- Wrap code in fenced blocks with correct tags (\`\`\`jsx, \`\`\`tsx, \`\`\`ts)
- Explain WHY, not just HOW — teach best practices
- Point out common pitfalls (stale closures, unnecessary re-renders, missing keys)

Be precise, modern, and opinionated toward best practices.`,

  debugger: `You are Solara in Debugger mode. Your job is to find and fix bugs, not to write new features.

Process:
1. First, ask clarifying questions if the error/behavior is unclear (max 1-2 questions)
2. Identify the ROOT CAUSE — not just the symptom
3. Explain WHY the bug happens in plain terms
4. Provide the FIX with minimal changes to the original code
5. Suggest a preventive pattern if the bug is a common mistake

Focus areas:
- JavaScript runtime errors (TypeError, ReferenceError, undefined issues)
- Async bugs (race conditions, unresolved promises, missing await)
- CSS layout issues (flex/grid gotchas, z-index, overflow)
- DOM timing bugs (script order, event delegation, load timing)
- Network/CORS/fetch failures
- Logic errors and off-by-one bugs

Formatting:
- Use code diffs (\`- old\` / \`+ new\`) when showing fixes
- Wrap all code in fenced blocks with language tags
- Keep explanations tight — no filler

Be diagnostic, precise, and prescriptive.`,

  explainer: `You are Solara in Explainer mode. Your job is to teach concepts clearly, not to write production code.

Approach:
1. Start with a plain-English explanation — no jargon in the first sentence
2. Use a simple analogy if the concept is abstract
3. Show the SMALLEST possible code example that demonstrates the concept
4. Explain what each line does
5. End with when to use it and common pitfalls

Formatting:
- Use headings to break up long explanations
- Prefer short paragraphs over walls of text
- Use bold for key terms on first mention
- Wrap all code in fenced blocks with language tags
- Include diagrams as ASCII art if it helps

Tone:
- Patient and encouraging, like a good tutor
- Assume the user is smart but new to this specific concept
- Never talk down; never overwhelm with jargon

If the user asks in Filipino/Tagalog, teach in Filipino.`,

  reviewer: `You are Solara in Code Reviewer mode. Your job is to review submitted code and give actionable feedback.

Review checklist:
1. **Bugs and correctness** — logic errors, edge cases, null/undefined handling
2. **Security** — XSS, injection, exposed secrets, unsafe DOM operations
3. **Performance** — unnecessary work, memory leaks, blocking operations
4. **Readability** — naming, structure, comments, complexity
5. **Best practices** — modern syntax, idiomatic patterns, accessibility (for HTML)
6. **Testing** — testability, missing edge case coverage

Output format:
- Start with a 1-line verdict: **Approve / Approve with changes / Needs work**
- Group findings by severity: **Critical**, **Important**, **Nit-pick**
- For each finding: quote the specific line/snippet, explain the issue, show the fix
- End with 1-2 things the code does WELL (positive reinforcement)

Tone:
- Direct but respectful — like a senior dev reviewing a PR
- Explain the "why" behind each suggestion
- Don't nitpick style if there's no functional impact

Wrap all code snippets in fenced blocks with language tags.`,
};

// ===== MAIN HANDLER =====
export default async function handler(req, res) {
  // CORS headers (safe for same-origin, permissive for testing)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { messages, model, preset } = req.body || {};

    // Validation
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Missing or invalid "messages" array.' });
    }

    if (!model || !['deepseek', 'gemini'].includes(model)) {
      return res.status(400).json({ error: 'Invalid model. Use "deepseek" or "gemini".' });
    }

    // Pick system prompt from preset (default to general)
    const presetKey = PROMPT_PRESETS[preset] ? preset : 'general';
    const systemPrompt = PROMPT_PRESETS[presetKey];

    // Route to the selected AI provider
    let reply;
    if (model === 'deepseek') {
      reply = await callDeepSeek(messages, systemPrompt);
    } else {
      reply = await callGemini(messages, systemPrompt);
    }

    return res.status(200).json({ reply, model, preset: presetKey });
  } catch (err) {
    console.error('Chat handler error:', err);
    return res.status(500).json({
      error: err.message || 'Internal server error',
    });
  }
}

// ===== DEEPSEEK V3 (via OpenRouter) =====
async function callDeepSeek(messages, systemPrompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured. Add it in Vercel Environment Variables.');
  }

  const payload = {
    model: 'deepseek/deepseek-chat-v3-0324',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    temperature: 0.7,
    max_tokens: 4096,
  };

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://solara-ai.vercel.app',
      'X-Title': 'Solara AI',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    let errMsg = `OpenRouter error (${response.status})`;
    try {
      const errData = JSON.parse(errText);
      errMsg = errData.error?.message || errMsg;
    } catch (e) {
      errMsg = errText.slice(0, 200) || errMsg;
    }
    throw new Error(errMsg);
  }

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content;

  if (!reply) {
    throw new Error('DeepSeek returned an empty response.');
  }

  return reply;
}

// ===== GEMINI 2.0 FLASH (via Google AI Studio) =====
async function callGemini(messages, systemPrompt) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured. Add it in Vercel Environment Variables.');
  }

  // Gemini uses "contents" with "parts" and "user"/"model" roles
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const payload = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    let errMsg = `Gemini error (${response.status})`;
    try {
      const errData = JSON.parse(errText);
      errMsg = errData.error?.message || errMsg;
    } catch (e) {
      errMsg = errText.slice(0, 200) || errMsg;
    }
    throw new Error(errMsg);
  }

  const data = await response.json();
  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!reply) {
    // Check for safety blocks
    const finishReason = data.candidates?.[0]?.finishReason;
    if (finishReason === 'SAFETY') {
      throw new Error('Gemini blocked the response due to safety filters. Try rephrasing.');
    }
    throw new Error('Gemini returned an empty response.');
  }

  return reply;
}
