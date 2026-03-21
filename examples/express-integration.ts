/**
 * Token-Kit SDK - Express Integration Example
 * Shows how to use Token-Kit in an Express.js application
 */

import express, { Request, Response } from 'express';
import TokenKit, { TokenKitAPIError } from '@codetunezstudios/token-kit';

const app = express();
app.use(express.json());

// Initialize TokenKit
const tokenKit = new TokenKit({
  apiKey: process.env.TOKENKIT_API_KEY!,
});

// Endpoint for chatbot
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { userToken, message } = req.body;

    if (!userToken || !message) {
      return res.status(400).json({
        error: 'userToken and message are required',
      });
    }

    // Validate token and check balance
    const validation = await tokenKit.validateToken(userToken);

    if (!validation.valid) {
      return res.status(401).json({
        error: 'Invalid user token',
      });
    }

    if ((validation.balance || 0) < 10) {
      return res.status(402).json({
        error: 'Insufficient token balance',
        balance: validation.balance,
      });
    }

    // Send chat request
    const response = await tokenKit.chat(userToken, [
      TokenKit.system('You are a helpful assistant.'),
      TokenKit.user(message),
    ]);

    res.json({
      message: response.message.content,
      tokensUsed: response.tokensUsed.total,
      balance: response.userBalance,
    });
  } catch (error) {
    if (error instanceof TokenKitAPIError) {
      res.status(error.statusCode || 500).json({
        error: error.message,
        code: error.code,
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
});

// Health check endpoint
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const models = await tokenKit.getModels();
    res.json({
      status: 'healthy',
      models: models.length,
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Cannot connect to Token-Kit API',
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
