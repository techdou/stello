// ─── Session 统一配置类型定义 ───

import type { LLMAdapter, LLMCompleteOptions } from '@stello-ai/session';
import type {
  SessionCompatibleConsolidateFn,
  SessionCompatibleCompressFn,
} from '../adapters/session-runtime';

/**
 * Session 配置字段集
 *
 * 固化后写入存储。覆盖单个 Session 在上下文组装、LLM 调用、
 * tool 调度、L3→L2 提炼、上下文压缩等环节所需的可配置项。
 */
export interface SessionConfig {
  /** 该 Session 的 system prompt */
  systemPrompt?: string;
  /** 该 Session 使用的 LLM 适配器 */
  llm?: LLMAdapter;
  /** 用户 tool 定义集合 */
  tools?: LLMCompleteOptions['tools'];
  /** skill 白名单：undefined=继承全局；[]=禁用 activate_skill；['a','b']=仅允许指定 skill */
  skills?: string[];
  /** L3→L2 提炼函数 */
  consolidateFn?: SessionCompatibleConsolidateFn;
  /** 上下文压缩函数 */
  compressFn?: SessionCompatibleCompressFn;
  /** Fork 时用于压缩父对话作为子会话上下文背景的函数;缺省时降级到 compressFn,再缺省则用 DEFAULT_FORK_COMPRESS_PROMPT */
  forkCompressFn?: SessionCompatibleCompressFn;
}

/**
 * SessionConfig 的可序列化子集
 *
 * 用于存储固化配置：只保留纯数据字段，丢弃函数/适配器等运行时引用。
 */
export interface SerializableSessionConfig {
  /** 该 Session 的 system prompt */
  systemPrompt?: string;
  /** skill 白名单 */
  skills?: string[];
}
