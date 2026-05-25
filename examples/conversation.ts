/**
 * Token-Kit SDK - Conversation Example
 * Multi-turn conversation with message history
 */

import TokenKit from '@codetunezstudios/token-kit';
import { Message } from '@codetunezstudios/token-kit';

async function main() {
  const tokenKit = new TokenKit({
    apiKey: process.env.TOKENKIT_API_KEY!,
    clientId: process.env.TOKENKIT_CLIENT_ID!,
  });

  const userToken = process.env.TOKENKIT_USER_TOKEN!;

  // Conversation history
  const messages: Message[] = [
    TokenKit.system('You are a friendly coding tutor.'),
  ];

  console.log('Starting conversation...\n');

  try {
    // First message
    messages.push(TokenKit.user('What is TypeScript?'));
    console.log('User: What is TypeScript?');

    let response = await tokenKit.chat(userToken, messages);
    console.log('Assistant:', response.message.content);
    messages.push(response.message);

    console.log(`\n[Tokens used: ${response.tokensDeducted}, Balance: ${response.userBalance}]\n`);

    // Second message (with context)
    messages.push(TokenKit.user('How is it different from JavaScript?'));
    console.log('User: How is it different from JavaScript?');

    response = await tokenKit.chat(userToken, messages);
    console.log('Assistant:', response.message.content);
    messages.push(response.message);

    console.log(`\n[Tokens used: ${response.tokensDeducted}, Balance: ${response.userBalance}]\n`);

    // Third message (with full context)
    messages.push(TokenKit.user('Give me a simple example.'));
    console.log('User: Give me a simple example.');

    response = await tokenKit.chat(userToken, messages);
    console.log('Assistant:', response.message.content);
    messages.push(response.message);

    console.log(`\n[Tokens used: ${response.tokensDeducted}, Balance: ${response.userBalance}]\n`);

    // Summary
    const totalTokens = messages.reduce((sum, msg, idx) => {
      // Only count responses
      return idx % 2 === 0 ? sum : sum + (response.tokensUsed.total || 0);
    }, 0);

    console.log('Conversation complete!');
    console.log(`Total messages: ${messages.length}`);
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
