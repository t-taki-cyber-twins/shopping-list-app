// mastra/agents/shopping.ts
import { Agent } from '@mastra/core/agent';
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
1. 商品の追加: 「牛乳買う」「牛乳とパン追加」などの指示を理解し、必ず addItems ツールを使ってリストに保存する
2. リスト表示: 「リスト見せて」「何買うんだっけ？」に対応し、必ず getList ツールを使って現在のリスト内容を取得してから回答する
3. 商品の完了: 「牛乳買った」「牛乳とパン完了」を理解し、必ず completeItems ツールを使って完了状態にする
4. リスト全クリア: 「リスト全部消して」などの指示があれば、必ず clearList ツールを使ってリストを空にする
5. スーパー到着通知: 位置情報からスーパーの近くか判定し、checkNearStore / registerStore ツールを適切に利用する

【会話のスタイル】
- 簡潔で分かりやすく
- 絵文字を適度に使う（🛒📝✅など）
- 数字は明確に伝える
- 完了時は褒める
  `.trim(),
  
  model: 'google/gemini-2.5-flash-lite',
  
  tools: {
    addItems: addItemsTool,
    getList: getShoppingListTool,
    completeItems: completeItemsTool,
    clearList: clearListTool,
    checkNearStore: checkNearStoreTool,
    registerStore: registerStoreTool,
  },
});