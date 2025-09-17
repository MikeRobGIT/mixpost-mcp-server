import { afterAll, afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { MIXPOST_TOOLS } from '../../src/tools'

// Capture console.error output
const originalConsoleError = console.error
const consoleCalls: unknown[][] = []
console.error = (...args: unknown[]) => {
  consoleCalls.push(args)
}

// Prevent actual process exit during SIGINT handling
const originalProcessExit = process.exit.bind(process)
const exitCalls: unknown[][] = []
process.exit = ((code?: number) => {
  exitCalls.push([code])
  return undefined as never
}) as typeof process.exit

// Track SIGINT handlers registered by the server
const originalProcessOn = process.on.bind(process)
const sigintHandlers: Array<() => Promise<void>> = []
process.on = ((event: string, handler: (...args: unknown[]) => unknown) => {
  if (event === 'SIGINT') {
    sigintHandlers.push(handler as () => Promise<void>)
    return process
  }
  return originalProcessOn(event, handler)
}) as typeof process.on

class MockServer {
  handlers = new Map<unknown, (request: unknown) => unknown>()
  onerror?: (error: unknown) => void
  closed = false
  connectCalls = 0

  constructor() {
    _lastServerInstance = this
  }

  setRequestHandler(schema: unknown, handler: (request: unknown) => unknown) {
    this.handlers.set(schema, handler)
    return 0
  }

  async connect(_transport: unknown) {
    this.connectCalls += 1
  }

  async close() {
    this.closed = true
  }
}

class MockTransport {}

let _lastServerInstance: MockServer | undefined

mock.module('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: MockServer,
}))

mock.module('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: MockTransport,
}))

const { MixpostMCPServer } = await import('../../src/index')

describe('MixpostMCPServer coverage helpers', () => {
  beforeEach(() => {
    consoleCalls.length = 0
    exitCalls.length = 0
    sigintHandlers.length = 0
    _lastServerInstance = undefined
  })

  afterEach(() => {
    process.removeAllListeners('SIGINT')
  })

  afterAll(() => {
    console.error = originalConsoleError
    process.exit = originalProcessExit
    process.on = originalProcessOn
  })

  test('ListTools handler returns the registered toolset', async () => {
    const server = new MixpostMCPServer()
    const internals = server as unknown as { server: MockServer }

    const handler = internals.server.handlers.get(ListToolsRequestSchema)
    expect(handler).toBeDefined()

    const response = await Promise.resolve(handler?.({}))
    expect(response).toEqual({ tools: MIXPOST_TOOLS })
  })

  test('error handler logs and SIGINT closes the server', async () => {
    const server = new MixpostMCPServer()
    const internals = server as unknown as { server: MockServer }

    const error = new Error('boom')
    internals.server.onerror?.(error)
    expect(consoleCalls.some((call) => call[0] === '[MCP Error]' && call[1] === error)).toBe(true)

    expect(sigintHandlers.length).toBeGreaterThan(0)
    await sigintHandlers[0]()
    expect(internals.server.closed).toBe(true)
    expect(exitCalls.some((call) => call[0] === 0)).toBe(true)
  })

  test('run connects transport and logs startup message', async () => {
    const server = new MixpostMCPServer()
    const internals = server as unknown as { server: MockServer }

    consoleCalls.length = 0
    await server.run()

    expect(internals.server.connectCalls).toBe(1)
    expect(consoleCalls.some((call) => call[0] === 'Mixpost MCP server running on stdio')).toBe(
      true,
    )
  })
})
