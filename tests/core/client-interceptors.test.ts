import { type Mock, beforeEach, describe, expect, mock, test } from 'bun:test'
import { MixpostClient } from '../../src/client'
import type { ApiError } from '../../src/types'

type AsyncMock = Mock<(...args: unknown[]) => Promise<{ data: unknown }>>

type ResponseData = {
  message?: string
  errors?: Record<string, unknown>
}

type ResponseShape = {
  status: number
  data?: ResponseData
  config?: {
    url?: string
    method?: string
  }
}

type ResponseInterceptor = (response: ResponseShape) => unknown
type ErrorInterceptor = (error: unknown) => unknown

interface AxiosMockInstance {
  get: AsyncMock
  post: AsyncMock
  put: AsyncMock
  delete: AsyncMock
  interceptors: {
    response: {
      use: Mock<(onFulfilled: ResponseInterceptor, onRejected: ErrorInterceptor) => number>
    }
  }
}

const createAxiosInstance = (): AxiosMockInstance => {
  const createMethod = (): AsyncMock =>
    mock<(...args: unknown[]) => Promise<{ data: unknown }>>(async () => ({ data: undefined }))

  const instance: AxiosMockInstance = {
    get: createMethod(),
    post: createMethod(),
    put: createMethod(),
    delete: createMethod(),
    interceptors: {
      response: {
        use: mock<(onFulfilled: ResponseInterceptor, onRejected: ErrorInterceptor) => number>(
          (onFulfilled, onRejected) => {
            responseInterceptor = onFulfilled
            errorInterceptor = onRejected
            return 0
          },
        ),
      },
    },
  }

  return instance
}

let mockAxiosInstance: AxiosMockInstance
let responseInterceptor: ResponseInterceptor
let errorInterceptor: ErrorInterceptor

const _createResponse = (
  status: number,
  data: ResponseData = {},
  config: { url?: string; method?: string } = {},
): ResponseShape => ({
  status,
  data,
  config: {
    url: config.url ?? '/test',
    method: config.method ?? 'get',
  },
})

const createAxiosError = (
  status: number | undefined,
  message: string,
  {
    data,
    url = '/test',
    method = 'get',
    code,
  }: { data?: ResponseData; url?: string; method?: string; code?: string } = {},
) => {
  const error: Record<string, unknown> = {
    isAxiosError: true,
    message,
    config: { url, method },
  }

  if (code) {
    error.code = code
  }

  if (typeof status === 'number') {
    error.response = {
      status,
      data: {
        message,
        ...(data ?? {}),
      },
    }
  }

  return error
}

const assertApiErrorShape = (
  error: unknown,
): asserts error is ApiError & {
  errors?: Record<string, unknown>
} => {
  if (!error || typeof error !== 'object') {
    throw error
  }
  const { status, message } = error as { status?: unknown; message?: unknown }
  if (typeof status !== 'number' || typeof message !== 'string') {
    throw error
  }
}

mock.module('axios', () => ({
  default: {
    create: mock<() => AxiosMockInstance>(() => {
      mockAxiosInstance = createAxiosInstance()
      return mockAxiosInstance
    }),
  },
}))

describe('MixpostClient Interceptors', () => {
  let client: MixpostClient

  beforeEach(() => {
    const config = {
      baseUrl: 'https://api.mixpost.com',
      workspaceUuid: 'test-workspace',
      apiKey: 'test-api-key',
      corePath: 'mixpost',
    }

    client = new MixpostClient(config)

    if (!responseInterceptor || !errorInterceptor) {
      throw new Error('Response interceptors were not registered')
    }
  })

  describe('Response Interceptor', () => {
    test('should handle successful responses', () => {
      const response = {
        status: 200,
        data: { success: true },
        config: { url: '/test', method: 'get' },
      }

      const result = responseInterceptor(response)
      expect(result).toEqual(response)
    })

    test('should throw error for 400 Bad Request', () => {
      const response = {
        status: 400,
        data: { message: 'Bad Request' },
        config: { url: '/test', method: 'get' },
      }

      expect(() => {
        responseInterceptor(response)
      }).toThrow()

      try {
        responseInterceptor(response)
      } catch (error) {
        assertApiErrorShape(error)
        expect(error.status).toBe(400)
        expect(error.message).toBe('Bad Request')
      }
    })

    test('should throw error for 401 Unauthorized', () => {
      const response = {
        status: 401,
        data: { message: 'Unauthorized' },
        config: { url: '/test', method: 'get' },
      }

      expect(() => {
        responseInterceptor(response)
      }).toThrow()

      try {
        responseInterceptor(response)
      } catch (error) {
        assertApiErrorShape(error)
        expect(error.status).toBe(401)
        expect(error.message).toBe('Unauthorized')
      }
    })

    test('should throw error for 403 Forbidden', () => {
      const response = {
        status: 403,
        data: { message: 'Forbidden' },
        config: { url: '/test', method: 'get' },
      }

      expect(() => {
        responseInterceptor(response)
      }).toThrow()

      try {
        responseInterceptor(response)
      } catch (error) {
        assertApiErrorShape(error)
        expect(error.status).toBe(403)
        expect(error.message).toBe('Forbidden')
      }
    })

    test('should throw error for 404 Not Found', () => {
      const response = {
        status: 404,
        data: { message: 'Resource not found' },
        config: { url: '/test', method: 'get' },
      }

      expect(() => {
        responseInterceptor(response)
      }).toThrow()

      try {
        responseInterceptor(response)
      } catch (error) {
        assertApiErrorShape(error)
        expect(error.status).toBe(404)
        expect(error.message).toBe('Resource not found')
      }
    })

    test('should throw error for 422 Unprocessable Entity with validation errors', () => {
      const response = {
        status: 422,
        data: {
          message: 'Validation failed',
          errors: {
            date: ['Date is required'],
            time: ['Time format is invalid'],
          },
        },
        config: { url: '/test', method: 'get' },
      }

      expect(() => {
        responseInterceptor(response)
      }).toThrow()

      try {
        responseInterceptor(response)
      } catch (error) {
        assertApiErrorShape(error)
        expect(error.status).toBe(422)
        expect(error.message).toBe('Validation failed')
        expect(error.errors).toEqual({
          date: ['Date is required'],
          time: ['Time format is invalid'],
        })
      }
    })

    test('should throw error for 429 Too Many Requests', () => {
      const response = {
        status: 429,
        data: { message: 'Rate limit exceeded' },
        config: { url: '/test', method: 'get' },
      }

      expect(() => {
        responseInterceptor(response)
      }).toThrow()

      try {
        responseInterceptor(response)
      } catch (error) {
        assertApiErrorShape(error)
        expect(error.status).toBe(429)
        expect(error.message).toBe('Rate limit exceeded')
      }
    })

    test('should use default message for 4xx without message', () => {
      const response = {
        status: 400,
        data: {}, // No message
        config: { url: '/test', method: 'get' },
      }

      expect(() => {
        responseInterceptor(response)
      }).toThrow()

      try {
        responseInterceptor(response)
      } catch (error) {
        assertApiErrorShape(error)
        expect(error.status).toBe(400)
        expect(error.message).toBe('Request failed with status 400')
      }
    })
  })

  describe('Error Interceptor', () => {
    test('should handle timeout errors', () => {
      const error = createAxiosError(408, 'Request timeout - the server took too long to respond', {
        url: '/test',
        method: 'get',
        code: 'ECONNABORTED',
      })

      try {
        errorInterceptor(error)
      } catch (apiError) {
        assertApiErrorShape(apiError)
        expect(apiError.status).toBe(408)
        expect(apiError.message).toBe('Request timeout - the server took too long to respond')
      }
    })

    test('should handle network errors', () => {
      const error = createAxiosError(undefined, 'Network Error')

      try {
        errorInterceptor(error)
      } catch (apiError) {
        assertApiErrorShape(apiError)
        expect(apiError.status).toBe(500)
        expect(apiError.message).toBe('Network Error')
      }
    })

    test('should handle 500 Internal Server Error', () => {
      const error = createAxiosError(500, 'Internal Server Error')

      try {
        errorInterceptor(error)
      } catch (apiError) {
        assertApiErrorShape(apiError)
        expect(apiError.status).toBe(500)
        expect(apiError.message).toBe('Internal Server Error')
      }
    })

    test('should handle 502 Bad Gateway', () => {
      const error = createAxiosError(502, 'Bad Gateway')

      try {
        errorInterceptor(error)
      } catch (apiError) {
        assertApiErrorShape(apiError)
        expect(apiError.status).toBe(502)
        expect(apiError.message).toBe('Bad Gateway')
      }
    })

    test('should handle 503 Service Unavailable', () => {
      const error = createAxiosError(503, 'Service Unavailable')

      try {
        errorInterceptor(error)
      } catch (apiError) {
        assertApiErrorShape(apiError)
        expect(apiError.status).toBe(503)
        expect(apiError.message).toBe('Service Unavailable')
      }
    })

    test('should handle 504 Gateway Timeout', () => {
      const error = createAxiosError(504, 'Gateway Timeout')

      try {
        errorInterceptor(error)
      } catch (apiError) {
        assertApiErrorShape(apiError)
        expect(apiError.status).toBe(504)
        expect(apiError.message).toBe('Gateway Timeout')
      }
    })

    test('should handle errors with validation data', () => {
      const error = createAxiosError(422, 'The given data was invalid.', {
        data: {
          errors: {
            email: ['The email field is required.'],
            name: ['The name field must be at least 3 characters.'],
          },
        },
      })

      try {
        errorInterceptor(error)
      } catch (apiError) {
        assertApiErrorShape(apiError)
        expect(apiError.status).toBe(422)
        expect(apiError.message).toBe('The given data was invalid.')
        expect(apiError.errors).toEqual({
          email: ['The email field is required.'],
          name: ['The name field must be at least 3 characters.'],
        })
      }
    })

    test('should use error message when no response', () => {
      const error = createAxiosError(undefined, 'Connection refused')

      try {
        errorInterceptor(error)
      } catch (apiError) {
        assertApiErrorShape(apiError)
        expect(apiError.status).toBe(500)
        expect(apiError.message).toBe('Connection refused')
      }
    })

    test('should handle unexpected error format', () => {
      const error = {} // Empty error object

      try {
        errorInterceptor(error)
      } catch (apiError) {
        assertApiErrorShape(apiError)
        expect(apiError.status).toBe(500)
        expect(apiError.message).toBe('An unexpected error occurred')
      }
    })

    test('should preserve error details from response', () => {
      const error = createAxiosError(400, 'Custom error message', {
        data: {
          errors: {
            custom_field: ['Custom validation error'],
          },
          extra_data: 'Some additional info',
        },
      })

      try {
        errorInterceptor(error)
      } catch (apiError) {
        assertApiErrorShape(apiError)
        expect(apiError.status).toBe(400)
        expect(apiError.message).toBe('Custom error message')
        expect(apiError.errors).toEqual({
          custom_field: ['Custom validation error'],
        })
      }
    })
  })

  describe('Upload Media Coverage', () => {
    test('should handle FormData in uploadMedia', async () => {
      // Mock FormData (not available in Node/Bun test environment)
      const appendMock = mock<(name: string, value: unknown) => void>()
      class TestFormData {
        append = appendMock
      }
      global.FormData = TestFormData as unknown as typeof FormData

      const file = { name: 'test.jpg', type: 'image/jpeg' }
      const data = { alt_text: 'Test image' }

      mockAxiosInstance.post.mockResolvedValue({ data: { success: true } })

      const result = await client.uploadMedia(file, data)
      expect(result).toEqual({ success: true })
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/media',
        expect.any(FormData),
        expect.objectContaining({
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }),
      )
    })

    test('should handle uploadMedia without additional data', async () => {
      const appendMock = mock<(name: string, value: unknown) => void>()
      class TestFormData {
        append = appendMock
      }
      global.FormData = TestFormData as unknown as typeof FormData

      const file = { name: 'test.jpg', type: 'image/jpeg' }

      mockAxiosInstance.post.mockResolvedValue({ data: { success: true } })

      const result = await client.uploadMedia(file)
      expect(result).toEqual({ success: true })
      expect(mockAxiosInstance.post).toHaveBeenCalled()
    })
  })
})
