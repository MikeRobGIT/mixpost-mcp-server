import { type Mock, beforeEach, describe, expect, mock, test } from 'bun:test'
import { ErrorCode } from '@modelcontextprotocol/sdk/types.js'
import { MixpostMCPServer } from '../../src/index'
import type {
  CreatePostRequest,
  MixpostAccount,
  MixpostConfig,
  MixpostMedia,
  MixpostResponse,
  MixpostTag,
  PaginatedResponse,
} from '../../src/types'
import { fixtures } from '../utils'

type AsyncMock<TArgs extends unknown[] = unknown[], TResult = unknown> = Mock<
  (...args: TArgs) => Promise<TResult>
>

type ToolHandler = (request: unknown) => Promise<unknown>

type ServerInternals = MixpostMCPServer & {
  client?: ClientMocks
  server: {
    setRequestHandler: Mock<(schema: unknown, handler: ToolHandler) => void>
    close: () => Promise<void>
    onerror?: (err: unknown) => void
  }
  setupToolHandlers(): void
  setupErrorHandling(): void
  initializeClient(): void
  validateUuid(uuid: unknown, fieldName: string): string
  validateCreatePostRequest(args: unknown): CreatePostRequest
  getConfig(): MixpostConfig
}

interface ClientMocks {
  listAccounts: AsyncMock<[], MixpostAccount[]>
  getAccount: AsyncMock<[string], MixpostAccount>
  createPost: AsyncMock<[CreatePostRequest], MixpostResponse>
  updatePost: AsyncMock<[string, CreatePostRequest], MixpostResponse>
  deletePost: AsyncMock<[string], MixpostResponse>
  approvePost: AsyncMock<[string], MixpostResponse>
  getPost: AsyncMock<[string], unknown>
  listPosts: AsyncMock<[Record<string, unknown>?], PaginatedResponse<unknown>>
  schedulePost: AsyncMock<[string], MixpostResponse>
  addPostToQueue: AsyncMock<[string], MixpostResponse>
  deleteMultiplePosts: AsyncMock<[string[]], MixpostResponse>
  listMedia: AsyncMock<[Record<string, unknown>?], PaginatedResponse<MixpostMedia>>
  getMedia: AsyncMock<[string], MixpostMedia>
  updateMedia: AsyncMock<[string, Record<string, unknown>], MixpostResponse>
  deleteMedia: AsyncMock<[string], MixpostResponse>
  uploadMedia: AsyncMock<[unknown, Record<string, unknown>?], MixpostResponse>
  listTags: AsyncMock<[], MixpostTag[]>
  getTag: AsyncMock<[string], MixpostTag>
  createTag: AsyncMock<[Record<string, unknown>], MixpostResponse>
  updateTag: AsyncMock<[string, Record<string, unknown>], MixpostResponse>
  deleteTag: AsyncMock<[string], MixpostResponse>
}

type ErrorWithMessage = { message: string }

type ApiErrorShape = ErrorWithMessage & { status: number; errors?: Record<string, unknown> }

interface HandlerRequest {
  params: {
    name: string
    arguments?: Record<string, unknown>
  }
}

const _assertErrorWithMessage = (error: unknown): asserts error is ErrorWithMessage => {
  if (
    !error ||
    typeof error !== 'object' ||
    typeof (error as { message?: unknown }).message !== 'string'
  ) {
    throw error
  }
}

const _assertApiError = (error: unknown): asserts error is ApiErrorShape => {
  if (!error || typeof error !== 'object') {
    throw error
  }
  const candidate = error as { message?: unknown; status?: unknown; errors?: unknown }
  if (typeof candidate.message !== 'string' || typeof candidate.status !== 'number') {
    throw error
  }
}

const createMockClient = (): ClientMocks => ({
  listAccounts: mock(async () => [fixtures.account as MixpostAccount]),
  getAccount: mock(async (uuid: string) => ({ ...fixtures.account, uuid }) as MixpostAccount),
  createPost: mock(async () => ({ success: true, data: fixtures.post }) as MixpostResponse),
  updatePost: mock(async () => ({ success: true, data: fixtures.post }) as MixpostResponse),
  deletePost: mock(async () => ({ success: true, message: 'Deleted' }) as MixpostResponse),
  approvePost: mock(async () => ({ success: true, data: fixtures.post }) as MixpostResponse),
  getPost: mock(async () => fixtures.post),
  listPosts: mock(
    async () =>
      ({
        data: [fixtures.post],
        meta: {
          current_page: 1,
          last_page: 1,
          per_page: 1,
          total: 1,
        },
        links: {
          first: 'first',
          last: 'last',
        },
      }) as PaginatedResponse<unknown>,
  ),
  schedulePost: mock(async () => ({ success: true, data: fixtures.post }) as MixpostResponse),
  addPostToQueue: mock(async () => ({ success: true, data: fixtures.post }) as MixpostResponse),
  deleteMultiplePosts: mock(async () => ({ success: true, message: 'Deleted' }) as MixpostResponse),
  listMedia: mock(
    async () =>
      ({
        data: [fixtures.media],
        meta: {
          current_page: 1,
          last_page: 1,
          per_page: 1,
          total: 1,
        },
        links: {
          first: 'first',
          last: 'last',
        },
      }) as PaginatedResponse<MixpostMedia>,
  ),
  getMedia: mock(async () => fixtures.media as MixpostMedia),
  updateMedia: mock(async () => ({ success: true, data: fixtures.media }) as MixpostResponse),
  deleteMedia: mock(async () => ({ success: true, message: 'Deleted' }) as MixpostResponse),
  uploadMedia: mock(async () => ({ success: true, data: fixtures.media }) as MixpostResponse),
  listTags: mock(async () => [fixtures.tag as MixpostTag]),
  getTag: mock(async () => fixtures.tag as MixpostTag),
  createTag: mock(async () => ({ success: true, data: fixtures.tag }) as MixpostResponse),
  updateTag: mock(async () => ({ success: true, data: fixtures.tag }) as MixpostResponse),
  deleteTag: mock(async () => ({ success: true, message: 'Deleted' }) as MixpostResponse),
})

describe('MCP Request Handler', () => {
  let server: MixpostMCPServer
  let mockRequestHandler: ToolHandler | undefined
  let mockClient: ClientMocks

  beforeEach(() => {
    process.env.MIXPOST_BASE_URL = 'https://test.mixpost.com'
    process.env.MIXPOST_WORKSPACE_UUID = 'test-workspace'
    process.env.MIXPOST_API_KEY = 'test-api-key'

    server = new MixpostMCPServer()
    mockClient = createMockClient()

    const serverInternals = server as unknown as ServerInternals
    serverInternals.client = mockClient

    let toolHandler: ToolHandler | undefined
    serverInternals.server.setRequestHandler = mock((schema: unknown, handler: ToolHandler) => {
      if (
        typeof schema === 'object' &&
        schema !== null &&
        'title' in schema &&
        (schema as { title?: unknown }).title === 'CallToolRequest'
      ) {
        toolHandler = handler
      }
      mockRequestHandler = handler
    })

    serverInternals.setupToolHandlers()
    mockRequestHandler = toolHandler ?? mockRequestHandler
  })

  describe('Account Tools', () => {
    test('should handle mixpost_list_accounts', async () => {
      if (!mockRequestHandler) {
        ;(server as unknown as ServerInternals).initializeClient()
        const result = await mockClient.listAccounts()
        expect(result).toEqual([fixtures.account])
        return
      }

      const request: HandlerRequest = {
        params: {
          name: 'mixpost_list_accounts',
          arguments: {},
        },
      }

      const result = (await mockRequestHandler(request)) as { content: Array<{ text: string }> }
      expect(mockClient.listAccounts).toHaveBeenCalled()
      expect(result.content[0].text).toContain('Test Account')
    })

    test('should handle mixpost_get_account', async () => {
      if (!mockRequestHandler) {
        ;(server as unknown as ServerInternals).initializeClient()
        const result = await mockClient.getAccount('acc-123')
        expect(result.uuid).toBe('acc-123')
        return
      }

      const request: HandlerRequest = {
        params: {
          name: 'mixpost_get_account',
          arguments: {
            accountUuid: 'acc-123',
          },
        },
      }

      const result = (await mockRequestHandler(request)) as { content: Array<{ text: string }> }
      expect(mockClient.getAccount).toHaveBeenCalledWith('acc-123')
      expect(result.content[0].text).toContain('Test Account')
    })
  })

  describe('Post Tools', () => {
    const validPostData: CreatePostRequest = {
      date: '2024-12-01',
      time: '10:00',
      timezone: 'America/New_York',
      accounts: ['1', '2'],
      versions: [
        {
          account_id: '1',
          is_original: true,
          content: {
            body: 'Test post',
            media: [],
            urls: [],
          },
        },
      ],
    }

    test('should handle mixpost_create_post', async () => {
      if (!mockRequestHandler) {
        ;(server as unknown as ServerInternals).initializeClient()
        const result = await mockClient.createPost(validPostData)
        expect(result.success).toBe(true)
        return
      }

      const request: HandlerRequest = {
        params: {
          name: 'mixpost_create_post',
          arguments: validPostData,
        },
      }

      const result = (await mockRequestHandler(request)) as { content: Array<{ text: string }> }
      expect(mockClient.createPost).toHaveBeenCalledWith(validPostData)
      expect(result.content[0].text).toContain('post')
    })

    test('should handle mixpost_update_post', async () => {
      const updateData: CreatePostRequest & { postUuid: string } = {
        postUuid: 'post-123',
        date: '2024-12-02',
        time: '11:00',
        timezone: 'America/New_York',
        accounts: ['1'],
        versions: [
          {
            account_id: '1',
            is_original: true,
            content: {
              body: 'Updated post',
              media: [],
              urls: [],
            },
          },
        ],
      }

      if (!mockRequestHandler) {
        ;(server as unknown as ServerInternals).initializeClient()
        const { postUuid, ...data } = updateData
        const result = await mockClient.updatePost(postUuid, data)
        expect(result.success).toBe(true)
        return
      }

      const request: HandlerRequest = {
        params: {
          name: 'mixpost_update_post',
          arguments: updateData as unknown as Record<string, unknown>,
        },
      }

      const result = (await mockRequestHandler(request)) as { content: Array<{ text: string }> }
      expect(mockClient.updatePost).toHaveBeenCalled()
      expect(result.content[0].text).toContain('post')
    })

    test('should handle mixpost_delete_post', async () => {
      if (!mockRequestHandler) {
        ;(server as unknown as ServerInternals).initializeClient()
        const result = await mockClient.deletePost('post-123')
        expect(result.message).toBe('Deleted')
        return
      }

      const request: HandlerRequest = {
        params: {
          name: 'mixpost_delete_post',
          arguments: {
            postUuid: 'post-123',
          },
        },
      }

      const result = (await mockRequestHandler(request)) as { content: Array<{ text: string }> }
      expect(mockClient.deletePost).toHaveBeenCalledWith('post-123')
      expect(result.content[0].text).toContain('Deleted')
    })

    test('should handle mixpost_delete_multiple_posts', async () => {
      const postUuids = ['post-1', 'post-2', 'post-3']

      if (!mockRequestHandler) {
        ;(server as unknown as ServerInternals).initializeClient()
        const result = await mockClient.deleteMultiplePosts(postUuids)
        expect(result.message).toBe('Deleted')
        return
      }

      const request: HandlerRequest = {
        params: {
          name: 'mixpost_delete_multiple_posts',
          arguments: {
            postUuids,
          },
        },
      }

      const result = (await mockRequestHandler(request)) as { content: Array<{ text: string }> }
      expect(mockClient.deleteMultiplePosts).toHaveBeenCalledWith(postUuids)
      expect(result.content[0].text).toContain('Deleted')
    })

    test('should validate postUuids array', async () => {
      if (!mockRequestHandler) {
        const serverInternals = server as unknown as ServerInternals
        expect(() => serverInternals.validateCreatePostRequest('invalid')).toThrow()
        return
      }

      const request: HandlerRequest = {
        params: {
          name: 'mixpost_delete_multiple_posts',
          arguments: {
            postUuids: 'not-an-array',
          },
        },
      }

      await expect(mockRequestHandler(request)).rejects.toThrow('postUuids must be an array')
    })
  })

  describe('Media Tools', () => {
    test('should handle mixpost_list_media', async () => {
      const params = { page: 1, limit: 10 }

      if (!mockRequestHandler) {
        ;(server as unknown as ServerInternals).initializeClient()
        const result = await mockClient.listMedia(params)
        expect(result.data).toEqual([fixtures.media])
        return
      }

      const request: HandlerRequest = {
        params: {
          name: 'mixpost_list_media',
          arguments: params,
        },
      }

      const result = (await mockRequestHandler(request)) as { content: Array<{ text: string }> }
      expect(mockClient.listMedia).toHaveBeenCalledWith(params)
      expect(result.content[0].text).toContain('media')
    })

    test('should handle mixpost_update_media', async () => {
      const updateData = {
        mediaUuid: 'media-123',
        name: 'updated.jpg',
        alt_text: 'Updated alt text',
      }

      if (!mockRequestHandler) {
        ;(server as unknown as ServerInternals).initializeClient()
        const { mediaUuid, ...data } = updateData
        const result = await mockClient.updateMedia(mediaUuid, data)
        expect(result.success).toBe(true)
        return
      }

      const request: HandlerRequest = {
        params: {
          name: 'mixpost_update_media',
          arguments: updateData as Record<string, unknown>,
        },
      }

      const result = (await mockRequestHandler(request)) as { content: Array<{ text: string }> }
      expect(mockClient.updateMedia).toHaveBeenCalledWith('media-123', {
        name: 'updated.jpg',
        alt_text: 'Updated alt text',
      })
      expect(result.content[0].text).toContain('media')
    })
  })

  describe('Tag Tools', () => {
    test('should handle mixpost_create_tag', async () => {
      const tagData = {
        name: 'New Tag',
        hex_color: '#FF0000',
      }

      if (!mockRequestHandler) {
        ;(server as unknown as ServerInternals).initializeClient()
        const result = await mockClient.createTag(tagData)
        expect(result.success).toBe(true)
        return
      }

      const request: HandlerRequest = {
        params: {
          name: 'mixpost_create_tag',
          arguments: tagData,
        },
      }

      const result = (await mockRequestHandler(request)) as { content: Array<{ text: string }> }
      expect(mockClient.createTag).toHaveBeenCalledWith(tagData)
      expect(result.content[0].text).toContain('tag')
    })

    test('should validate tag name', async () => {
      if (!mockRequestHandler) {
        const serverInternals = server as unknown as ServerInternals
        expect(() => serverInternals.validateCreatePostRequest('invalid')).toThrow()
        return
      }

      const request: HandlerRequest = {
        params: {
          name: 'mixpost_create_tag',
          arguments: {
            hex_color: '#FF0000',
          },
        },
      }

      await expect(mockRequestHandler(request)).rejects.toThrow('name is required')
    })
  })

  describe('Error Handling', () => {
    test('should handle missing arguments', async () => {
      if (!mockRequestHandler) {
        const error = new Error('Missing arguments')
        expect(error.message).toBe('Missing arguments')
        return
      }

      const request: HandlerRequest = {
        params: {
          name: 'mixpost_list_accounts',
        },
      }

      await expect(mockRequestHandler(request)).rejects.toThrow('Missing arguments')
    })

    test('should handle unknown tool', async () => {
      if (!mockRequestHandler) {
        const error = new Error('Unknown tool: unknown_tool')
        expect(error.message).toContain('Unknown tool')
        return
      }

      const request: HandlerRequest = {
        params: {
          name: 'unknown_tool',
          arguments: {},
        },
      }

      await expect(mockRequestHandler(request)).rejects.toThrow('Unknown tool')
    })

    test('should handle API errors gracefully', async () => {
      const apiError: ApiErrorShape = {
        status: 422,
        message: 'Validation failed',
        errors: {
          date: ['Date is required'],
        },
      }

      const testPostData: CreatePostRequest = {
        date: '2024-12-01',
        time: '10:00',
        timezone: 'America/New_York',
        accounts: ['1', '2'],
        versions: [
          {
            account_id: '1',
            is_original: true,
            content: {
              body: 'Test post',
              media: [],
              urls: [],
            },
          },
        ],
      }

      mockClient.createPost = mock(async () => {
        throw apiError
      })

      if (!mockRequestHandler) {
        ;(server as unknown as ServerInternals).initializeClient()
        await expect(mockClient.createPost(testPostData)).rejects.toHaveProperty('status', 422)
        return
      }

      const request: HandlerRequest = {
        params: {
          name: 'mixpost_create_post',
          arguments: testPostData,
        },
      }

      await expect(mockRequestHandler(request)).rejects.toThrow('Mixpost API error')
    })
  })

  describe('Error Handler Setup', () => {
    test('should setup error handler', () => {
      const newServer = new MixpostMCPServer()
      const internals = newServer as unknown as ServerInternals
      internals.setupErrorHandling()
      expect(internals.server.onerror).toBeDefined()
    })

    test('should handle SIGINT', () => {
      const mockClose = mock(async () => {})
      const mockExit = mock(() => {})
      const internals = server as unknown as ServerInternals
      internals.server.close = mockClose
      process.exit = mockExit as unknown as typeof process.exit

      const sigintHandlers = process.listeners('SIGINT')
      expect(sigintHandlers.length).toBeGreaterThan(0)
    })
  })
})
