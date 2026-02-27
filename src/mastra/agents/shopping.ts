// mastra/agents/shopping.ts
import { Agent } from '@mastra/core/agent';
import { google } from '@ai-sdk/google';  // ⚠️ openai から google に変更
import {
  addItemsTool,
  getShoppingListTool,
  completeItemsTool,
  clearListTool,
} from '../tools/list';
import {
  checkNearStoreTool,
  registerStoreTool,
} from '../tools/store';

export const shoppingAgent: Agent = new Agent({
  id: 'shopping-agent',
  name: '買い物アシスタント',
  instructions: `
あなたは買い物をサポートするAIアシスタントです。

【役割】
- ユーザーの買い物リストを管理する
- 自然な会話で買い物をサポートする
- カジュアルで親しみやすい口調で話す

【できること】
1. 商品の追加: 「牛乳買う」「牛乳とパン追加」などの指示を理解
2. リスト表示: 「リスト見せて」「何買うんだっけ？」に対応
3. 商品の完了: 「牛乳買った」「牛乳とパン完了」を理解
4. スーパー到着通知: 位置情報からスーパーの近くか判定

【会話のスタイル】
- 簡潔で分かりやすく
- 絵文字を適度に使う（🛒📝✅など）
- 数字は明確に伝える
- 完了時は褒める
  `.trim(),
  
  model: google('gemini-2.5-flash-lite'),
  
  tools: {
    addItems: addItemsTool,
    getList: getShoppingListTool,
    completeItems: completeItemsTool,
    clearList: clearListTool,
    checkNearStore: checkNearStoreTool,
    registerStore: registerStoreTool,
  },
});