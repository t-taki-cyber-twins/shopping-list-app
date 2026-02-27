// app/api/test/route.ts
import { NextResponse } from 'next/server';
import { mastra } from '@/mastra';

export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    const userId = process.env.DEV_USER_ID || 'test_user';

    const agent = mastra.getAgent('shopping');
    if (!agent) {
      throw new Error('Agent not found');
    }
    const result = await agent.generate(
        [{ role: 'user', content: message }],
        {}
    );

    return NextResponse.json({
      success: true,
      response: result.text,
    });
  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}