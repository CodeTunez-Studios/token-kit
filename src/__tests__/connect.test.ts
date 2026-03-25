/**
 * @jest-environment jsdom
 *
 * Unit tests for connectViaPortal()
 */

import {
  connectViaPortal,
  TokenKitConnectCancelledError,
  getStoredUserToken,
  clearStoredUserToken,
} from '../connect';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Build a minimal mock for window.open that returns a controllable popup object */
function makePopupMock(closed = false) {
  return {
    closed,
    close: jest.fn(),
  };
}

// ── Setup ──────────────────────────────────────────────────────────────────

const PORTAL_URL = 'https://ai-tokens.me';
const APP_ID = 'dev_test_abc123';
const TOKEN = 'ut_test_token_xyz';

let messageListeners: Array<(event: MessageEvent) => void> = [];
let openMock: jest.SpyInstance;
let removeEventListenerSpy: jest.SpyInstance;
let localStorageGetSpy: jest.SpyInstance;
let localStorageSetSpy: jest.SpyInstance;
let localStorageRemoveSpy: jest.SpyInstance;

beforeEach(() => {
  jest.useFakeTimers();
  messageListeners = [];

  openMock = jest.spyOn(window, 'open').mockReturnValue(makePopupMock() as unknown as Window);

  jest
    .spyOn(window, 'addEventListener')
    .mockImplementation((type, handler) => {
      if (type === 'message') {
        messageListeners.push(handler as (event: MessageEvent) => void);
      }
    });

  removeEventListenerSpy = jest
    .spyOn(window, 'removeEventListener')
    .mockImplementation(() => {});

  localStorageSetSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
  localStorageGetSpy = jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
  localStorageRemoveSpy = jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('connectViaPortal', () => {
  it('opens a popup with the correct URL', async () => {
    const promise = connectViaPortal({ appId: APP_ID, portalUrl: PORTAL_URL });

    expect(openMock).toHaveBeenCalledWith(
      expect.stringContaining(`/connect?appId=${encodeURIComponent(APP_ID)}`),
      'tokenkit-connect',
      expect.any(String)
    );

    // Resolve immediately to avoid test hanging
    const event = new MessageEvent('message', {
      origin: PORTAL_URL,
      data: { type: 'TOKEN_KIT_TOKEN', token: TOKEN, appId: APP_ID },
    });
    messageListeners.forEach((l) => l(event));

    await expect(promise).resolves.toBe(TOKEN);
  });

  it('resolves with token when a valid TOKEN_KIT_TOKEN message is received', async () => {
    const promise = connectViaPortal({ appId: APP_ID, portalUrl: PORTAL_URL });

    const event = new MessageEvent('message', {
      origin: PORTAL_URL,
      data: { type: 'TOKEN_KIT_TOKEN', token: TOKEN, appId: APP_ID },
    });
    messageListeners.forEach((l) => l(event));

    await expect(promise).resolves.toBe(TOKEN);
    expect(localStorageSetSpy).toHaveBeenCalledWith('tokenkit_user_token', TOKEN);
  });

  it('ignores messages from unexpected origins', async () => {
    const promise = connectViaPortal({ appId: APP_ID, portalUrl: PORTAL_URL });

    // Wrong origin — should be ignored
    const wrongOriginEvent = new MessageEvent('message', {
      origin: 'https://evil.example.com',
      data: { type: 'TOKEN_KIT_TOKEN', token: 'stolen', appId: APP_ID },
    });
    messageListeners.forEach((l) => l(wrongOriginEvent));

    // Correct origin — should resolve
    const goodEvent = new MessageEvent('message', {
      origin: PORTAL_URL,
      data: { type: 'TOKEN_KIT_TOKEN', token: TOKEN, appId: APP_ID },
    });
    messageListeners.forEach((l) => l(goodEvent));

    await expect(promise).resolves.toBe(TOKEN);
    // Only the legitimate token should be stored
    expect(localStorageSetSpy).toHaveBeenCalledWith('tokenkit_user_token', TOKEN);
    expect(localStorageSetSpy).not.toHaveBeenCalledWith('tokenkit_user_token', 'stolen');
  });

  it('ignores messages with wrong type', async () => {
    const promise = connectViaPortal({ appId: APP_ID, portalUrl: PORTAL_URL });

    const wrongTypeEvent = new MessageEvent('message', {
      origin: PORTAL_URL,
      data: { type: 'SOME_OTHER_TYPE', token: TOKEN },
    });
    messageListeners.forEach((l) => l(wrongTypeEvent));

    // Now send the correct message
    const goodEvent = new MessageEvent('message', {
      origin: PORTAL_URL,
      data: { type: 'TOKEN_KIT_TOKEN', token: TOKEN, appId: APP_ID },
    });
    messageListeners.forEach((l) => l(goodEvent));

    await expect(promise).resolves.toBe(TOKEN);
  });

  it('rejects with TokenKitConnectCancelledError when popup is closed without confirming', async () => {
    const popup = makePopupMock(false);
    openMock.mockReturnValue(popup as unknown as Window);

    const promise = connectViaPortal({ appId: APP_ID, portalUrl: PORTAL_URL });

    // Simulate user closing the popup
    popup.closed = true;
    jest.advanceTimersByTime(500);

    await expect(promise).rejects.toBeInstanceOf(TokenKitConnectCancelledError);
    await expect(promise).rejects.toMatchObject({
      name: 'TokenKitConnectCancelledError',
    });
  });

  it('throws immediately when popup cannot be opened', async () => {
    openMock.mockReturnValue(null);

    await expect(
      connectViaPortal({ appId: APP_ID, portalUrl: PORTAL_URL })
    ).rejects.toThrow('Failed to open Token-Kit connect popup');
  });

  it('removes the message event listener after resolving', async () => {
    const promise = connectViaPortal({ appId: APP_ID, portalUrl: PORTAL_URL });

    const event = new MessageEvent('message', {
      origin: PORTAL_URL,
      data: { type: 'TOKEN_KIT_TOKEN', token: TOKEN, appId: APP_ID },
    });
    messageListeners.forEach((l) => l(event));
    await promise;

    expect(removeEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function));
  });
});

describe('getStoredUserToken', () => {
  it('returns null when no token is stored', () => {
    localStorageGetSpy.mockReturnValue(null);
    expect(getStoredUserToken()).toBeNull();
  });

  it('returns the stored token string', () => {
    localStorageGetSpy.mockReturnValue(TOKEN);
    expect(getStoredUserToken()).toBe(TOKEN);
  });
});

describe('clearStoredUserToken', () => {
  it('removes the token from localStorage', () => {
    clearStoredUserToken();
    expect(localStorageRemoveSpy).toHaveBeenCalledWith('tokenkit_user_token');
  });
});
