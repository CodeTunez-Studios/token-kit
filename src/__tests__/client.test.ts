/**
 * TokenKitClient Tests
 * Tests for the low-level HTTP client
 */

import axios from 'axios';
import { TokenKitClient } from '../client';
import { TokenKitAPIError } from '../types';
import { mockFactory, testConstants } from './setup';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TokenKitClient', () => {
  let client: TokenKitClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      interceptors: {
        response: {
          use: jest.fn(),
        },
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    // Create client
    client = new TokenKitClient({
      apiKey: testConstants.apiKey,
      baseUrl: testConstants.baseUrl,
    });
  });

  describe('constructor', () => {
    it('should create axios instance with correct config', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: testConstants.baseUrl,
        timeout: 60000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testConstants.apiKey}`,
        },
      });
    });

    it('should use custom timeout if provided', () => {
      new TokenKitClient({
        apiKey: testConstants.apiKey,
        timeout: 30000,
      });

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 30000,
        })
      );
    });

    it('should register response interceptor', () => {
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('chat()', () => {
    const userToken = testConstants.userToken;
    const messages = [mockFactory.message('user', 'Hello')];

    it('should make POST request to /llm/chat', async () => {
      const mockResponse = mockFactory.chatResponse();
      mockAxiosInstance.post.mockResolvedValue({
        data: mockFactory.apiResponse(mockResponse),
      });

      await client.chat(userToken, messages);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/llm/chat', {
        userToken,
        messages,
      });
    });

    it('should include options in request', async () => {
      const mockResponse = mockFactory.chatResponse();
      mockAxiosInstance.post.mockResolvedValue({
        data: mockFactory.apiResponse(mockResponse),
      });

      const options = {
        model: 'gpt-4o',
        maxTokens: 100,
        temperature: 0.8,
      };

      await client.chat(userToken, messages, options);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/llm/chat', {
        userToken,
        messages,
        ...options,
      });
    });

    it('should return chat response on success', async () => {
      const mockResponse = mockFactory.chatResponse();
      mockAxiosInstance.post.mockResolvedValue({
        data: mockFactory.apiResponse(mockResponse),
      });

      const result = await client.chat(userToken, messages);

      expect(result).toEqual(mockResponse);
    });

    it('should throw TokenKitAPIError on API error', async () => {
      const errorResponse = {
        isAxiosError: true,
        response: {
          data: {
            success: false,
            error: {
              code: 'INSUFFICIENT_BALANCE',
              message: 'Not enough tokens',
            },
          },
          status: 402,
        },
      };

      mockAxiosInstance.post.mockRejectedValue(errorResponse);

      await expect(client.chat(userToken, messages)).rejects.toThrow(TokenKitAPIError);
    });

    it('should throw TokenKitAPIError on timeout', async () => {
      const timeoutError = {
        isAxiosError: true,
        code: 'ECONNABORTED',
        message: 'timeout of 60000ms exceeded',
      };

      mockAxiosInstance.post.mockRejectedValue(timeoutError);

      await expect(client.chat(userToken, messages)).rejects.toThrow(TokenKitAPIError);
      await expect(client.chat(userToken, messages)).rejects.toMatchObject({
        code: 'TIMEOUT',
      });
    });

    it('should throw TokenKitAPIError on network error', async () => {
      const networkError = {
        isAxiosError: true,
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED',
      };

      mockAxiosInstance.post.mockRejectedValue(networkError);

      await expect(client.chat(userToken, messages)).rejects.toThrow(TokenKitAPIError);
      await expect(client.chat(userToken, messages)).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
      });
    });
  });

  describe('validateToken()', () => {
    const userToken = testConstants.userToken;

    it('should make POST request to /tokens/validate', async () => {
      const mockResponse = mockFactory.validationResponse();
      mockAxiosInstance.post.mockResolvedValue({
        data: mockFactory.apiResponse(mockResponse),
      });

      await client.validateToken(userToken);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/tokens/validate', {
        userToken,
      });
    });

    it('should return validation response on success', async () => {
      const mockResponse = mockFactory.validationResponse();
      mockAxiosInstance.post.mockResolvedValue({
        data: mockFactory.apiResponse(mockResponse),
      });

      const result = await client.validateToken(userToken);

      expect(result).toEqual(mockResponse);
    });

    it('should throw TokenKitAPIError on invalid token', async () => {
      const errorResponse = {
        isAxiosError: true,
        response: {
          data: {
            success: false,
            error: {
              code: 'INVALID_TOKEN',
              message: 'Token not found',
            },
          },
          status: 401,
        },
      };

      mockAxiosInstance.post.mockRejectedValue(errorResponse);

      await expect(client.validateToken(userToken)).rejects.toThrow(TokenKitAPIError);
      await expect(client.validateToken(userToken)).rejects.toMatchObject({
        code: 'INVALID_TOKEN',
        statusCode: 401,
      });
    });
  });

  describe('getModels()', () => {
    it('should make GET request to /llm/models', async () => {
      const models = ['gpt-4o-mini', 'gpt-4o'];
      mockAxiosInstance.get.mockResolvedValue({
        data: mockFactory.apiResponse({ models }),
      });

      await client.getModels();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/llm/models');
    });

    it('should return array of models on success', async () => {
      const models = ['gpt-4o-mini', 'gpt-4o', 'claude-sonnet-4'];
      mockAxiosInstance.get.mockResolvedValue({
        data: mockFactory.apiResponse({ models }),
      });

      const result = await client.getModels();

      expect(result).toEqual(models);
    });

    it('should throw TokenKitAPIError on error', async () => {
      const errorResponse = {
        isAxiosError: true,
        response: {
          data: {
            success: false,
            error: {
              code: 'INVALID_API_KEY',
              message: 'Invalid API key',
            },
          },
          status: 401,
        },
      };

      mockAxiosInstance.get.mockRejectedValue(errorResponse);

      await expect(client.getModels()).rejects.toThrow(TokenKitAPIError);
    });
  });

  describe('Error Handling', () => {
    it('should extract error code from API response', async () => {
      const errorResponse = {
        isAxiosError: true,
        response: {
          data: {
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests',
            },
          },
          status: 429,
        },
      };

      mockAxiosInstance.post.mockRejectedValue(errorResponse);

      try {
        await client.chat(testConstants.userToken, [mockFactory.message()]);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(TokenKitAPIError);
        expect((error as TokenKitAPIError).code).toBe('RATE_LIMIT_EXCEEDED');
        expect((error as TokenKitAPIError).message).toBe('Too many requests');
        expect((error as TokenKitAPIError).statusCode).toBe(429);
      }
    });

    it('should handle errors without response', async () => {
      const genericError = new Error('Unknown error');

      mockAxiosInstance.post.mockRejectedValue(genericError);

      try {
        await client.chat(testConstants.userToken, [mockFactory.message()]);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(TokenKitAPIError);
        expect((error as TokenKitAPIError).code).toBe('UNKNOWN_ERROR');
      }
    });
  });
});
