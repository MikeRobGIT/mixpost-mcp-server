import { mock } from 'bun:test'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import type { MixpostResponse, PaginatedResponse } from '../src/types'

// Test fixtures
export const fixtures = {
  account: {
    id: 'acc-1',
    uuid: 'acc-123',
    name: 'Test Account',
    username: 'testuser',
    provider: 'twitter',
    authorized: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  post: {
    id: 'post-1',
    uuid: 'post-123',
    status: 'published',
    scheduled_at: '2024-12-01T10:00:00Z',
    published_at: null,
    content: {
      body: 'Test post content',
      media: [],
      urls: [],
    },
  },
  media: {
    id: 'media-1',
    uuid: 'media-123',
    name: 'test-image.jpg',
    type: 'image',
    url: 'https://example.com/test-image.jpg',
    created_at: '2024-01-01T00:00:00Z',
  },
  tag: {
    id: 'tag-1',
    uuid: 'tag-123',
    name: 'Test Tag',
    hex_color: '#FF0000',
  },
}

// Mock axios client factory
export function createMockAxiosClient(): AxiosInstance {
  const mockClient = {
    get: mock(() => Promise.resolve({ data: {} })),
    post: mock(() => Promise.resolve({ data: {} })),
    put: mock(() => Promise.resolve({ data: {} })),
    delete: mock(() => Promise.resolve({ data: {} })),
    patch: mock(() => Promise.resolve({ data: {} })),
    request: mock(() => Promise.resolve({ data: {} })),
    defaults: {
      headers: {
        common: {},
        'Content-Type': 'application/json',
      },
    },
    interceptors: {
      request: {
        use: mock(() => 0),
        eject: mock(() => {}),
      },
      response: {
        use: mock(() => 0),
        eject: mock(() => {}),
      },
    },
  } as unknown as AxiosInstance

  return mockClient
}

// Helper to create paginated response
export function createPaginatedResponse<T>(data: T[], total = 0): PaginatedResponse<T> {
  return {
    data,
    meta: {
      current_page: 1,
      last_page: Math.ceil(total / 10) || 1,
      per_page: 10,
      total: total || data.length,
      from: 1,
      to: data.length,
    },
    links: {
      first: 'first',
      last: 'last',
      prev: undefined,
      next: undefined,
    },
  }
}

// Helper to create API response
export function createApiResponse<T>(data: T, success = true): MixpostResponse<T> {
  return {
    success,
    data,
  }
}

// Helper to create axios response
export function createAxiosResponse<T>(data: T, status = 200): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: {} as AxiosRequestConfig,
  }
}

// Helper to wait for async operations
export function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Helper to validate UUID format
export function isValidUuid(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// Helper to generate random UUID
export function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
