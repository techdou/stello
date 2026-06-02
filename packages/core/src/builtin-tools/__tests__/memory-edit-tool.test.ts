import { describe, it, expect } from 'vitest'
import { memoryEditTool } from '../memory-edit-tool'
import { InMemorySharedMemoryStore } from '../../shared-memory/in-memory-shared-memory-store'
import type { ToolExecutionContext } from '../../types/tool'
import type { StelloAgent } from '../../agent/stello-agent'

function fakeAgent(store: InMemorySharedMemoryStore | undefined): StelloAgent {
  return { sharedMemory: store } as unknown as StelloAgent
}

function ctx(agent: StelloAgent): ToolExecutionContext {
  return { agent, sessionId: 's1', toolName: 'stello_memory_edit' }
}

describe('memoryEditTool', () => {
  it('exposes tool name "stello_memory_edit"', () => {
    expect(memoryEditTool().name).toBe('stello_memory_edit')
  })

  it('upserts a new entry when body provided and delete not true', async () => {
    const store = new InMemorySharedMemoryStore()
    const r = await memoryEditTool().execute(
      { slug: 'a', body: 'BODY' },
      ctx(fakeAgent(store)),
    )
    expect(r).toEqual({ success: true, data: { slug: 'a', op: 'upsert' } })
    expect(await store.get('a')).toEqual({ slug: 'a', body: 'BODY' })
  })

  it('overwrites existing entry on upsert', async () => {
    const store = new InMemorySharedMemoryStore()
    await store.upsert('a', 'old')
    const r = await memoryEditTool().execute(
      { slug: 'a', body: 'NEW' },
      ctx(fakeAgent(store)),
    )
    expect(r.success).toBe(true)
    expect(await store.get('a')).toEqual({ slug: 'a', body: 'NEW' })
  })

  it('deletes entry when delete=true', async () => {
    const store = new InMemorySharedMemoryStore()
    await store.upsert('a', 'BODY')
    const r = await memoryEditTool().execute(
      { slug: 'a', delete: true },
      ctx(fakeAgent(store)),
    )
    expect(r).toEqual({ success: true, data: { slug: 'a', op: 'delete' } })
    expect(await store.get('a')).toBeNull()
  })

  it('delete=true on missing slug returns success (no-op)', async () => {
    const store = new InMemorySharedMemoryStore()
    const r = await memoryEditTool().execute(
      { slug: 'missing', delete: true },
      ctx(fakeAgent(store)),
    )
    expect(r).toEqual({ success: true, data: { slug: 'missing', op: 'delete' } })
  })

  it('delete=true ignores body even when provided', async () => {
    const store = new InMemorySharedMemoryStore()
    await store.upsert('a', 'old')
    const r = await memoryEditTool().execute(
      { slug: 'a', body: 'IGNORED', delete: true },
      ctx(fakeAgent(store)),
    )
    expect(r.success).toBe(true)
    expect(await store.get('a')).toBeNull()
  })

  it('returns error for empty slug', async () => {
    const store = new InMemorySharedMemoryStore()
    const r = await memoryEditTool().execute(
      { slug: '', body: 'b' },
      ctx(fakeAgent(store)),
    )
    expect(r.success).toBe(false)
    expect(r.error).toMatch(/slug/i)
  })

  it('returns error when body missing and delete not set', async () => {
    const store = new InMemorySharedMemoryStore()
    const r = await memoryEditTool().execute(
      { slug: 'a' },
      ctx(fakeAgent(store)),
    )
    expect(r.success).toBe(false)
    expect(r.error).toMatch(/body is required/i)
  })

  it('returns error when body is empty string and delete not set', async () => {
    const store = new InMemorySharedMemoryStore()
    const r = await memoryEditTool().execute(
      { slug: 'a', body: '' },
      ctx(fakeAgent(store)),
    )
    expect(r.success).toBe(false)
    expect(r.error).toMatch(/body is required/i)
  })

  it('returns error when sharedMemory not configured', async () => {
    const r = await memoryEditTool().execute(
      { slug: 'a', body: 'b' },
      ctx(fakeAgent(undefined)),
    )
    expect(r.success).toBe(false)
    expect(r.error).toMatch(/sharedMemory not configured/)
  })
})
