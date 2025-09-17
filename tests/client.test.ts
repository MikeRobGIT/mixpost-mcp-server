import { beforeEach, describe, expect, it } from 'bun:test'
import { MixpostClient } from '../src/client'
import type {
  CreatePostRequest,
  MixpostAccount,
  MixpostMedia,
  MixpostPost,
  MixpostTag,
  PaginatedResponse,
  UpdatePostRequest,
} from '../src/types'
import { type MockHttpClient, createMockHttpClient, mockResponse } from './utils/mock-http-client'

describe('MixpostClient', () => {
  let client: MixpostClient
  let mockHttpClient: MockHttpClient

  const mockConfig = {
    baseUrl: 'https://api.mixpost.test',
    workspaceUuid: 'test-workspace-uuid',
    apiKey: 'test-api-key',
    corePath: 'mixpost',
  }

  beforeEach(() => {
    // Create a mock HTTP client
    mockHttpClient = createMockHttpClient()

    // Create client with mock HTTP client
    client = new MixpostClient({
      ...mockConfig,
      httpClient: mockHttpClient,
      enableRetry: false, // Disable retry for simpler testing
    })
  })

  describe('Constructor and Configuration', () => {
    it('should create client with correct configuration', () => {
      expect(client).toBeDefined()
      expect(client).toBeInstanceOf(MixpostClient)
    })

    it('should use custom timeout when provided', () => {
      const customConfig = {
        ...mockConfig,
        timeout: 60000,
        httpClient: createMockHttpClient(),
      }
      const customClient = new MixpostClient(customConfig)
      expect(customClient).toBeDefined()
    })
  })

  describe('Accounts', () => {
    it('should list accounts', async () => {
      const mockAccounts: MixpostAccount[] = [
        {
          uuid: 'acc-1',
          name: 'Test Account 1',
          network: 'twitter',
          active: true,
        },
        {
          uuid: 'acc-2',
          name: 'Test Account 2',
          network: 'facebook',
          active: true,
        },
      ]

      mockHttpClient.get.mockResolvedValue(mockResponse(mockAccounts))
      const result = await client.listAccounts()

      expect(mockHttpClient.get).toHaveBeenCalledWith('/accounts')
      expect(result).toEqual(mockAccounts)
    })

    it('should get single account', async () => {
      const mockAccount: MixpostAccount = {
        uuid: 'acc-1',
        name: 'Test Account',
        network: 'twitter',
        active: true,
      }

      mockHttpClient.get.mockResolvedValue(mockResponse(mockAccount))
      const result = await client.getAccount('acc-1')

      expect(mockHttpClient.get).toHaveBeenCalledWith('/accounts/acc-1')
      expect(result).toEqual(mockAccount)
    })
  })

  describe('Posts', () => {
    it('should create post', async () => {
      const createRequest: CreatePostRequest = {
        date: '2024-03-15',
        time: '14:30',
        timezone: 'UTC',
        accounts: ['acc-1'],
        versions: [
          {
            account_id: 'acc-1',
            is_original: true,
            content: {
              body: 'Test post content',
            },
          },
        ],
      }

      const mockPost: MixpostPost = {
        uuid: 'post-1',
        status: 'scheduled',
        ...createRequest,
      }

      mockHttpClient.post.mockResolvedValue(mockResponse(mockPost))
      const result = await client.createPost(createRequest)

      expect(mockHttpClient.post).toHaveBeenCalledWith('/posts', createRequest)
      expect(result).toEqual(mockPost)
    })

    it('should update post', async () => {
      const updateRequest: UpdatePostRequest = {
        date: '2024-03-16',
        time: '15:00',
        timezone: 'UTC',
        accounts: ['acc-1'],
        versions: [
          {
            account_id: 'acc-1',
            is_original: true,
            content: {
              body: 'Updated content',
            },
          },
        ],
      }

      const mockPost: MixpostPost = {
        uuid: 'post-1',
        status: 'scheduled',
        ...updateRequest,
      }

      mockHttpClient.put.mockResolvedValue(mockResponse(mockPost))
      const result = await client.updatePost('post-1', updateRequest)

      expect(mockHttpClient.put).toHaveBeenCalledWith('/posts/post-1', updateRequest)
      expect(result).toEqual(mockPost)
    })

    it('should approve post', async () => {
      const mockPost: MixpostPost = {
        uuid: 'post-1',
        status: 'approved',
        date: '2024-03-15',
        time: '14:30',
        timezone: 'UTC',
      }

      mockHttpClient.post.mockResolvedValue(mockResponse(mockPost))
      const result = await client.approvePost('post-1')

      expect(mockHttpClient.post).toHaveBeenCalledWith('/posts/post-1/approve')
      expect(result).toEqual(mockPost)
    })

    it('should get single post', async () => {
      const mockPost: MixpostPost = {
        uuid: 'post-1',
        status: 'scheduled',
        date: '2024-03-15',
        time: '14:30',
        timezone: 'UTC',
      }

      mockHttpClient.get.mockResolvedValue(mockResponse(mockPost))
      const result = await client.getPost('post-1')

      expect(mockHttpClient.get).toHaveBeenCalledWith('/posts/post-1')
      expect(result).toEqual(mockPost)
    })

    it('should list posts with pagination', async () => {
      const paginatedResponse: PaginatedResponse<MixpostPost> = {
        data: [
          {
            uuid: 'post-1',
            status: 'scheduled',
            date: '2024-03-15',
            time: '14:30',
            timezone: 'UTC',
          },
        ],
        links: {
          first: '/posts?page=1',
          last: '/posts?page=5',
          prev: null,
          next: '/posts?page=2',
        },
        meta: {
          current_page: 1,
          from: 1,
          last_page: 5,
          per_page: 10,
          to: 10,
          total: 50,
          links: [],
          path: '/posts',
        },
      }

      mockHttpClient.get.mockResolvedValue(mockResponse(paginatedResponse))
      const result = await client.listPosts({ page: 1, limit: 10 })

      expect(mockHttpClient.get).toHaveBeenCalledWith('/posts', {
        params: { page: 1, limit: 10 },
      })
      expect(result).toEqual(paginatedResponse)
    })

    it('should delete post', async () => {
      mockHttpClient.delete.mockResolvedValue(mockResponse({ success: true }))
      const result = await client.deletePost('post-1')

      expect(mockHttpClient.delete).toHaveBeenCalledWith('/posts/post-1')
      expect(result).toEqual({ success: true })
    })

    it('should delete multiple posts', async () => {
      mockHttpClient.post.mockResolvedValue(mockResponse({ success: true }))
      const result = await client.deleteMultiplePosts(['post-1', 'post-2'])

      expect(mockHttpClient.post).toHaveBeenCalledWith('/posts/delete-multiple', {
        uuids: ['post-1', 'post-2'],
      })
      expect(result).toEqual({ success: true })
    })

    it('should schedule post', async () => {
      mockHttpClient.post.mockResolvedValue(mockResponse({ success: true }))
      const result = await client.schedulePost('post-1')

      expect(mockHttpClient.post).toHaveBeenCalledWith('/posts/post-1/schedule')
      expect(result).toEqual({ success: true })
    })

    it('should add post to queue', async () => {
      mockHttpClient.post.mockResolvedValue(mockResponse({ success: true }))
      const result = await client.addPostToQueue('post-1')

      expect(mockHttpClient.post).toHaveBeenCalledWith('/posts/post-1/queue')
      expect(result).toEqual({ success: true })
    })
  })

  describe('Media', () => {
    it('should list media with pagination', async () => {
      const paginatedResponse: PaginatedResponse<MixpostMedia> = {
        data: [
          {
            uuid: 'media-1',
            name: 'test.jpg',
            type: 'image',
            url: 'https://example.com/test.jpg',
          },
        ],
        links: {
          first: '/media?page=1',
          last: '/media?page=5',
          prev: null,
          next: '/media?page=2',
        },
        meta: {
          current_page: 1,
          from: 1,
          last_page: 5,
          per_page: 10,
          to: 10,
          total: 50,
          links: [],
          path: '/media',
        },
      }

      mockHttpClient.get.mockResolvedValue(mockResponse(paginatedResponse))
      const result = await client.listMedia({ page: 1 })

      expect(mockHttpClient.get).toHaveBeenCalledWith('/media', { params: { page: 1 } })
      expect(result).toEqual(paginatedResponse)
    })

    it('should get single media', async () => {
      const mockMedia: MixpostMedia = {
        uuid: 'media-1',
        name: 'test.jpg',
        type: 'image',
        url: 'https://example.com/test.jpg',
      }

      mockHttpClient.get.mockResolvedValue(mockResponse(mockMedia))
      const result = await client.getMedia('media-1')

      expect(mockHttpClient.get).toHaveBeenCalledWith('/media/media-1')
      expect(result).toEqual(mockMedia)
    })

    it('should update media', async () => {
      mockHttpClient.put.mockResolvedValue(mockResponse({ success: true }))
      const result = await client.updateMedia('media-1', { name: 'updated.jpg' })

      expect(mockHttpClient.put).toHaveBeenCalledWith('/media/media-1', {
        name: 'updated.jpg',
      })
      expect(result).toEqual({ success: true })
    })

    it('should delete media', async () => {
      mockHttpClient.delete.mockResolvedValue(mockResponse({ success: true }))
      const result = await client.deleteMedia('media-1')

      expect(mockHttpClient.delete).toHaveBeenCalledWith('/media/media-1')
      expect(result).toEqual({ success: true })
    })
  })

  describe('Tags', () => {
    it('should list tags', async () => {
      const mockTags: MixpostTag[] = [
        {
          uuid: 'tag-1',
          name: 'Marketing',
          hex_color: '#FF0000',
        },
        {
          uuid: 'tag-2',
          name: 'Sales',
          hex_color: '#00FF00',
        },
      ]

      mockHttpClient.get.mockResolvedValue(mockResponse(mockTags))
      const result = await client.listTags()

      expect(mockHttpClient.get).toHaveBeenCalledWith('/tags')
      expect(result).toEqual(mockTags)
    })

    it('should get single tag', async () => {
      const mockTag: MixpostTag = {
        uuid: 'tag-1',
        name: 'Marketing',
        hex_color: '#FF0000',
      }

      mockHttpClient.get.mockResolvedValue(mockResponse(mockTag))
      const result = await client.getTag('tag-1')

      expect(mockHttpClient.get).toHaveBeenCalledWith('/tags/tag-1')
      expect(result).toEqual(mockTag)
    })

    it('should create tag', async () => {
      const newTag = { name: 'New Tag', hex_color: '#0000FF' }
      mockHttpClient.post.mockResolvedValue(mockResponse({ ...newTag, uuid: 'tag-new' }))
      const result = await client.createTag(newTag)

      expect(mockHttpClient.post).toHaveBeenCalledWith('/tags', newTag)
      expect(result).toEqual({ ...newTag, uuid: 'tag-new' })
    })

    it('should update tag', async () => {
      const updateData = { name: 'Updated Tag' }
      mockHttpClient.put.mockResolvedValue(mockResponse({ success: true }))
      const result = await client.updateTag('tag-1', updateData)

      expect(mockHttpClient.put).toHaveBeenCalledWith('/tags/tag-1', updateData)
      expect(result).toEqual({ success: true })
    })

    it('should delete tag', async () => {
      mockHttpClient.delete.mockResolvedValue(mockResponse({ success: true }))
      const result = await client.deleteTag('tag-1')

      expect(mockHttpClient.delete).toHaveBeenCalledWith('/tags/tag-1')
      expect(result).toEqual({ success: true })
    })
  })
})
