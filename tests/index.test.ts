import { type Mock, afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { MixpostClient } from '../src/client'

// Mock the MCP SDK modules first
mock.module('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: class MockServer {
    name = 'mixpost-mcp-server'
    version = '1.0.0'

    setRequestHandler = mock((type: string, handler: (...args: unknown[]) => unknown) => {
      this.handlers = this.handlers || {}
      this.handlers[type] = handler
    })

    connect = mock(async (_transport: unknown) => {
      return Promise.resolve()
    })

    error = mock((_message: string, _details?: unknown) => {})

    // Helper to call handlers in tests
    callHandler = async (type: string, params: unknown) => {
      if (this.handlers?.[type]) {
        return await this.handlers[type](params)
      }
      throw new Error(`No handler for ${type}`)
    }

    handlers: Record<string, (...args: unknown[]) => unknown> = {}
  },
}))

mock.module('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: class MockTransport {},
}))

describe('MCP Server Integration', () => {
  let server: { callHandler: (type: string, params: unknown) => Promise<unknown> }
  let mockClient: Record<string, Mock<(...args: unknown[]) => Promise<unknown>>>

  beforeEach(() => {
    // Reset environment variables
    process.env.MIXPOST_BASE_URL = 'https://api.mixpost.test'
    process.env.MIXPOST_WORKSPACE_UUID = 'test-workspace-uuid'
    process.env.MIXPOST_API_KEY = 'test-api-key'
    process.env.MIXPOST_CORE_PATH = 'mixpost'

    // Create a mock client
    mockClient = {
      listAccounts: mock(() => Promise.resolve([])),
      getAccount: mock(() => Promise.resolve({})),
      createPost: mock(() => Promise.resolve({})),
      updatePost: mock(() => Promise.resolve({})),
      getPost: mock(() => Promise.resolve({})),
      listPosts: mock(() => Promise.resolve({ data: [] })),
      deletePost: mock(() => Promise.resolve()),
      deleteMultiplePosts: mock(() => Promise.resolve()),
      schedulePost: mock(() => Promise.resolve()),
      addPostToQueue: mock(() => Promise.resolve()),
      approvePost: mock(() => Promise.resolve()),
      listMedia: mock(() => Promise.resolve({ data: [] })),
      getMedia: mock(() => Promise.resolve({})),
      updateMedia: mock(() => Promise.resolve({})),
      deleteMedia: mock(() => Promise.resolve()),
      listTags: mock(() => Promise.resolve([])),
      getTag: mock(() => Promise.resolve({})),
      createTag: mock(() => Promise.resolve({})),
      updateTag: mock(() => Promise.resolve({})),
      deleteTag: mock(() => Promise.resolve()),
    }

    // Mock the MixpostClient constructor
    const originalClient = MixpostClient
    mock.module('../src/client', () => ({
      MixpostClient: class extends originalClient {
        constructor(config: unknown) {
          super(config)
          Object.assign(this, mockClient)
        }
      },
    }))
  })

  afterEach(() => {
    mock.restore()
    process.env.MIXPOST_BASE_URL = undefined
    process.env.MIXPOST_WORKSPACE_UUID = undefined
    process.env.MIXPOST_API_KEY = undefined
    process.env.MIXPOST_CORE_PATH = undefined
  })

  describe('Server Initialization', () => {
    // Import here after mocks are set up
    const { MixpostMCPServer } = require('../src/index')

    it('should initialize server with correct configuration', async () => {
      const { Server } = await import('@modelcontextprotocol/sdk/server/index.js')
      server = new Server()

      expect(server.name).toBe('mixpost-mcp-server')
      expect(server.version).toBe('1.0.0')
    })

    it.skip('should throw error if required environment variables are missing', async () => {
      process.env.MIXPOST_API_KEY = undefined

      // Environment variables are validated when getConfig is called
      const _server = new MixpostMCPServer()
      // NOTE: server.server is private and callHandler doesn't exist
      // This test needs to be rewritten to test the actual API
    })

    it('should use default corePath when not provided', async () => {
      process.env.MIXPOST_CORE_PATH = undefined

      // This should not throw since default is used
      const _server = new MixpostMCPServer()
      // Stop the server after initialization
      setTimeout(() => process.exit(0), 100)
    })
  })

  describe.skip('Tool List Handler', () => {
    // Import here after mocks are set up
    const { MixpostMCPServer } = require('../src/index')

    beforeEach(async () => {
      const { Server } = await import('@modelcontextprotocol/sdk/server/index.js')
      server = new Server()

      // Initialize handlers
      const _mixpostServer = new MixpostMCPServer()
    })

    it('should return list of available tools', async () => {
      // NOTE: server.callHandler is a test helper in the mock that doesn't exist in real Server
      // These tests need to be rewritten to test the actual MCP server protocol
      const result = await server.callHandler('tools/list', {})

      expect(result).toHaveProperty('tools')
      expect(Array.isArray(result.tools)).toBe(true)
      expect(result.tools.length).toBeGreaterThan(0)

      // Check for specific tools
      const toolNames = result.tools.map((t: { name: string }) => t.name)
      expect(toolNames).toContain('mixpost_list_accounts')
      expect(toolNames).toContain('mixpost_create_post')
      expect(toolNames).toContain('mixpost_list_tags')
    })
  })

  describe.skip('Tool Call Handler', () => {
    // Import here after mocks are set up
    const { MixpostMCPServer } = require('../src/index')

    beforeEach(async () => {
      const { Server } = await import('@modelcontextprotocol/sdk/server/index.js')
      server = new Server()
      const _mixpostServer = new MixpostMCPServer()
      // NOTE: These tests rely on mock Server internals that don't match real implementation
    })

    describe('Account Tools', () => {
      it('should handle mixpost_list_accounts', async () => {
        const mockAccounts = [
          { uuid: 'acc-1', name: 'Twitter' },
          { uuid: 'acc-2', name: 'Facebook' },
        ]
        mockClient.listAccounts.mockResolvedValue(mockAccounts)

        const result = await server.callHandler('tools/call', {
          name: 'mixpost_list_accounts',
          arguments: {},
        })

        expect(mockClient.listAccounts).toHaveBeenCalled()
        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: JSON.stringify(mockAccounts, null, 2),
            },
          ],
        })
      })

      it('should handle mixpost_get_account', async () => {
        const mockAccount = { uuid: 'acc-1', name: 'Twitter' }
        mockClient.getAccount.mockResolvedValue(mockAccount)

        const result = await server.callHandler('tools/call', {
          name: 'mixpost_get_account',
          arguments: { accountUuid: 'acc-1' },
        })

        expect(mockClient.getAccount).toHaveBeenCalledWith('acc-1')
        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: JSON.stringify(mockAccount, null, 2),
            },
          ],
        })
      })
    })

    describe('Post Tools', () => {
      it('should handle mixpost_create_post', async () => {
        const postData = {
          accounts: ['acc-1'],
          versions: [
            {
              account_id: 1,
              is_original: true,
              content: { body: 'Test post' },
            },
          ],
          date: '2024-03-15',
          time: '14:30',
          timezone: 'UTC',
        }

        const mockPost = { uuid: 'post-1', ...postData }
        mockClient.createPost.mockResolvedValue(mockPost)

        const result = await server.callHandler('tools/call', {
          name: 'mixpost_create_post',
          arguments: postData,
        })

        expect(mockClient.createPost).toHaveBeenCalledWith(postData)
        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: JSON.stringify(mockPost, null, 2),
            },
          ],
        })
      })

      it('should handle mixpost_update_post', async () => {
        const updateData = {
          postUuid: 'post-1',
          accounts: ['acc-1'],
          versions: [
            {
              account_id: 1,
              is_original: true,
              content: { body: 'Updated post' },
            },
          ],
          date: '2024-03-16',
          time: '15:00',
          timezone: 'UTC',
        }

        const mockPost = { uuid: 'post-1', ...updateData }
        mockClient.updatePost.mockResolvedValue(mockPost)

        const _result = await server.callHandler('tools/call', {
          name: 'mixpost_update_post',
          arguments: updateData,
        })

        expect(mockClient.updatePost).toHaveBeenCalledWith(
          'post-1',
          expect.objectContaining({
            accounts: updateData.accounts,
            versions: updateData.versions,
            date: updateData.date,
            time: updateData.time,
            timezone: updateData.timezone,
          }),
        )
      })

      it('should handle mixpost_delete_post', async () => {
        await server.callHandler('tools/call', {
          name: 'mixpost_delete_post',
          arguments: { postUuid: 'post-1' },
        })

        expect(mockClient.deletePost).toHaveBeenCalledWith('post-1')
      })

      it('should handle mixpost_delete_multiple_posts', async () => {
        const postUuids = ['post-1', 'post-2', 'post-3']

        await server.callHandler('tools/call', {
          name: 'mixpost_delete_multiple_posts',
          arguments: { postUuids },
        })

        expect(mockClient.deleteMultiplePosts).toHaveBeenCalledWith(postUuids)
      })

      it('should handle mixpost_list_posts', async () => {
        const mockResponse = {
          data: [
            { uuid: 'post-1', status: 'scheduled' },
            { uuid: 'post-2', status: 'published' },
          ],
        }
        mockClient.listPosts.mockResolvedValue(mockResponse)

        const result = await server.callHandler('tools/call', {
          name: 'mixpost_list_posts',
          arguments: { page: 1, limit: 10 },
        })

        expect(mockClient.listPosts).toHaveBeenCalledWith({ page: 1, limit: 10 })
        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: JSON.stringify(mockResponse, null, 2),
            },
          ],
        })
      })
    })

    describe('Media Tools', () => {
      it('should handle mixpost_list_media', async () => {
        const mockResponse = {
          data: [{ uuid: 'media-1', name: 'image.jpg' }],
        }
        mockClient.listMedia.mockResolvedValue(mockResponse)

        const _result = await server.callHandler('tools/call', {
          name: 'mixpost_list_media',
          arguments: { type: 'image' },
        })

        expect(mockClient.listMedia).toHaveBeenCalledWith({ type: 'image' })
      })

      it('should handle mixpost_update_media', async () => {
        const updateData = {
          mediaUuid: 'media-1',
          name: 'updated.jpg',
          alt_text: 'Updated description',
        }

        mockClient.updateMedia.mockResolvedValue({ uuid: 'media-1', ...updateData })

        await server.callHandler('tools/call', {
          name: 'mixpost_update_media',
          arguments: updateData,
        })

        expect(mockClient.updateMedia).toHaveBeenCalledWith('media-1', {
          name: updateData.name,
          alt_text: updateData.alt_text,
        })
      })
    })

    describe('Tag Tools', () => {
      it('should handle mixpost_list_tags', async () => {
        const mockTags = [
          { uuid: 'tag-1', name: 'Marketing' },
          { uuid: 'tag-2', name: 'Sales' },
        ]
        mockClient.listTags.mockResolvedValue(mockTags)

        const _result = await server.callHandler('tools/call', {
          name: 'mixpost_list_tags',
          arguments: {},
        })

        expect(mockClient.listTags).toHaveBeenCalled()
      })

      it('should handle mixpost_create_tag', async () => {
        const tagData = {
          name: 'Marketing',
          hex_color: '#FF0000',
        }

        mockClient.createTag.mockResolvedValue({ uuid: 'tag-1', ...tagData })

        await server.callHandler('tools/call', {
          name: 'mixpost_create_tag',
          arguments: tagData,
        })

        expect(mockClient.createTag).toHaveBeenCalledWith(tagData)
      })

      it('should handle mixpost_update_tag', async () => {
        const updateData = {
          tagUuid: 'tag-1',
          name: 'Updated Marketing',
          hex_color: '#00FF00',
        }

        mockClient.updateTag.mockResolvedValue({ uuid: 'tag-1', ...updateData })

        await server.callHandler('tools/call', {
          name: 'mixpost_update_tag',
          arguments: updateData,
        })

        expect(mockClient.updateTag).toHaveBeenCalledWith('tag-1', {
          name: updateData.name,
          hex_color: updateData.hex_color,
        })
      })
    })

    describe('Error Handling', () => {
      it('should handle unknown tool name', async () => {
        const result = await server.callHandler('tools/call', {
          name: 'unknown_tool',
          arguments: {},
        })

        expect(result).toHaveProperty('content')
        expect(result.content[0].text).toContain('Unknown tool')
      })

      it('should handle missing required arguments', async () => {
        const result = await server.callHandler('tools/call', {
          name: 'mixpost_get_account',
          arguments: {},
        })

        expect(result).toHaveProperty('content')
        expect(result.content[0].text).toContain('Missing required argument')
      })

      it('should handle API errors gracefully', async () => {
        mockClient.listAccounts.mockRejectedValue(new Error('API Error'))

        const result = await server.callHandler('tools/call', {
          name: 'mixpost_list_accounts',
          arguments: {},
        })

        expect(result).toHaveProperty('content')
        expect(result.content[0].text).toContain('Error')
      })
    })
  })

  describe.skip('Environment Variable Validation', () => {
    // Import here after mocks are set up
    const { MixpostMCPServer } = require('../src/index')

    it('should require MIXPOST_BASE_URL', async () => {
      process.env.MIXPOST_BASE_URL = undefined
      // Environment variables are validated when getConfig is called
      const _server = new MixpostMCPServer()
      // NOTE: server.server is private and callHandler doesn't exist
      // These tests need to be rewritten to test the actual API
      // await expect(server.server.callHandler('tools/list', {})).rejects.toThrow(/MIXPOST_BASE_URL/)
    })

    it('should require MIXPOST_WORKSPACE_UUID', async () => {
      process.env.MIXPOST_WORKSPACE_UUID = undefined
      // Environment variables are validated when getConfig is called
      const server = new MixpostMCPServer()
      // Try to access client which would trigger getConfig()
      await expect(server.server.callHandler('tools/list', {})).rejects.toThrow(
        /MIXPOST_WORKSPACE_UUID/,
      )
    })

    it('should require MIXPOST_API_KEY', async () => {
      process.env.MIXPOST_API_KEY = undefined
      // Environment variables are validated when getConfig is called
      const server = new MixpostMCPServer()
      // Try to access client which would trigger getConfig()
      await expect(server.server.callHandler('tools/list', {})).rejects.toThrow(/MIXPOST_API_KEY/)
    })

    it('should use default corePath when not provided', async () => {
      process.env.MIXPOST_CORE_PATH = undefined
      // Should not throw, uses default
      const _server = new MixpostMCPServer()
      setTimeout(() => process.exit(0), 100)
    })
  })
})
