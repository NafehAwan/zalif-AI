import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProjects, ProjectFile, Message } from '../hooks/useProjects'
import { generateWebsite, buildPreviewHtml } from '../lib/api'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { oneDark } from '@codemirror/theme-one-dark'
import styles from './Editor.module.css'

type Tab = 'preview' | 'code'

function getExtension(file: ProjectFile) {
  if (file.language === 'html') return html()
  if (file.language === 'css') return css()
  return javascript({ jsx: true, typescript: file.language === 'typescript' })
}

export default function Editor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { getProject, updateProject } = useProjects()

  const project = getProject(id!)
  const [files, setFiles] = useState<ProjectFile[]>(project?.files || [])
  const [messages, setMessages] = useState<Message[]>(project?.messages || [])
  const [activeFile, setActiveFile] = useState(0)
  const [tab, setTab] = useState<Tab>('preview')
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [previewKey, setPreviewKey] = useState(0)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const previewHtml = files.length > 0 ? buildPreviewHtml(files) : null

  const save = useCallback((newFiles: ProjectFile[], newMessages: Message[]) => {
    updateProject(id!, { files: newFiles, messages: newMessages })
  }, [id, updateProject])

  async function handleSend() {
    if (!prompt.trim() || loading) return
    if (!user?.apiKey) {
      setError('Please add your Anthropic API key in Settings first.')
      return
    }
    setError('')
    const userMsg: Message = { role: 'user', content: prompt.trim(), timestamp: Date.now() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setPrompt('')
    setLoading(true)

    try {
      const result = await generateWebsite(
        user.apiKey,
        prompt.trim(),
        files,
        newMessages.map(m => ({ role: m.role, content: m.content }))
      )
      const aiMsg: Message = {
        role: 'assistant',
        content: `Generated ${result.files.length} files: ${result.files.map(f => f.name).join(', ')}`,
        timestamp: Date.now()
      }
      const finalMessages = [...newMessages, aiMsg]
      setMessages(finalMessages)
      setFiles(result.files)
      setActiveFile(0)
      setTab('preview')
      setPreviewKey(k => k + 1)
      save(result.files, finalMessages)
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
      setMessages(newMessages)
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleCodeChange(value: string) {
    const updated = files.map((f, i) => i === activeFile ? { ...f, content: value } : f)
    setFiles(updated)
    save(updated, messages)
    setPreviewKey(k => k + 1)
  }

  function downloadProject() {
    files.forEach(file => {
      const blob = new Blob([file.content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  if (!project) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--muted2)' }}>
      Project not found. <button onClick={() => navigate('/')} style={{ marginLeft: 8, color: 'var(--accent)', background: 'none', cursor: 'pointer' }}>Go home</button>
    </div>
  )

  const fileExtColor: Record<string, string> = {
    html: '#f97316', css: '#3ecf8e', javascript: '#facc15', typescript: '#60a5fa'
  }

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.backBtn} onClick={() => navigate('/')}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="15,18 9,12 15,6"/></svg>
          </button>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>Z</span>
            <span className={styles.projectName}>{project.name}</span>
          </div>
        </div>
        <div className={styles.headerCenter}>
          <button className={`${styles.tabBtn} ${tab === 'preview' ? styles.active : ''}`} onClick={() => setTab('preview')}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
            Preview
          </button>
          <button className={`${styles.tabBtn} ${tab === 'code' ? styles.active : ''}`} onClick={() => setTab('code')}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="16,18 22,12 16,6"/><polyline points="8,6 2,12 8,18"/></svg>
            Code
          </button>
        </div>
        <div className={styles.headerRight}>
          {files.length > 0 && (
            <button className={styles.downloadBtn} onClick={downloadProject}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download
            </button>
          )}
        </div>
      </header>

      <div className={styles.body}>
        {/* Chat panel */}
        <aside className={styles.chat}>
          <div className={styles.chatMessages}>
            {messages.length === 0 && !loading && (
              <div className={styles.chatEmpty}>
                <div className={styles.chatEmptyIcon}>✦</div>
                <p>Describe the website you want to build</p>
                <div className={styles.suggestions}>
                  {['Landing page for a SaaS app', 'Personal portfolio with dark theme', 'Restaurant menu website', 'Calculator app'].map(s => (
                    <button key={s} className={styles.suggestion} onClick={() => { setPrompt(s); textareaRef.current?.focus() }}>{s}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`${styles.msg} ${msg.role === 'user' ? styles.userMsg : styles.aiMsg}`}>
                {msg.role === 'assistant' && <div className={styles.aiLabel}>ZalifAI</div>}
                <p>{msg.content}</p>
              </div>
            ))}
            {loading && (
              <div className={`${styles.msg} ${styles.aiMsg}`}>
                <div className={styles.aiLabel}>ZalifAI</div>
                <div className={styles.typing}>
                  <span /><span /><span />
                </div>
              </div>
            )}
            {error && (
              <div className={styles.errorMsg}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className={styles.chatInput}>
            <textarea
              ref={textareaRef}
              className={styles.textarea}
              placeholder="Describe what to build or change..."
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              disabled={loading}
            />
            <div className={styles.chatActions}>
              <span className={styles.hint}>Enter to send · Shift+Enter for new line</span>
              <button className={styles.sendBtn} onClick={handleSend} disabled={loading || !prompt.trim()}>
                {loading ? <span className={styles.spinner} /> : (
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></svg>
                )}
              </button>
            </div>
          </div>
        </aside>

        {/* Main area: preview or code */}
        <main className={styles.main}>
          {tab === 'preview' ? (
            <div className={styles.preview}>
              {previewHtml ? (
                <iframe
                  key={previewKey}
                  className={styles.iframe}
                  srcDoc={previewHtml}
                  sandbox="allow-scripts"
                  title="Preview"
                />
              ) : (
                <div className={styles.previewEmpty}>
                  <div className={styles.previewEmptyIcon}>
                    <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>
                  </div>
                  <p>Your website will appear here</p>
                  <p className={styles.previewHint}>Describe what to build in the chat →</p>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.codeArea}>
              {files.length === 0 ? (
                <div className={styles.previewEmpty}>
                  <p>No files yet. Generate a website from the chat first.</p>
                </div>
              ) : (
                <>
                  <div className={styles.fileTabs}>
                    {files.map((f, i) => (
                      <button
                        key={i}
                        className={`${styles.fileTab} ${i === activeFile ? styles.fileTabActive : ''}`}
                        onClick={() => setActiveFile(i)}
                      >
                        <span className={styles.fileDot} style={{ background: fileExtColor[f.language] || '#888' }} />
                        {f.name}
                      </button>
                    ))}
                  </div>
                  <div className={styles.editor}>
                    <CodeMirror
                      value={files[activeFile]?.content || ''}
                      extensions={[getExtension(files[activeFile])]}
                      theme={oneDark}
                      onChange={handleCodeChange}
                      height="100%"
                      style={{ height: '100%', fontSize: '13px' }}
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
