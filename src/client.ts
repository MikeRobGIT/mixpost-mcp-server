import axios from 'axios'
import { type CircuitBreakerConfig, ErrorHandler, type RetryConfig } from './error-handler.js'
import { AxiosHttpClientAdapter, type HttpClient, type HttpResponse } from './http-client.js'
import type {
  CreatePostRequest,
  MixpostAccount,
  MixpostConfig,
  MixpostMedia,
  MixpostPost,
  MixpostResponse,
  MixpostTag,
  PaginatedResponse,
  UpdatePostRequest,
} from './types.js'

export type QueryParams = Record<string, string | number | boolean | undefined>
type UpdatePayload = Record<string, unknown>
type UploadMetadata = Record<string, string | number | boolean | undefined>
type UploadableFile = Blob | File

export interface MixpostClientOptions extends MixpostConfig {
  retryConfig?: Partial<RetryConfig>
  circuitBreakerConfig?: CircuitBreakerConfig
  enableRetry?: boolean
  timeout?: number
  httpClient?: HttpClient
}

export class MixpostClient {
  private client: HttpClient
  private errorHandler: ErrorHandler
  private enableRetry: boolean
  private baseURL: string

  constructor(config: MixpostConfig | MixpostClientOptions) {
    const options = config as MixpostClientOptions
    this.enableRetry = options.enableRetry !== false // Default to true
    this.errorHandler = new ErrorHandler(options.retryConfig, options.circuitBreakerConfig)
    this.baseURL = `${config.baseUrl}/${config.corePath}/api/${config.workspaceUuid}`

    if (options.httpClient) {
      // Use provided HTTP client (for testing)
      this.client = options.httpClient
    } else {
      // Create default axios-based client
      const timeout = options.timeout || 30000
      const axiosInstance = axios.create({
        baseURL: this.baseURL,
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        timeout,
        validateStatus: (status) => status < 500, // Don't throw on 4xx errors
      })

      // Add response interceptor for error handling
      axiosInstance.interceptors.response.use(
        (response) => {
          // Handle 4xx errors
          if (response.status >= 400) {
            const error = this.errorHandler.enhanceError(
              {
                message: response.data?.message || `Request failed with status ${response.status}`,
                status: response.status,
                errors: response.data?.errors,
                response,
              },
              {
                endpoint: response.config.url,
                method: response.config.method,
              },
            )
            throw error
          }
          return response
        },
        (error) => {
          const enhancedError = this.errorHandler.enhanceError(error, {
            endpoint: error.config?.url,
            method: error.config?.method,
          })
          throw enhancedError
        },
      )

      this.client = new AxiosHttpClientAdapter(axiosInstance)
    }
  }

  private async executeRequest<T>(
    request: () => Promise<HttpResponse<T>>,
    context?: { endpoint?: string; method?: string },
  ): Promise<T> {
    if (this.enableRetry) {
      const response = await this.errorHandler.executeWithRetry(request, context)
      return response.data
    }
    try {
      const response = await request()
      return response.data
    } catch (error) {
      // Enhance error even when retry is disabled
      throw this.errorHandler.enhanceError(error, context)
    }
  }

  // Accounts
  async listAccounts(): Promise<MixpostAccount[]> {
    return this.executeRequest(() => this.client.get<MixpostAccount[]>('/accounts'), {
      endpoint: '/accounts',
      method: 'GET',
    })
  }

  async getAccount(accountUuid: string): Promise<MixpostAccount> {
    return this.executeRequest(() => this.client.get<MixpostAccount>(`/accounts/${accountUuid}`), {
      endpoint: `/accounts/${accountUuid}`,
      method: 'GET',
    })
  }

  // Posts
  async createPost(postData: CreatePostRequest): Promise<MixpostResponse> {
    return this.executeRequest(() => this.client.post<MixpostResponse>('/posts', postData), {
      endpoint: '/posts',
      method: 'POST',
    })
  }

  async updatePost(postUuid: string, postData: UpdatePostRequest): Promise<MixpostResponse> {
    return this.executeRequest(
      () => this.client.put<MixpostResponse>(`/posts/${postUuid}`, postData),
      { endpoint: `/posts/${postUuid}`, method: 'PUT' },
    )
  }

  async approvePost(postUuid: string): Promise<MixpostResponse> {
    return this.executeRequest(
      () => this.client.post<MixpostResponse>(`/posts/${postUuid}/approve`),
      { endpoint: `/posts/${postUuid}/approve`, method: 'POST' },
    )
  }

  async getPost(postUuid: string): Promise<MixpostPost> {
    return this.executeRequest(() => this.client.get<MixpostPost>(`/posts/${postUuid}`), {
      endpoint: `/posts/${postUuid}`,
      method: 'GET',
    })
  }

  async listPosts(params?: QueryParams): Promise<PaginatedResponse<MixpostPost>> {
    return this.executeRequest(
      () => this.client.get<PaginatedResponse<MixpostPost>>('/posts', { params }),
      { endpoint: '/posts', method: 'GET' },
    )
  }

  async deletePost(postUuid: string): Promise<MixpostResponse> {
    return this.executeRequest(() => this.client.delete<MixpostResponse>(`/posts/${postUuid}`), {
      endpoint: `/posts/${postUuid}`,
      method: 'DELETE',
    })
  }

  async deleteMultiplePosts(postUuids: string[]): Promise<MixpostResponse> {
    return this.executeRequest(
      () =>
        this.client.post<MixpostResponse>('/posts/delete-multiple', {
          uuids: postUuids,
        }),
      { endpoint: '/posts/delete-multiple', method: 'POST' },
    )
  }

  async schedulePost(postUuid: string): Promise<MixpostResponse> {
    return this.executeRequest(
      () => this.client.post<MixpostResponse>(`/posts/${postUuid}/schedule`),
      { endpoint: `/posts/${postUuid}/schedule`, method: 'POST' },
    )
  }

  async addPostToQueue(postUuid: string): Promise<MixpostResponse> {
    return this.executeRequest(
      () => this.client.post<MixpostResponse>(`/posts/${postUuid}/queue`),
      { endpoint: `/posts/${postUuid}/queue`, method: 'POST' },
    )
  }

  // Media
  async listMedia(params?: QueryParams): Promise<PaginatedResponse<MixpostMedia>> {
    return this.executeRequest(
      () => this.client.get<PaginatedResponse<MixpostMedia>>('/media', { params }),
      { endpoint: '/media', method: 'GET' },
    )
  }

  async getMedia(mediaUuid: string): Promise<MixpostMedia> {
    return this.executeRequest(() => this.client.get<MixpostMedia>(`/media/${mediaUuid}`), {
      endpoint: `/media/${mediaUuid}`,
      method: 'GET',
    })
  }

  async updateMedia(mediaUuid: string, data: UpdatePayload): Promise<MixpostResponse> {
    return this.executeRequest(
      () => this.client.put<MixpostResponse>(`/media/${mediaUuid}`, data),
      { endpoint: `/media/${mediaUuid}`, method: 'PUT' },
    )
  }

  async uploadMedia(file: UploadableFile, data?: UploadMetadata): Promise<MixpostResponse> {
    const formData = new FormData()
    formData.append('file', file)

    if (data) {
      for (const [key, value] of Object.entries(data)) {
        formData.append(key, String(value))
      }
    }

    return this.executeRequest(
      () =>
        this.client.post<MixpostResponse>('/media', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }),
      { endpoint: '/media', method: 'POST' },
    )
  }

  async deleteMedia(mediaUuid: string): Promise<MixpostResponse> {
    return this.executeRequest(() => this.client.delete<MixpostResponse>(`/media/${mediaUuid}`), {
      endpoint: `/media/${mediaUuid}`,
      method: 'DELETE',
    })
  }

  // Tags
  async listTags(): Promise<MixpostTag[]> {
    return this.executeRequest(() => this.client.get<MixpostTag[]>('/tags'), {
      endpoint: '/tags',
      method: 'GET',
    })
  }

  async getTag(tagUuid: string): Promise<MixpostTag> {
    return this.executeRequest(() => this.client.get<MixpostTag>(`/tags/${tagUuid}`), {
      endpoint: `/tags/${tagUuid}`,
      method: 'GET',
    })
  }

  async createTag(data: UpdatePayload): Promise<MixpostResponse> {
    return this.executeRequest(() => this.client.post<MixpostResponse>('/tags', data), {
      endpoint: '/tags',
      method: 'POST',
    })
  }

  async updateTag(tagUuid: string, data: UpdatePayload): Promise<MixpostResponse> {
    return this.executeRequest(() => this.client.put<MixpostResponse>(`/tags/${tagUuid}`, data), {
      endpoint: `/tags/${tagUuid}`,
      method: 'PUT',
    })
  }

  async deleteTag(tagUuid: string): Promise<MixpostResponse> {
    return this.executeRequest(() => this.client.delete<MixpostResponse>(`/tags/${tagUuid}`), {
      endpoint: `/tags/${tagUuid}`,
      method: 'DELETE',
    })
  }
}
