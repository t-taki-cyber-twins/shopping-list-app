import 'dotenv/config'; // 最初に追加
import { Mastra } from '@mastra/core/mastra';
import { createLogger } from '@mastra/core/logger';
import { shoppingAgent } from './agents/shopping';
import { shoppingWorkflow } from './workflows/shopping';

// Mastraインスタンス
export const mastra = new Mastra({
  agents: {
    shopping: shoppingAgent,
  },
  
  workflows: {
    shopping: shoppingWorkflow,
  },
  
  logger: createLogger({
    name: 'ShoppingApp',
    level: 'info',
  }),
});