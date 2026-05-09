import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProjects } from '../hooks/useProjects'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const { projects, createProject, deleteProject } = useProjects()
  const navigate = useNavigate()
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [apiKey, setApiKey] = useState(user?.apiKey || '')
  const { updateApiKey } = useAuth()

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    const p = createProject(newName.trim(), newDesc.trim())
    navigate(`/editor/${p.id}`)
  }

  function handleSaveKey() {
    updateApiKey(apiKey.trim())
    setShowSettings(false)
  }

  const fmt = (ms: number) => new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>Z</span>
          Zalif<span className={styles.dim}>AI</span>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.settingsBtn} onClick={() => setShowSettings(true)}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
            Settings
          </button>
          <div className={styles.avatar}>{user?.name?.[0]?.toUpperCase()}</div>
          <button className={styles.logoutBtn} onClick={logout}>Sign out</button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.topBar}>
          <div>
            <h1 className={styles.greeting}>Good to see you, {user?.name?.split(' ')[0]} 👋</h1>
            <p className={styles.sub}>{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
          </div>
          <button className={styles.newBtn} onClick={() => setShowNew(true)}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New project
          </button>
        </div>

        {!user?.apiKey && (
          <div className={styles.apiWarning}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            You need to add your Anthropic API key before generating websites.
            <button onClick={() => setShowSettings(true)}>Add API key →</button>
          </div>
        )}

        {projects.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>✦</div>
            <h2>No projects yet</h2>
            <p>Create your first project and let ZalifAI build it for you</p>
            <button className={styles.newBtn} onClick={() => setShowNew(true)}>
              Create your first project
            </button>
          </div>
        ) : (
          <div className={styles.grid}>
            {projects.map(p => (
              <div key={p.id} className={styles.card} onClick={() => navigate(`/editor/${p.id}`)}>
                <div className={styles.cardTop}>
                  <div className={styles.cardIcon}>{p.name[0]?.toUpperCase()}</div>
                  <button
                    className={styles.deleteBtn}
                    onClick={e => { e.stopPropagation(); deleteProject(p.id) }}
                    title="Delete project"
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14H6L5,6"/><path d="M10,11v6M14,11v6"/><path d="M9,6V4h6v2"/></svg>
                  </button>
                </div>
                <h3 className={styles.cardName}>{p.name}</h3>
                {p.description && <p className={styles.cardDesc}>{p.description}</p>}
                <div className={styles.cardMeta}>
                  <span>{p.files.length} file{p.files.length !== 1 ? 's' : ''}</span>
                  <span>{fmt(p.updatedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showNew && (
        <div className={styles.modal} onClick={() => setShowNew(false)}>
          <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
            <h2>New project</h2>
            <form onSubmit={handleCreate}>
              <div className={styles.field}>
                <label>Project name</label>
                <input autoFocus placeholder="e.g. Portfolio website" value={newName} onChange={e => setNewName(e.target.value)} required />
              </div>
              <div className={styles.field}>
                <label>Description <span>(optional)</span></label>
                <input placeholder="What are you building?" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowNew(false)}>Cancel</button>
                <button type="submit" className={styles.createBtn}>Create & open</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSettings && (
        <div className={styles.modal} onClick={() => setShowSettings(false)}>
          <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
            <h2>Settings</h2>
            <div className={styles.field}>
              <label>Anthropic API Key</label>
              <input
                type="password"
                placeholder="sk-ant-..."
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
              />
              <p className={styles.hint}>
                Get your key at <a href="https://console.anthropic.com" target="_blank" rel="noreferrer">console.anthropic.com</a>. Stored locally in your browser only.
              </p>
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.cancelBtn} onClick={() => setShowSettings(false)}>Cancel</button>
              <button className={styles.createBtn} onClick={handleSaveKey}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
