import type { SessionStorage, ListRecordsOptions } from '../types/storage.js'
import type { SessionMeta, SessionFilter } from '../types/session.js'
import type { Message } from '../types/llm.js'

/**
 * InMemoryStorageAdapter — SessionStorage 的内存实现，主要用于测试
 */
export class InMemoryStorageAdapter implements SessionStorage {
  private sessions = new Map<string, SessionMeta>()
  private records = new Map<string, Message[]>()
  private memories = new Map<string, string>()
  private systemPrompts = new Map<string, string>()
  private insights = new Map<string, string>()

  async getSession(id: string): Promise<SessionMeta | null> {
    return this.sessions.get(id) ?? null
  }

  async putSession(session: SessionMeta): Promise<void> {
    this.sessions.set(session.id, { ...session })
  }

  async listSessions(filter?: SessionFilter): Promise<SessionMeta[]> {
    const all = Array.from(this.sessions.values())
    if (!filter) return all
    return all.filter((s) => filter.status === undefined || s.status === filter.status)
  }

  async appendRecord(sessionId: string, record: Message): Promise<void> {
    const list = this.records.get(sessionId) ?? []
    list.push({ ...record })
    this.records.set(sessionId, list)
  }

  async listRecords(sessionId: string, options?: ListRecordsOptions): Promise<Message[]> {
    let list = this.records.get(sessionId) ?? []

    if (options?.role) {
      list = list.filter((m) => m.role === options.role)
    }

    const offset = options?.offset ?? 0
    const limit = options?.limit

    list = list.slice(offset)
    if (limit !== undefined) {
      list = list.slice(0, limit)
    }

    return list.map((m) => ({ ...m }))
  }

  /** 裁剪旧 L3，保留最近 keepRecent 条 */
  async trimRecords(sessionId: string, keepRecent: number): Promise<void> {
    if (keepRecent <= 0) {
      this.records.set(sessionId, [])
      return
    }
    const list = this.records.get(sessionId) ?? []
    if (list.length > keepRecent) {
      this.records.set(sessionId, list.slice(-keepRecent))
    }
  }

  async getSystemPrompt(sessionId: string): Promise<string | null> {
    return this.systemPrompts.get(sessionId) ?? null
  }

  async putSystemPrompt(sessionId: string, content: string): Promise<void> {
    this.systemPrompts.set(sessionId, content)
  }

  async getInsight(sessionId: string): Promise<string | null> {
    return this.insights.get(sessionId) ?? null
  }

  async putInsight(sessionId: string, content: string): Promise<void> {
    this.insights.set(sessionId, content)
  }

  async clearInsight(sessionId: string): Promise<void> {
    this.insights.delete(sessionId)
  }

  async getMemory(sessionId: string): Promise<string | null> {
    return this.memories.get(sessionId) ?? null
  }

  async putMemory(sessionId: string, content: string): Promise<void> {
    this.memories.set(sessionId, content)
  }

  async transaction<T>(fn: (tx: SessionStorage) => Promise<T>): Promise<T> {
    return fn(this)
  }
}
