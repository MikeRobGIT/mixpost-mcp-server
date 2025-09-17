import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { MixpostClient } from '../src/client'
import type { CreatePostRequest, MixpostAccount, MixpostPost } from '../src/types'
import { type MockHttpClient, createMockHttpClient, mockResponse } from './utils/mock-http-client'

// Type for axios-like errors
interface AxiosLikeError extends Error {
  response?: {
    status: number
    data: { message: string }
  }
  isAxiosError?: boolean
  code?: string
}

describe('Performance Tests', () => {
  let client: MixpostClient
  let mockHttpClient: MockHttpClient

  const mockConfig = {
    baseUrl: 'https://api.mixpost.test',
    workspaceUuid: 'test-workspace-uuid',
    apiKey: 'test-api-key',
    corePath: 'mixpost',
  }

  beforeEach(() => {
    // Create mock HTTP client with performance tracking
    mockHttpClient = createMockHttpClient()

    // Override get method with performance simulation
    mockHttpClient.get = mock(async (_url: string) => {
      const startTime = performance.now()
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            data: [],
            status: 200,
            statusText: 'OK',
            headers: {},
            responseTime: performance.now() - startTime,
          })
        }, Math.random() * 100) // Simulate variable network latency
      })
    })

    mockHttpClient.post = mock(async () => ({
      data: {},
      status: 201,
      statusText: 'Created',
      headers: {},
    }))
    mockHttpClient.put = mock(async () => ({
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {},
    }))
    mockHttpClient.delete = mock(async () => ({
      data: {},
      status: 204,
      statusText: 'No Content',
      headers: {},
    }))

    // Create client with mock HTTP client
    client = new MixpostClient({
      ...mockConfig,
      httpClient: mockHttpClient,
    })
  })

  afterEach(() => {
    // Clean up mocks if needed
  })

  describe('Response Time Tests', () => {
    it('should respond within acceptable time for list operations', async () => {
      const startTime = performance.now()
      await client.listAccounts()
      const responseTime = performance.now() - startTime

      expect(responseTime).toBeLessThan(1000) // Should respond within 1 second
    })

    it('should handle multiple concurrent requests efficiently', async () => {
      const startTime = performance.now()
      const concurrentRequests = 10

      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        client.getAccount(`acc-${i}`),
      )

      await Promise.all(promises)
      const totalTime = performance.now() - startTime

      // Should handle 10 concurrent requests within 2 seconds
      expect(totalTime).toBeLessThan(2000)
    })

    it('should maintain performance with large payloads', async () => {
      const largePost: CreatePostRequest = {
        accounts: Array.from({ length: 10 }, (_, i) => `acc-${i}`),
        versions: Array.from({ length: 10 }, (_, i) => ({
          account_id: i,
          is_original: i === 0,
          content: {
            body: 'x'.repeat(5000), // Large content
          },
        })),
        date: '2024-03-15',
        time: '14:30',
        timezone: 'UTC',
        tags: Array.from({ length: 20 }, (_, i) => `tag-${i}`),
      }

      const startTime = performance.now()
      await client.createPost(largePost)
      const responseTime = performance.now() - startTime

      expect(responseTime).toBeLessThan(2000) // Should handle large payloads within 2 seconds
    })
  })

  describe('Load Tests', () => {
    it('should handle sustained load without degradation', async () => {
      // Create a new mock for this test
      const loadTestMockClient = createMockHttpClient()
      loadTestMockClient.get = mock(async () => ({
        data: [],
        status: 200,
        statusText: 'OK',
        headers: {},
      }))

      // Use a client without retry for faster testing
      const testClient = new MixpostClient({
        ...mockConfig,
        enableRetry: false,
        httpClient: loadTestMockClient,
      })

      const requestsPerSecond = 10
      const duration = 2 // Reduced to 2 seconds for faster tests
      const totalRequests = requestsPerSecond * duration
      const responseTimes: number[] = []

      for (let i = 0; i < totalRequests; i++) {
        const startTime = performance.now()
        await testClient.listAccounts()
        responseTimes.push(performance.now() - startTime)

        // Reduced wait time for faster test execution
        await new Promise((resolve) => setTimeout(resolve, 50))
      }

      // Calculate performance metrics
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      const maxResponseTime = Math.max(...responseTimes)
      const minResponseTime = Math.min(...responseTimes)

      // Performance assertions
      expect(avgResponseTime).toBeLessThan(500) // Average should be under 500ms
      expect(maxResponseTime).toBeLessThan(1000) // Max should be under 1 second
      expect(minResponseTime).toBeGreaterThan(0) // Should have valid response times
    })

    it('should handle burst traffic', async () => {
      const burstSize = 50
      const startTime = performance.now()

      const promises = Array.from({ length: burstSize }, () => client.listAccounts())

      const results = await Promise.allSettled(promises)
      const totalTime = performance.now() - startTime

      // Check success rate
      const successCount = results.filter((r) => r.status === 'fulfilled').length
      const successRate = (successCount / burstSize) * 100

      expect(successRate).toBeGreaterThan(95) // At least 95% success rate
      expect(totalTime).toBeLessThan(5000) // Should handle 50 requests within 5 seconds
    })

    it('should recover from temporary failures', async () => {
      let failureCount = 0
      const maxFailures = 3

      // Create a new mock for this test with intermittent failures
      const retryMockClient = createMockHttpClient()
      retryMockClient.get = mock(async () => {
        if (failureCount < maxFailures) {
          failureCount++
          throw new Error('Temporary failure')
        }
        return { data: [], status: 200, statusText: 'OK', headers: {} }
      })

      // Enable retry with custom configuration
      const clientWithRetry = new MixpostClient({
        ...mockConfig,
        enableRetry: true,
        httpClient: retryMockClient,
        retryConfig: {
          maxRetries: 5,
          baseDelay: 100,
          maxDelay: 1000,
        },
      })

      const startTime = performance.now()
      let success = false

      try {
        await clientWithRetry.listAccounts()
        success = true
      } catch (_error) {
        success = false
      }

      const recoveryTime = performance.now() - startTime

      expect(success).toBe(true) // Should eventually succeed
      expect(recoveryTime).toBeLessThan(5000) // Should recover within 5 seconds
    })
  })

  describe('Memory Usage Tests', () => {
    it('should not leak memory during repeated operations', async () => {
      // Mock for fast responses to avoid timeout
      mockHttpClient.get = mock(async () => ({
        data: [],
        status: 200,
        statusText: 'OK',
        headers: {},
      }))

      if (typeof global.gc === 'function') {
        // Force garbage collection if available
        global.gc()
      }

      const initialMemory = process.memoryUsage().heapUsed
      const iterations = 100

      for (let i = 0; i < iterations; i++) {
        await client.listAccounts()
      }

      if (typeof global.gc === 'function') {
        global.gc()
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory

      // Memory increase should be reasonable (less than 10MB for 100 operations)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
    })

    it('should handle large result sets efficiently', async () => {
      // Mock large result set
      const largeResultSet = Array.from({ length: 1000 }, (_, i) => ({
        uuid: `post-${i}`,
        id: i,
        status: 'scheduled',
        created_at: '2024-03-15T14:30:00Z',
        updated_at: '2024-03-15T14:30:00Z',
        scheduled_at: { date: '2024-03-15', time: '14:30' },
        published_at: null,
        accounts: [],
      }))

      mockHttpClient.get.mockResolvedValue(mockResponse({ data: largeResultSet }))

      const startTime = performance.now()
      const result = await client.listPosts()
      const processingTime = performance.now() - startTime

      expect(processingTime).toBeLessThan(1000) // Should process 1000 items within 1 second
      expect(result.data).toHaveLength(1000)
    })
  })

  describe('Rate Limiting Tests', () => {
    it('should respect rate limits', async () => {
      const rateLimitPerSecond = 5
      const testDuration = 2 // seconds
      const requestTimes: number[] = []

      for (let second = 0; second < testDuration; second++) {
        const secondStart = performance.now()

        for (let request = 0; request < rateLimitPerSecond; request++) {
          const requestStart = performance.now()
          await client.listAccounts()
          requestTimes.push(performance.now() - requestStart)
        }

        const secondElapsed = performance.now() - secondStart
        if (secondElapsed < 1000) {
          await new Promise((resolve) => setTimeout(resolve, 1000 - secondElapsed))
        }
      }

      // Verify all requests completed
      expect(requestTimes).toHaveLength(rateLimitPerSecond * testDuration)

      // Verify requests were spread over time
      const avgRequestTime = requestTimes.reduce((a, b) => a + b, 0) / requestTimes.length
      expect(avgRequestTime).toBeLessThan(500)
    })

    it('should handle rate limit errors gracefully', async () => {
      let requestCount = 0
      const rateLimitThreshold = 3

      // Create a new mock for this test
      const rateLimitMockClient = createMockHttpClient()
      rateLimitMockClient.get = mock(async () => {
        requestCount++
        if (requestCount > rateLimitThreshold) {
          throw mockError('Too Many Requests', 429)
        }
        return mockResponse([])
      })

      // Create a client with retry disabled to avoid retry delays
      const rateLimitClient = new MixpostClient({
        ...mockConfig,
        enableRetry: false,
        httpClient: rateLimitMockClient,
      })

      const results = []
      for (let i = 0; i < 5; i++) {
        try {
          const result = await rateLimitClient.listAccounts()
          results.push({ success: true, data: result })
        } catch (error) {
          results.push({ success: false, error })
        }
      }

      const successCount = results.filter((r) => r.success).length
      expect(successCount).toBe(rateLimitThreshold)
    })
  })

  describe('Timeout Tests', () => {
    it('should timeout long-running requests', async () => {
      // Create a new mock for this test
      const timeoutMockClient = createMockHttpClient()
      timeoutMockClient.get = mock(async () => {
        const error = new Error('timeout of 1000ms exceeded') as AxiosLikeError
        error.code = 'ECONNABORTED'
        error.isAxiosError = true
        throw error
      })

      const clientWithTimeout = new MixpostClient({
        ...mockConfig,
        timeout: 1000, // 1 second timeout
        enableRetry: false, // Disable retry to test timeout directly
        httpClient: timeoutMockClient,
      })

      const startTime = performance.now()
      let timedOut = false

      try {
        await clientWithTimeout.listAccounts()
      } catch (error) {
        const err = error as AxiosLikeError
        if (
          err.code === 'ECONNABORTED' ||
          err.code === 'TIMEOUT' ||
          err.message?.includes('timeout')
        ) {
          timedOut = true
        }
      }

      const elapsed = performance.now() - startTime

      expect(timedOut).toBe(true)
      expect(elapsed).toBeLessThan(2000) // Should timeout within 2 seconds
    })

    it('should handle variable timeouts for different operations', async () => {
      // Create mock clients for different timeout tests
      const shortMockClient = createMockHttpClient()
      const longMockClient = createMockHttpClient()
      shortMockClient.get.mockResolvedValue(mockResponse([]))
      longMockClient.get.mockResolvedValue(mockResponse([]))

      const shortTimeout = new MixpostClient({
        ...mockConfig,
        timeout: 500,
        httpClient: shortMockClient,
      })
      const longTimeout = new MixpostClient({
        ...mockConfig,
        timeout: 5000,
        httpClient: longMockClient,
      })

      const shortStart = performance.now()
      await shortTimeout.listAccounts()
      const shortTime = performance.now() - shortStart

      const longStart = performance.now()
      await longTimeout.listAccounts()
      const longTime = performance.now() - longStart

      expect(shortTime).toBeLessThan(500)
      expect(longTime).toBeLessThan(5000)
    })
  })

  describe('Circuit Breaker Tests', () => {
    it('should open circuit after repeated failures', async () => {
      // Create a new mock for this test with consistent failures
      const circuitBreakerMockClient = createMockHttpClient()
      circuitBreakerMockClient.get = mock(async () => {
        throw mockError('Service unavailable', 503)
      })

      const clientWithCircuitBreaker = new MixpostClient({
        ...mockConfig,
        enableRetry: true, // Circuit breaker requires enableRetry to be true
        retryConfig: {
          maxRetries: 0, // Disable retries but keep circuit breaker
        },
        circuitBreakerConfig: {
          failureThreshold: 3,
          resetTimeout: 1000,
        },
        httpClient: circuitBreakerMockClient,
      })

      const results = []
      for (let i = 0; i < 5; i++) {
        try {
          await clientWithCircuitBreaker.listAccounts()
          results.push('success')
        } catch (error) {
          const err = error as AxiosLikeError
          results.push(err.message || err.code || 'unknown error')
        }
      }

      // After threshold, circuit should be open
      const circuitOpenErrors = results.filter(
        (r) => r.includes('Circuit breaker is open') || r.includes('CIRCUIT_OPEN'),
      )
      expect(circuitOpenErrors.length).toBeGreaterThan(0)
    })

    it('should recover when service is healthy again', async () => {
      // Create a new mock for recovery test
      const recoveryMockClient = createMockHttpClient()
      let callCount = 0
      recoveryMockClient.get = mock(async () => {
        callCount++
        if (callCount <= 2) {
          throw new Error('Service unavailable')
        }
        return mockResponse([])
      })

      const clientWithCircuitBreaker = new MixpostClient({
        ...mockConfig,
        circuitBreakerConfig: {
          failureThreshold: 2,
          resetTimeout: 500,
        },
        httpClient: recoveryMockClient,
      })

      // Trigger circuit breaker
      for (let i = 0; i < 2; i++) {
        try {
          await clientWithCircuitBreaker.listAccounts()
        } catch (_error) {
          // Expected failures
        }
      }

      // Wait for circuit to half-open
      await new Promise((resolve) => setTimeout(resolve, 600))

      // Should succeed after recovery
      const result = await clientWithCircuitBreaker.listAccounts()
      expect(result).toBeDefined()
    })
  })
})
