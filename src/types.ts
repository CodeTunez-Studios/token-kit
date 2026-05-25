/**
 * Token-Kit SDK - Type Definitions
 * TypeScript types for the Token-Kit SDK
 */

// ============================================================================
// LLM Types
// ============================================================================

export type MessageRole = 'system' | 'user' | 'assistant';

export interface Message {
  role: MessageRole;
  content: string;
}

export interface ChatOptions {
  /** LLM model to use (default: 'gpt-4o-mini') */
  model?: string;
  /** Maximum tokens in response (default: 500) */
  maxTokens?: number;
  /** Temperature for response randomness 0-2 (default: 0.7) */
  temperature?: number;
}

export interface ChatResponse {
  /** Unique chat completion ID */
  id: string;
  /** Model used for completion */
  model: string;
  /** Assistant's response message */
  message: Message;
  /** Token usage statistics */
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  /** Number of tokens deducted from user balance */
  tokensDeducted: number;
  /** Reason completion finished */
  finishReason: string;
  /** User's remaining token balance */
  userBalance?: number;
  /** Response latency in milliseconds */
  latency?: number;
}

// ============================================================================
// Token Validation Types
// ============================================================================

export interface TokenValidationResponse {
  /** Whether the token is valid */
  valid: boolean;
  /** User information */
  user?: {
    id: string;
    email: string;
  };
  /** Current token balance */
  balance?: number;
  /** Daily spending so far */
  dailySpending?: number;
  /** Monthly spending so far */
  monthlySpending?: number;
  /** Spending limits */
  limits?: {
    dailyLimit: number;
    monthlyLimit: number;
    perRequestLimit: number;
  };
}

// ============================================================================
// Model Types
// ============================================================================

export interface ModelInfo {
  /** Model identifier */
  name: string;
  /** Human-readable model name */
  displayName: string;
  /** Token rate multiplier */
  tokenRate: number;
  /** Default max tokens */
  defaultMaxTokens: number;
}

export interface ModelsResponse {
  models: string[];
  count: number;
}

// ============================================================================
// Error Types
// ============================================================================

export interface TokenKitError extends Error {
  /** Error code */
  code: string;
  /** HTTP status code */
  statusCode?: number;
  /** Additional error details */
  details?: unknown;
}

export class TokenKitAPIError extends Error implements TokenKitError {
  code: string;
  statusCode?: number;
  details?: unknown;

  constructor(message: string, code: string, statusCode?: number, details?: unknown) {
    super(message);
    this.name = 'TokenKitAPIError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

// ============================================================================
// SDK Configuration
// ============================================================================

/**
 * Named deployment environments.
 * Maps to the canonical API Gateway URLs for each environment.
 * Use `baseUrl` to override for self-hosted or custom deployments.
 */
export type TokenKitEnvironment = 'production' | 'staging' | 'development';

/** Canonical base URLs per environment — exported for reference */
export const ENVIRONMENT_URLS: Record<TokenKitEnvironment, string> = {
  production:  'https://api.token-kit.com/v1',
  staging:     'https://api-staging.token-kit.com/v1',
  development: 'https://api-dev.token-kit.com/v1',
};

export interface TokenKitConfig {
  /** Developer API key */
  apiKey: string;
  /**
   * Client ID of your registered app.
   * Required for app-bound tokens. Create apps in the Token-Kit developer portal.
   */
  clientId: string;
  /**
   * Named environment shorthand. Resolves to the canonical API URL.
   * Ignored when `baseUrl` is also provided (baseUrl takes precedence).
   * Defaults to `'production'` when neither is set.
   */
  environment?: TokenKitEnvironment;
  /**
   * Explicit API Gateway base URL.
   * Use this for self-hosted deployments or local development.
   * Takes precedence over `environment`.
   */
  baseUrl?: string;
  /** Request timeout in milliseconds (default: 60000) */
  timeout?: number;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    requestId: string;
    timestamp: string;
    latency?: number;
  };
}
