// scripts/test-mastra.ts
import './load-env';
import { mastra } from '../mastra';
import { initDatabase } from '../lib/db';

async function testMastra() {
  console.log('🧪 Mastra + Geminiテスト開始\n');
  
  const userId = process.env.DEV_USER_ID || 'user_test_123';
  
  try {
    // APIキーの確認
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new Error('GOOGLE_GENERATIVE_AI_API_KEY が設定されていません');
    }
    
    console.log('✅ Gemini APIキー確認完了\n');
    
    // 1. データベース初期化
    console.log('1️⃣ データベース初期化...');
    await initDatabase();
    console.log('✅ 完了\n');
    
    // 2. エージェント取得
    const agent = mastra.getAgent('shopping');
    
    if (!agent) {
      throw new Error('Shopping agent not found');
    }
    
    console.log('✅ エージェント取得完了\n');
    
    // 3. アイテム追加テスト
    console.log('2️⃣ アイテム追加テスト（Gemini使用）...');
    const addResult = await agent.generate(
      [{ role: 'user', content: '牛乳とパンと卵を買い物リストに追加して' }],
      {}
    );
    console.log('応答:', addResult.text);
    console.log('✅ 完了\n');
    
    // 4. リスト取得テスト
    console.log('3️⃣ リスト取得テスト...');
    const listResult = await agent.generate(
      [{ role: 'user', content: '買い物リスト見せて' }],
      {}
    );
    console.log('応答:', listResult.text);
    console.log('✅ 完了\n');
    
    // 5. アイテム完了テスト
    console.log('4️⃣ アイテム完了テスト...');
    const completeResult = await agent.generate(
      [{ role: 'user', content: '牛乳買った' }],
      {}
    );
    console.log('応答:', completeResult.text);
    console.log('✅ 完了\n');
    
    console.log('🎉 Geminiテスト完了！');
    
  } catch (error) {
    console.error('❌ エラー:', error);
    if (error instanceof Error) {
      console.error('詳細:', error.message);
      console.error('スタック:', error.stack);
    }
    process.exit(1);
  }
}

testMastra();