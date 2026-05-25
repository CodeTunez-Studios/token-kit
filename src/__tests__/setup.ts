/**
 * Test setup and utilities
 */

import { Message, ChatResponse, TokenValidationResponse } from '../types';

/**
 * Mock factory for creating test data
 */
export const mockFactory = {
  message: (role: 'user' | 'system' | 'assistant' = 'user', content = 'Test message'): Message => ({
    role,
    content,
  }),

  chatResponse: (overrides?: Partial<ChatResponse>): ChatResponse => ({
    id: 'chat_test_123',
    model: 'gpt-4o-mini',
    message: {
      role: 'assistant',
      content: 'This is a test response',
    },
    tokensUsed: {
      prompt: 10,
      completion: 20,
      total: 30,
    },
    tokensDeducted: 30,
    finishReason: 'stop',
    userBalance: 970,
    latency: 500,
    ...overrides,
  }),

  validationResponse: (overrides?: Partial<TokenValidationResponse>): TokenValidationResponse => ({
    valid: true,
    user: {
      id: 'user_test_123',
      email: 'test@example.com',
    },
    balance: 1000,
    dailySpending: 50,
    monthlySpending: 200,
    limits: {
      dailyLimit: 500,
      monthlyLimit: 5000,
      perRequestLimit: 100,
    },
    ...overrides,
  }),

  apiResponse: <T>(data: T) => ({
    success: true,
    data,
  }),

  apiError: (code: string, message: string, statusCode = 400) => ({
    success: false,
    error: {
      code,
      message,
    },
    statusCode,
  }),
};

/**
 * Common test constants
 */
export const testConstants = {
  apiKey: 'dev_test_api_key_123',
  clientId: 'app_test_client_id_123',
  userToken: 'ut_test_user_token_123',
  baseUrl: 'https://api.token-kit.com/api/v1',
};
