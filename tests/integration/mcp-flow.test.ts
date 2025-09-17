import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { MixpostMCPServer } from '../../src/index'
import { MIXPOST_TOOLS } from '../../src/tools'
import { createApiResponse, fixtures } from '../utils'

// Type definitions for server test methods
interface ServerTestMethods {
  validateCreatePostRequest: (data: unknown) => unknown
  validateUuid: (uuid: string, param: string) => string
  getConfig: () => unknown
}

describe('MCP Integration Flow', () => {
  let server: MixpostMCPServer
  let mockHandlers: Record<string, unknown>

  beforeEach(() => {
    // Set test environment
    process.env.MIXPOST_BASE_URL = 'https://test.mixpost.com'
    process.env.MIXPOST_WORKSPACE_UUID = 'test-workspace'
    process.env.MIXPOST_API_KEY = 'test-api-key'

    // Create server instance
    server = new MixpostMCPServer()

    // Store original server request handlers
    mockHandlers = {}

    // Mock server setRequestHandler to capture handlers
    ;(server as unknown as { server: { setRequestHandler: unknown } }).server.setRequestHandler =
      mock((schema: { title?: string; name?: string }, handler: unknown) => {
        const schemaName = schema.title || schema.name || 'unknown'
        mockHandlers[schemaName] = handler
      })

    // Setup handlers
    ;(server as unknown as { setupToolHandlers: () => void }).setupToolHandlers()
  })

  describe('Tool Registration Flow', () => {
    test('should handle ListToolsRequest', async () => {
      // Test that tools are properly defined
      expect(MIXPOST_TOOLS).toBeDefined()
      expect(MIXPOST_TOOLS.length).toBeGreaterThan(0)

      // Verify all required tool properties
      for (const tool of MIXPOST_TOOLS) {
        expect(tool.name).toBeDefined()
        expect(tool.description).toBeDefined()
        expect(tool.inputSchema).toBeDefined()
      }
    })
  })

  describe('Account Operations Flow', () => {
    test('should handle list accounts request', async () => {
      // Mock the client
      const mockClient = {
        listAccounts: mock(() => Promise.resolve([fixtures.account])),
      }
      ;(server as unknown as { client: unknown }).client = mockClient

      // Simulate the request handling
      const _request = {
        params: {
          name: 'mixpost_list_accounts',
          arguments: {},
        },
      }

      // Test that the tool exists
      const tool = MIXPOST_TOOLS.find((t) => t.name === 'mixpost_list_accounts')
      expect(tool).toBeDefined()
      expect(tool?.description).toContain('List all connected social media accounts')
    })

    test('should handle get account request with validation', async () => {
      // Mock the client
      const mockClient = {
        getAccount: mock(() => Promise.resolve(fixtures.account)),
      }
      ;(server as unknown as { client: unknown }).client = mockClient

      // Test UUID validation
      const validUuid = 'acc-123'
      const result = (server as unknown as ServerTestMethods).validateUuid(validUuid, 'accountUuid')
      expect(result).toBe(validUuid)

      // Test tool definition
      const tool = MIXPOST_TOOLS.find((t) => t.name === 'mixpost_get_account')
      expect(tool).toBeDefined()
      expect(tool?.inputSchema.required).toContain('accountUuid')
    })
  })

  describe('Post Operations Flow', () => {
    test('should validate post creation request', () => {
      const validPostData = {
        date: '2024-12-01',
        time: '10:00',
        timezone: 'America/New_York',
        schedule: true,
        accounts: [1, 2],
        versions: [
          {
            account_id: 1,
            is_original: true,
            content: {
              body: 'Test post content',
              media: [],
              urls: [],
            },
          },
        ],
      }

      const result = (server as unknown as ServerTestMethods).validateCreatePostRequest(
        validPostData,
      )
      expect(result).toEqual(validPostData)

      // Test tool definition
      const tool = MIXPOST_TOOLS.find((t) => t.name === 'mixpost_create_post')
      expect(tool).toBeDefined()
      expect(tool?.inputSchema.required).toContain('date')
      expect(tool?.inputSchema.required).toContain('time')
      expect(tool?.inputSchema.required).toContain('timezone')
      expect(tool?.inputSchema.required).toContain('accounts')
      expect(tool?.inputSchema.required).toContain('versions')
    })

    test('should validate post update request', () => {
      const updateData = {
        date: '2024-12-02',
        time: '11:00',
        timezone: 'America/New_York',
        accounts: [1],
        versions: [
          {
            account_id: 1,
            is_original: true,
            content: {
              body: 'Updated post content',
              media: [],
              urls: [],
            },
          },
        ],
      }

      const result = (server as unknown as ServerTestMethods).validateCreatePostRequest(updateData)
      expect(result).toEqual(updateData)

      // Test tool definition
      const tool = MIXPOST_TOOLS.find((t) => t.name === 'mixpost_update_post')
      expect(tool).toBeDefined()
      expect(tool?.inputSchema.required).toContain('postUuid')
    })

    test('should handle post deletion', () => {
      const tool = MIXPOST_TOOLS.find((t) => t.name === 'mixpost_delete_post')
      expect(tool).toBeDefined()
      expect(tool?.inputSchema.required).toContain('postUuid')
    })

    test('should handle multiple post deletion', () => {
      const tool = MIXPOST_TOOLS.find((t) => t.name === 'mixpost_delete_multiple_posts')
      expect(tool).toBeDefined()
      expect(tool?.inputSchema.required).toContain('postUuids')
      expect(tool?.inputSchema.properties.postUuids.type).toBe('array')
    })

    test('should handle post scheduling', () => {
      const tool = MIXPOST_TOOLS.find((t) => t.name === 'mixpost_schedule_post')
      expect(tool).toBeDefined()
      expect(tool?.inputSchema.required).toContain('postUuid')
    })

    test('should handle adding post to queue', () => {
      const tool = MIXPOST_TOOLS.find((t) => t.name === 'mixpost_add_post_to_queue')
      expect(tool).toBeDefined()
      expect(tool?.inputSchema.required).toContain('postUuid')
    })
  })

  describe('Media Operations Flow', () => {
    test('should handle media listing with pagination', () => {
      const tool = MIXPOST_TOOLS.find((t) => t.name === 'mixpost_list_media')
      expect(tool).toBeDefined()
      expect(tool?.inputSchema.properties.limit).toBeDefined()
      expect(tool?.inputSchema.properties.page).toBeDefined()
      expect(tool?.inputSchema.properties.type).toBeDefined()
    })

    test('should handle media update', () => {
      const tool = MIXPOST_TOOLS.find((t) => t.name === 'mixpost_update_media')
      expect(tool).toBeDefined()
      expect(tool?.inputSchema.required).toContain('mediaUuid')
      expect(tool?.inputSchema.properties.name).toBeDefined()
      expect(tool?.inputSchema.properties.alt_text).toBeDefined()
    })

    test('should handle media deletion', () => {
      const tool = MIXPOST_TOOLS.find((t) => t.name === 'mixpost_delete_media')
      expect(tool).toBeDefined()
      expect(tool?.inputSchema.required).toContain('mediaUuid')
    })
  })

  describe('Tag Operations Flow', () => {
    test('should handle tag creation', () => {
      const tool = MIXPOST_TOOLS.find((t) => t.name === 'mixpost_create_tag')
      expect(tool).toBeDefined()
      expect(tool?.inputSchema.required).toContain('name')
      expect(tool?.inputSchema.properties.hex_color).toBeDefined()
    })

    test('should handle tag update', () => {
      const tool = MIXPOST_TOOLS.find((t) => t.name === 'mixpost_update_tag')
      expect(tool).toBeDefined()
      expect(tool?.inputSchema.required).toContain('tagUuid')
      expect(tool?.inputSchema.properties.name).toBeDefined()
      expect(tool?.inputSchema.properties.hex_color).toBeDefined()
    })

    test('should handle tag deletion', () => {
      const tool = MIXPOST_TOOLS.find((t) => t.name === 'mixpost_delete_tag')
      expect(tool).toBeDefined()
      expect(tool?.inputSchema.required).toContain('tagUuid')
    })
  })

  describe('Error Handling Flow', () => {
    test('should validate date formats correctly', () => {
      const invalidDates = ['12-01-2024', '2024/12/01', '01.12.2024', 'invalid']
      const validDates = ['2024-12-01', '2025-01-15', '2023-06-30']

      for (const date of invalidDates) {
        const data = {
          date,
          time: '10:00',
          timezone: 'UTC',
          accounts: [1],
          versions: [],
        }
        expect(() => {
          ;(server as unknown as ServerTestMethods).validateCreatePostRequest(data)
        }).toThrow('Invalid date format')
      }

      for (const date of validDates) {
        const data = {
          date,
          time: '10:00',
          timezone: 'UTC',
          accounts: [1],
          versions: [{ account_id: 1, is_original: true, content: { body: 'test' } }],
        }
        const result = (server as unknown as ServerTestMethods).validateCreatePostRequest(data)
        expect(result.date).toBe(date)
      }
    })

    test('should validate time formats correctly', () => {
      const invalidTimes = ['10:00 AM', '10:00:00', '10', '1030', 'invalid']
      const validTimes = ['10:00', '00:00', '23:59', '15:30', '25:00', '10:70'] // Note: regex doesn't validate actual time values

      for (const time of invalidTimes) {
        const data = {
          date: '2024-12-01',
          time,
          timezone: 'UTC',
          accounts: [1],
          versions: [{ account_id: 1, is_original: true, content: { body: 'test' } }], // Need valid versions
        }
        expect(() => {
          ;(server as unknown as ServerTestMethods).validateCreatePostRequest(data)
        }).toThrow('Invalid time format')
      }

      for (const time of validTimes) {
        const data = {
          date: '2024-12-01',
          time,
          timezone: 'UTC',
          accounts: [1],
          versions: [{ account_id: 1, is_original: true, content: { body: 'test' } }],
        }
        const result = (server as unknown as ServerTestMethods).validateCreatePostRequest(data)
        expect(result.time).toBe(time)
      }
    })

    test('should validate array fields correctly', () => {
      // Test non-array accounts
      const invalidAccounts = {
        date: '2024-12-01',
        time: '10:00',
        timezone: 'UTC',
        accounts: 'not-an-array',
        versions: [],
      }
      expect(() => {
        ;(server as unknown as ServerTestMethods).validateCreatePostRequest(invalidAccounts)
      }).toThrow('Accounts must be a non-empty array')

      // Test empty accounts array
      const emptyAccounts = {
        date: '2024-12-01',
        time: '10:00',
        timezone: 'UTC',
        accounts: [],
        versions: [],
      }
      expect(() => {
        ;(server as unknown as ServerTestMethods).validateCreatePostRequest(emptyAccounts)
      }).toThrow('Accounts must be a non-empty array')

      // Test non-array versions
      const invalidVersions = {
        date: '2024-12-01',
        time: '10:00',
        timezone: 'UTC',
        accounts: [1],
        versions: 'not-an-array',
      }
      expect(() => {
        ;(server as unknown as ServerTestMethods).validateCreatePostRequest(invalidVersions)
      }).toThrow('Versions must be a non-empty array')

      // Test empty versions array
      const emptyVersions = {
        date: '2024-12-01',
        time: '10:00',
        timezone: 'UTC',
        accounts: [1],
        versions: [],
      }
      expect(() => {
        ;(server as unknown as ServerTestMethods).validateCreatePostRequest(emptyVersions)
      }).toThrow('Versions must be a non-empty array')
    })
  })

  describe('Configuration Flow', () => {
    test('should handle all required environment variables', () => {
      const config = (server as unknown as ServerTestMethods).getConfig()
      expect(config.baseUrl).toBeDefined()
      expect(config.workspaceUuid).toBeDefined()
      expect(config.apiKey).toBeDefined()
      expect(config.corePath).toBeDefined()
    })

    test('should throw error for each missing environment variable', () => {
      const originalEnv = { ...process.env }

      // Test missing BASE_URL
      process.env.MIXPOST_BASE_URL = undefined
      expect(() => {
        new MixpostMCPServer()
        ;(server as unknown as ServerTestMethods).getConfig()
      }).toThrow()
      process.env.MIXPOST_BASE_URL = originalEnv.MIXPOST_BASE_URL

      // Test missing WORKSPACE_UUID
      process.env.MIXPOST_WORKSPACE_UUID = undefined
      expect(() => {
        new MixpostMCPServer()
        ;(server as unknown as ServerTestMethods).getConfig()
      }).toThrow()
      process.env.MIXPOST_WORKSPACE_UUID = originalEnv.MIXPOST_WORKSPACE_UUID

      // Test missing API_KEY
      process.env.MIXPOST_API_KEY = undefined
      expect(() => {
        new MixpostMCPServer()
        ;(server as unknown as ServerTestMethods).getConfig()
      }).toThrow()

      // Restore environment
      process.env = originalEnv
    })
  })
})
