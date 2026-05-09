import { useState, useCallback } from 'react'
import { useAuth } from './useAuth'

export interface ProjectFile {
  name: string
  content: string
  language: 'html' | 'css' | 'javascript' | 'typescript'
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface Project {
  id: string
  name: string
  description: string
  files: ProjectFile[]
  messages: Message[]
  createdAt: number
  updatedAt: number
  userId: string
}

function getKey(userId: string) { return `zalifai_projects_${userId}` }

export function useProjects() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>(() => {
    if (!user) return []
    return JSON.parse(localStorage.getItem(getKey(user.id)) || '[]')
  })

  const save = useCallback((list: Project[]) => {
    if (!user) return
    setProjects(list)
    localStorage.setItem(getKey(user.id), JSON.stringify(list))
  }, [user])

  const createProject = useCallback((name: string, description: string): Project => {
    const p: Project = {
      id: crypto.randomUUID(),
      name,
      description,
      files: [],
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      userId: user!.id
    }
    save([p, ...projects])
    return p
  }, [projects, save, user])

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    const list = projects.map(p => p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p)
    save(list)
    return list.find(p => p.id === id)!
  }, [projects, save])

  const deleteProject = useCallback((id: string) => {
    save(projects.filter(p => p.id !== id))
  }, [projects, save])

  const getProject = useCallback((id: string) => {
    return projects.find(p => p.id === id) || null
  }, [projects])

  return { projects, createProject, updateProject, deleteProject, getProject }
}
