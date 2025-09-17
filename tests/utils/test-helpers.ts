import { type Mock, mock } from 'bun:test'
import { MixpostClient } from '../../src/client'
import type { HttpClient, HttpResponse } from '../../src/http-client'
import type { MixpostConfig } from '../../src/types'

// Create a completely isolated mock HTTP client for each test
export function createIsolatedMockClient() {
  const mockGet = mock(
    // biome-ignore lint/suspicious/noExplicitAny: Mock functions need flexible types for testing
    async <T = any>(_url: string, _config?: any): Promise<HttpResponse<T>> => ({
      data: {} as T,
      status: 200,
      statusText: 'OK',
      headers: {},
    }),
  )
  const mockPost = mock(
    // biome-ignore lint/suspicious/noExplicitAny: Mock functions need flexible types for testing
    async <T = any>(_url: string, _data?: any, _config?: any): Promise<HttpResponse<T>> => ({
      data: {} as T,
      status: 200,
      statusText: 'OK',
      headers: {},
    }),
  )
  const mockPut = mock(
    // biome-ignore lint/suspicious/noExplicitAny: Mock functions need flexible types for testing
    async <T = any>(_url: string, _data?: any, _config?: any): Promise<HttpResponse<T>> => ({
      data: {} as T,
      status: 200,
      statusText: 'OK',
      headers: {},
    }),
  )
  const mockDelete = mock(
    // biome-ignore lint/suspicious/noExplicitAny: Mock functions need flexible types for testing
    async <T = any>(_url: string, _config?: any): Promise<HttpResponse<T>> => ({
      data: {} as T,
      status: 200,
      statusText: 'OK',
      headers: {},
    }),
  )

  const httpClient: HttpClient & {
    // biome-ignore lint/suspicious/noExplicitAny: Mock functions need flexible types for testing
    get: Mock<(url: string, config?: any) => Promise<HttpResponse>>
    // biome-ignore lint/suspicious/noExplicitAny: Mock functions need flexible types for testing
    post: Mock<(url: string, data?: any, config?: any) => Promise<HttpResponse>>
    // biome-ignore lint/suspicious/noExplicitAny: Mock functions need flexible types for testing
    put: Mock<(url: string, data?: any, config?: any) => Promise<HttpResponse>>
    // biome-ignore lint/suspicious/noExplicitAny: Mock functions need flexible types for testing
    delete: Mock<(url: string, config?: any) => Promise<HttpResponse>>
  } = {
    // biome-ignore lint/suspicious/noExplicitAny: Type casting needed for mock compatibility
    get: mockGet as any,
    // biome-ignore lint/suspicious/noExplicitAny: Type casting needed for mock compatibility
    post: mockPost as any,
    // biome-ignore lint/suspicious/noExplicitAny: Type casting needed for mock compatibility
    put: mockPut as any,
    // biome-ignore lint/suspicious/noExplicitAny: Type casting needed for mock compatibility
    delete: mockDelete as any,
  }

  return httpClient
}

// Create an isolated MixpostClient with mock HTTP client
export function createTestClient(config?: Partial<MixpostConfig>) {
  const httpClient = createIsolatedMockClient()

  const client = new MixpostClient({
    baseUrl: config?.baseUrl || 'https://test.mixpost.com',
    workspaceUuid: config?.workspaceUuid || 'test-workspace',
    apiKey: config?.apiKey || 'test-api-key',
    corePath: config?.corePath || 'mixpost',
    httpClient,
    enableRetry: false, // Disable retry for simpler testing
  })

  return { client, httpClient }
}
