import type { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios'
import type { HttpResponse } from './http-client'
import type { ApiError } from './types'

export interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  shouldRetry?: (error: EnhancedApiError) => boolean
}

export interface CircuitBreakerConfig {
  failureThreshold: number
  resetTimeout: number
  monitoringPeriod: number
}

export interface EnhancedApiError extends ApiError {
  code?: string
  retryable?: boolean
  suggestion?: string
  context?: {
    endpoint?: string
    method?: string
    timestamp?: string
    requestId?: string
    retryCount?: number
  }
}

type ErrorContext = {
  endpoint?: string
  method?: string
}

export const ERROR_CODES = {
  // Client errors (4xx)
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  CONFLICT: 'CONFLICT',
  UNPROCESSABLE_ENTITY: 'UNPROCESSABLE_ENTITY',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',

  // Server errors (5xx)
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  BAD_GATEWAY: 'BAD_GATEWAY',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  GATEWAY_TIMEOUT: 'GATEWAY_TIMEOUT',

  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  CONNECTION_REFUSED: 'CONNECTION_REFUSED',

  // Circuit breaker
  CIRCUIT_OPEN: 'CIRCUIT_OPEN',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'
  private failures = 0
  private successCount = 0
  private lastFailureTime?: number
  private nextAttemptTime?: number

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() < (this.nextAttemptTime || 0)) {
        throw this.createCircuitOpenError()
      }
      this.state = 'HALF_OPEN'
      this.successCount = 0
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.successCount++
      if (this.successCount >= 3) {
        this.state = 'CLOSED'
        this.failures = 0
      }
    } else if (this.state === 'CLOSED') {
      this.failures = Math.max(0, this.failures - 1)
    }
  }

  private onFailure() {
    this.failures++
    this.lastFailureTime = Date.now()

    if (this.failures >= this.config.failureThreshold) {
      this.state = 'OPEN'
      this.nextAttemptTime = Date.now() + this.config.resetTimeout
    }
  }

  private createCircuitOpenError(): EnhancedApiError {
    return {
      message: 'Circuit breaker is open - service temporarily unavailable',
      status: 503,
      code: ERROR_CODES.CIRCUIT_OPEN,
      retryable: false,
      suggestion: `Service is experiencing issues. Circuit will reset in ${Math.ceil(((this.nextAttemptTime ?? Date.now()) - Date.now()) / 1000)} seconds`,
      context: {
        timestamp: new Date().toISOString(),
      },
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      successCount: this.successCount,
    }
  }
}

export class ErrorHandler {
  private circuitBreaker: CircuitBreaker
  private retryConfig: RetryConfig
  private defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    shouldRetry: (error) => this.isRetryable(error),
  }

  constructor(
    retryConfigOptions: Partial<RetryConfig> = {},
    circuitBreakerConfig: CircuitBreakerConfig = {
      failureThreshold: 5,
      resetTimeout: 60000,
      monitoringPeriod: 60000,
    },
  ) {
    this.retryConfig = { ...this.defaultRetryConfig, ...retryConfigOptions }
    this.circuitBreaker = new CircuitBreaker(circuitBreakerConfig)
  }

  async executeWithRetry<T>(fn: () => Promise<T>, context?: ErrorContext): Promise<T> {
    return this.circuitBreaker.execute(async () => {
      return this.retryOperation(fn, context)
    })
  }

  private async retryOperation<T>(
    fn: () => Promise<T>,
    context?: ErrorContext,
    retryCount = 0,
  ): Promise<T> {
    try {
      return await fn()
    } catch (error) {
      const enhancedError = this.enhanceError(error, context, retryCount)

      if (
        retryCount < this.retryConfig.maxRetries &&
        this.retryConfig.shouldRetry?.(enhancedError)
      ) {
        const delay = this.calculateBackoffDelay(retryCount)
        await this.sleep(delay)
        return this.retryOperation(fn, context, retryCount + 1)
      }

      throw enhancedError
    }
  }

  private calculateBackoffDelay(retryCount: number): number {
    const exponentialDelay = this.retryConfig.baseDelay * 2 ** retryCount
    const jitteredDelay = exponentialDelay * (0.5 + Math.random() * 0.5)
    return Math.min(jitteredDelay, this.retryConfig.maxDelay)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  enhanceError(error: unknown, context?: ErrorContext, retryCount?: number): EnhancedApiError {
    const axiosError = this.isAxiosError(error) ? error : undefined
    const apiError = this.isApiErrorLike(error) ? error : undefined
    const status = axiosError?.response?.status ?? apiError?.status ?? 500
    const code = this.getErrorCode(status, error)

    const enhancedError: EnhancedApiError = {
      message: this.getErrorMessage(error),
      status,
      code,
      retryable: this.isRetryable(error),
      suggestion: this.getErrorSuggestion(code, error),
      errors: this.extractValidationErrors(error, axiosError),
      context: {
        endpoint: context?.endpoint ?? axiosError?.config?.url,
        method: (context?.method ?? axiosError?.config?.method)?.toUpperCase(),
        timestamp: new Date().toISOString(),
        requestId: this.extractRequestId(axiosError),
        retryCount,
      },
    }

    return enhancedError
  }

  private getErrorCode(status: number, error: unknown): ErrorCode {
    const errorCode =
      (this.isApiErrorLike(error) ? error.code : undefined) ??
      (typeof error === 'object' && error !== null && 'code' in error
        ? (error as { code?: string }).code
        : undefined)

    if (errorCode === 'ECONNABORTED') return ERROR_CODES.TIMEOUT
    if (errorCode === 'ECONNREFUSED') return ERROR_CODES.CONNECTION_REFUSED
    if (errorCode === ERROR_CODES.CIRCUIT_OPEN) return ERROR_CODES.CIRCUIT_OPEN

    const hasResponse = this.hasResponse(error)
    const message = this.extractPlainMessage(error)
    if (!hasResponse && message === 'Network Error') {
      return ERROR_CODES.NETWORK_ERROR
    }

    switch (status) {
      case 400:
        return ERROR_CODES.BAD_REQUEST
      case 401:
        return ERROR_CODES.UNAUTHORIZED
      case 403:
        return ERROR_CODES.FORBIDDEN
      case 404:
        return ERROR_CODES.NOT_FOUND
      case 405:
        return ERROR_CODES.METHOD_NOT_ALLOWED
      case 409:
        return ERROR_CODES.CONFLICT
      case 422:
        return ERROR_CODES.UNPROCESSABLE_ENTITY
      case 429:
        return ERROR_CODES.TOO_MANY_REQUESTS
      case 500:
        return ERROR_CODES.INTERNAL_SERVER_ERROR
      case 502:
        return ERROR_CODES.BAD_GATEWAY
      case 503:
        return ERROR_CODES.SERVICE_UNAVAILABLE
      case 504:
        return ERROR_CODES.GATEWAY_TIMEOUT
      default:
        return status >= 500 ? ERROR_CODES.INTERNAL_SERVER_ERROR : ERROR_CODES.BAD_REQUEST
    }
  }

  private getErrorMessage(error: unknown): string {
    const plainMessage = this.extractPlainMessage(error)
    if (plainMessage) {
      return plainMessage
    }

    const axiosError = this.isAxiosError(error) ? error : undefined
    const data = axiosError?.response?.data
    if (data && typeof data === 'object') {
      const withMessage = data as { message?: unknown; error?: unknown }
      if (typeof withMessage.message === 'string') {
        return withMessage.message
      }
      if (typeof withMessage.error === 'string') {
        return withMessage.error
      }
    }

    return 'An unexpected error occurred'
  }

  private isRetryable(error: unknown): boolean {
    const code =
      (this.isApiErrorLike(error) ? error.code : undefined) ??
      (typeof error === 'object' && error !== null && 'code' in error
        ? (error as { code?: string }).code
        : undefined)

    if (code === ERROR_CODES.CIRCUIT_OPEN) return false

    const status =
      (this.isApiErrorLike(error) ? error.status : undefined) ??
      (this.isAxiosError(error) ? error.response?.status : undefined)

    if (status && status >= 400 && status < 500) {
      return status === 429 || status === 408
    }

    return status === undefined || status >= 500
  }

  private getErrorSuggestion(code: ErrorCode, error: unknown): string {
    switch (code) {
      case ERROR_CODES.UNAUTHORIZED:
        return 'Check your API key and ensure it is valid and has the necessary permissions'
      case ERROR_CODES.FORBIDDEN:
        return 'You do not have permission to access this resource. Check your workspace access'
      case ERROR_CODES.NOT_FOUND:
        return 'The requested resource was not found. Verify the ID and that it exists'
      case ERROR_CODES.TOO_MANY_REQUESTS:
        return 'Rate limit exceeded. Please wait before making additional requests'
      case ERROR_CODES.UNPROCESSABLE_ENTITY:
        return 'Validation failed. Check the request data format and required fields'
      case ERROR_CODES.TIMEOUT:
        return 'Request timed out. The server may be slow or unresponsive. Try again later'
      case ERROR_CODES.NETWORK_ERROR:
        return 'Network connection failed. Check your internet connection and server URL'
      case ERROR_CODES.SERVICE_UNAVAILABLE:
        return 'Service is temporarily unavailable. This is usually temporary, please try again later'
      case ERROR_CODES.CIRCUIT_OPEN: {
        const suggestion =
          this.isApiErrorLike(error) && typeof error.suggestion === 'string'
            ? error.suggestion
            : undefined
        return suggestion || 'Service is experiencing issues. Please wait before retrying'
      }
      default:
        return 'An error occurred. If this persists, please check the API documentation or contact support'
    }
  }

  private isAxiosError(error: unknown): error is AxiosError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'isAxiosError' in error &&
      (error as { isAxiosError?: unknown }).isAxiosError === true
    )
  }

  private isApiErrorLike(error: unknown): error is ApiError & {
    code?: string
    errors?: Record<string, unknown | string[]>
    suggestion?: string
  } {
    if (!error || typeof error !== 'object') {
      return false
    }
    const candidate = error as { status?: unknown; message?: unknown }
    return typeof candidate.status === 'number' && typeof candidate.message === 'string'
  }

  private extractValidationErrors(
    error: unknown,
    axiosError?: AxiosError,
  ): Record<string, string[]> | undefined {
    if (this.isApiErrorLike(error) && error.errors && typeof error.errors === 'object') {
      // Convert any validation errors to string arrays
      const errors = error.errors as Record<string, unknown>
      const result: Record<string, string[]> = {}
      for (const [key, value] of Object.entries(errors)) {
        if (Array.isArray(value)) {
          result[key] = value.map((v) => String(v))
        } else if (value !== null && value !== undefined) {
          result[key] = [String(value)]
        }
      }
      return Object.keys(result).length > 0 ? result : undefined
    }
    const data = axiosError?.response?.data
    if (data && typeof data === 'object' && 'errors' in data) {
      const { errors } = data as { errors?: unknown }
      if (errors && typeof errors === 'object') {
        const result: Record<string, string[]> = {}
        for (const [key, value] of Object.entries(errors as Record<string, unknown>)) {
          if (Array.isArray(value)) {
            result[key] = value.map((v) => String(v))
          } else if (value !== null && value !== undefined) {
            result[key] = [String(value)]
          }
        }
        return Object.keys(result).length > 0 ? result : undefined
      }
    }
    return undefined
  }

  private extractRequestId(error: AxiosError | undefined): string | undefined {
    const headers = error?.config?.headers
    if (!headers) {
      return undefined
    }

    if (typeof (headers as { get?: unknown }).get === 'function') {
      const value = (headers as { get: (name: string) => unknown }).get('X-Request-ID')
      return typeof value === 'string' ? value : undefined
    }

    const recordHeaders = headers as Record<string, unknown>
    const headerValue = recordHeaders['X-Request-ID']
    return typeof headerValue === 'string' ? headerValue : undefined
  }

  private hasResponse(error: unknown): boolean {
    if (this.isAxiosError(error)) {
      return typeof error.response !== 'undefined'
    }
    if (typeof error === 'object' && error !== null && 'response' in error) {
      return (error as { response?: unknown }).response !== undefined
    }
    return false
  }

  private extractPlainMessage(error: unknown): string | undefined {
    if (this.isApiErrorLike(error)) {
      return typeof error.message === 'string' ? error.message : undefined
    }
    if (typeof error === 'object' && error !== null && 'message' in error) {
      const message = (error as { message?: unknown }).message
      if (typeof message === 'string') {
        return message
      }
    }
    return undefined
  }

  getCircuitBreakerState() {
    return this.circuitBreaker.getState()
  }
}
