import { beforeEach, describe, expect, mock, test } from 'bun:test'
import type { AxiosError } from 'axios'
import { ERROR_CODES, type EnhancedApiError, ErrorHandler } from '../../src/error-handler'

const createAxiosError = (
  status: number,
  message: string,
  {
    data,
    url = '/api/posts',
    method = 'post',
  }: { data?: Record<string, unknown>; url?: string; method?: string } = {},
): AxiosError => {
  return {
    isAxiosError: true,
    message,
    config: {
      url,
      method,
    },
    response: {
      status,
      data: {
        message,
        ...(data ?? {}),
      },
    },
  } as AxiosError
}

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler

  beforeEach(() => {
    errorHandler = new ErrorHandler()
  })

  describe('Error Enhancement', () => {
    test('should enhance 400 Bad Request error', () => {
      const axiosError = createAxiosError(400, 'Bad request', {
        data: { errors: { field: ['Invalid value'] } },
      })

      const enhanced = errorHandler.enhanceError(axiosError)

      expect(enhanced.status).toBe(400)
      expect(enhanced.code).toBe(ERROR_CODES.BAD_REQUEST)
      expect(enhanced.message).toBe('Bad request')
      expect(enhanced.retryable).toBe(false)
      expect(enhanced.errors).toEqual({ field: ['Invalid value'] })
      expect(enhanced.context?.endpoint).toBe('/api/posts')
      expect(enhanced.context?.method).toBe('POST')
    })

    test('should enhance 401 Unauthorized error', () => {
      const axiosError = createAxiosError(401, 'Unauthorized')

      const enhanced = errorHandler.enhanceError(axiosError)

      expect(enhanced.status).toBe(401)
      expect(enhanced.code).toBe(ERROR_CODES.UNAUTHORIZED)
      expect(enhanced.suggestion).toContain('Check your API key')
      expect(enhanced.retryable).toBe(false)
    })

    test('should enhance 429 Too Many Requests error', () => {
      const axiosError = createAxiosError(429, 'Rate limit exceeded')

      const enhanced = errorHandler.enhanceError(axiosError)

      expect(enhanced.status).toBe(429)
      expect(enhanced.code).toBe(ERROR_CODES.TOO_MANY_REQUESTS)
      expect(enhanced.retryable).toBe(true)
      expect(enhanced.suggestion).toContain('Rate limit exceeded')
    })

    test('should enhance 500 Internal Server Error', () => {
      const axiosError = createAxiosError(500, 'Internal server error')

      const enhanced = errorHandler.enhanceError(axiosError)

      expect(enhanced.status).toBe(500)
      expect(enhanced.code).toBe(ERROR_CODES.INTERNAL_SERVER_ERROR)
      expect(enhanced.retryable).toBe(true)
    })

    test('should enhance timeout error', () => {
      const error = {
        code: 'ECONNABORTED',
        message: 'Request timeout',
      }

      const enhanced = errorHandler.enhanceError(error)

      expect(enhanced.code).toBe(ERROR_CODES.TIMEOUT)
      expect(enhanced.retryable).toBe(true)
      expect(enhanced.suggestion).toContain('Request timed out')
    })

    test('should enhance network error', () => {
      const error = {
        message: 'Network Error',
      }

      const enhanced = errorHandler.enhanceError(error)

      expect(enhanced.code).toBe(ERROR_CODES.NETWORK_ERROR)
      expect(enhanced.retryable).toBe(true)
      expect(enhanced.suggestion).toContain('Network connection failed')
    })

    test('should add retry count to context', () => {
      const error = { status: 500 }
      const context = { endpoint: '/api/test', method: 'GET' }
      const retryCount = 2

      const enhanced = errorHandler.enhanceError(error, context, retryCount)

      expect(enhanced.context?.retryCount).toBe(2)
      expect(enhanced.context?.endpoint).toBe('/api/test')
      expect(enhanced.context?.method).toBe('GET')
    })
  })

  describe('Retry Logic', () => {
    test('should retry on 500 errors', async () => {
      let attempts = 0
      const fn = mock(() => {
        attempts++
        if (attempts < 3) {
          throw { status: 500, message: 'Server error' }
        }
        return Promise.resolve({ data: 'success' })
      })

      const result = await errorHandler.executeWithRetry(fn)

      expect(result.data).toBe('success')
      expect(attempts).toBe(3)
    })

    test('should not retry on 400 errors', async () => {
      let attempts = 0
      const fn = mock(() => {
        attempts++
        throw { status: 400, message: 'Bad request' }
      })

      try {
        await errorHandler.executeWithRetry(fn)
        expect(false).toBe(true) // Should not reach here
      } catch (error) {
        expect(attempts).toBe(1)
        expect((error as EnhancedApiError).status).toBe(400)
      }
    })

    test('should retry on network errors', async () => {
      let attempts = 0
      const fn = mock(() => {
        attempts++
        if (attempts < 2) {
          throw { message: 'Network Error' }
        }
        return Promise.resolve({ data: 'success' })
      })

      const result = await errorHandler.executeWithRetry(fn)

      expect(result.data).toBe('success')
      expect(attempts).toBe(2)
    })

    test('should respect max retries', async () => {
      const errorHandler = new ErrorHandler({ maxRetries: 2 })
      let attempts = 0
      const fn = mock(() => {
        attempts++
        throw { status: 500, message: 'Server error' }
      })

      try {
        await errorHandler.executeWithRetry(fn)
        expect(false).toBe(true) // Should not reach here
      } catch (error) {
        expect(attempts).toBe(3) // Initial + 2 retries
        expect((error as EnhancedApiError).status).toBe(500)
      }
    })

    test('should apply exponential backoff', async () => {
      const errorHandler = new ErrorHandler({ baseDelay: 100, maxDelay: 1000 })
      const startTime = Date.now()
      let attempts = 0

      const fn = mock(() => {
        attempts++
        if (attempts < 3) {
          throw { status: 503, message: 'Service unavailable' }
        }
        return Promise.resolve({ data: 'success' })
      })

      await errorHandler.executeWithRetry(fn)
      const totalTime = Date.now() - startTime

      // With exponential backoff and jitter, should take at least 150ms
      // (100ms * 0.5 for first retry + 200ms * 0.5 for second retry minimum)
      expect(totalTime).toBeGreaterThan(100)
      expect(attempts).toBe(3)
    })

    test('should use custom shouldRetry function', async () => {
      const errorHandler = new ErrorHandler({
        shouldRetry: (error) => error.status === 503,
      })

      let attempts = 0
      const fn = mock(() => {
        attempts++
        throw { status: 500, message: 'Server error' }
      })

      try {
        await errorHandler.executeWithRetry(fn)
        expect(false).toBe(true)
      } catch (error) {
        expect(attempts).toBe(1) // No retry for 500
        expect((error as EnhancedApiError).status).toBe(500)
      }
    })
  })

  describe('Circuit Breaker', () => {
    test('should open circuit after failure threshold', async () => {
      const errorHandler = new ErrorHandler(
        { maxRetries: 0, baseDelay: 10 }, // No retries and short delay for test
        {
          failureThreshold: 3,
          resetTimeout: 100,
          monitoringPeriod: 1000,
        },
      )

      const fn = mock(() => {
        throw { status: 500, message: 'Server error' }
      })

      // Cause 3 failures to open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await errorHandler.executeWithRetry(fn)
        } catch (_error) {
          // Expected
        }
      }

      // Circuit should be open now
      try {
        await errorHandler.executeWithRetry(fn)
        expect(false).toBe(true)
      } catch (error) {
        expect((error as EnhancedApiError).code).toBe(ERROR_CODES.CIRCUIT_OPEN)
        expect((error as EnhancedApiError).status).toBe(503)
        expect(error.message).toContain('Circuit breaker is open')
      }
    })

    test('should reset circuit after timeout', async () => {
      const errorHandler = new ErrorHandler(
        { maxRetries: 0 },
        {
          failureThreshold: 2,
          resetTimeout: 100,
          monitoringPeriod: 1000,
        },
      )

      let callCount = 0
      const fn = mock(() => {
        callCount++
        if (callCount <= 2) {
          throw { status: 500, message: 'Server error' }
        }
        return Promise.resolve({ data: 'success' })
      })

      // Cause 2 failures to open the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await errorHandler.executeWithRetry(fn)
        } catch (_error) {
          // Expected
        }
      }

      // Circuit should be open
      try {
        await errorHandler.executeWithRetry(fn)
        expect(false).toBe(true)
      } catch (error) {
        expect((error as EnhancedApiError).code).toBe(ERROR_CODES.CIRCUIT_OPEN)
      }

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150))

      // Circuit should be half-open, next call succeeds
      const result = await errorHandler.executeWithRetry(fn)
      expect(result.data).toBe('success')
    })

    test('should provide circuit breaker state', () => {
      const errorHandler = new ErrorHandler()
      const state = errorHandler.getCircuitBreakerState()

      expect(state).toHaveProperty('state')
      expect(state).toHaveProperty('failures')
      expect(state).toHaveProperty('successCount')
      expect(state.state).toBe('CLOSED')
      expect(state.failures).toBe(0)
    })
  })

  describe('Error Suggestions', () => {
    test('should provide helpful suggestions for common errors', () => {
      const errors = [
        { status: 401, expectedSuggestion: 'Check your API key and ensure it is valid' },
        { status: 403, expectedSuggestion: 'do not have permission' },
        { status: 404, expectedSuggestion: 'resource was not found' },
        { status: 422, expectedSuggestion: 'Validation failed' },
        { status: 429, expectedSuggestion: 'Rate limit exceeded' },
        { status: 503, expectedSuggestion: 'temporarily unavailable' },
      ]

      for (const { status, expectedSuggestion } of errors) {
        // Create a proper axios-like error object
        const axiosError = {
          response: { status },
          isAxiosError: true,
        }
        const enhanced = errorHandler.enhanceError(axiosError)
        expect(enhanced.suggestion).toContain(expectedSuggestion)
      }
    })
  })
})
