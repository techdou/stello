import { describe, it, expect } from 'vitest'
import { InMemorySharedMemoryStore } from '../in-memory-shared-memory-store'

describe('InMemorySharedMemoryStore', () => {
  it('list returns [] when empty', async () => {
    const store = new InMemorySharedMemoryStore()
    expect(await store.list()).toEqual([])
  })

  it('upsert adds new entry and list returns it', async () => {
    const store = new InMemorySharedMemoryStore()
    await store.upsert('a', 'body-a')
    expect(await store.list()).toEqual([{ slug: 'a', body: 'body-a' }])
  })

  it('get returns the entry by slug, null if missing', async () => {
    const store = new InMemorySharedMemoryStore()
    await store.upsert('a', 'body-a')
    expect(await store.get('a')).toEqual({ slug: 'a', body: 'body-a' })
    expect(await store.get('missing')).toBeNull()
  })

  it('upsert preserves insertion order across multiple slugs', async () => {
    const store = new InMemorySharedMemoryStore()
    await store.upsert('a', 'ba')
    await store.upsert('b', 'bb')
    await store.upsert('c', 'bc')
    expect((await store.list()).map(e => e.slug)).toEqual(['a', 'b', 'c'])
  })

  it('upsert on existing slug overwrites body but keeps position', async () => {
    const store = new InMemorySharedMemoryStore()
    await store.upsert('a', 'ba')
    await store.upsert('b', 'bb')
    await store.upsert('a', 'ba2')
    expect(await store.list()).toEqual([
      { slug: 'a', body: 'ba2' },
      { slug: 'b', body: 'bb' },
    ])
  })

  it('remove deletes the entry; subsequent list omits it', async () => {
    const store = new InMemorySharedMemoryStore()
    await store.upsert('a', 'ba')
    await store.upsert('b', 'bb')
    await store.remove('a')
    expect(await store.list()).toEqual([{ slug: 'b', body: 'bb' }])
  })

  it('remove on missing slug is a no-op', async () => {
    const store = new InMemorySharedMemoryStore()
    await store.upsert('a', 'ba')
    await store.remove('missing')
    expect(await store.list()).toEqual([{ slug: 'a', body: 'ba' }])
  })

  it('serializes concurrent upserts to same slug (last value wins, no lost write)', async () => {
    const store = new InMemorySharedMemoryStore()
    await Promise.all([
      store.upsert('a', 'b1'),
      store.upsert('a', 'b2'),
      store.upsert('a', 'b3'),
    ])
    const entries = await store.list()
    expect(entries.length).toBe(1)
    expect(entries[0]!.slug).toBe('a')
    expect(['b1', 'b2', 'b3']).toContain(entries[0]!.body)
  })

  it('serializes mixed concurrent upsert/remove without corruption', async () => {
    const store = new InMemorySharedMemoryStore()
    await store.upsert('a', 'ba')
    await Promise.all([
      store.upsert('b', 'bb'),
      store.remove('a'),
      store.upsert('c', 'bc'),
    ])
    const entries = await store.list()
    expect(entries.find(e => e.slug === 'a')).toBeUndefined()
    expect(entries.find(e => e.slug === 'b')).toEqual({ slug: 'b', body: 'bb' })
    expect(entries.find(e => e.slug === 'c')).toEqual({ slug: 'c', body: 'bc' })
  })
})
