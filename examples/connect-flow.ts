/**
 * Token-Kit SDK - Connect Flow Example
 * Shows how to handle both new users and returning users
 */

import TokenKit from '../src/index';
import { connectViaPortal, TokenKitTokenExistsError } from '../src/connect';

/**
 * Example 1: Basic connect flow with proper error handling
 */
async function basicConnectFlow() {
  try {
    const result = await connectViaPortal({
      clientId: 'app_xxxxxxxx_your_client_id_here',
      portalUrl: 'https://ai-tokens.me', // optional, this is the default
    });

    if (result.isNewToken && result.token) {
      // New user - save the token securely
      console.log('Welcome! Your new token:', result.token);
      console.log('This token is also saved in sessionStorage.');
      
      // Store in your app (e.g., localStorage, secure cookie, etc.)
      localStorage.setItem('user_token', result.token);
      
      // Initialize SDK
      const tokenKit = new TokenKit({
        apiKey: process.env.TOKENKIT_API_KEY!,
        clientId: 'app_xxxxxxxx_your_client_id_here',
      });
      
      tokenKit.setUserToken(result.token);
      console.log('✓ Token Kit initialized and ready to use!');
      
    } else if (result.existingTokenPrefix) {
      // Returning user - they already have a token
      console.log('You already have an active token!');
      console.log('Token starts with:', result.existingTokenPrefix);
      console.log('');
      console.log('Please retrieve your token from:');
      console.log('https://ai-tokens.me/dashboard');
      console.log('');
      console.log('Or rotate your token if you have lost access.');
      
      // Prompt user to enter their existing token
      const existingToken = prompt('Enter your existing token:');
      if (existingToken) {
        localStorage.setItem('user_token', existingToken);
        console.log('✓ Token saved!');
      }
    }
    
  } catch (error) {
    if (error instanceof TokenKitTokenExistsError) {
      console.error('Token exists:', error.tokenPrefix);
      console.error(error.message);
    } else {
      console.error('Connection failed:', error);
    }
  }
}

/**
 * Example 2: Full app integration with UI feedback
 */
async function fullAppIntegration() {
  const connectButton = document.getElementById('connect-btn');
  const statusDiv = document.getElementById('status');
  const tokenInput = document.getElementById('token-input') as HTMLInputElement;

  connectButton?.addEventListener('click', async () => {
    statusDiv!.textContent = 'Opening portal...';

    try {
      const result = await connectViaPortal({
        clientId: 'app_xxxxxxxx_your_client_id_here',
      });

      if (result.isNewToken && result.token) {
        // New token created
        statusDiv!.innerHTML = `
          <div class="success">
            <h3>✓ Connected Successfully!</h3>
            <p>Your token: <code>${result.token.slice(0, 20)}...</code></p>
            <p>Token saved to sessionStorage.</p>
          </div>
        `;
        
        localStorage.setItem('user_token', result.token);
        initializeTokenKit(result.token);
        
      } else if (result.existingTokenPrefix) {
        // User already has a token
        statusDiv!.innerHTML = `
          <div class="warning">
            <h3>You Already Have a Token!</h3>
            <p>Your token starts with: <code>${result.existingTokenPrefix}</code></p>
            <p>Options:</p>
            <ul>
              <li>
                <a href="https://ai-tokens.me/dashboard" target="_blank">
                  View your token in the dashboard
                </a>
              </li>
              <li>Or enter it below:</li>
            </ul>
            <input type="text" id="existing-token-input" placeholder="ut_..." />
            <button id="submit-token-btn">Submit</button>
          </div>
        `;
        
        document.getElementById('submit-token-btn')?.addEventListener('click', () => {
          const tokenInputEl = document.getElementById('existing-token-input') as HTMLInputElement;
          const token = tokenInputEl.value.trim();
          
          if (token.startsWith('ut_')) {
            localStorage.setItem('user_token', token);
            initializeTokenKit(token);
            statusDiv!.innerHTML = '<div class="success">✓ Token saved!</div>';
          } else {
            alert('Invalid token format. Tokens start with "ut_"');
          }
        });
      }
      
    } catch (error) {
      if (error instanceof TokenKitTokenExistsError) {
        statusDiv!.innerHTML = `
          <div class="error">
            <h3>Token Already Exists</h3>
            <p>Prefix: ${error.tokenPrefix}</p>
            <p>${error.message}</p>
          </div>
        `;
      } else {
        statusDiv!.innerHTML = `
          <div class="error">
            <h3>Connection Failed</h3>
            <p>${error}</p>
          </div>
        `;
      }
    }
  });
}

/**
 * Initialize Token Kit SDK with user token
 */
function initializeTokenKit(userToken: string) {
  const tokenKit = new TokenKit({
    apiKey: process.env.TOKENKIT_API_KEY!,
    clientId: 'app_xxxxxxxx_your_client_id_here',
  });
  
  tokenKit.setUserToken(userToken);
  
  // Now you can make API calls
  (window as any).tokenKit = tokenKit; // Make available globally for testing
  console.log('Token Kit ready! Try: await tokenKit.getBalance()');
}

/**
 * Example 3: Check for existing token first
 */
async function checkExistingTokenFirst() {
  // Check if user already has token stored locally
  const existingToken = localStorage.getItem('user_token');
  
  if (existingToken) {
    console.log('Using existing token from localStorage');
    initializeTokenKit(existingToken);
    return;
  }
  
  // No local token - check sessionStorage (from previous connect)
  const sessionToken = sessionStorage.getItem('tokenkit_user_token');
  
  if (sessionToken) {
    console.log('Using token from sessionStorage');
    localStorage.setItem('user_token', sessionToken);
    initializeTokenKit(sessionToken);
    return;
  }
  
  // No token found - user needs to connect
  console.log('No token found. User needs to connect.');
  await basicConnectFlow();
}

// Run the example
if (typeof window !== 'undefined') {
  console.log('Token-Kit Connect Flow Examples');
  console.log('Available functions:');
  console.log('  - basicConnectFlow()');
  console.log('  - fullAppIntegration()');
  console.log('  - checkExistingTokenFirst()');
}
