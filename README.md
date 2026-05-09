# ZalifAI

Build websites with AI. Powered by Claude Sonnet.

## Features
- AI website generation (HTML, CSS, JS, React/TSX)
- Live preview
- Multi-file code editor with syntax highlighting
- Chat history per project
- Save & load projects
- User auth (local storage)

## Setup

```bash
npm install
npm run dev
```

## Deploy to Vercel

1. Push to GitHub
2. Import repo on [vercel.com](https://vercel.com)
3. Deploy (no env vars needed — API key is entered by each user in Settings)

## Usage

1. Sign up / log in
2. Go to Settings → add your Anthropic API key (get one at console.anthropic.com)
3. Create a new project
4. Describe the website you want in the chat
5. ZalifAI generates the full website — preview it live, edit the code, download files

## Stack
- React 18 + TypeScript
- Vite
- React Router
- CodeMirror 6 (code editor)
- Anthropic Claude Sonnet API
- CSS Modules
- localStorage (auth + projects)
