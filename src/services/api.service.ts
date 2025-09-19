import { APP_CONFIG } from '@/config/app.config'

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface User {
  id: string
  nickname: string
  email: string
  createdAt: Date
}

export interface LoginResponse {
  user: User
  token?: string
}

export interface RegisterResponse {
  user: User
  token?: string
}

// API Service Class
class ApiService {
  private baseUrl: string

  constructor() {
    this.baseUrl = APP_CONFIG.api.baseUrl
  }

  // Helper method for making requests
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`
      console.log('API Request:', {
        url,
        method: options.method || 'GET',
        body: options.body,
      })

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      })

      const data = await response.json()
      console.log('API Response:', { status: response.status, data })

      if (!response.ok) {
        console.error('API Error Response:', { status: response.status, data })
        return {
          success: false,
          error:
            data.message ||
            data.error ||
            `HTTP ${response.status}: ${response.statusText}`,
        }
      }

      return data
    } catch (error) {
      console.error('API Request Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '網路連線錯誤',
      }
    }
  }

  // Authentication APIs
  async login(
    email: string,
    password: string
  ): Promise<ApiResponse<LoginResponse>> {
    return this.request<LoginResponse>(APP_CONFIG.api.endpoints.auth.login, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async register(
    nickname: string,
    email: string,
    password: string
  ): Promise<ApiResponse<RegisterResponse>> {
    return this.request<RegisterResponse>(
      APP_CONFIG.api.endpoints.auth.register,
      {
        method: 'POST',
        body: JSON.stringify({ nickname, email, password }),
      }
    )
  }

  async logout(): Promise<ApiResponse> {
    return this.request(APP_CONFIG.api.endpoints.auth.logout, {
      method: 'POST',
    })
  }

  // User APIs
  async getUserCount(): Promise<ApiResponse<{ count: number }>> {
    return this.request<{ count: number }>(APP_CONFIG.api.endpoints.users.count)
  }

  async getUserProfile(): Promise<ApiResponse<User>> {
    return this.request<User>(APP_CONFIG.api.endpoints.users.profile)
  }

  // Gemini Assistant API
  async sendToAssistant(
    message: string
  ): Promise<ApiResponse<{ response: string }>> {
    return this.request<{ response: string }>(
      APP_CONFIG.api.endpoints.gemini.assistant,
      {
        method: 'POST',
        body: JSON.stringify({ message }),
      }
    )
  }
}

// Export singleton instance
export const apiService = new ApiService()
