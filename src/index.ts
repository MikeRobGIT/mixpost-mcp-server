#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js'

import { MixpostClient, type QueryParams } from './client.js'
import { MIXPOST_TOOLS } from './tools.js'
import {
  type ApiError,
  type CreatePostRequest,
  type MixpostConfig,
  UpdatePostRequest,
} from './types.js'

class MixpostMCPServer {
  private server: Server
  private client!: MixpostClient

  constructor() {
    this.server = new Server(
      {
        name: 'mixpost-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    )

    this.setupToolHandlers()
    this.setupErrorHandling()
  }

  private getConfig(): MixpostConfig {
    const baseUrl = process.env.MIXPOST_BASE_URL
    const workspaceUuid = process.env.MIXPOST_WORKSPACE_UUID
    const corePath = process.env.MIXPOST_CORE_PATH || 'mixpost'
    const apiKey = process.env.MIXPOST_API_KEY

    if (!baseUrl || !workspaceUuid || !apiKey) {
      throw new Error(
        'Missing required environment variables. Please set MIXPOST_BASE_URL, MIXPOST_WORKSPACE_UUID, and MIXPOST_API_KEY',
      )
    }

    return { baseUrl, workspaceUuid, corePath, apiKey }
  }

  private initializeClient() {
    if (!this.client) {
      const config = this.getConfig()
      this.client = new MixpostClient(config)
    }
  }

  private validateCreatePostRequest(args: unknown): CreatePostRequest {
    if (!args || typeof args !== 'object') {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid request format')
    }

    const request = args as Partial<CreatePostRequest>

    // Validate required fields
    if (
      !request.date ||
      !request.time ||
      !request.timezone ||
      !request.accounts ||
      !request.versions
    ) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Missing required fields: date, time, timezone, accounts, and versions are required',
      )
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(request.date)) {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid date format. Use YYYY-MM-DD')
    }

    // Validate time format
    if (!/^\d{2}:\d{2}$/.test(request.time)) {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid time format. Use HH:MM')
    }

    // Validate accounts array
    if (!Array.isArray(request.accounts) || request.accounts.length === 0) {
      throw new McpError(ErrorCode.InvalidParams, 'Accounts must be a non-empty array')
    }

    // Validate versions array
    if (!Array.isArray(request.versions) || request.versions.length === 0) {
      throw new McpError(ErrorCode.InvalidParams, 'Versions must be a non-empty array')
    }

    return request as CreatePostRequest
  }

  private validateUuid(uuid: unknown, fieldName: string): string {
    if (typeof uuid !== 'string' || uuid.trim() === '') {
      throw new McpError(ErrorCode.InvalidParams, `${fieldName} must be a non-empty string`)
    }
    return uuid
  }

  private ensureRecord(value: unknown, errorMessage: string): Record<string, unknown> {
    if (!value || typeof value !== 'object') {
      throw new McpError(ErrorCode.InvalidParams, errorMessage)
    }
    return value as Record<string, unknown>
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: MIXPOST_TOOLS,
    }))

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        this.initializeClient()
        const { name, arguments: args } = request.params
        if (!args) {
          throw new McpError(ErrorCode.InvalidParams, 'Missing arguments')
        }

        switch (name) {
          // Account tools
          case 'mixpost_list_accounts':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await this.client.listAccounts(), null, 2),
                },
              ],
            }

          case 'mixpost_get_account': {
            const accountUuid = this.validateUuid(args.accountUuid, 'accountUuid')
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await this.client.getAccount(accountUuid), null, 2),
                },
              ],
            }
          }

          // Post tools
          case 'mixpost_create_post': {
            const createRequest = this.validateCreatePostRequest(args)
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await this.client.createPost(createRequest), null, 2),
                },
              ],
            }
          }

          case 'mixpost_update_post': {
            const recordArgs = this.ensureRecord(args, 'Invalid request format for update')
            const { postUuid, ...updateData } = recordArgs
            const validatedPostUuid = this.validateUuid(postUuid, 'postUuid')
            const updateRequest = this.validateCreatePostRequest(updateData)
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.client.updatePost(validatedPostUuid, updateRequest),
                    null,
                    2,
                  ),
                },
              ],
            }
          }

          case 'mixpost_approve_post':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.client.approvePost(this.validateUuid(args.postUuid, 'postUuid')),
                    null,
                    2,
                  ),
                },
              ],
            }

          case 'mixpost_get_post':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.client.getPost(this.validateUuid(args.postUuid, 'postUuid')),
                    null,
                    2,
                  ),
                },
              ],
            }

          case 'mixpost_list_posts': {
            const params: QueryParams = {}
            for (const [key, value] of Object.entries(args)) {
              if (value !== undefined && value !== null) {
                params[key] = value as string | number | boolean
              }
            }
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await this.client.listPosts(params), null, 2),
                },
              ],
            }
          }

          case 'mixpost_delete_post':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.client.deletePost(this.validateUuid(args.postUuid, 'postUuid')),
                    null,
                    2,
                  ),
                },
              ],
            }

          case 'mixpost_delete_multiple_posts':
            if (!Array.isArray(args.postUuids)) {
              throw new McpError(ErrorCode.InvalidParams, 'postUuids must be an array')
            }
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.client.deleteMultiplePosts(args.postUuids),
                    null,
                    2,
                  ),
                },
              ],
            }

          case 'mixpost_schedule_post':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.client.schedulePost(this.validateUuid(args.postUuid, 'postUuid')),
                    null,
                    2,
                  ),
                },
              ],
            }

          case 'mixpost_add_post_to_queue':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.client.addPostToQueue(this.validateUuid(args.postUuid, 'postUuid')),
                    null,
                    2,
                  ),
                },
              ],
            }

          // Media tools
          case 'mixpost_list_media': {
            const params: QueryParams = {}
            for (const [key, value] of Object.entries(args)) {
              if (value !== undefined && value !== null) {
                params[key] = value as string | number | boolean
              }
            }
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await this.client.listMedia(params), null, 2),
                },
              ],
            }
          }

          case 'mixpost_get_media':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.client.getMedia(this.validateUuid(args.mediaUuid, 'mediaUuid')),
                    null,
                    2,
                  ),
                },
              ],
            }

          case 'mixpost_update_media': {
            const mediaArgs = this.ensureRecord(args, 'Invalid media update format')
            const { mediaUuid, ...mediaData } = mediaArgs
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.client.updateMedia(
                      this.validateUuid(mediaUuid, 'mediaUuid'),
                      mediaData,
                    ),
                    null,
                    2,
                  ),
                },
              ],
            }
          }

          case 'mixpost_delete_media':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.client.deleteMedia(this.validateUuid(args.mediaUuid, 'mediaUuid')),
                    null,
                    2,
                  ),
                },
              ],
            }

          // Tag tools
          case 'mixpost_list_tags':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await this.client.listTags(), null, 2),
                },
              ],
            }

          case 'mixpost_get_tag':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.client.getTag(this.validateUuid(args.tagUuid, 'tagUuid')),
                    null,
                    2,
                  ),
                },
              ],
            }

          case 'mixpost_create_tag':
            if (!args.name || typeof args.name !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'name is required and must be a string')
            }
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await this.client.createTag(args), null, 2),
                },
              ],
            }

          case 'mixpost_update_tag': {
            const tagArgs = this.ensureRecord(args, 'Invalid tag update format')
            const { tagUuid, ...tagData } = tagArgs
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.client.updateTag(this.validateUuid(tagUuid, 'tagUuid'), tagData),
                    null,
                    2,
                  ),
                },
              ],
            }
          }

          case 'mixpost_delete_tag':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.client.deleteTag(this.validateUuid(args.tagUuid, 'tagUuid')),
                    null,
                    2,
                  ),
                },
              ],
            }

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`)
        }
      } catch (error) {
        if (error && typeof error === 'object' && 'status' in error && 'message' in error) {
          const apiError = error as ApiError
          throw new McpError(
            ErrorCode.InternalError,
            `Mixpost API error (${apiError.status}): ${apiError.message}`,
            apiError.errors,
          )
        }
        throw error
      }
    })
  }

  private setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error)
    }

    process.on('SIGINT', async () => {
      await this.server.close()
      process.exit(0)
    })
  }

  async run() {
    const transport = new StdioServerTransport()
    await this.server.connect(transport)
    console.error('Mixpost MCP server running on stdio')
  }
}

// Export for testing
export { MixpostMCPServer }

// Only run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new MixpostMCPServer()
  server.run().catch((error) => {
    console.error('Failed to start server:', error)
    process.exit(1)
  })
}
