// ─── Session 系统类型定义 ───

import type { SerializableSessionConfig } from './session-config';

/** Session 状态 */
export type SessionStatus = 'active' | 'archived';

/**
 * Session 元数据
 *
 * Session 是 Stello 的原子单元——一个独立对话空间。
 * 不包含树结构信息，Session 不感知自己在拓扑中的位置。
 */
export interface SessionMeta {
  readonly id: string;
  label: string;
  status: SessionStatus;
  turnCount: number;
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
}

/**
 * 拓扑节点
 *
 * 树结构信息，独立于 Session 维护。id 与 SessionMeta.id 对应。
 * `parentId === null` 即为 root。多 root 合法。
 */
export interface TopologyNode {
  readonly id: string;
  parentId: string | null;
  children: string[];
  refs: string[];
  depth: number;
  index: number;
  label: string;
  sourceSessionId?: string;
}

/** 递归树节点（API 返回用） */
export interface SessionTreeNode {
  id: string;
  label: string;
  sourceSessionId?: string;
  status: SessionStatus;
  turnCount: number;
  children: SessionTreeNode[];
}

/**
 * 创建 Session 的参数（纯拓扑信息）
 *
 * `parentId` 为空则为新 root；非空挂在该节点下。
 */
export interface CreateSessionOptions {
  /** 父节点 ID；为空建 root */
  parentId?: string;
  /** 显示名称 */
  label?: string;
  /** fork 时的上下文来源 session */
  sourceSessionId?: string;
}

/**
 * Session 树操作接口
 *
 * 管理对话的空间结构。支持多 root（森林）。
 */
export interface SessionTree {
  /**
   * 创建 Session 拓扑节点。
   * - `options.parentId` 为空：创建新 root（`parentId === null`）
   * - 非空：挂在该节点下作为子节点
   * - **不**继承父 Session 上下文 / 配置（需要继承走 forkSession）
   */
  createSession(options?: CreateSessionOptions): Promise<TopologyNode>;
  /** 获取单个 Session 元数据 */
  get(id: string): Promise<SessionMeta | null>;
  /** 列出所有 Session */
  listAll(): Promise<SessionMeta[]>;
  /** 列出所有 root（parentId === null） */
  listRoots(): Promise<TopologyNode[]>;
  /** 归档 Session（不连带子节点） */
  archive(id: string): Promise<void>;
  /** 创建跨分支引用 */
  addRef(fromId: string, toId: string): Promise<void>;
  /** 更新 Session 元数据 */
  updateMeta(
    id: string,
    updates: Partial<Pick<SessionMeta, 'label' | 'turnCount'>>,
  ): Promise<SessionMeta>;
  /** 获取单个拓扑节点 */
  getNode(id: string): Promise<TopologyNode | null>;
  /** 获取完整拓扑（森林） */
  getTree(): Promise<SessionTreeNode[]>;
  /** 获取所有祖先节点 */
  getAncestors(id: string): Promise<TopologyNode[]>;
  /** 获取同级兄弟节点 */
  getSiblings(id: string): Promise<TopologyNode[]>;
  /** 读取 Session 固化配置 */
  getConfig(id: string): Promise<SerializableSessionConfig | null>;
  /** 写入 Session 固化配置 */
  putConfig(id: string, config: SerializableSessionConfig): Promise<void>;
}
