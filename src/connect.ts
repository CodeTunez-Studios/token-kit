/**
 * Token-Kit SDK — Portal Connect Helper
 *
 * Opens a popup to the ai-tokens.me /connect page, listens for the
 * TOKEN_KIT_TOKEN postMessage from the portal, stores the token in
 * localStorage, and resolves a promise with the token string.
 *
 * Rejects with TokenKitConnectCancelledError if the user closes the
 * popup without confirming.
 *
 * Usage:
 * ```typescript
 * import { connectViaPortal } from '@codetunezstudios/token-kit';
 *
 * const userToken = await connectViaPortal({ clientId: 'app_abc123...' });
 * tokenKit.setUserToken(userToken);
 * ```
 */

// ── Types ─────────────────────────────────────────────────────────────────

export interface ConnectViaPortalOptions {
  /** The clientId of the developer app (created in the token-kit.com Apps dashboard). */
  clientId: string;
  /**
   * Base URL of the Token-Kit portal.
   * Defaults to 'https://ai-tokens.me'.
   * Override for local development: 'http://localhost:3000'
   */
  portalUrl?: string;
}

/**
 * Result of a connect attempt.
 * 
 * - If `token` is provided: new token was created, save it securely
 * - If `token` is empty and `existingTokenPrefix` is set: user already has a token,
   they need to retrieve it from the dashboard
 */
export interface ConnectResult {
  /** The user token (only set for new tokens) */
  token: string;
  /** Whether this is a newly created token */
  isNewToken: boolean;
  /** Prefix of existing token if user already has one (e.g., 'ut_abc12345') */
  existingTokenPrefix?: string;
  /** Error code if connection failed */
  errorCode?: string;
  /** Error message if connection failed */
  errorMessage?: string;
}

/** Payload posted from the portal /connect page to the opener. */
interface TokenKitConnectMessage {
  type: 'TOKEN_KIT_TOKEN' | 'TOKEN_KIT_ERROR';
  token?: string;
  clientId?: string;
  isNewToken?: boolean;
  existingTokenPrefix?: string;
  errorCode?: string;
  errorMessage?: string;
}

// ── Error ─────────────────────────────────────────────────────────────────

/**
 * Thrown by connectViaPortal() when the user closes the popup without
 * clicking "Allow Access".
 */
export class TokenKitConnectCancelledError extends Error {
  constructor() {
    super('User closed the Token-Kit connect popup without confirming.');
    this.name = 'TokenKitConnectCancelledError';
    Object.setPrototypeOf(this, TokenKitConnectCancelledError.prototype);
  }
}

/**
 * Thrown when user already has an active token and attempts to connect again.
 * User should retrieve their existing token from the dashboard.
 */
export class TokenKitTokenExistsError extends Error {
  public readonly tokenPrefix: string;
  
  constructor(tokenPrefix: string) {
    super(
      `You already have an active token (${tokenPrefix}...). ` +
      'Please retrieve it from https://ai-tokens.me/dashboard or rotate it in settings.'
    );
    this.name = 'TokenKitTokenExistsError';
    this.tokenPrefix = tokenPrefix;
    Object.setPrototypeOf(this, TokenKitTokenExistsError.prototype);
  }
}

// ── sessionStorage key ──────────────────────────────────────────────────────

const STORAGE_KEY = 'tokenkit_user_token';

// ── Implementation ────────────────────────────────────────────────────────

/**
 * Open a Token-Kit portal popup to acquire a user token via postMessage.
 *
 * Flow:
 *  1. Opens `${portalUrl}/connect?clientId=...&origin=...` as a 480×640 popup
 *  2. Listens for `message` events filtered to the portal origin
 *  3. On success:
 *     a) New user: receives new token, stores in sessionStorage
 *     b) Existing user: receives error indicating token already exists
 *  4. If popup is closed without a message: rejects with TokenKitConnectCancelledError
 *
 * **Important**: Users have ONE global token that works across all apps.
 * If they already have a token, they must retrieve it from the dashboard
 * or explicitly rotate it in settings.
 *
 * @param options - Connection options
 * @returns Promise that resolves with ConnectResult
 * 
 * @example
 * ```typescript
 * try {
 *   const result = await connectViaPortal({ clientId: 'app_123...' });
 *   
 *   if (result.isNewToken && result.token) {
 *     console.log('Save this token:', result.token);
 *     // Token is auto-saved to sessionStorage
 *   } else if (result.existingTokenPrefix) {
 *     console.log('You already have a token:', result.existingTokenPrefix);
 *     console.log('Retrieve it from: https://ai-tokens.me/dashboard');
 *   }
 * } catch (error) {
 *   if (error instanceof TokenKitTokenExistsError) {
 *     console.log('Token prefix:', error.tokenPrefix);
 *   }
 * }
 * ```
 */
export async function connectViaPortal(options: ConnectViaPortalOptions): Promise<ConnectResult> {
  const portalUrl = (options.portalUrl ?? 'https://ai-tokens.me').replace(/\/$/, '');
  const currentOrigin = encodeURIComponent(window.location.origin);
  const url = `${portalUrl}/connect?clientId=${encodeURIComponent(options.clientId)}&origin=${currentOrigin}`;

  const popup = window.open(
    url,
    'tokenkit-connect',
    'width=480,height=640,scrollbars=no,resizable=no,status=no,toolbar=no,menubar=no'
  );

  if (!popup) {
    throw new Error(
      'Failed to open Token-Kit connect popup. ' +
        'Ensure popups are allowed for this origin, or call connectViaPortal() ' +
        'directly from a user gesture (e.g. button click).'
    );
  }

  return new Promise<ConnectResult>((resolve, reject) => {
    function onMessage(event: MessageEvent): void {
      // Only accept messages from the portal origin
      if (event.origin !== new URL(portalUrl).origin) return;

      const data = event.data as Partial<TokenKitConnectMessage>;
      
      // Handle error responses (e.g., token already exists)
      if (data?.type === 'TOKEN_KIT_ERROR') {
        cleanup();
        
        if (data.errorCode === 'TOKEN_ALREADY_EXISTS' && data.existingTokenPrefix) {
          // User already has a token - return info but don't throw
          resolve({
            token: '',
            isNewToken: false,
            existingTokenPrefix: data.existingTokenPrefix,
            errorCode: data.errorCode,
            errorMessage: data.errorMessage,
          });
        } else {
          // Other errors - reject
          reject(new Error(data.errorMessage || 'Connection failed'));
        }
        return;
      }
      
      // Handle success response (new token)
      if (data?.type === 'TOKEN_KIT_TOKEN' && typeof data.token === 'string' && data.token) {
        // MEDIUM-2 fix: validate clientId matches what was requested
        if (data.clientId !== options.clientId) return;

        cleanup();
        localStorage.setItem(STORAGE_KEY, data.token);
        resolve({
          token: data.token,
          isNewToken: data.isNewToken ?? true,
        });
        return;
      }
    }

    // Poll for popup closure — popup.closed is the only reliable cross-browser signal
    const pollInterval = setInterval(() => {
      if (popup.closed) {
        cleanup();
        reject(new TokenKitConnectCancelledError());
      }
    }, 400);

    function cleanup(): void {
      window.removeEventListener('message', onMessage);
      clearInterval(pollInterval);
    }

    window.addEventListener('message', onMessage);
  });
}

/**
 * Retrieve the most recently connected user token from localStorage.
 * Returns null if no token has been stored via connectViaPortal().
 */
export function getStoredUserToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Clear the stored user token from localStorage.
 * Call this on logout.
 */
export function clearStoredUserToken(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore — localStorage unavailable in some environments
  }
}
