# Solara AI

A minimal AI coding assistant for web development, powered by **DeepSeek V3** and **Gemini 2.0 Flash**. Built for HTML, CSS, JavaScript, Node.js, and more.

Live: [solara-ai.vercel.app](https://solara-ai.vercel.app)

---

## Features

- Clean monochrome interface (black / gray / white)
- Dual AI backend — switch between DeepSeek V3 (powerful) and Gemini 2.0 Flash (fast)
- Markdown rendering with syntax-highlighted code blocks
- Copy-to-clipboard on every code block
- Chat history saved in browser (localStorage)
- Fully responsive — works on mobile and desktop
- Zero build step, deployed as static + serverless on Vercel

---

## Tech Stack

- **Frontend:** Vanilla HTML, CSS, JavaScript
- **Backend:** Vercel Serverless Functions (Node.js 18+)
- **AI Providers:**
  - DeepSeek V3 via [OpenRouter](https://openrouter.ai) (free tier)
  - Gemini 2.0 Flash via [Google AI Studio](https://aistudio.google.com) (free tier)
- **Libraries (CDN):** [marked.js](https://marked.js.org) for Markdown, [highlight.js](https://highlightjs.org) for syntax highlighting

---

## Project Structure

```
Solara/
├── api/
│   └── chat.js          # Serverless function (AI backend)
├── public/
│   ├── index.html       # Chat UI
│   ├── style.css        # Monochrome dark theme
│   └── app.js           # Frontend logic
├── package.json
├── vercel.json          # Vercel routing config
├── .gitignore
└── README.md
```

---

## Setup

### 1. Get your API keys

**OpenRouter (for DeepSeek V3):**

1. Sign in at [openrouter.ai](https://openrouter.ai)
2. Go to [openrouter.ai/keys](https://openrouter.ai/keys)
3. Create a new key (starts with `sk-or-v1-...`)

**Google AI Studio (for Gemini):**

1. Sign in at [aistudio.google.com](https://aistudio.google.com)
2. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
3. Create a new key (starts with `AIza...`)

### 2. Add keys to Vercel

1. Open your project on [vercel.com](https://vercel.com)
2. Go to **Settings → Environment Variables**
3. Add these two variables:

| Name                 | Value          |
| -------------------- | -------------- |
| `OPENROUTER_API_KEY` | `sk-or-v1-...` |
| `GEMINI_API_KEY`     | `AIza...`      |

4. Redeploy the project (Deployments → latest → **Redeploy**)

---

## Local Development

```bash
npm install -g vercel
vercel dev
```

Create a `.env.local` file in the project root:

```
OPENROUTER_API_KEY=sk-or-v1-your-key-here
GEMINI_API_KEY=AIza-your-key-here
```

Open [http://localhost:3000](http://localhost:3000).

---

## API

`POST /api/chat`

```json
{
  "messages": [{ "role": "user", "content": "Build a todo app in vanilla JS" }],
  "model": "deepseek"
}
```

Response:

```json
{
  "reply": "Here's a todo app...",
  "model": "deepseek"
}
```

---

## License

MIT

