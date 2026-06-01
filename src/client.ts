import { ChariowError } from "./errors.js"
import { ApiResponse } from "./types/product.js"

export interface ChariowConfig {
  apiKey: string
  baseUrl?: string
}

export class ChariowClient {
  apiKey: string
  baseUrl: string

  constructor(config: ChariowConfig) {
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl || "https://api.chariow.com/v1"
  }

  async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(
      `${this.baseUrl}${path}`,
      {
        ...options,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          ...(options.headers || {})
        }
      }
    )

    let data: unknown

    try {
      data = await response.json()
    } catch {
      data = null
    }

    if (!response.ok) {
      throw new ChariowError(
        (data as any)?.message || "Chariow API Error",
        response.status,
        data
      )
    }

    // Si la réponse a une structure { message, data, errors }, extraire data
    if (data && typeof data === 'object' && 'data' in data) {
      return (data as ApiResponse<T>).data as T
    }

    return data as T
  }
}
