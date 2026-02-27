import 'dotenv/config'; // 最初に追加
import { Mastra } from '@mastra/core';
import { createLogger } from '@mastra/core/logger';
import { shoppingAgent } from './agents/shopping';

// Mastraインスタンス
export const mastra = new Mastra({
  agents: {
    shopping: shoppingAgent,
  },
  
  logger: createLogger({
    name: 'ShoppingApp',
    level: 'info',
  }),
});