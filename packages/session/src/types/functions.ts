import type { Message, LLMAdapter, ToolCall, LLMCompleteOptions } from './llm.js'
import type { SessionStorage } from './storage.js'

/** consolidate 函数签名：L3 → L2，接收当前 L2 和 L3 记录，返回新 L2 */
export type ConsolidateFn = (currentMemory: string | null, messages: Message[]) => Promise<string>

/** 上下文压缩函数签名：接收需压缩的消息列表，返回摘要文本 */
export type CompressFn = (messages: Message[]) => Promise<string>

/** createSession() 的选项 */
export interface CreateSessionOptions {
  /** 指定 session ID（用于与拓扑节点对齐）。不提供则自动生成。 */
  id?: string
  /** 指定存储适配器（普通 Session 只需 SessionStorage） */
  storage: SessionStorage
  /** 指定 LLM 适配器 */
  llm?: LLMAdapter
  /** Session 标签 */
  label?: string
  /** 系统提示词 */
  systemPrompt?: string
  /** 可用工具定义 */
  tools?: LLMCompleteOptions['tools']
  /** 上下文压缩函数（超阈值时调用） */
  compressFn?: CompressFn
  /** L3 → L2 提炼函数，创建时绑定，供 consolidate() 调用 */
  consolidateFn?: ConsolidateFn

}

/** loadSession() 的选项 */
export interface LoadSessionOptions {
  /** 指定存储适配器 */
  storage: SessionStorage
  /** LLM 适配器 */
  llm?: LLMAdapter
  /** 系统提示词 */
  systemPrompt?: string
  /** 可用工具定义 */
  tools?: LLMCompleteOptions['tools']
  /** 上下文压缩函数（超阈值时调用） */
  compressFn?: CompressFn
  /** L3 → L2 提炼函数，加载时绑定，供 consolidate() 调用 */
  consolidateFn?: ConsolidateFn

}

/** send() 的返回结果 */
export interface SendResult {
  /** LLM 文本响应 */
  content: string | null
  /** LLM 返回的工具调用（由上层决定是否执行） */
  toolCalls?: ToolCall[]
  /** token 用量统计 */
  usage?: {
    promptTokens: number
    completionTokens: number
  }
}

/**
 * StreamResult — stream() 的返回值
 * 既是 AsyncIterable<string>（逐 chunk 消费），又能通过 result 拿最终结果
 * L3 在流结束后（result resolve 时）自动保存
 */
export interface StreamResult extends AsyncIterable<string> {
  /** 流结束后 resolve，此时 L3 已保存 */
  result: Promise<SendResult>
}
