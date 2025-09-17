/**
 * HTTP Client interface for dependency injection and testing
 */

import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

export interface HttpRequestConfig {
  params?: Record<string, unknown>
  headers?: Record<string, string>
  timeout?: number
  validateStatus?: (status: number) => boolean
}

export interface HttpResponse<T = unknown> {
  data: T
  status: number
  statusText: string
  headers: Record<string, string>
}

export interface HttpClient {
  get<T = unknown>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>>
  post<T = unknown>(
    url: string,
    data?: unknown,
    config?: HttpRequestConfig,
  ): Promise<HttpResponse<T>>
  put<T = unknown>(
    url: string,
    data?: unknown,
    config?: HttpRequestConfig,
  ): Promise<HttpResponse<T>>
  delete<T = unknown>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>>

  interceptors?: {
    response: {
      use(
        onFulfilled?: (response: HttpResponse) => HttpResponse | Promise<HttpResponse>,
        onRejected?: (error: unknown) => unknown,
      ): number
    }
  }
}

/**
 * Adapter to make Axios compatible with our HttpClient interface
 */
export class AxiosHttpClientAdapter implements HttpClient {
  constructor(private axiosInstance: AxiosInstance) {}

  async get<T = unknown>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    const response = await this.axiosInstance.get<T>(url, this.mapConfigToAxios(config))
    return this.mapAxiosResponse(response)
  }

  async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: HttpRequestConfig,
  ): Promise<HttpResponse<T>> {
    const response = await this.axiosInstance.post<T>(url, data, this.mapConfigToAxios(config))
    return this.mapAxiosResponse(response)
  }

  async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: HttpRequestConfig,
  ): Promise<HttpResponse<T>> {
    const response = await this.axiosInstance.put<T>(url, data, this.mapConfigToAxios(config))
    return this.mapAxiosResponse(response)
  }

  async delete<T = unknown>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    const response = await this.axiosInstance.delete<T>(url, this.mapConfigToAxios(config))
    return this.mapAxiosResponse(response)
  }

  get interceptors() {
    return {
      response: {
        use: (
          onFulfilled?: (response: HttpResponse) => HttpResponse | Promise<HttpResponse>,
          onRejected?: (error: unknown) => unknown,
        ) => {
          return this.axiosInstance.interceptors.response.use(
            onFulfilled
              ? async (response: AxiosResponse) => {
                  const mappedResponse = this.mapAxiosResponse(response)
                  const result = await onFulfilled(mappedResponse)
                  // Convert back to AxiosResponse format for the interceptor chain
                  return {
                    ...response,
                    data: result.data,
                    status: result.status,
                    statusText: result.statusText,
                    headers: result.headers,
                  }
                }
              : undefined,
            onRejected,
          )
        },
      },
    }
  }

  private mapConfigToAxios(config?: HttpRequestConfig): AxiosRequestConfig | undefined {
    if (!config) return undefined

    return {
      params: config.params,
      headers: config.headers,
      timeout: config.timeout,
      validateStatus: config.validateStatus,
    }
  }

  private mapAxiosResponse<T>(response: AxiosResponse<T>): HttpResponse<T> {
    return {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers as Record<string, string>,
    }
  }
}
