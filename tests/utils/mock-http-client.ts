import { type Mock, mock } from 'bun:test'
import type { HttpClient, HttpRequestConfig, HttpResponse } from '../../src/http-client'

export interface MockHttpClient extends HttpClient {
  // biome-ignore lint/suspicious/noExplicitAny: Mock functions need flexible types for testing
  get: Mock<(url: string, config?: HttpRequestConfig) => Promise<HttpResponse<any>>>
  // biome-ignore lint/suspicious/noExplicitAny: Mock functions need flexible types for testing
  post: Mock<(url: string, data?: any, config?: HttpRequestConfig) => Promise<HttpResponse<any>>>
  // biome-ignore lint/suspicious/noExplicitAny: Mock functions need flexible types for testing
  put: Mock<(url: string, data?: any, config?: HttpRequestConfig) => Promise<HttpResponse<any>>>
  // biome-ignore lint/suspicious/noExplicitAny: Mock functions need flexible types for testing
  delete: Mock<(url: string, config?: HttpRequestConfig) => Promise<HttpResponse<any>>>
}

export function createMockHttpClient(): MockHttpClient {
  // Create mocks that accept parameters to match how they're called in tests
  // This prevents conflicts when tests run in parallel

  // Create strongly-typed mocks that match the HttpClient interface exactly
  const mockGet = mock(async (_url: string, _config?: HttpRequestConfig) => ({
    data: {},
    status: 200,
    statusText: 'OK',
    headers: {},
  }))

  const mockPost = mock(async (_url: string, _data?: unknown, _config?: HttpRequestConfig) => ({
    data: {},
    status: 200,
    statusText: 'OK',
    headers: {},
  }))

  const mockPut = mock(async (_url: string, _data?: unknown, _config?: HttpRequestConfig) => ({
    data: {},
    status: 200,
    statusText: 'OK',
    headers: {},
  }))

  const mockDelete = mock(async (_url: string, _config?: HttpRequestConfig) => ({
    data: {},
    status: 200,
    statusText: 'OK',
    headers: {},
  }))

  return {
    // biome-ignore lint/suspicious/noExplicitAny: Type assertion needed for Mock compatibility
    get: mockGet as any,
    // biome-ignore lint/suspicious/noExplicitAny: Type assertion needed for Mock compatibility
    post: mockPost as any,
    // biome-ignore lint/suspicious/noExplicitAny: Type assertion needed for Mock compatibility
    put: mockPut as any,
    // biome-ignore lint/suspicious/noExplicitAny: Type assertion needed for Mock compatibility
    delete: mockDelete as any,
  }
}

export function mockResponse<T>(data: T, status = 200): HttpResponse<T> {
  return {
    data,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {},
  }
}

export function mockError(message: string, status = 500, errors?: Record<string, string[]>): Error {
  const error = new Error(message) as Error & {
    status?: number
    response?: { status: number; data: { message: string; errors?: Record<string, string[]> } }
    isAxiosError?: boolean
    config?: { url?: string; method?: string }
  }
  error.status = status
  error.response = {
    status,
    data: errors ? { message, errors } : { message },
  }
  error.isAxiosError = true
  error.config = { url: '/test', method: 'get' }
  return error
}
