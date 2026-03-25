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

/** Payload posted from the portal /connect page to the opener. */
interface TokenKitConnectMessage {
  type: 'TOKEN_KIT_TOKEN';
  token: string;
  clientId: string;
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

// ── localStorage key ──────────────────────────────────────────────────────

const STORAGE_KEY = 'tokenkit_user_token';

// ── Implementation ────────────────────────────────────────────────────────

/**
 * Open a Token-Kit portal popup to acquire a user token via postMessage.
 *
 * Flow:
 *  1. Opens `${portalUrl}/connect?appId=...&origin=...` as a 480×640 popup
 *  2. Listens for `message` events filtered to the portal origin and
 *     `type === 'TOKEN_KIT_TOKEN'`
 *  3. On receipt: stores token in localStorage, resolves with the token string
 *  4. If popup is closed without a message: rejects with TokenKitConnectCancelledError
 *
 * @param options - Connection options
 * @returns Promise that resolves with the user token string
 */
export async function connectViaPortal(options: ConnectViaPortalOptions): Promise<string> {
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

  return new Promise<string>((resolve, reject) => {
    function onMessage(event: MessageEvent): void {
      // Only accept messages from the portal origin
      if (event.origin !== new URL(portalUrl).origin) return;

      const data = event.data as Partial<TokenKitConnectMessage>;
      if (data?.type !== 'TOKEN_KIT_TOKEN' || typeof data.token !== 'string' || !data.token) {
        return;
      }

      cleanup();
      localStorage.setItem(STORAGE_KEY, data.token);
      resolve(data.token);
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
