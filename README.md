# @codetunezstudios/token-kit

[![npm version](https://img.shields.io/npm/v/@codetunezstudios/token-kit.svg)](https://www.npmjs.com/package/@codetunezstudios/token-kit)
[![license](https://img.shields.io/npm/l/@codetunezstudios/token-kit.svg)](https://github.com/codetunez-studios/token-kit/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green)](https://nodejs.org/)

> **Beta** — This SDK is under active development. APIs may change before 1.0.

Official TypeScript/JavaScript SDK for [token-kit](https://token-kit.com) — the AI token infrastructure platform for developers.

token-kit enables developers to integrate LLM features into their applications using an end-user-funded token model. Users purchase tokens, developers consume them for AI operations.

## Features

- **Simple API** — Intuitive methods for chat completions
- **TypeScript First** — Full type safety and IntelliSense support
- **Multiple Models** — Support for Claude, GPT-4o, Amazon Nova (more coming)
- **Token Management** — Built-in balance checking and validation
- **Error Handling** — Comprehensive typed error classes
- **Lightweight** — Single runtime dependency (axios)

## Installation

```bash
npm install @codetunezstudios/token-kit
```

```bash
yarn add @codetunezstudios/token-kit
```

```bash
pnpm add @codetunezstudios/token-kit
```

## Quick Start

```typescript
import TokenKit from '@codetunezstudios/token-kit';

// Initialize with your developer API key
const tk = new TokenKit({
  apiKey: process.env.TOKENKIT_API_KEY!,
});

// Make a chat request
const res = await tk.chat('user_token_here', [
  TokenKit.user('What is token-kit?'),
]);

console.log(res.message.content);
console.log('Tokens used:', res.tokensDeducted);
console.log('Balance:', res.userBalance);
```

## API Reference

### Constructor

```typescript
const tk = new TokenKit(config);
```

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `apiKey` | `string` | Yes | — | Developer API key |
| `baseUrl` | `string` | No | `https://api.token-kit.com/api/v1` | API base URL |
| `timeout` | `number` | No | `60000` | Request timeout (ms) |

### Methods

#### `tk.chat(userToken, messages, options?)`

Send a chat completion request.

```typescript
const res = await tk.chat('user_token', [
  TokenKit.system('You are a helpful assistant.'),
  TokenKit.user('Explain quantum computing simply.'),
], {
  model: 'gpt-4o',
  maxTokens: 200,
  temperature: 0.8,
});
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `model` | `string` | `gpt-4o-mini` | LLM model to use |
| `maxTokens` | `number` | `500` | Max tokens in response |
| `temperature` | `number` | `0.7` | Randomness (0–2) |

**Returns** `ChatResponse`:

```typescript
{
  id: string;
  model: string;
  message: { role: 'assistant'; content: string };
  tokensUsed: { prompt: number; completion: number; total: number };
  tokensDeducted: number;
  finishReason: string;
  userBalance?: number;
  latency?: number;
}
```

#### `tk.setUserToken(userToken)`

Set the user token for subsequent requests so you don't have to pass it each time.

```typescript
tk.setUserToken('user_token');

// Now you can omit the userToken parameter
const res = await tk.chat([TokenKit.user('Hello!')]);
```

#### `tk.validateToken(userToken?)`

Validate a user token and check balance/limits.

```typescript
const info = await tk.validateToken('user_token');
if (info.valid) {
  console.log('Balance:', info.balance);
}
```

#### `tk.getBalance(userToken?)`

Get the current token balance.

```typescript
const balance = await tk.getBalance('user_token');
```

#### `tk.getModels()`

List available LLM models.

```typescript
const models = await tk.getModels();
// ['gpt-4o-mini', 'gpt-4o', 'claude-3.5-haiku', 'claude-sonnet-4', 'nova-micro', 'nova-lite']
```

### Helper Methods

```typescript
TokenKit.user('message')       // { role: 'user', content: 'message' }
TokenKit.system('message')     // { role: 'system', content: 'message' }
TokenKit.assistant('message')  // { role: 'assistant', content: 'message' }
```

## Error Handling

```typescript
import TokenKit, { TokenKitAPIError } from '@codetunezstudios/token-kit';

try {
  const res = await tk.chat(userToken, messages);
} catch (err) {
  if (err instanceof TokenKitAPIError) {
    console.error(err.code);       // 'INSUFFICIENT_BALANCE'
    console.error(err.statusCode); // 402
    console.error(err.message);    // 'Insufficient token balance'
  }
}
```

**Error codes:**

| Code | Status | Description |
|------|--------|-------------|
| `INVALID_API_KEY` | 401 | Developer API key is invalid |
| `INVALID_TOKEN` | 401 | User token is invalid or expired |
| `INSUFFICIENT_BALANCE` | 402 | Not enough tokens |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `DAILY_LIMIT_EXCEEDED` | 429 | Daily spending limit reached |
| `MONTHLY_LIMIT_EXCEEDED` | 429 | Monthly spending limit reached |
| `MODEL_NOT_SUPPORTED` | 400 | Requested model is not available |
| `TIMEOUT` | 504 | Request timed out |
| `NETWORK_ERROR` | 503 | Cannot reach token-kit API |

## Express Integration Example

```typescript
import express from 'express';
import TokenKit from '@codetunezstudios/token-kit';

const app = express();
const tk = new TokenKit({ apiKey: process.env.TOKENKIT_API_KEY! });

app.post('/api/chat', async (req, res) => {
  try {
    const { userToken, message } = req.body;
    const result = await tk.chat(userToken, [TokenKit.user(message)]);
    res.json({ reply: result.message.content, balance: result.userBalance });
  } catch (err) {
    res.status(500).json({ error: 'Chat failed' });
  }
});
```

> **Security:** Never expose your developer API key in client-side code. Always proxy requests through your backend.

## Token Pricing

Different models consume tokens at different rates:

| Model | Rate | 1,000 TK tokens = |
|-------|------|-------------------|
| GPT-4o Mini | 1.0x | 1,000 LLM tokens |
| Claude 3.5 Haiku | 1.0x | 1,000 LLM tokens |
| Amazon Nova Micro | 1.0x | 1,000 LLM tokens |
| Amazon Nova Lite | 1.0x | 1,000 LLM tokens |
| GPT-4o | 2.0x | 500 LLM tokens |
| Claude Sonnet 4 | 3.0x | 333 LLM tokens |

See [token-kit.com](https://token-kit.com) for current package pricing and details.

## Requirements

- Node.js >= 18
- TypeScript >= 5.0 (recommended)

## Development

```bash
git clone https://github.com/codetunez-studios/token-kit.git
cd token-kit
npm install     # Install dependencies
npm run build   # Build (CJS + ESM + types)
npm test        # Run tests
npm run typecheck  # Type checking
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

## License

[MIT](LICENSE) © [Codetunez Studios](https://github.com/codetunez-studios)

## Links

- [token-kit Platform](https://token-kit.com)
- [User Token Portal](https://ai-tokens.me)
- [Documentation](https://token-kit.com/sdk)
- [npm Package](https://www.npmjs.com/package/@codetunezstudios/token-kit)
- [GitHub Issues](https://github.com/codetunez-studios/token-kit/issues)
