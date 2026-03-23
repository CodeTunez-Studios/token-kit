/**
 * Integration Test Example
 * Shows how to test applications that use Token-Kit SDK
 */

import TokenKit from '../index';
import { TokenKitAPIError } from '../types';

/**
 * Example: Chatbot Service
 * Demonstrates dependency injection for testing
 */
class ChatbotService {
  constructor(private tokenKit: TokenKit) {}

  async chat(userToken: string, message: string): Promise<string> {
    try {
      // Check balance first
      const balance = await this.tokenKit.getBalance(userToken);

      if (balance < 10) {
        throw new Error('Insufficient balance. Please add more tokens.');
      }

      // Send chat request
      const response = await this.tokenKit.chat(userToken, [
        TokenKit.system('You are a helpful assistant.'),
        TokenKit.user(message),
      ]);

      return response.message.content;
    } catch (error) {
      if (error instanceof TokenKitAPIError) {
        const apiError = error as TokenKitAPIError;
        if (apiError.code === 'INSUFFICIENT_BALANCE') {
          throw new Error('Not enough tokens. Please purchase more.');
        }
        if (apiError.code === 'INVALID_TOKEN') {
          throw new Error('Invalid user token. Please login again.');
        }
      }
      throw error;
    }
  }

  async isTokenValid(userToken: string): Promise<boolean> {
    try {
      const validation = await this.tokenKit.validateToken(userToken);
      return validation.valid;
    } catch (error) {
      return false;
    }
  }
}

describe('ChatbotService Integration', () => {
  let chatbotService: ChatbotService;
  let mockTokenKit: jest.Mocked<TokenKit>;

  beforeEach(() => {
    // Create a mock TokenKit instance
    mockTokenKit = {
      chat: jest.fn(),
      getBalance: jest.fn(),
      validateToken: jest.fn(),
      getModels: jest.fn(),
      setUserToken: jest.fn(),
    } as unknown as jest.Mocked<TokenKit>;

    // Inject the mock via dependency injection
    chatbotService = new ChatbotService(mockTokenKit);
  });

  describe('chat()', () => {
    it('should check balance before sending message', async () => {
      mockTokenKit.getBalance.mockResolvedValue(100);
      mockTokenKit.chat.mockResolvedValue({
        id: 'chat_123',
        model: 'gpt-4o-mini',
        message: { role: 'assistant', content: 'Hello!' },
        tokensUsed: { prompt: 5, completion: 10, total: 15 },
        tokensDeducted: 15,
        finishReason: 'stop',
        userBalance: 85,
      });

      await chatbotService.chat('ut_test', 'Hello');

      expect(mockTokenKit.getBalance).toHaveBeenCalledWith('ut_test');
    });

    it('should throw error if balance is low', async () => {
      mockTokenKit.getBalance.mockResolvedValue(5);

      await expect(chatbotService.chat('ut_test', 'Hello')).rejects.toThrow(
        'Insufficient balance'
      );

      expect(mockTokenKit.chat).not.toHaveBeenCalled();
    });

    it('should send chat request with system message', async () => {
      mockTokenKit.getBalance.mockResolvedValue(100);
      mockTokenKit.chat.mockResolvedValue({
        id: 'chat_123',
        model: 'gpt-4o-mini',
        message: { role: 'assistant', content: 'Hello!' },
        tokensUsed: { prompt: 5, completion: 10, total: 15 },
        tokensDeducted: 15,
        finishReason: 'stop',
      });

      await chatbotService.chat('ut_test', 'Hello');

      expect(mockTokenKit.chat).toHaveBeenCalledWith('ut_test', [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello' },
      ]);
    });

    it('should return assistant response', async () => {
      mockTokenKit.getBalance.mockResolvedValue(100);
      mockTokenKit.chat.mockResolvedValue({
        id: 'chat_123',
        model: 'gpt-4o-mini',
        message: { role: 'assistant', content: 'Hello! How can I help?' },
        tokensUsed: { prompt: 5, completion: 10, total: 15 },
        tokensDeducted: 15,
        finishReason: 'stop',
      });

      const response = await chatbotService.chat('ut_test', 'Hello');

      expect(response).toBe('Hello! How can I help?');
    });

    it('should handle INSUFFICIENT_BALANCE error', async () => {
      mockTokenKit.getBalance.mockResolvedValue(100);
      mockTokenKit.chat.mockRejectedValue(
        new TokenKitAPIError('Not enough tokens', 'INSUFFICIENT_BALANCE', 402)
      );

      await expect(chatbotService.chat('ut_test', 'Hello')).rejects.toThrow(
        'Not enough tokens. Please purchase more.'
      );
    });

    it('should handle INVALID_TOKEN error', async () => {
      mockTokenKit.getBalance.mockResolvedValue(100);
      mockTokenKit.chat.mockRejectedValue(
        new TokenKitAPIError('Token not found', 'INVALID_TOKEN', 401)
      );

      await expect(chatbotService.chat('ut_test', 'Hello')).rejects.toThrow(
        'Invalid user token. Please login again.'
      );
    });
  });

  describe('isTokenValid()', () => {
    it('should return true for valid token', async () => {
      mockTokenKit.validateToken.mockResolvedValue({
        valid: true,
        user: {
          id: 'user_123',
          email: 'test@example.com',
        },
        balance: 1000,
      });

      const isValid = await chatbotService.isTokenValid('ut_test');

      expect(isValid).toBe(true);
    });

    it('should return false for invalid token', async () => {
      mockTokenKit.validateToken.mockRejectedValue(
        new TokenKitAPIError('Token not found', 'INVALID_TOKEN', 401)
      );

      const isValid = await chatbotService.isTokenValid('ut_test');

      expect(isValid).toBe(false);
    });

    it('should return false on network error', async () => {
      mockTokenKit.validateToken.mockRejectedValue(
        new TokenKitAPIError('Cannot connect', 'NETWORK_ERROR', 503)
      );

      const isValid = await chatbotService.isTokenValid('ut_test');

      expect(isValid).toBe(false);
    });
  });
});

/**
 * Example: Express Middleware
 */
export function createTokenMiddleware(tokenKit: TokenKit) {
  return async (req: any, res: any, next: any) => {
    const userToken = req.headers['x-user-token'];

    if (!userToken) {
      return res.status(401).json({ error: 'Missing user token' });
    }

    try {
      const validation = await tokenKit.validateToken(userToken as string);

      if (!validation.valid) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      req.user = validation.user;
      req.balance = validation.balance;
      next();
    } catch (error) {
      return res.status(500).json({ error: 'Token validation failed' });
    }
  };
}

describe('Token Middleware Integration', () => {
  let mockTokenKit: jest.Mocked<TokenKit>;
  let middleware: any;

  beforeEach(() => {
    mockTokenKit = {
      validateToken: jest.fn(),
    } as unknown as jest.Mocked<TokenKit>;

    middleware = createTokenMiddleware(mockTokenKit);
  });

  it('should return 401 if no token provided', async () => {
    const req = { headers: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing user token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should validate token and call next()', async () => {
    mockTokenKit.validateToken.mockResolvedValue({
      valid: true,
      user: {
        id: 'user_123',
        email: 'test@example.com',
      },
      balance: 1000,
    });

    const req = { headers: { 'x-user-token': 'ut_test' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await middleware(req, res, next);

    expect(mockTokenKit.validateToken).toHaveBeenCalledWith('ut_test');
    expect(req).toHaveProperty('user');
    expect(req).toHaveProperty('balance', 1000);
    expect(next).toHaveBeenCalled();
  });

  it('should return 401 for invalid token', async () => {
    mockTokenKit.validateToken.mockResolvedValue({
      valid: false,
    });

    const req = { headers: { 'x-user-token': 'ut_invalid' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 500 on validation error', async () => {
    mockTokenKit.validateToken.mockRejectedValue(new Error('Network error'));

    const req = { headers: { 'x-user-token': 'ut_test' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token validation failed' });
    expect(next).not.toHaveBeenCalled();
  });
});
