export interface MixpostConfig {
  baseUrl: string
  workspaceUuid: string
  corePath: string
  apiKey: string
}

export interface MixpostAccount {
  id: string
  uuid: string
  name: string
  username: string
  image?: string
  provider: string
  authorized: boolean
  created_at: string
  provider_data?: Record<string, unknown>
}

export interface PostMedia {
  id: string
  url: string
  type: 'image' | 'video'
  thumbnail?: string
}

export interface PostContent {
  body?: string
  media?: PostMedia[]
  urls?: string[]
}

export interface PostVersion {
  account_id: string
  is_original: boolean
  content: PostContent
  options?: Record<string, unknown>
}

export interface CreatePostRequest {
  date: string // YYYY-MM-DD
  time: string // HH:MM
  timezone: string
  schedule?: boolean
  schedule_now?: boolean
  queue?: boolean
  accounts: string[]
  tags?: string[]
  versions: PostVersion[]
}

export interface UpdatePostRequest extends CreatePostRequest {
  // Same structure as create
}

export interface MixpostPost {
  id: string
  uuid: string
  content: PostContent
  status: 'draft' | 'scheduled' | 'published' | 'failed'
  scheduled_at?: string
  published_at?: string
  created_at: string
  updated_at: string
  accounts: MixpostAccount[]
  tags?: MixpostTag[]
  versions: PostVersion[]
}

export interface MixpostTag {
  id: string
  uuid: string
  name: string
  hex_color?: string
  created_at: string
}

export interface MixpostMedia {
  id: string
  uuid: string
  name: string
  type: string
  url: string
  thumbnail?: string
  alt_text?: string
  size: number
  created_at: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
  links: {
    first: string
    last: string
    prev?: string
    next?: string
  }
}

export interface MixpostResponse<T = unknown> {
  success?: boolean
  data?: T
  message?: string
  errors?: Record<string, string[]>
  scheduled_at?: string
}

export interface ApiError {
  message: string
  status: number
  errors?: Record<string, string[]>
}

export type { EnhancedApiError, ErrorCode } from './error-handler'
