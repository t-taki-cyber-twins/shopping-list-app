// app/api/init-db/route.ts
import { NextResponse } from 'next/server';
import { initDatabase } from '@/lib/db';

export async function GET() {
  console.error('[init-db] GET 開始', JSON.stringify({ vercel: process.env.VERCEL === '1' }));
  try {
    // Vercel環境でのみ実行
    if (process.env.VERCEL !== '1') {
      return NextResponse.json({
        error: 'この操作はVercel環境でのみ実行できます',
      }, { status: 403 });
    }

    console.error('[init-db] initDatabase を呼び出します');
    const result = await initDatabase();
    console.error('[init-db] 成功', JSON.stringify({ result }));
    return NextResponse.json({
      success: true,
      message: 'データベースを初期化しました',
      result,
    });
  } catch (error) {
    const err = error as Error & { code?: string };
    console.error('[init-db] エラー', JSON.stringify({
      message: err?.message,
      code: err?.code,
      name: err?.name,
    }));
    return NextResponse.json({
      error: 'データベース初期化に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}