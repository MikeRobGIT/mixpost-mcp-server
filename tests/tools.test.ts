import { describe, expect, it } from 'bun:test'
import { MIXPOST_TOOLS as tools } from '../src/tools'

describe('Tools Configuration', () => {
  describe('Tool Structure', () => {
    it('should export an array of tools', () => {
      expect(Array.isArray(tools)).toBe(true)
      expect(tools.length).toBeGreaterThan(0)
    })

    it('should have valid tool structure for each tool', () => {
      for (const tool of tools) {
        expect(tool).toHaveProperty('name')
        expect(tool).toHaveProperty('description')
        expect(tool).toHaveProperty('inputSchema')

        expect(typeof tool.name).toBe('string')
        expect(typeof tool.description).toBe('string')
        expect(typeof tool.inputSchema).toBe('object')
      }
    })

    it('should have valid JSON schema for each tool', () => {
      for (const tool of tools) {
        const schema = tool.inputSchema

        expect(schema).toHaveProperty('type')
        expect(schema.type).toBe('object')
        expect(schema).toHaveProperty('properties')
        expect(typeof schema.properties).toBe('object')
      }
    })
  })

  describe('Account Management Tools', () => {
    it('should have mixpost_list_accounts tool', () => {
      const tool = tools.find((t) => t.name === 'mixpost_list_accounts')

      expect(tool).toBeDefined()
      expect(tool?.description).toContain('List all connected social media accounts')
      expect(tool?.inputSchema.required).toEqual([])
    })

    it('should have mixpost_get_account tool with required parameters', () => {
      const tool = tools.find((t) => t.name === 'mixpost_get_account')

      expect(tool).toBeDefined()
      expect(tool?.inputSchema.required).toContain('accountUuid')
      expect(tool?.inputSchema.properties?.accountUuid).toHaveProperty('type', 'string')
    })
  })

  describe('Post Management Tools', () => {
    describe('mixpost_create_post', () => {
      it('should have correct structure', () => {
        const tool = tools.find((t) => t.name === 'mixpost_create_post')

        expect(tool).toBeDefined()
        expect(tool?.description).toContain('Create a new social media post')
      })

      it('should have required fields', () => {
        const tool = tools.find((t) => t.name === 'mixpost_create_post')

        expect(tool?.inputSchema.required).toContain('date')
        expect(tool?.inputSchema.required).toContain('time')
        expect(tool?.inputSchema.required).toContain('timezone')
        expect(tool?.inputSchema.required).toContain('accounts')
        expect(tool?.inputSchema.required).toContain('versions')
      })

      it('should have correct property types', () => {
        const tool = tools.find((t) => t.name === 'mixpost_create_post')
        const props = tool?.inputSchema.properties

        expect(props?.date).toHaveProperty('type', 'string')
        expect(props?.time).toHaveProperty('type', 'string')
        expect(props?.timezone).toHaveProperty('type', 'string')
        expect(props?.accounts).toHaveProperty('type', 'array')
        expect(props?.versions).toHaveProperty('type', 'array')
      })

      it('should have correct version schema', () => {
        const tool = tools.find((t) => t.name === 'mixpost_create_post')
        const versionSchema = tool?.inputSchema.properties?.versions?.items

        expect(versionSchema).toHaveProperty('type', 'object')
        expect(versionSchema?.required).toContain('account_id')
        expect(versionSchema?.required).toContain('is_original')
        expect(versionSchema?.required).toContain('content')
      })
    })

    describe('mixpost_update_post', () => {
      it('should have postUuid as required parameter', () => {
        const tool = tools.find((t) => t.name === 'mixpost_update_post')

        expect(tool?.inputSchema.required).toContain('postUuid')
        expect(tool?.inputSchema.required).toContain('date')
        expect(tool?.inputSchema.required).toContain('time')
        expect(tool?.inputSchema.required).toContain('timezone')
      })
    })

    describe('mixpost_list_posts', () => {
      it('should have optional pagination parameters', () => {
        const tool = tools.find((t) => t.name === 'mixpost_list_posts')

        expect(tool?.inputSchema.required).toEqual([])
        expect(tool?.inputSchema.properties).toHaveProperty('page')
        expect(tool?.inputSchema.properties).toHaveProperty('limit')
        expect(tool?.inputSchema.properties).toHaveProperty('status')
      })
    })

    describe('mixpost_delete_post', () => {
      it('should require postUuid parameter', () => {
        const tool = tools.find((t) => t.name === 'mixpost_delete_post')

        expect(tool?.inputSchema.required).toContain('postUuid')
      })
    })

    describe('mixpost_delete_multiple_posts', () => {
      it('should require array of postUuids', () => {
        const tool = tools.find((t) => t.name === 'mixpost_delete_multiple_posts')

        expect(tool?.inputSchema.required).toContain('postUuids')
        expect(tool?.inputSchema.properties?.postUuids).toHaveProperty('type', 'array')
      })
    })
  })

  describe('Media Management Tools', () => {
    it('should have mixpost_list_media with optional parameters', () => {
      const tool = tools.find((t) => t.name === 'mixpost_list_media')

      expect(tool).toBeDefined()
      expect(tool?.inputSchema.required).toEqual([])
      expect(tool?.inputSchema.properties).toHaveProperty('page')
      expect(tool?.inputSchema.properties).toHaveProperty('limit')
      expect(tool?.inputSchema.properties).toHaveProperty('type')
    })

    it('should have mixpost_get_media with required mediaUuid', () => {
      const tool = tools.find((t) => t.name === 'mixpost_get_media')

      expect(tool?.inputSchema.required).toContain('mediaUuid')
    })

    it('should have mixpost_update_media with required mediaUuid', () => {
      const tool = tools.find((t) => t.name === 'mixpost_update_media')

      expect(tool?.inputSchema.required).toContain('mediaUuid')
      expect(tool?.inputSchema.properties).toHaveProperty('name')
      expect(tool?.inputSchema.properties).toHaveProperty('alt_text')
    })

    it('should have mixpost_delete_media with required mediaUuid', () => {
      const tool = tools.find((t) => t.name === 'mixpost_delete_media')

      expect(tool?.inputSchema.required).toContain('mediaUuid')
    })
  })

  describe('Tag Management Tools', () => {
    it('should have mixpost_list_tags tool', () => {
      const tool = tools.find((t) => t.name === 'mixpost_list_tags')

      expect(tool).toBeDefined()
      expect(tool?.inputSchema.required).toEqual([])
    })

    it('should have mixpost_create_tag with required name', () => {
      const tool = tools.find((t) => t.name === 'mixpost_create_tag')

      expect(tool?.inputSchema.required).toContain('name')
      expect(tool?.inputSchema.properties).toHaveProperty('hex_color')
    })

    it('should have mixpost_update_tag with required tagUuid', () => {
      const tool = tools.find((t) => t.name === 'mixpost_update_tag')

      expect(tool?.inputSchema.required).toContain('tagUuid')
    })

    it('should have mixpost_delete_tag with required tagUuid', () => {
      const tool = tools.find((t) => t.name === 'mixpost_delete_tag')

      expect(tool?.inputSchema.required).toContain('tagUuid')
    })
  })

  describe('Post Operation Tools', () => {
    it('should have mixpost_schedule_post tool', () => {
      const tool = tools.find((t) => t.name === 'mixpost_schedule_post')

      expect(tool).toBeDefined()
      expect(tool?.inputSchema.required).toContain('postUuid')
    })

    it('should have mixpost_add_post_to_queue tool', () => {
      const tool = tools.find((t) => t.name === 'mixpost_add_post_to_queue')

      expect(tool).toBeDefined()
      expect(tool?.inputSchema.required).toContain('postUuid')
    })

    it('should have mixpost_approve_post tool', () => {
      const tool = tools.find((t) => t.name === 'mixpost_approve_post')

      expect(tool).toBeDefined()
      expect(tool?.inputSchema.required).toContain('postUuid')
    })

    it('should have mixpost_get_post tool', () => {
      const tool = tools.find((t) => t.name === 'mixpost_get_post')

      expect(tool).toBeDefined()
      expect(tool?.inputSchema.required).toContain('postUuid')
    })
  })

  describe('Tool Count and Coverage', () => {
    it('should have the expected number of tools', () => {
      // Count expected tools
      const expectedTools = [
        // Account Management (2)
        'mixpost_list_accounts',
        'mixpost_get_account',

        // Post Management (9)
        'mixpost_create_post',
        'mixpost_update_post',
        'mixpost_approve_post',
        'mixpost_get_post',
        'mixpost_list_posts',
        'mixpost_delete_post',
        'mixpost_delete_multiple_posts',
        'mixpost_schedule_post',
        'mixpost_add_post_to_queue',

        // Media Management (4)
        'mixpost_list_media',
        'mixpost_get_media',
        'mixpost_update_media',
        'mixpost_delete_media',

        // Tag Management (5)
        'mixpost_list_tags',
        'mixpost_get_tag',
        'mixpost_create_tag',
        'mixpost_update_tag',
        'mixpost_delete_tag',
      ]

      expect(tools.length).toBe(expectedTools.length)

      for (const toolName of expectedTools) {
        const tool = tools.find((t) => t.name === toolName)
        expect(tool).toBeDefined()
      }
    })
  })

  describe('Schema Validation', () => {
    it('should have valid descriptions for all tools', () => {
      for (const tool of tools) {
        expect(tool.description.length).toBeGreaterThan(10)
        expect(tool.description).not.toContain('undefined')
        expect(tool.description).not.toContain('null')
      }
    })

    it('should have consistent parameter naming', () => {
      // Check that all UUID parameters end with 'Uuid'
      const uuidTools = tools.filter((t) =>
        Object.keys(t.inputSchema.properties || {}).some((key) =>
          key.toLowerCase().includes('uuid'),
        ),
      )

      for (const tool of uuidTools) {
        for (const key of Object.keys(tool.inputSchema.properties || {})) {
          if (key.toLowerCase().includes('uuid')) {
            expect(key).toMatch(/Uuid$|Uuids$/)
          }
        }
      }
    })

    it('should have appropriate data types for parameters', () => {
      for (const tool of tools) {
        const props = tool.inputSchema.properties || {}

        for (const [key, value] of Object.entries(props)) {
          const propValue = value as Record<string, unknown>
          // Check common parameter types
          if (key.includes('Uuid') && !key.includes('Uuids')) {
            expect(propValue.type).toBe('string')
          }
          if (key.includes('Uuids')) {
            expect(propValue.type).toBe('array')
          }
          if (key === 'page' || key === 'limit') {
            expect(propValue.type).toBe('number')
          }
          if (key.includes('date')) {
            expect(propValue.type).toBe('string')
          }
          if (key.includes('time')) {
            expect(propValue.type).toBe('string')
          }
          if (key.endsWith('s') && propValue.type === 'array') {
            expect(propValue).toHaveProperty('items')
          }
        }
      }
    })

    it('should have descriptions for all parameters', () => {
      for (const tool of tools) {
        const props = tool.inputSchema.properties || {}

        for (const [_key, value] of Object.entries(props)) {
          const propValue = value as Record<string, unknown>
          expect(propValue).toHaveProperty('description')
          expect((propValue.description as string).length).toBeGreaterThan(0)
        }
      }
    })
  })

  describe('Complex Schema Validation', () => {
    it('should have correct nested schemas for post versions', () => {
      const createTool = tools.find((t) => t.name === 'mixpost_create_post')
      const updateTool = tools.find((t) => t.name === 'mixpost_update_post')
      for (const tool of [createTool, updateTool]) {
        const versionSchema = tool?.inputSchema.properties?.versions?.items
        const contentSchema = versionSchema?.properties?.content

        expect(contentSchema).toHaveProperty('type', 'object')
        expect(contentSchema?.properties).toHaveProperty('body')
        expect(contentSchema?.properties).toHaveProperty('media')
        expect(contentSchema?.properties).toHaveProperty('urls')
      }
    })

    it('should have boolean flags with correct types', () => {
      for (const tool of tools) {
        const props = tool.inputSchema.properties || {}

        for (const [key, value] of Object.entries(props)) {
          const propValue = value as Record<string, unknown>
          if (
            key.startsWith('is_') ||
            key === 'schedule' ||
            key === 'queue' ||
            key === 'schedule_now'
          ) {
            expect(propValue.type).toBe('boolean')
          }
        }
      }
    })

    it('should have array parameters with item definitions', () => {
      for (const tool of tools) {
        const props = tool.inputSchema.properties || {}

        for (const [_key, value] of Object.entries(props)) {
          const propValue = value as Record<string, unknown>
          if (propValue.type === 'array') {
            expect(propValue).toHaveProperty('items')
            expect(propValue.items as Record<string, unknown>).toHaveProperty('type')
          }
        }
      }
    })
  })
})
