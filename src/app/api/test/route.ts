// app/api/test/route.ts
import { NextResponse } from 'next/server';
import { mastra } from '@/mastra';

export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    console.log('📬 API Route received message:', message);
    const userId = process.env.DEV_USER_ID || 'user_test_123';

    const workflow = mastra.getWorkflow('shopping');
    const run = await workflow.createRun();
    const result = await run.start({
      inputData: { message },
    });

    if (result.status !== 'success') {
      throw new Error(result.status === 'failed' ? result.error?.message : 'Workflow failed');
    }

    return NextResponse.json({
      success: true,
      response: (result.result as any).text,
      _runId: run.runId,
    });
  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}