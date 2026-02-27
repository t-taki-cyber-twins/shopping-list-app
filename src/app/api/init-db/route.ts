// app/api/init-db/route.ts
import { NextResponse } from 'next/server';
import { initDatabase } from '@/lib/db';

/** 環境変数の有無のみ（値は返さない）。レスポンスに載せてVercelで状況確認する用 */
function getEnvDebug() {
  return {
    isVercel: process.env.VERCEL === '1',
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    hasPostgresUrl: !!process.env.POSTGRES_URL,
    hasPostgresUrlNonPooling: !!process.env.POSTGRES_URL_NON_POOLING,
    hasDirectUrl: !!process.env.DIRECT_URL,
  };
}

export async function GET() {
  const envDebug = getEnvDebug();
  try {
    if (process.env.VERCEL !== '1') {
      return NextResponse.json({
        error: 'この操作はVercel環境でのみ実行できます',
        _debug: { env: envDebug, step: 'vercel_check' },
      }, { status: 403 });
    }

    const result = await initDatabase();
    if (!result.success) {
      return NextResponse.json(
        {
          error: 'データベース初期化に失敗しました',
          details: result.error,
          _debug: { env: envDebug, initDb: result.debug, step: 'initDatabase_returned_false' },
        },
        { status: 500 }
      );
    }
    return NextResponse.json({
      success: true,
      message: 'データベースを初期化しました',
      result,
      _debug: { env: envDebug, step: 'after_initDatabase' },
    });
  } catch (error) {
    const err = error as Error & { code?: string };
    return NextResponse.json(
      {
        error: 'データベース初期化に失敗しました',
        details: err?.message ?? 'Unknown error',
        _debug: {
          env: envDebug,
          step: 'catch',
          errorName: err?.name,
          errorCode: err?.code,
          errorMessage: err?.message,
        },
      },
      { status: 500 }
    );
  }
}