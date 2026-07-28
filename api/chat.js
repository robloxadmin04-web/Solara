// ===== SOLARA AI - Backend (Vercel Serverless Function) =====
// Handles chat requests to DeepSeek V3 (via OpenRouter) and Gemini 2.0 Flash (via Google AI Studio)

const SYSTEM_PROMPT = `You are Solara, an expert AI coding assistant specializing in web development.

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

Be direct, technical, and helpful.`;

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
    const { messages, model } = req.body || {};

    // Validation
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Missing or invalid "messages" array.' });
    }

    if (!model || !['deepseek', 'gemini'].includes(model)) {
      return res.status(400).json({ error: 'Invalid model. Use "deepseek" or "gemini".' });
    }

    // Route to the selected AI provider
    let reply;
    if (model === 'deepseek') {
      reply = await callDeepSeek(messages);
    } else {
      reply = await callGemini(messages);
    }

    return res.status(200).json({ reply, model });
  } catch (err) {
    console.error('Chat handler error:', err);
    return res.status(500).json({
      error: err.message || 'Internal server error',
    });
  }
}

// ===== DEEPSEEK V3 (via OpenRouter) =====
async function callDeepSeek(messages) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured. Add it in Vercel Environment Variables.');
  }

  const payload = {
    model: 'deepseek/deepseek-chat-v3-0324:free',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
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
async function callGemini(messages) {
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
      parts: [{ text: SYSTEM_PROMPT }],
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
