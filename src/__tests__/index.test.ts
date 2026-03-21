/**
 * TokenKit Tests
 * Tests for the main user-facing SDK class
 */

import TokenKit from '../index';
import { TokenKitClient } from '../client';
import { mockFactory, testConstants } from './setup';

// Mock the TokenKitClient
jest.mock('../client');
const MockedTokenKitClient = TokenKitClient as jest.MockedClass<typeof TokenKitClient>;

describe('TokenKit', () => {
  let tokenKit: TokenKit;
  let mockClient: jest.Mocked<TokenKitClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock client instance
    mockClient = {
      chat: jest.fn(),
      validateToken: jest.fn(),
      getModels: jest.fn(),
    } as any;

    MockedTokenKitClient.mockImplementation(() => mockClient);

    // Create TokenKit instance
    tokenKit = new TokenKit({
      apiKey: testConstants.apiKey,
    });
  });

  describe('constructor', () => {
    it('should create TokenKitClient with config', () => {
      expect(MockedTokenKitClient).toHaveBeenCalledWith({
        apiKey: testConstants.apiKey,
      });
    });

    it('should pass baseUrl to client if provided', () => {
      new TokenKit({
        apiKey: testConstants.apiKey,
        baseUrl: 'http://localhost:3000',
      });

      expect(MockedTokenKitClient).toHaveBeenCalledWith({
        apiKey: testConstants.apiKey,
        baseUrl: 'http://localhost:3000',
      });
    });

    it('should pass timeout to client if provided', () => {
      new TokenKit({
        apiKey: testConstants.apiKey,
        timeout: 30000,
      });

      expect(MockedTokenKitClient).toHaveBeenCalledWith({
        apiKey: testConstants.apiKey,
        timeout: 30000,
      });
    });
  });

  describe('setUserToken()', () => {
    it('should store user token', () => {
      tokenKit.setUserToken('ut_test_123');
      // Token is stored internally, tested via chat() method
      expect(() => tokenKit.setUserToken('ut_test_123')).not.toThrow();
    });
  });

  describe('chat() - with explicit userToken', () => {
    const userToken = testConstants.userToken;
    const messages = [TokenKit.user('Hello')];
    const mockResponse = mockFactory.chatResponse();

    beforeEach(() => {
      mockClient.chat.mockResolvedValue(mockResponse);
    });

    it('should call client.chat with userToken and messages', async () => {
      await tokenKit.chat(userToken, messages);

      expect(mockClient.chat).toHaveBeenCalledWith(userToken, messages, undefined);
    });

    it('should call client.chat with options', async () => {
      const options = {
        model: 'gpt-4',
        maxTokens: 100,
        temperature: 0.8,
      };

      await tokenKit.chat(userToken, messages, options);

      expect(mockClient.chat).toHaveBeenCalledWith(userToken, messages, options);
    });

    it('should return chat response', async () => {
      const result = await tokenKit.chat(userToken, messages);

      expect(result).toEqual(mockResponse);
    });
  });

  describe('chat() - with implicit userToken', () => {
    const userToken = testConstants.userToken;
    const messages = [TokenKit.user('Hello')];
    const mockResponse = mockFactory.chatResponse();

    beforeEach(() => {
      mockClient.chat.mockResolvedValue(mockResponse);
      tokenKit.setUserToken(userToken);
    });

    it('should use stored userToken when not provided', async () => {
      await tokenKit.chat(messages);

      expect(mockClient.chat).toHaveBeenCalledWith(userToken, messages, undefined);
    });

    it('should use stored userToken with options', async () => {
      const options = { model: 'gpt-4' };

      await tokenKit.chat(messages, options);

      expect(mockClient.chat).toHaveBeenCalledWith(userToken, messages, options);
    });

    it('should throw error if userToken not set', async () => {
      const freshTokenKit = new TokenKit({ apiKey: testConstants.apiKey });

      await expect(freshTokenKit.chat(messages)).rejects.toThrow(
        'User token not set. Call setUserToken() first or pass userToken to chat().'
      );
    });
  });

  describe('validateToken()', () => {
    const userToken = testConstants.userToken;
    const mockValidation = mockFactory.validationResponse();

    beforeEach(() => {
      mockClient.validateToken.mockResolvedValue(mockValidation);
    });

    it('should call client.validateToken with explicit token', async () => {
      await tokenKit.validateToken(userToken);

      expect(mockClient.validateToken).toHaveBeenCalledWith(userToken);
    });

    it('should use stored userToken when not provided', async () => {
      tokenKit.setUserToken(userToken);

      await tokenKit.validateToken();

      expect(mockClient.validateToken).toHaveBeenCalledWith(userToken);
    });

    it('should throw error if no token available', async () => {
      await expect(tokenKit.validateToken()).rejects.toThrow(
        'User token not set. Call setUserToken() first or pass userToken to validateToken().'
      );
    });

    it('should return validation response', async () => {
      const result = await tokenKit.validateToken(userToken);

      expect(result).toEqual(mockValidation);
    });
  });

  describe('getBalance()', () => {
    const userToken = testConstants.userToken;
    const mockValidation = mockFactory.validationResponse({ balance: 1500 });

    beforeEach(() => {
      mockClient.validateToken.mockResolvedValue(mockValidation);
    });

    it('should call validateToken and return balance', async () => {
      const balance = await tokenKit.getBalance(userToken);

      expect(mockClient.validateToken).toHaveBeenCalledWith(userToken);
      expect(balance).toBe(1500);
    });

    it('should use stored userToken when not provided', async () => {
      tokenKit.setUserToken(userToken);

      const balance = await tokenKit.getBalance();

      expect(mockClient.validateToken).toHaveBeenCalledWith(userToken);
      expect(balance).toBe(1500);
    });

    it('should throw error if no token available', async () => {
      await expect(tokenKit.getBalance()).rejects.toThrow(
        'User token not set. Call setUserToken() first or pass userToken to validateToken().'
      );
    });

    it('should return 0 if balance is undefined', async () => {
      mockClient.validateToken.mockResolvedValue(
        mockFactory.validationResponse({ balance: undefined })
      );

      const balance = await tokenKit.getBalance(userToken);

      expect(balance).toBe(0);
    });
  });

  describe('getModels()', () => {
    it('should call client.getModels', async () => {
      const models = ['gpt-3.5-turbo', 'gpt-4'];
      mockClient.getModels.mockResolvedValue(models);

      const result = await tokenKit.getModels();

      expect(mockClient.getModels).toHaveBeenCalled();
      expect(result).toEqual(models);
    });
  });

  describe('Static Helper Methods', () => {
    describe('user()', () => {
      it('should create user message', () => {
        const message = TokenKit.user('Hello');

        expect(message).toEqual({
          role: 'user',
          content: 'Hello',
        });
      });
    });

    describe('system()', () => {
      it('should create system message', () => {
        const message = TokenKit.system('You are a helpful assistant');

        expect(message).toEqual({
          role: 'system',
          content: 'You are a helpful assistant',
        });
      });
    });

    describe('assistant()', () => {
      it('should create assistant message', () => {
        const message = TokenKit.assistant('Hello! How can I help?');

        expect(message).toEqual({
          role: 'assistant',
          content: 'Hello! How can I help?',
        });
      });
    });
  });

  describe('Real Usage Patterns', () => {
    it('should support session-style usage', async () => {
      const mockResponse = mockFactory.chatResponse();
      mockClient.chat.mockResolvedValue(mockResponse);
      mockClient.validateToken.mockResolvedValue(
        mockFactory.validationResponse({ balance: 1000 })
      );

      tokenKit.setUserToken('ut_test_123');

      // Multiple calls without passing token
      await tokenKit.chat([TokenKit.user('First message')]);
      await tokenKit.chat([TokenKit.user('Second message')]);
      const balance = await tokenKit.getBalance();

      expect(mockClient.chat).toHaveBeenCalledTimes(2);
      expect(balance).toBe(1000);
    });

    it('should support multi-user pattern', async () => {
      const mockResponse = mockFactory.chatResponse();
      mockClient.chat.mockResolvedValue(mockResponse);

      // Different users
      await tokenKit.chat('ut_user_1', [TokenKit.user('User 1 message')]);
      await tokenKit.chat('ut_user_2', [TokenKit.user('User 2 message')]);

      expect(mockClient.chat).toHaveBeenNthCalledWith(
        1,
        'ut_user_1',
        expect.any(Array),
        undefined
      );
      expect(mockClient.chat).toHaveBeenNthCalledWith(
        2,
        'ut_user_2',
        expect.any(Array),
        undefined
      );
    });

    it('should support conversation with context', async () => {
      const messages = [TokenKit.system('You are a tutor.')];
      mockClient.chat.mockResolvedValue(mockFactory.chatResponse());

      // Turn 1
      messages.push(TokenKit.user('What is TypeScript?'));
      const response1 = await tokenKit.chat('ut_test', messages);
      messages.push(response1.message);

      // Turn 2
      messages.push(TokenKit.user('Give an example'));
      await tokenKit.chat('ut_test', messages);

      expect(mockClient.chat).toHaveBeenNthCalledWith(
        1,
        'ut_test',
        expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user', content: 'What is TypeScript?' }),
        ]),
        undefined
      );

      expect(mockClient.chat).toHaveBeenNthCalledWith(
        2,
        'ut_test',
        expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user', content: 'What is TypeScript?' }),
          expect.objectContaining({ role: 'assistant' }),
          expect.objectContaining({ role: 'user', content: 'Give an example' }),
        ]),
        undefined
      );
    });
  });
});
