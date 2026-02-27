// mastra/tools/store.ts
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { sql } from '@/lib/db';

// 距離計算（Haversine公式）
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// ツール: スーパー近く判定
export const checkNearStoreTool = createTool({
  id: 'check-near-store',
  description: '現在地がスーパーの近くかどうか判定する',
  inputSchema: z.object({
    userId: z.string(),
    latitude: z.number().describe('現在地の緯度'),
    longitude: z.number().describe('現在地の経度'),
  }),
  outputSchema: z.object({
    nearStore: z.boolean(),
    storeName: z.string().optional(),
    distance: z.number().optional(),
    message: z.string(),
  }),
  
  execute: async (inputData) => {
    const { latitude, longitude } = inputData;
    const userId = process.env.DEV_USER_ID || 'test_user';
    
    const result = await sql`
      SELECT * FROM user_stores
      WHERE user_id = ${userId}
    `;
    
    if (result.rows.length === 0) {
      return {
        nearStore: false,
        message: 'スーパーが登録されていません',
      };
    }
    
    for (const store of result.rows) {
      const distance = calculateDistance(
        latitude,
        longitude,
        store.latitude,
        store.longitude
      );
      
      if (distance <= store.radius) {
        return {
          nearStore: true,
          storeName: store.name,
          distance: Math.round(distance),
          message: `${store.name}の近くです（${Math.round(distance)}m）`,
        };
      }
    }
    
    return {
      nearStore: false,
      message: 'スーパーから離れています',
    };
  },
});

// ツール: スーパー登録
export const registerStoreTool = createTool({
  id: 'register-store',
  description: 'よく行くスーパーを登録する',
  inputSchema: z.object({
    userId: z.string(),
    name: z.string().describe('スーパーの名前'),
    latitude: z.number(),
    longitude: z.number(),
    radius: z.number().optional().describe('通知範囲（メートル）デフォルト100m'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
  }),
  
  execute: async (inputData) => {
    const { name, latitude, longitude, radius = 100 } = inputData;
    const userId = process.env.DEV_USER_ID || 'test_user';
    
    await sql`
      INSERT INTO user_stores (user_id, name, latitude, longitude, radius)
      VALUES (${userId}, ${name}, ${latitude}, ${longitude}, ${radius})
    `;
    
    return {
      success: true,
      message: `${name}を登録しました（通知範囲: ${radius}m）`,
    };
  },
});