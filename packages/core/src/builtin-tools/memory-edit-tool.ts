import type { ToolRegistryEntry } from '../tool/tool-registry'

const DESCRIPTION = `新增、覆盖或删除一条共享 memory entry。所有 Session 共享同一份 store,
内容已直接在 <shared_memory> 段呈现给你,无需另外查询。

参数：
- slug（必填）: kebab-case 主键
- body（可选）: 完整内容。提供时执行 upsert（存在则覆盖 body,顺序不变；不存在则追加）。
- delete（可选,默认 false）: true 时按 slug 删除,忽略 body；slug 不存在为 no-op。

何时使用：用户告诉你一条跨 session 持久成立的认知 / 偏好 / 背景,
或原条目已过时需要更新 / 移除时调用。`

const PARAMETERS = {
  type: 'object',
  properties: {
    slug:   { type: 'string', description: 'kebab-case 主键' },
    body:   { type: 'string', description: '完整内容；upsert 时必填' },
    delete: { type: 'boolean', description: 'true 时删除该 slug' },
  },
  required: ['slug'],
}

/** 共享 memory 的单一编辑工具：upsert / delete */
export function memoryEditTool(): ToolRegistryEntry {
  return {
    name: 'stello_memory_edit',
    description: DESCRIPTION,
    parameters: PARAMETERS,
    execute: async (args, ctx) => {
      const slug = (args.slug as string | undefined)?.trim()
      if (!slug) return { success: false, error: 'slug is required and must be non-empty' }
      const store = ctx.agent.sharedMemory
      if (!store) return { success: false, error: 'sharedMemory not configured' }
      const del = args.delete === true
      try {
        if (del) {
          await store.remove(slug)
          return { success: true, data: { slug, op: 'delete' } }
        }
        const body = args.body as string | undefined
        if (!body || body.length === 0) {
          return { success: false, error: 'body is required when not deleting' }
        }
        await store.upsert(slug, body)
        return { success: true, data: { slug, op: 'upsert' } }
      } catch (e) {
        return { success: false, error: `failed: ${e instanceof Error ? e.message : String(e)}` }
      }
    },
  }
}
