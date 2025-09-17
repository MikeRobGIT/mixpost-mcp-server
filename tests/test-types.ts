import type { Mock } from 'bun:test'
// Test types for mocked objects
import type { AxiosInstance, AxiosRequestConfig } from 'axios'

export interface MockAxiosInstance extends AxiosInstance {
  get: Mock<(...args: unknown[]) => Promise<{ data: unknown }>>
  post: Mock<(...args: unknown[]) => Promise<{ data: unknown }>>
  put: Mock<(...args: unknown[]) => Promise<{ data: unknown }>>
  patch: Mock<(...args: unknown[]) => Promise<{ data: unknown }>>
  delete: Mock<(...args: unknown[]) => Promise<{ data: unknown }>>
}

export interface AxiosWithCreate {
  create: Mock<(config?: AxiosRequestConfig) => MockAxiosInstance>
}
