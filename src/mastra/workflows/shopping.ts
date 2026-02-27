import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { addItemsTool, getShoppingListTool, completeItemsTool, clearListTool } from '../tools/list';

// 単一のステップでインテント解析から実行、回答生成までを行う
const processShoppingStep = createStep({
  id: 'process-shopping',
  inputSchema: z.object({
    message: z.string(),
  }),
  outputSchema: z.object({
    text: z.string(),
  }),
  execute: async ({ inputData, mastra }: any) => {
    const { message } = inputData;
    console.log('🔍 [Workflow] processShoppingStep: message =', message);

    const agent = mastra?.getAgent('shopping');
    if (!agent) throw new Error('Agent "shopping" not found');

    // 1. インテント解析
    // Gemini の MIME タイプエラーを回避するため、構造化出力を使わずプレーンテキストで取得
    const intentPrompt = `
以下のユーザーメッセージから、買い物の「意図」と「対象アイテム」を抽出してください。
回答は必ず純粋なJSON形式のみで返し、それ以外のテキスト（Markdownのバックティックスなど）も含めないでください。

JSON形式:
{
  "action": "ADD" | "LIST" | "COMPLETE" | "CLEAR" | "UNKNOWN",
  "items": "商品名1,商品名2" (抽出された商品名がある場合のみ)
}

ユーザーメッセージ: "${message}"
`;

    const intentResult = await agent.generate(intentPrompt);
    console.log('🔍 [Workflow] raw intent result:', intentResult.text);

    let action = 'UNKNOWN';
    let items = '';

    try {
      // JSONをパース（Markdownのタグが含まれている場合も考慮）
      const cleanJson = intentResult.text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      action = parsed.action;
      items = parsed.items || '';
    } catch (e) {
      console.error('❌ [Workflow] Failed to parse intent JSON:', e);
      // フォールバック: テキストから抽出を試みる
      if (intentResult.text.includes('ADD')) action = 'ADD';
      else if (intentResult.text.includes('LIST')) action = 'LIST';
      else if (intentResult.text.includes('COMPLETE')) action = 'COMPLETE';
      else if (intentResult.text.includes('CLEAR')) action = 'CLEAR';
    }

    console.log('🚀 [Workflow] Parsed Intent:', { action, items });

    // 2. 実行
    let actionResult;
    switch (action) {
      case 'ADD':
        actionResult = await (addItemsTool as any).execute({ items }, {} as any);
        break;
      case 'LIST':
        actionResult = await (getShoppingListTool as any).execute({ includeCompleted: false }, {} as any);
        break;
      case 'COMPLETE':
        actionResult = await (completeItemsTool as any).execute({ items }, {} as any);
        break;
      case 'CLEAR':
        actionResult = await (clearListTool as any).execute({}, {} as any);
        break;
      default:
        actionResult = { message: '何をすべきか判断できませんでした。' };
    }

    // 3. 回答生成
    const responsePrompt = `
ユーザーのメッセージ: "${message}"
解析されたアクション: "${action}"
アイテム: "${items}"
実行結果の詳細: ${JSON.stringify(actionResult)}

上記の情報を元に、ユーザーに対して親切でフレンドリーな回答を生成してください。
絵文字を使って、買い物アシスタントらしい口調にしてください。
`;

    const finalResponse = await agent.generate(responsePrompt);

    return {
      text: finalResponse?.text || 'エラーが発生しました。',
    };
  },
});

// ワークフローの構築（1ステップ）
export const shoppingWorkflow = createWorkflow({
  id: 'shopping',
  inputSchema: z.object({
    message: z.string(),
  }),
  outputSchema: z.object({
    text: z.string(),
  }),
})
  .then(processShoppingStep)
  .commit();
