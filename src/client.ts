import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  MixpostConfig, 
  MixpostAccount, 
  CreatePostRequest, 
  UpdatePostRequest, 
  MixpostResponse, 
  ApiError,
  MixpostPost,
  MixpostTag,
  MixpostMedia,
  PaginatedResponse
} from './types.js';

export class MixpostClient {
  private client: AxiosInstance;
  private config: MixpostConfig;

  constructor(config: MixpostConfig) {
    this.config = config;
    
    const baseURL = `${config.baseUrl}/${config.corePath}/api/${config.workspaceUuid}`;
    
    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
      validateStatus: (status) => status < 500, // Don't throw on 4xx errors
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        // Handle 4xx errors
        if (response.status >= 400) {
          const apiError: ApiError = {
            message: response.data?.message || `Request failed with status ${response.status}`,
            status: response.status,
            errors: response.data?.errors,
          };
          throw apiError;
        }
        return response;
      },
      (error) => {
        // Handle network errors and 5xx errors
        if (error.code === 'ECONNABORTED') {
          throw {
            message: 'Request timeout - the server took too long to respond',
            status: 408,
          } as ApiError;
        }
        
        const apiError: ApiError = {
          message: error.response?.data?.message || error.message || 'An unexpected error occurred',
          status: error.response?.status || 500,
          errors: error.response?.data?.errors,
        };
        throw apiError;
      }
    );
  }

  // Accounts
  async listAccounts(): Promise<MixpostAccount[]> {
    const response: AxiosResponse<MixpostAccount[]> = await this.client.get('/accounts');
    return response.data;
  }

  async getAccount(accountUuid: string): Promise<MixpostAccount> {
    const response: AxiosResponse<MixpostAccount> = await this.client.get(`/accounts/${accountUuid}`);
    return response.data;
  }

  // Posts
  async createPost(postData: CreatePostRequest): Promise<MixpostResponse> {
    const response: AxiosResponse<MixpostResponse> = await this.client.post('/posts', postData);
    return response.data;
  }

  async updatePost(postUuid: string, postData: UpdatePostRequest): Promise<MixpostResponse> {
    const response: AxiosResponse<MixpostResponse> = await this.client.put(`/posts/${postUuid}`, postData);
    return response.data;
  }

  async approvePost(postUuid: string): Promise<MixpostResponse> {
    const response: AxiosResponse<MixpostResponse> = await this.client.post(`/posts/approve/${postUuid}`);
    return response.data;
  }

  async getPost(postUuid: string): Promise<MixpostPost> {
    const response: AxiosResponse<MixpostPost> = await this.client.get(`/posts/${postUuid}`);
    return response.data;
  }

  async listPosts(params?: Record<string, any>): Promise<PaginatedResponse<MixpostPost>> {
    const response: AxiosResponse<PaginatedResponse<MixpostPost>> = await this.client.get('/posts', { params });
    return response.data;
  }

  async deletePost(postUuid: string): Promise<MixpostResponse> {
    const response: AxiosResponse<MixpostResponse> = await this.client.delete(`/posts/${postUuid}`);
    return response.data;
  }

  async deleteMultiplePosts(postUuids: string[]): Promise<MixpostResponse> {
    const response: AxiosResponse<MixpostResponse> = await this.client.delete('/posts', { 
      data: { posts: postUuids }
    });
    return response.data;
  }

  async schedulePost(postUuid: string): Promise<MixpostResponse> {
    const response: AxiosResponse<MixpostResponse> = await this.client.post(`/posts/schedule/${postUuid}`);
    return response.data;
  }

  async addPostToQueue(postUuid: string): Promise<MixpostResponse> {
    const response: AxiosResponse<MixpostResponse> = await this.client.post(`/posts/queue/${postUuid}`);
    return response.data;
  }

  // Media
  async listMedia(params?: Record<string, any>): Promise<PaginatedResponse<MixpostMedia>> {
    const response: AxiosResponse<PaginatedResponse<MixpostMedia>> = await this.client.get('/media', { params });
    return response.data;
  }

  async getMedia(mediaUuid: string): Promise<MixpostMedia> {
    const response: AxiosResponse<MixpostMedia> = await this.client.get(`/media/${mediaUuid}`);
    return response.data;
  }

  async updateMedia(mediaUuid: string, data: Record<string, any>): Promise<MixpostResponse> {
    const response: AxiosResponse<MixpostResponse> = await this.client.put(`/media/${mediaUuid}`, data);
    return response.data;
  }

  async uploadMedia(file: any, data?: Record<string, any>): Promise<MixpostResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (data) {
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    const response: AxiosResponse<MixpostResponse> = await this.client.post('/media', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async deleteMedia(mediaUuid: string): Promise<MixpostResponse> {
    const response: AxiosResponse<MixpostResponse> = await this.client.delete(`/media/${mediaUuid}`);
    return response.data;
  }

  // Tags
  async listTags(): Promise<MixpostTag[]> {
    const response: AxiosResponse<MixpostTag[]> = await this.client.get('/tags');
    return response.data;
  }

  async getTag(tagUuid: string): Promise<MixpostTag> {
    const response: AxiosResponse<MixpostTag> = await this.client.get(`/tags/${tagUuid}`);
    return response.data;
  }

  async createTag(data: Record<string, any>): Promise<MixpostResponse> {
    const response: AxiosResponse<MixpostResponse> = await this.client.post('/tags', data);
    return response.data;
  }

  async updateTag(tagUuid: string, data: Record<string, any>): Promise<MixpostResponse> {
    const response: AxiosResponse<MixpostResponse> = await this.client.put(`/tags/${tagUuid}`, data);
    return response.data;
  }

  async deleteTag(tagUuid: string): Promise<MixpostResponse> {
    const response: AxiosResponse<MixpostResponse> = await this.client.delete(`/tags/${tagUuid}`);
    return response.data;
  }
}