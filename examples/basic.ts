/**
 * Token-Kit SDK - Basic Example
 * Simple chat completion example
 */

import TokenKit from '@codetunezstudios/token-kit';

async function main() {
  // Initialize TokenKit with your API key
  const tokenKit = new TokenKit({
    apiKey: 'dev_xxxxxxxx_your_api_key_here',
    clientId: 'app_xxxxxxxx_your_client_id_here',
  });

  // User token (provided by your end user)
  const userToken = 'ut_xxxxxxxx_user_token_here';

  try {
    // Simple chat request
    const response = await tokenKit.chat(userToken, [
      TokenKit.user('What is Token-Kit?'),
    ]);

    console.log('Assistant:', response.message.content);
    console.log('Tokens used:', response.tokensUsed.total);
    console.log('Tokens deducted:', response.tokensDeducted);
    console.log('Remaining balance:', response.userBalance);
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
