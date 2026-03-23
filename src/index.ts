/**
 * Token-Kit SDK - Main Entry Point
 * Official TypeScript SDK for Token-Kit platform
 */

import { TokenKitClient } from './client';
import {
  TokenKitConfig,
  Message,
  ChatOptions,
  ChatResponse,
  TokenValidationResponse,
  TokenKitAPIError,
  MessageRole,
  ModelInfo,
  ModelsResponse,
} from './types';

/**
 * TokenKit - Main SDK class
 * 
 * Example usage:
 * ```typescript
 * const tokenKit = new TokenKit({ apiKey: 'your-api-key' });
 * 
 * const response = await tokenKit.chat('user-token', [
 *   { role: 'user', content: 'Hello!' }
 * ]);
 * 
 * console.log(response.message.content);
 * ```
 */
export class TokenKit {
  private client: TokenKitClient;
  private userToken: string | null = null;

  /**
   * Create a new TokenKit instance
   * 
   * @param config - Configuration options
   * @param config.apiKey - Your developer API key
   * @param config.baseUrl - API base URL (optional, defaults to production)
   * @param config.timeout - Request timeout in ms (optional, defaults to 60000)
   */
  constructor(config: TokenKitConfig) {
    this.client = new TokenKitClient(config);
  }

  /**
   * Set the user token for subsequent requests
   * This allows you to omit the userToken parameter in other methods
   * 
   * @param userToken - The user's token
   */
  setUserToken(userToken: string): void {
    this.userToken = userToken;
  }

  /**
   * Send a chat completion request
   * 
   * @param userTokenOrMessages - User token string OR array of messages (if user token was set)
   * @param messagesOrOptions - Array of messages OR chat options (if first param is user token)
   * @param options - Chat options (only if first two params are provided)
   * @returns Chat completion response
   * 
   * @example
   * ```typescript
   * // With explicit user token
   * const response = await tokenKit.chat('user-token', [
   *   { role: 'user', content: 'What is Token-Kit?' }
   * ]);
   * 
   * // With pre-set user token
   * tokenKit.setUserToken('user-token');
   * const response = await tokenKit.chat([
   *   { role: 'user', content: 'What is Token-Kit?' }
   * ]);
   * 
   * // With options
   * const response = await tokenKit.chat('user-token', [
   *   { role: 'system', content: 'You are a helpful assistant.' },
   *   { role: 'user', content: 'Hello!' }
   * ], {
   *   model: 'gpt-4o',
   *   maxTokens: 200,
   *   temperature: 0.8
   * });
   * ```
   */
  async chat(
    userTokenOrMessages: string | Message[],
    messagesOrOptions?: Message[] | ChatOptions,
    options?: ChatOptions
  ): Promise<ChatResponse> {
    let userToken: string;
    let messages: Message[];
    let chatOptions: ChatOptions | undefined;

    // Parse overloaded parameters
    if (typeof userTokenOrMessages === 'string') {
      // chat(userToken, messages, options?)
      userToken = userTokenOrMessages;
      messages = messagesOrOptions as Message[];
      chatOptions = options;
    } else {
      // chat(messages, options?)
      if (!this.userToken) {
        throw new Error('User token not set. Call setUserToken() first or pass userToken to chat().');
      }
      userToken = this.userToken;
      messages = userTokenOrMessages;
      chatOptions = messagesOrOptions as ChatOptions | undefined;
    }

    if (!messages || messages.length === 0) {
      throw new Error('Messages array cannot be empty');
    }

    return this.client.chat(userToken, messages, chatOptions);
  }

  /**
   * Validate a user token and check balance
   * 
   * @param userToken - User token to validate (optional if already set)
   * @returns Token validation response with balance and limits
   * 
   * @example
   * ```typescript
   * const validation = await tokenKit.validateToken('user-token');
   * console.log('Balance:', validation.balance);
   * console.log('Daily spending:', validation.dailySpending);
   * ```
   */
  async validateToken(userToken?: string): Promise<TokenValidationResponse> {
    const token = userToken || this.userToken;
    if (!token) {
      throw new Error('User token not set. Call setUserToken() first or pass userToken to validateToken().');
    }
    return this.client.validateToken(token);
  }

  /**
   * Get balance for the current user token
   * 
   * @param userToken - User token (optional if already set)
   * @returns Current token balance
   * 
   * @example
   * ```typescript
   * const balance = await tokenKit.getBalance('user-token');
   * console.log(`You have ${balance} tokens remaining`);
   * ```
   */
  async getBalance(userToken?: string): Promise<number> {
    const validation = await this.validateToken(userToken);
    return validation.balance || 0;
  }

  /**
   * Get list of available LLM models
   * 
   * @returns Array of model names
   * 
   * @example
   * ```typescript
   * const response = await tokenKit.getModels();
   * console.log('Available models:', models);
   * // ['claude-3.5-haiku', 'claude-sonnet-4', 'nova-micro', 'nova-lite', 'gpt-4o', 'gpt-4o-mini']
   * ```
   */
  async getModels(): Promise<string[]> {
    return this.client.getModels();
  }

  /**
   * Helper method to create a simple user message
   * 
   * @param content - Message content
   * @returns Message object
   */
  static user(content: string): Message {
    return { role: 'user', content };
  }

  /**
   * Helper method to create a system message
   * 
   * @param content - Message content
   * @returns Message object
   */
  static system(content: string): Message {
    return { role: 'system', content };
  }

  /**
   * Helper method to create an assistant message
   * 
   * @param content - Message content
   * @returns Message object
   */
  static assistant(content: string): Message {
    return { role: 'assistant', content };
  }
}

// Re-export types for convenience
export type {
  TokenKitConfig,
  Message,
  MessageRole,
  ChatOptions,
  ChatResponse,
  TokenValidationResponse,
  ModelInfo,
  ModelsResponse,
};

export { TokenKitAPIError };

// Default export
export default TokenKit;
