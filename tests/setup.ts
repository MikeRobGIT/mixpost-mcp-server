import { afterAll, beforeAll } from 'bun:test'

// Global test setup
beforeAll(() => {
  // Set test environment
  process.env.NODE_ENV = 'test'

  // Mock environment variables for testing
  process.env.MIXPOST_BASE_URL = process.env.MIXPOST_BASE_URL || 'https://test.mixpost.com'
  process.env.MIXPOST_WORKSPACE_UUID = process.env.MIXPOST_WORKSPACE_UUID || 'test-workspace-uuid'
  process.env.MIXPOST_API_KEY = process.env.MIXPOST_API_KEY || 'test-api-key'
  process.env.MIXPOST_CORE_PATH = process.env.MIXPOST_CORE_PATH || 'mixpost'
})

afterAll(() => {
  // Cleanup after all tests
})

// Export test environment config
export const testConfig = {
  baseUrl: 'https://test.mixpost.com',
  workspaceUuid: 'test-workspace-uuid',
  apiKey: 'test-api-key',
  corePath: 'mixpost',
}
