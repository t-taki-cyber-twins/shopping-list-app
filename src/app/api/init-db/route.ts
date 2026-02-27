// app/api/init-db/route.ts
import { NextResponse } from 'next/server';
import { initDatabase } from '@/lib/db';

export async function GET() {
  try {
    // Vercel環境でのみ実行
    if (process.env.VERCEL !== '1') {
      return NextResponse.json({
        error: 'この操作はVercel環境でのみ実行できます',
      }, { status: 403 });
    }

    const result = await initDatabase();
    
    return NextResponse.json({
      success: true,
      message: 'データベースを初期化しました',
      result,
    });
  } catch (error) {
    console.error('Database initialization error:', error);
    return NextResponse.json({
      error: 'データベース初期化に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}