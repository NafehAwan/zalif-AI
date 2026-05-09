import { ProjectFile } from '../hooks/useProjects'

const SYSTEM_PROMPT = `You are ZalifAI, an expert web developer that generates complete, beautiful, production-ready websites.

CRITICAL RULES — follow these exactly:
1. Always respond with ONLY a valid JSON object — no markdown, no backticks, no explanation before or after
2. The JSON must have this exact shape:
{
  "projectName": "short descriptive name",
  "files": [
    { "name": "index.html", "language": "html", "content": "..." },
    { "name": "styles.css", "language": "css", "content": "..." },
    { "name": "app.js", "language": "javascript", "content": "..." }
  ]
}
3. ALWAYS generate at least 3 files: index.html, styles.css, app.js
4. Every file must be COMPLETE — no placeholders, no "// TODO", no truncation
5. HTML must link to styles.css and app.js correctly
6. CSS must be beautiful, modern, and fully styled — use CSS variables, flexbox/grid, animations
7. JavaScript must be functional and error-free
8. Designs must be visually stunning — use a cohesive color palette, great typography (Google Fonts via @import), smooth animations
9. Mobile responsive by default
10. If the user wants a React/TSX app, generate: index.html, App.tsx, styles.css, and use a CDN import for React in the HTML
11. Never cut off — always complete every file fully

DESIGN PRINCIPLES:
- Pick a strong visual identity: dark/light theme, bold typography, meaningful color scheme
- Add micro-interactions and hover effects in CSS
- Use modern CSS: variables, grid, clamp(), custom animations
- Import Google Fonts in CSS with @import
- Make it look like it was designed by a senior designer, not a beginner`

export interface GenerateResult {
  projectName: string
  files: ProjectFile[]
}

export async function generateWebsite(
  apiKey: string,
  prompt: string,
  existingFiles: ProjectFile[],
  chatHistory: { role: 'user' | 'assistant'; content: string }[]
): Promise<GenerateResult> {
  const messages: { role: 'user' | 'assistant'; content: string }[] = []

  // Include prior chat context (last 6 messages to stay within limits)
  const recentHistory = chatHistory.slice(-6)
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content })
  }

  // If there are existing files, give the model context
  if (existingFiles.length > 0) {
    const filesContext = existingFiles
      .map(f => `=== ${f.name} ===\n${f.content}`)
      .join('\n\n')
    messages.push({
      role: 'user',
      content: `Here are the current project files:\n\n${filesContext}\n\nNow: ${prompt}`
    })
  } else {
    messages.push({ role: 'user', content: prompt })
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages
    })
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error((err as any)?.error?.message || `API error ${response.status}`)
  }

  const data = await response.json()
  const text = data.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('')

  // Strip any accidental markdown fences
  const clean = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  let parsed: any
  try {
    parsed = JSON.parse(clean)
  } catch {
    // Try to extract JSON from the response
    const match = clean.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('AI returned invalid JSON. Please try again.')
    parsed = JSON.parse(match[0])
  }

  if (!parsed.files || !Array.isArray(parsed.files)) {
    throw new Error('AI response missing files array. Please try again.')
  }

  return {
    projectName: parsed.projectName || 'My Project',
    files: parsed.files.map((f: any) => ({
      name: f.name,
      content: f.content,
      language: f.language || detectLanguage(f.name)
    }))
  }
}

function detectLanguage(filename: string): ProjectFile['language'] {
  if (filename.endsWith('.html')) return 'html'
  if (filename.endsWith('.css')) return 'css'
  if (filename.endsWith('.ts') || filename.endsWith('.tsx')) return 'typescript'
  return 'javascript'
}

export function buildPreviewHtml(files: ProjectFile[]): string {
  const html = files.find(f => f.name.endsWith('.html'))
  const css = files.filter(f => f.name.endsWith('.css'))
  const js = files.filter(f => f.name.endsWith('.js') || f.name.endsWith('.ts'))

  if (html) {
    let doc = html.content
    // Inject CSS inline
    const styleTag = css.map(f => `<style>${f.content}</style>`).join('\n')
    // Inject JS inline
    const scriptTag = js.map(f => `<script type="module">${f.content}</script>`).join('\n')
    // Replace external refs with inline content
    doc = doc
      .replace(/<link[^>]*href=["'][^"']*\.css["'][^>]*>/gi, styleTag)
      .replace(/<script[^>]*src=["'][^"']*\.js["'][^>]*><\/script>/gi, scriptTag)
    // If no replacement happened, inject before </body>
    if (!doc.includes(styleTag)) {
      doc = doc.replace('</head>', `${styleTag}</head>`)
    }
    if (!doc.includes(scriptTag)) {
      doc = doc.replace('</body>', `${scriptTag}</body>`)
    }
    return doc
  }

  // Fallback: build a document from parts
  const cssContent = css.map(f => f.content).join('\n')
  const jsContent = js.map(f => f.content).join('\n')
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${cssContent}</style></head><body><script type="module">${jsContent}</script></body></html>`
}
