/**
 * Token-Kit SDK - HTTP Client
 * Handles all HTTP communication with Token-Kit API Gateway
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  ApiResponse,
  TokenKitAPIError,
  TokenKitConfig,
  ChatResponse,
  TokenValidationResponse,
  ModelsResponse,
  Message,
  ChatOptions,
} from './types';

export class TokenKitClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(config: TokenKitConfig) {
    if (!config.apiKey) {
      throw new Error('API key is required');
    }

    this.apiKey = config.apiKey;

    // Create axios instance
    this.client = axios.create({
      baseURL: config.baseUrl || 'https://api.token-kit.com/v1',
      timeout: config.timeout || 60000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiResponse>) => {
        return Promise.reject(this.handleError(error));
      }
    );
  }

  /**
   * Send a chat completion request
   */
  async chat(
    userToken: string,
    messages: Message[],
    options: ChatOptions = {}
  ): Promise<ChatResponse> {
    try {
      const response = await this.client.post<ApiResponse<ChatResponse>>('/llm/chat', {
        userToken,
        messages,
        model: options.model,
        maxTokens: options.maxTokens,
        temperature: options.temperature,
      });

      if (!response.data.success || !response.data.data) {
        throw new TokenKitAPIError(
          response.data.error?.message || 'Chat request failed',
          response.data.error?.code || 'CHAT_ERROR',
          response.status,
          response.data.error?.details
        );
      }

      return response.data.data;
    } catch (error) {
      if (error instanceof TokenKitAPIError) {
        throw error;
      }
      throw this.handleError(error);
    }
  }

  /**
   * Validate a user token
   */
  async validateToken(userToken: string): Promise<TokenValidationResponse> {
    try {
      const response = await this.client.post<ApiResponse<TokenValidationResponse>>(
        '/tokens/validate',
        { userToken }
      );

      if (!response.data.success || !response.data.data) {
        throw new TokenKitAPIError(
          response.data.error?.message || 'Token validation failed',
          response.data.error?.code || 'VALIDATION_ERROR',
          response.status,
          response.data.error?.details
        );
      }

      return response.data.data;
    } catch (error) {
      if (error instanceof TokenKitAPIError) {
        throw error;
      }
      throw this.handleError(error);
    }
  }

  /**
   * Get list of available models
   */
  async getModels(): Promise<string[]> {
    try {
      const response = await this.client.get<ApiResponse<ModelsResponse>>('/llm/models');

      if (!response.data.success || !response.data.data) {
        throw new TokenKitAPIError(
          response.data.error?.message || 'Failed to fetch models',
          response.data.error?.code || 'MODELS_ERROR',
          response.status,
          response.data.error?.details
        );
      }

      return response.data.data.models;
    } catch (error) {
      if (error instanceof TokenKitAPIError) {
        throw error;
      }
      throw this.handleError(error);
    }
  }

  /**
   * Handle axios errors and convert to TokenKitAPIError
   */
  private handleError(error: unknown): TokenKitAPIError {
    // Check if it's an axios error (either from axios.isAxiosError or has the shape)
    const isAxios = axios.isAxiosError(error) || (typeof error === 'object' && error !== null && 'isAxiosError' in error);
    
    if (isAxios) {
      const axiosError = error as AxiosError<ApiResponse>;

      // Timeout error
      if (axiosError.code === 'ECONNABORTED') {
        return new TokenKitAPIError(
          'Request timeout',
          'TIMEOUT',
          504
        );
      }

      // Network error
      if (axiosError.code === 'ECONNREFUSED' || !axiosError.response) {
        return new TokenKitAPIError(
          'Unable to connect to Token-Kit API',
          'NETWORK_ERROR',
          503
        );
      }

      // API error response
      if (axiosError.response?.data?.error) {
        return new TokenKitAPIError(
          axiosError.response.data.error.message,
          axiosError.response.data.error.code,
          axiosError.response.status,
          axiosError.response.data.error.details
        );
      }

      // Generic HTTP error
      return new TokenKitAPIError(
        axiosError.message || 'API request failed',
        'API_ERROR',
        axiosError.response?.status
      );
    }

    // Unknown error
    if (error instanceof Error) {
      return new TokenKitAPIError(
        error.message,
        'UNKNOWN_ERROR'
      );
    }

    return new TokenKitAPIError(
      'An unknown error occurred',
      'UNKNOWN_ERROR'
    );
  }
}
