// mastra/tools/list.ts
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { sql } from '@/lib/db';

// ツール1: アイテム追加
export const addItemsTool = createTool({
  id: 'add-shopping-items',
  description: '買い物リストにアイテムを追加する。複数のアイテムをカンマ区切りで追加できる。',
  inputSchema: z.object({
    items: z.string().describe('追加する商品名（複数の場合はカンマ区切り）'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    added: z.array(z.object({
      name: z.string(),
      category: z.string(),
    })),
    total: z.number(),
    message: z.string(),
  }),
  
  execute: async (inputData) => {  // ⚠️ v1形式: 第1引数がinputData
    const { items } = inputData;
    const userId = process.env.DEV_USER_ID || 'user_test_123';
    
    // カンマや「と」で分割
    const itemList = items
      .split(/[、,，と]/)
      .map(item => item.trim())
      .filter(item => item.length > 0);
    
    const addedItems = [];
    
    for (const itemName of itemList) {
      // カテゴリを自動判定
      const category = categorizeItem(itemName);
      
      // データベースに追加
      const result = await sql`
        INSERT INTO shopping_items (user_id, name, category)
        VALUES (${userId}, ${itemName}, ${category})
        RETURNING *
      `;
      
      addedItems.push({
        name: itemName,
        category: category,
      });
    }
    
    // 現在の合計数を取得
    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM shopping_items
      WHERE user_id = ${userId} AND completed = false
    `;
    
    const total = parseInt(countResult.rows[0].total);
    
    return {
      success: true,
      added: addedItems,
      total: total,
      message: `${addedItems.length}つ追加しました。現在${total}点です。`,
    };
  },
});

// ツール2: リスト取得
export const getShoppingListTool = createTool({
  id: 'get-shopping-list',
  description: '現在の買い物リストを取得する。カテゴリ別に整理されている。',
  inputSchema: z.object({
    includeCompleted: z.boolean().optional().describe('完了済みも含めるか'),
  }),
  outputSchema: z.object({
    items: z.array(z.any()),
    grouped: z.record(z.string(), z.array(z.any())),  // keyType, valueType
    total: z.number(),
    categories: z.array(z.string()),
  }),
  
  execute: async (inputData) => {
    const { includeCompleted = false } = inputData;
    const userId = process.env.DEV_USER_ID || 'user_test_123';
    
    let query;
    if (includeCompleted) {
      query = sql`
        SELECT * FROM shopping_items
        WHERE user_id = ${userId}
        ORDER BY completed ASC, category, added_at DESC
      `;
    } else {
      query = sql`
        SELECT * FROM shopping_items
        WHERE user_id = ${userId} AND completed = false
        ORDER BY category, added_at DESC
      `;
    }
    
    const result = await query;
    const items = result.rows;
    
    // カテゴリ別にグループ化
    const grouped = items.reduce((acc: Record<string, any[]>, item: any) => {
      const cat = item.category || 'その他';
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        completed: item.completed,
      });
      return acc;
    }, {});
    
    return {
      items: items,
      grouped: grouped,
      total: items.length,
      categories: Object.keys(grouped),
    };
  },
});

// ツール3: アイテム完了（削除）
export const completeItemsTool = createTool({
  id: 'complete-shopping-items',
  description: '買い物リストのアイテムを完了（削除）する。',
  inputSchema: z.object({
    items: z.string().describe('完了した商品名（複数の場合はカンマ区切り）'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    completed: z.array(z.string()),
    remaining: z.number(),
    message: z.string(),
  }),
  
  execute: async (inputData) => {
    const { items } = inputData;
    const userId = process.env.DEV_USER_ID || 'user_test_123';
    
    // 分割
    const itemList = items
      .split(/[、,，と]/)
      .map(item => item.trim())
      .filter(item => item.length > 0);
    
    const completedItems = [];
    
    for (const itemName of itemList) {
      // 部分一致で検索して完了
      const result = await sql`
        UPDATE shopping_items
        SET completed = true, completed_at = CURRENT_TIMESTAMP
        WHERE user_id = ${userId} 
          AND name ILIKE ${'%' + itemName + '%'}
          AND completed = false
        RETURNING name
      `;
      
      if (result.rows.length > 0) {
        completedItems.push(result.rows[0].name);
      }
    }
    
    // 残りのアイテム数
    const countResult = await sql`
      SELECT COUNT(*) as remaining
      FROM shopping_items
      WHERE user_id = ${userId} AND completed = false
    `;
    
    const remaining = parseInt(countResult.rows[0].remaining);
    
    return {
      success: true,
      completed: completedItems,
      remaining: remaining,
      message: remaining === 0 
        ? '全部買い終わりました！お疲れ様です。' 
        : `${completedItems.length}つ完了しました。残り${remaining}点です。`,
    };
  },
});

// すべてクリア
export const clearListTool = createTool({
  id: 'clear-shopping-list',
  description: '買い物リストをすべてクリアする',
  inputSchema: z.object({
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
  }),
  
  execute: async (inputData) => {
    const userId = process.env.DEV_USER_ID || 'user_test_123';
    
    await sql`
      DELETE FROM shopping_items
      WHERE user_id = ${userId} AND completed = false
    `;
    
    return {
      success: true,
      message: 'リストをクリアしました',
    };
  },
});

// ヘルパー関数: カテゴリ判定
function categorizeItem(itemName: string): string {
  const categories: Record<string, string[]> = {
    '乳製品': ['牛乳', 'ヨーグルト', 'チーズ', 'バター'],
    'パン': ['パン', '食パン', 'ロールパン'],
    '生鮮': ['卵', '肉', '魚', '鶏肉', '豚肉', '牛肉', 'サーモン'],
    '野菜': ['レタス', 'トマト', 'キャベツ', '玉ねぎ', 'にんじん', 'じゃがいも'],
    '果物': ['りんご', 'バナナ', 'みかん', 'いちご'],
    '飲料': ['水', 'お茶', 'ジュース', 'コーヒー'],
    '調味料': ['醤油', '味噌', '砂糖', '塩', '油'],
  };
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => itemName.includes(keyword))) {
      return category;
    }
  }
  
  return 'その他';
}