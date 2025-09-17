import { beforeEach, describe, expect, test } from 'bun:test'
import { MixpostClient } from '../../src/client'
import type { EnhancedApiError } from '../../src/error-handler'
import type { CreatePostRequest } from '../../src/types'
import { createApiResponse, createPaginatedResponse, fixtures } from '../utils'
import {
  type MockHttpClient,
  createMockHttpClient,
  mockError,
  mockResponse,
} from '../utils/mock-http-client'

const assertEnhancedError = (error: unknown): asserts error is EnhancedApiError => {
  if (
    !error ||
    typeof error !== 'object' ||
    typeof (error as { message?: unknown }).message !== 'string'
  ) {
    throw error
  }
  const candidate = error as { status?: unknown }
  if (typeof candidate.status !== 'number') {
    throw error
  }
}

describe('MixpostClient', () => {
  let client: MixpostClient
  let mockHttpClient: MockHttpClient

  beforeEach(() => {
    // Use the shared mock HTTP client creator
    mockHttpClient = createMockHttpClient()

    // Create client with mock HTTP client
    const config = {
      baseUrl: 'https://test.mixpost.com',
      workspaceUuid: 'test-workspace',
      apiKey: 'test-api-key',
      corePath: 'mixpost',
      httpClient: mockHttpClient,
      enableRetry: false, // Disable retry for simpler testing
    }

    client = new MixpostClient(config)
  })

  describe('Account Methods', () => {
    test('listAccounts should return paginated accounts', async () => {
      const mockAccounts = [fixtures.account]
      const expectedResponse = createPaginatedResponse(mockAccounts)

      mockHttpClient.get.mockResolvedValue(mockResponse(expectedResponse))

      const result = await client.listAccounts()

      expect(mockHttpClient.get).toHaveBeenCalledWith('/accounts')
      expect(result).toEqual(expectedResponse)
    })

    test('getAccount should return single account', async () => {
      const expectedResponse = createApiResponse(fixtures.account)

      mockHttpClient.get.mockResolvedValue(mockResponse(expectedResponse))

      const result = await client.getAccount('acc-123')

      expect(mockHttpClient.get).toHaveBeenCalledWith('/accounts/acc-123')
      expect(result).toEqual(expectedResponse)
    })
  })

  describe('Post Methods', () => {
    test('createPost should create a new post', async () => {
      const postRequest: CreatePostRequest = {
        date: '2024-12-01',
        time: '10:00',
        timezone: 'America/New_York',
        schedule: true,
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

      const expectedResponse = createApiResponse(fixtures.post)
      mockHttpClient.post.mockResolvedValue(mockResponse(expectedResponse))

      const result = await client.createPost(postRequest)

      expect(mockHttpClient.post).toHaveBeenCalledWith('/posts', postRequest)
      expect(result).toEqual(expectedResponse)
    })

    test('updatePost should update existing post', async () => {
      const updateRequest: CreatePostRequest = {
        date: '2024-12-02',
        time: '11:00',
        timezone: 'America/New_York',
        schedule: true,
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

      const expectedResponse = createApiResponse(fixtures.post)
      mockHttpClient.put.mockResolvedValue(mockResponse(expectedResponse))

      const result = await client.updatePost('post-123', updateRequest)

      expect(mockHttpClient.put).toHaveBeenCalledWith('/posts/post-123', updateRequest)
      expect(result).toEqual(expectedResponse)
    })

    test('deletePost should delete a post', async () => {
      const expectedResponse = createApiResponse({ message: 'Post deleted' })
      mockHttpClient.delete.mockResolvedValue(mockResponse(expectedResponse))

      const result = await client.deletePost('post-123')

      expect(mockHttpClient.delete).toHaveBeenCalledWith('/posts/post-123')
      expect(result).toEqual(expectedResponse)
    })

    test('approvePost should approve a post', async () => {
      const expectedResponse = createApiResponse(fixtures.post)
      mockHttpClient.post.mockResolvedValue(mockResponse(expectedResponse))

      const result = await client.approvePost('post-123')

      expect(mockHttpClient.post).toHaveBeenCalledWith('/posts/post-123/approve')
      expect(result).toEqual(expectedResponse)
    })

    test('schedulePost should schedule a post', async () => {
      const expectedResponse = createApiResponse(fixtures.post)
      mockHttpClient.post.mockResolvedValue(mockResponse(expectedResponse))

      const result = await client.schedulePost('post-123')

      expect(mockHttpClient.post).toHaveBeenCalledWith('/posts/post-123/schedule')
      expect(result).toEqual(expectedResponse)
    })

    test('addPostToQueue should add post to queue', async () => {
      const expectedResponse = createApiResponse(fixtures.post)
      mockHttpClient.post.mockResolvedValue(mockResponse(expectedResponse))

      const result = await client.addPostToQueue('post-123')

      expect(mockHttpClient.post).toHaveBeenCalledWith('/posts/post-123/queue')
      expect(result).toEqual(expectedResponse)
    })
  })

  describe('Media Methods', () => {
    test('listMedia should return paginated media', async () => {
      const mockMedia = [fixtures.media]
      const expectedResponse = createPaginatedResponse(mockMedia)

      mockHttpClient.get.mockResolvedValue(mockResponse(expectedResponse))

      const result = await client.listMedia()

      expect(mockHttpClient.get).toHaveBeenCalledWith('/media', { params: undefined })
      expect(result).toEqual(expectedResponse)
    })

    test('getMedia should return single media file', async () => {
      const expectedResponse = createApiResponse(fixtures.media)
      mockHttpClient.get.mockResolvedValue(mockResponse(expectedResponse))

      const result = await client.getMedia('media-123')

      expect(mockHttpClient.get).toHaveBeenCalledWith('/media/media-123')
      expect(result).toEqual(expectedResponse)
    })

    test('updateMedia should update media metadata', async () => {
      const updateData = { name: 'updated-image.jpg', alt_text: 'Updated alt text' }
      const expectedResponse = createApiResponse(fixtures.media)
      mockHttpClient.put.mockResolvedValue(mockResponse(expectedResponse))

      const result = await client.updateMedia('media-123', updateData)

      expect(mockHttpClient.put).toHaveBeenCalledWith('/media/media-123', updateData)
      expect(result).toEqual(expectedResponse)
    })

    test('deleteMedia should delete media file', async () => {
      const expectedResponse = createApiResponse({ message: 'Media deleted' })
      mockHttpClient.delete.mockResolvedValue(mockResponse(expectedResponse))

      const result = await client.deleteMedia('media-123')

      expect(mockHttpClient.delete).toHaveBeenCalledWith('/media/media-123')
      expect(result).toEqual(expectedResponse)
    })
  })

  describe('Tag Methods', () => {
    test('listTags should return all tags', async () => {
      const mockTags = [fixtures.tag]
      const expectedResponse = createApiResponse(mockTags)

      mockHttpClient.get.mockResolvedValue(mockResponse(expectedResponse))

      const result = await client.listTags()

      expect(mockHttpClient.get).toHaveBeenCalledWith('/tags')
      expect(result).toEqual(expectedResponse)
    })

    test('getTag should return single tag', async () => {
      const expectedResponse = createApiResponse(fixtures.tag)
      mockHttpClient.get.mockResolvedValue(mockResponse(expectedResponse))

      const result = await client.getTag('tag-123')

      expect(mockHttpClient.get).toHaveBeenCalledWith('/tags/tag-123')
      expect(result).toEqual(expectedResponse)
    })

    test('createTag should create new tag', async () => {
      const tagData = { name: 'New Tag', hex_color: '#00FF00' }
      const expectedResponse = createApiResponse(fixtures.tag)
      mockHttpClient.post.mockResolvedValue(mockResponse(expectedResponse))

      const result = await client.createTag(tagData)

      expect(mockHttpClient.post).toHaveBeenCalledWith('/tags', tagData)
      expect(result).toEqual(expectedResponse)
    })

    test('updateTag should update existing tag', async () => {
      const updateData = { name: 'Updated Tag', hex_color: '#0000FF' }
      const expectedResponse = createApiResponse(fixtures.tag)
      mockHttpClient.put.mockResolvedValue(mockResponse(expectedResponse))

      const result = await client.updateTag('tag-123', updateData)

      expect(mockHttpClient.put).toHaveBeenCalledWith('/tags/tag-123', updateData)
      expect(result).toEqual(expectedResponse)
    })

    test('deleteTag should delete tag', async () => {
      const expectedResponse = createApiResponse({ message: 'Tag deleted' })
      mockHttpClient.delete.mockResolvedValue(mockResponse(expectedResponse))

      const result = await client.deleteTag('tag-123')

      expect(mockHttpClient.delete).toHaveBeenCalledWith('/tags/tag-123')
      expect(result).toEqual(expectedResponse)
    })
  })

  describe('Error Handling', () => {
    test('should handle 401 unauthorized error', async () => {
      const error = mockError('Unauthorized', 401)
      mockHttpClient.get.mockRejectedValue(error)

      try {
        await client.listAccounts()
        expect(true).toBe(false) // Should not reach here
      } catch (err) {
        assertEnhancedError(err)
        expect(err.status).toBe(401)
        expect(err.message).toBe('Unauthorized')
      }
    })

    test('should handle 404 not found error', async () => {
      const error = mockError('Resource not found', 404)
      mockHttpClient.get.mockRejectedValue(error)

      try {
        await client.getPost('non-existent')
        expect(true).toBe(false) // Should not reach here
      } catch (err) {
        assertEnhancedError(err)
        expect(err.status).toBe(404)
        expect(err.message).toBe('Resource not found')
      }
    })

    test('should handle 422 validation error', async () => {
      const error = mockError('Validation failed', 422, {
        date: ['Date is required'],
        time: ['Time is invalid'],
      })
      mockHttpClient.post.mockRejectedValue(error)

      try {
        await client.createPost({} as CreatePostRequest)
        expect(true).toBe(false) // Should not reach here
      } catch (err) {
        assertEnhancedError(err)
        expect(err.status).toBe(422)
        expect(err.message).toBe('Validation failed')
        // Check if the error has the validation errors
        const errorWithErrors = err as EnhancedApiError & { errors?: Record<string, string[]> }
        expect(errorWithErrors.errors).toEqual({
          date: ['Date is required'],
          time: ['Time is invalid'],
        })
      }
    })

    test('should handle network errors', async () => {
      // Create a new mock client for this specific test
      const errorHttpClient = createMockHttpClient()
      // biome-ignore lint/suspicious/noExplicitAny: Mock needs flexible params for testing
      errorHttpClient.get.mockImplementation(async (_url: any, _config?: any) => {
        throw new Error('Network Error')
      })

      const errorClient = new MixpostClient({
        baseUrl: 'https://test.mixpost.com',
        workspaceUuid: 'test-workspace',
        apiKey: 'test-api-key',
        corePath: 'mixpost',
        enableRetry: false,
        httpClient: errorHttpClient,
      })

      try {
        await errorClient.listAccounts()
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeDefined()
        expect((error as Error).message).toBe('Network Error')
      }
    })
  })
})
