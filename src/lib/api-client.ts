import { z } from "zod"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"

interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export class ApiClient {
  private static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      credentials: "include", // Include cookies for session management
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`)
    }

    return data
  }

  static async post<TData, TResponse = ApiResponse<unknown>>(
    endpoint: string,
    data: TData,
    schema?: z.ZodSchema<TData>
  ): Promise<TResponse> {
    // Optional: Validate data before sending
    if (schema) {
      schema.parse(data)
    }

    return this.request<TResponse>(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  static async get<TResponse = unknown>(endpoint: string): Promise<TResponse> {
    return this.request<TResponse>(endpoint, {
      method: "GET",
    })
  }

  static async put<TData, TResponse = ApiResponse<unknown>>(
    endpoint: string,
    data: TData
  ): Promise<TResponse> {
    return this.request<TResponse>(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  static async delete<TResponse = unknown>(
    endpoint: string
  ): Promise<TResponse> {
    return this.request<TResponse>(endpoint, {
      method: "DELETE",
    })
  }
}

// Example usage:
// import { ApiClient } from "@/lib/api-client"
// import { signupSchema } from "@/features/auth/sign-up/schema/zod-schema"
// 
// const result = await ApiClient.post("/auth/sign-up", data, signupSchema)