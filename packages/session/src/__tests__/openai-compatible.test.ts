import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createOpenAICompatibleAdapter } from '../adapters/openai-compatible.js'
import type { Message } from '../types/llm.js'

const createCompletion = vi.fn()

vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: createCompletion,
      },
    }
  },
}))

describe('createOpenAICompatibleAdapter', () => {
  beforeEach(() => {
    createCompletion.mockReset()
    createCompletion.mockResolvedValue({
      choices: [{ message: { content: 'ok', tool_calls: [] } }],
      usage: { prompt_tokens: 12, completion_tokens: 3 },
    })
  })

  it('合并连续的 system 消息后再发请求', async () => {
    const adapter = createOpenAICompatibleAdapter({
      apiKey: 'test-key',
      baseURL: 'https://api.example.com/v1',
      model: 'test-model',
      maxContextTokens: 128_000,
    })

    const messages: Message[] = [
      { role: 'system', content: 'system prompt' },
      { role: 'system', content: 'synthesis' },
      { role: 'user', content: 'hello' },
    ]

    await adapter.complete(messages)

    expect(createCompletion).toHaveBeenCalledTimes(1)
    expect(createCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          { role: 'system', content: 'system prompt\n\nsynthesis' },
          { role: 'user', content: 'hello' },
        ],
        max_tokens: 4096,
        stream: false,
      }),
      undefined,
    )
  })

  it('显式传入 maxTokens 时优先使用调用方配置', async () => {
    const adapter = createOpenAICompatibleAdapter({
      apiKey: 'test-key',
      baseURL: 'https://api.example.com/v1',
      model: 'test-model',
      maxContextTokens: 128_000,
    })

    await adapter.complete([{ role: 'user', content: 'hello' }], { maxTokens: 2048 })

    expect(createCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        max_tokens: 2048,
        stream: false,
      }),
      undefined,
    )
  })

  it('options.maxOutputTokens 覆盖内建默认值', async () => {
    const adapter = createOpenAICompatibleAdapter({
      apiKey: 'test-key',
      baseURL: 'https://api.example.com/v1',
      model: 'test-model',
      maxContextTokens: 128_000,
      maxOutputTokens: 8192,
    })

    await adapter.complete([{ role: 'user', content: 'hello' }])

    expect(createCompletion).toHaveBeenCalledWith(
      expect.objectContaining({ max_tokens: 8192, stream: false }),
      undefined,
    )
  })

  it('调用方 maxTokens 优先级最高，盖过 options.maxOutputTokens', async () => {
    const adapter = createOpenAICompatibleAdapter({
      apiKey: 'test-key',
      baseURL: 'https://api.example.com/v1',
      model: 'test-model',
      maxContextTokens: 128_000,
      maxOutputTokens: 8192,
    })

    await adapter.complete([{ role: 'user', content: 'hello' }], { maxTokens: 2048 })

    expect(createCompletion).toHaveBeenCalledWith(
      expect.objectContaining({ max_tokens: 2048, stream: false }),
      undefined,
    )
  })

  it('complete() 提取响应中的 reasoning_content', async () => {
    createCompletion.mockResolvedValueOnce({
      choices: [{ message: { content: 'answer', reasoning_content: 'thinking...' } }],
      usage: { prompt_tokens: 10, completion_tokens: 5 },
    })

    const adapter = createOpenAICompatibleAdapter({
      apiKey: 'test-key',
      baseURL: 'https://api.example.com/v1',
      model: 'test-model',
      maxContextTokens: 128_000,
    })

    const result = await adapter.complete([{ role: 'user', content: 'hello' }])
    expect(result.reasoningContent).toBe('thinking...')
    expect(result.content).toBe('answer')
  })

  it('assistant 消息的 reasoningContent 回传为 reasoning_content', async () => {
    const adapter = createOpenAICompatibleAdapter({
      apiKey: 'test-key',
      baseURL: 'https://api.example.com/v1',
      model: 'test-model',
      maxContextTokens: 128_000,
    })

    const messages: Message[] = [
      { role: 'user', content: 'hello' },
      {
        role: 'assistant',
        content: 'let me think',
        reasoningContent: 'step 1: ...',
        toolCalls: [{ id: 'tc_1', name: 'foo', input: {} }],
      },
      { role: 'tool', content: 'result', toolCallId: 'tc_1' },
    ]

    await adapter.complete(messages)

    const sentMessages = createCompletion.mock.calls[0]![0].messages
    expect(sentMessages[1]).toMatchObject({
      role: 'assistant',
      content: 'let me think',
      reasoning_content: 'step 1: ...',
      tool_calls: [{ id: 'tc_1', type: 'function', function: { name: 'foo', arguments: '{}' } }],
    })
  })

  it('非推理模型响应不含 reasoningContent', async () => {
    const adapter = createOpenAICompatibleAdapter({
      apiKey: 'test-key',
      baseURL: 'https://api.example.com/v1',
      model: 'test-model',
      maxContextTokens: 128_000,
    })

    const result = await adapter.complete([{ role: 'user', content: 'hello' }])
    expect(result.reasoningContent).toBeUndefined()
  })

  it('signal 透传到 SDK request options', async () => {
    const adapter = createOpenAICompatibleAdapter({
      apiKey: 'test-key',
      baseURL: 'https://api.example.com/v1',
      model: 'test-model',
      maxContextTokens: 128_000,
    })

    const controller = new AbortController()
    await adapter.complete([{ role: 'user', content: 'hello' }], { signal: controller.signal })

    expect(createCompletion).toHaveBeenCalledWith(
      expect.objectContaining({ stream: false }),
      { signal: controller.signal },
    )
  })
})
