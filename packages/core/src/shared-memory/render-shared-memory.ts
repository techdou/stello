import type { SharedMemoryStore } from './types'

const HINT = `调用 stello_memory_edit 工具新增、修改或删除上面的条目。`

/**
 * 渲染共享 memory 全量内容段。
 * - store 为 undefined 或无 entry：返回 undefined（调用方应跳过注入）
 * - 否则返回 <shared_memory>...</shared_memory> + hint 文本,
 *   每条 entry 用 `## {slug}` 标题 + body 正文,条目间空行分隔
 */
export async function renderSharedMemoryContext(
  store: SharedMemoryStore | undefined,
): Promise<string | undefined> {
  if (!store) return undefined
  const entries = await store.list()
  if (entries.length === 0) return undefined
  const blocks = entries.map(e => `## ${e.slug}\n${e.body}`).join('\n\n')
  return `<shared_memory>\n${blocks}\n</shared_memory>\n\n${HINT}`
}
