// MCP server test types
import type { Mock } from 'bun:test'
import type { MixpostClient } from '../src/client'
import type { MixpostMCPServer } from '../src/index'

export interface MockMixpostClient extends Partial<MixpostClient> {
  listAccounts: Mock<(...args: unknown[]) => Promise<unknown>>
  getAccount: Mock<(...args: unknown[]) => Promise<unknown>>
  createPost: Mock<(...args: unknown[]) => Promise<unknown>>
  updatePost: Mock<(...args: unknown[]) => Promise<unknown>>
  deletePost: Mock<(...args: unknown[]) => Promise<unknown>>
  approvePost: Mock<(...args: unknown[]) => Promise<unknown>>
  getPost: Mock<(...args: unknown[]) => Promise<unknown>>
  listPosts: Mock<(...args: unknown[]) => Promise<unknown>>
  schedulePost: Mock<(...args: unknown[]) => Promise<unknown>>
  addPostToQueue: Mock<(...args: unknown[]) => Promise<unknown>>
  deleteMultiplePosts: Mock<(...args: unknown[]) => Promise<unknown>>
  listMedia: Mock<(...args: unknown[]) => Promise<unknown>>
  getMedia: Mock<(...args: unknown[]) => Promise<unknown>>
  updateMedia: Mock<(...args: unknown[]) => Promise<unknown>>
  deleteMedia: Mock<(...args: unknown[]) => Promise<unknown>>
  listTags: Mock<(...args: unknown[]) => Promise<unknown>>
  getTag: Mock<(...args: unknown[]) => Promise<unknown>>
  createTag: Mock<(...args: unknown[]) => Promise<unknown>>
  updateTag: Mock<(...args: unknown[]) => Promise<unknown>>
  deleteTag: Mock<(...args: unknown[]) => Promise<unknown>>
}

export interface ServerWithPrivateMethods extends MixpostMCPServer {
  client: MixpostClient
  initializeClient(): void
  getConfig(): { baseUrl: string; workspaceUuid: string; apiKey: string; corePath?: string }
  validateUuid(uuid: string, paramName: string): string
  validateCreatePostRequest(data: unknown): unknown
}
