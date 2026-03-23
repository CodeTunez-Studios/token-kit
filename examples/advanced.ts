/**
 * Token-Kit SDK - Advanced Example
 * Shows advanced features: system messages, options, error handling
 */

import TokenKit, { TokenKitAPIError } from '@codetunezstudios/token-kit';

async function main() {
  const tokenKit = new TokenKit({
    apiKey: process.env.TOKENKIT_API_KEY!,
    // For development, use local API Gateway
    // baseUrl: 'http://localhost:3000/api/v1',
  });

  const userToken = process.env.TOKENKIT_USER_TOKEN!;

  // Set user token once to avoid passing it every time
  tokenKit.setUserToken(userToken);

  try {
    // Check balance before making requests
    const balance = await tokenKit.getBalance();
    console.log(`Current balance: ${balance} tokens\n`);

    if (balance < 100) {
      console.warn('Warning: Low token balance!');
    }

    // Chat with system message and options
    const response = await tokenKit.chat(
      [
        TokenKit.system('You are a helpful AI assistant that explains complex topics simply.'),
        TokenKit.user('Explain how Token-Kit works in 2 sentences.'),
      ],
      {
        model: 'gpt-4o-mini',
        maxTokens: 150,
        temperature: 0.7,
      }
    );

    console.log('Response:', response.message.content);
    console.log('\nStats:');
    console.log('- Model:', response.model);
    console.log('- Prompt tokens:', response.tokensUsed.prompt);
    console.log('- Completion tokens:', response.tokensUsed.completion);
    console.log('- Total tokens:', response.tokensUsed.total);
    console.log('- Tokens deducted:', response.tokensDeducted);
    console.log('- New balance:', response.userBalance);
    console.log('- Latency:', response.latency, 'ms');

    // Get available models
    const models = await tokenKit.getModels();
    console.log('\nAvailable models:', models);
  } catch (error) {
    if (error instanceof TokenKitAPIError) {
      console.error('TokenKit API Error:');
      console.error('- Code:', error.code);
      console.error('- Message:', error.message);
      console.error('- Status:', error.statusCode);
      if (error.details) {
        console.error('- Details:', error.details);
      }
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

main();
