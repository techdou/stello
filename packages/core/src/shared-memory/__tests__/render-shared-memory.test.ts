import { describe, it, expect } from 'vitest'
import { renderSharedMemoryContext } from '../render-shared-memory'
import { InMemorySharedMemoryStore } from '../in-memory-shared-memory-store'

describe('renderSharedMemoryContext', () => {
  it('returns undefined when store is undefined', async () => {
    expect(await renderSharedMemoryContext(undefined)).toBeUndefined()
  })

  it('returns undefined when store has no entries', async () => {
    const store = new InMemorySharedMemoryStore()
    expect(await renderSharedMemoryContext(store)).toBeUndefined()
  })

  it('renders entries inside <shared_memory> with hint footer', async () => {
    const store = new InMemorySharedMemoryStore()
    await store.upsert('prefer-concise', '用户偏好简短回答。')
    await store.upsert('user-profile', '大三本科生 CS 专业。')
    const out = await renderSharedMemoryContext(store)
    expect(out).toContain('<shared_memory>')
    expect(out).toContain('## prefer-concise')
    expect(out).toContain('用户偏好简短回答。')
    expect(out).toContain('## user-profile')
    expect(out).toContain('大三本科生 CS 专业。')
    expect(out).toContain('</shared_memory>')
    expect(out).toMatch(/stello_memory_edit/)
  })

  it('preserves entry order in output', async () => {
    const store = new InMemorySharedMemoryStore()
    await store.upsert('a', 'body-a')
    await store.upsert('b', 'body-b')
    await store.upsert('c', 'body-c')
    const out = await renderSharedMemoryContext(store)
    const aIdx = out!.indexOf('## a')
    const bIdx = out!.indexOf('## b')
    const cIdx = out!.indexOf('## c')
    expect(aIdx).toBeGreaterThan(-1)
    expect(aIdx).toBeLessThan(bIdx)
    expect(bIdx).toBeLessThan(cIdx)
  })

  it('separates entries with a blank line between bodies', async () => {
    const store = new InMemorySharedMemoryStore()
    await store.upsert('a', 'body-a')
    await store.upsert('b', 'body-b')
    const out = await renderSharedMemoryContext(store)
    expect(out).toContain('body-a\n\n## b')
  })
})
