import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { MixpostMCPServer } from '../../src/index'
import { MIXPOST_TOOLS } from '../../src/tools'
import type { MockMixpostClient, ServerWithPrivateMethods } from '../mcp-test-types'
import { fixtures } from '../utils'

describe('MixpostMCPServer', () => {
  let server: MixpostMCPServer
  let mockClient: MockMixpostClient

  beforeEach(() => {
    // Set test environment
    process.env.MIXPOST_BASE_URL = 'https://test.mixpost.com'
    process.env.MIXPOST_WORKSPACE_UUID = 'test-workspace'
    process.env.MIXPOST_API_KEY = 'test-api-key'

    // Create server instance
    server = new MixpostMCPServer()

    // Mock the client
    mockClient = {
      listAccounts: mock(() => Promise.resolve([fixtures.account])),
      getAccount: mock(() => Promise.resolve(fixtures.account)),
      createPost: mock(() => Promise.resolve({ success: true, data: fixtures.post })),
      updatePost: mock(() => Promise.resolve({ success: true, data: fixtures.post })),
      deletePost: mock(() => Promise.resolve({ success: true, message: 'Deleted' })),
      approvePost: mock(() => Promise.resolve({ success: true, data: fixtures.post })),
      getPost: mock(() => Promise.resolve(fixtures.post)),
      listPosts: mock(() => Promise.resolve({ data: [fixtures.post], meta: {} })),
      schedulePost: mock(() => Promise.resolve({ success: true, data: fixtures.post })),
      addPostToQueue: mock(() => Promise.resolve({ success: true, data: fixtures.post })),
      deleteMultiplePosts: mock(() => Promise.resolve({ success: true, message: 'Deleted' })),
      listMedia: mock(() => Promise.resolve({ data: [fixtures.media], meta: {} })),
      getMedia: mock(() => Promise.resolve(fixtures.media)),
      updateMedia: mock(() => Promise.resolve({ success: true, data: fixtures.media })),
      deleteMedia: mock(() => Promise.resolve({ success: true, message: 'Deleted' })),
      listTags: mock(() => Promise.resolve([fixtures.tag])),
      getTag: mock(() => Promise.resolve(fixtures.tag)),
      createTag: mock(() => Promise.resolve({ success: true, data: fixtures.tag })),
      updateTag: mock(() => Promise.resolve({ success: true, data: fixtures.tag })),
      deleteTag: mock(() => Promise.resolve({ success: true, message: 'Deleted' })),
    }

    // Replace the client with mock
    ;(server as ServerWithPrivateMethods).client = mockClient as MockMixpostClient
  })

  describe('Tool Registration', () => {
    test('should have all tools defined', () => {
      expect(MIXPOST_TOOLS).toBeDefined()
      expect(MIXPOST_TOOLS.length).toBeGreaterThan(0)

      // Check for specific tools
      const toolNames = MIXPOST_TOOLS.map((t) => t.name)
      expect(toolNames).toContain('mixpost_list_accounts')
      expect(toolNames).toContain('mixpost_create_post')
      expect(toolNames).toContain('mixpost_list_media')
      expect(toolNames).toContain('mixpost_list_tags')
    })
  })

  describe('Client Methods', () => {
    test('client should be initialized', () => {
      // Force initialization
      ;(server as ServerWithPrivateMethods).initializeClient()
      expect((server as ServerWithPrivateMethods).client).toBeDefined()
    })

    test('should validate required environment variables', () => {
      // Test missing environment variables
      const originalEnv = { ...process.env }
      process.env.MIXPOST_BASE_URL = undefined as unknown as string

      expect(() => {
        ;(server as ServerWithPrivateMethods).getConfig()
      }).toThrow()

      // Restore environment
      process.env = originalEnv
    })
  })

  describe('Validation Methods', () => {
    test('validateUuid should accept valid UUID', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000'
      const result = (server as ServerWithPrivateMethods).validateUuid(validUuid, 'test')
      expect(result).toBe(validUuid)
    })

    test('validateUuid should reject empty string', () => {
      expect(() => {
        ;(server as ServerWithPrivateMethods).validateUuid('', 'test')
      }).toThrow()
    })

    test('validateCreatePostRequest should validate date format', () => {
      const invalidData = {
        date: '12-01-2024', // Invalid format
        time: '10:00',
        timezone: 'America/New_York',
        accounts: [1],
        versions: [],
      }

      expect(() => {
        ;(server as ServerWithPrivateMethods).validateCreatePostRequest(invalidData)
      }).toThrow('Invalid date format')
    })

    test('validateCreatePostRequest should validate time format', () => {
      const invalidData = {
        date: '2024-12-01',
        time: '10:00 AM', // Invalid format
        timezone: 'America/New_York',
        accounts: [1],
        versions: [],
      }

      expect(() => {
        ;(server as ServerWithPrivateMethods).validateCreatePostRequest(invalidData)
      }).toThrow('Invalid time format')
    })

    test('validateCreatePostRequest should validate required fields', () => {
      const invalidData = {
        date: '2024-12-01',
        // Missing time, timezone, accounts, versions
      }

      expect(() => {
        ;(server as ServerWithPrivateMethods).validateCreatePostRequest(invalidData)
      }).toThrow('Missing required fields')
    })

    test('validateCreatePostRequest should accept valid data', () => {
      const validData = {
        date: '2024-12-01',
        time: '10:00',
        timezone: 'America/New_York',
        accounts: [1],
        versions: [
          {
            account_id: 1,
            is_original: true,
            content: {
              body: 'Test',
              media: [],
              urls: [],
            },
          },
        ],
      }

      const result = (server as ServerWithPrivateMethods).validateCreatePostRequest(validData)
      expect(result).toEqual(validData)
    })
  })

  describe('Configuration', () => {
    test('getConfig should return proper configuration', () => {
      const config = (server as ServerWithPrivateMethods).getConfig()
      expect(config.baseUrl).toBe('https://test.mixpost.com')
      expect(config.workspaceUuid).toBe('test-workspace')
      expect(config.apiKey).toBe('test-api-key')
      expect(config.corePath).toBe('mixpost')
    })

    test('getConfig should use custom core path if provided', () => {
      process.env.MIXPOST_CORE_PATH = 'custom-path'
      const config = (server as ServerWithPrivateMethods).getConfig()
      expect(config.corePath).toBe('custom-path')
      // Reset to default
      process.env.MIXPOST_CORE_PATH = 'mixpost'
    })
  })

  describe('Error Handling', () => {
    test('should handle missing environment variables', () => {
      const originalEnv = { ...process.env }
      process.env.MIXPOST_API_KEY = undefined

      const newServer = new MixpostMCPServer()
      expect(() => {
        ;(newServer as ServerWithPrivateMethods).getConfig()
      }).toThrow('Missing required environment variables')

      // Restore environment
      process.env = originalEnv
    })
  })
})
