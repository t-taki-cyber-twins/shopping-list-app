// lib/db.ts

// Vercel環境かどうかをチェック
const isVercel = process.env.VERCEL === '1';

// Vercel環境の場合のみPostgresをインポート
let sql: any;

if (isVercel) {
  // Prisma Postgres の DATABASE_URL は @vercel/postgres（Neon WebSocket）で 404 になるため、
  // 標準の pg（TCP）を使用する。
  let _pool: any = null;
  function getPool() {
    if (_pool) return _pool;
    const url =
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.POSTGRES_URL_NON_POOLING;
    if (!url) {
      throw new Error(
        '接続用の環境変数がありません。DATABASE_URL / POSTGRES_URL / POSTGRES_URL_NON_POOLING のいずれかを設定してください。'
      );
    }
    const { Pool } = require('pg');
    _pool = new Pool({ connectionString: url, max: 2 });
    return _pool;
  }
  function sqlTag(strings: TemplateStringsArray, ...values: unknown[]) {
    let text = strings[0];
    for (let i = 1; i < strings.length; i++) {
      text += '$' + i + strings[i];
    }
    return getPool().query(text, values);
  }
  sql = sqlTag;
} else {
  // ローカル環境ではモック
  console.log('⚠️ ローカル環境: PostgreSQLモック使用');
  sql = createMockSql();
}

export { sql };

// モック関数（ローカル開発用）
function createMockSql() {
  const mockData: any[] = [];
  let mockId = 1;

  return function mockSqlTag(strings: TemplateStringsArray, ...values: any[]) {
    const query = strings.join('?');
    console.log('📝 Mock Query:', query);
    console.log('📝 Values:', values);

    // INSERT のモック
    if (query.includes('INSERT INTO shopping_items')) {
      const item = {
        id: mockId++,
        user_id: values[0],
        name: values[1],
        category: values[2],
        quantity: '1',
        completed: false,
        added_at: new Date(),
      };
      mockData.push(item);
      return Promise.resolve({ rows: [item] });
    }

    // SELECT のモック
    if (query.includes('SELECT') && query.includes('shopping_items')) {
      const filtered = mockData.filter(
        (item) => !item.completed && item.user_id === values[0]
      );
      return Promise.resolve({ rows: filtered });
    }

    // COUNT のモック
    if (query.includes('COUNT')) {
      const count = mockData.filter(
        (item) => !item.completed && item.user_id === values[0]
      ).length;
      return Promise.resolve({ rows: [{ total: count, remaining: count }] });
    }

    // UPDATE のモック
    if (query.includes('UPDATE')) {
      const itemName = values[1].replace('%', '');
      const updated = mockData.filter(
        (item) =>
          item.name.includes(itemName) &&
          !item.completed &&
          item.user_id === values[0]
      );
      updated.forEach((item) => (item.completed = true));
      return Promise.resolve({ rows: updated });
    }

    // DELETE のモック
    if (query.includes('DELETE')) {
      const beforeLength = mockData.length;
      const filtered = mockData.filter(
        (item) => item.completed || item.user_id !== values[0]
      );
      mockData.length = 0;
      mockData.push(...filtered);
      return Promise.resolve({ rows: [] });
    }

    // CREATE TABLE のモック
    if (query.includes('CREATE TABLE')) {
      console.log('✅ テーブル作成（モック）');
      return Promise.resolve({ rows: [] });
    }

    // CREATE INDEX のモック
    if (query.includes('CREATE INDEX')) {
      console.log('✅ インデックス作成（モック）');
      return Promise.resolve({ rows: [] });
    }

    return Promise.resolve({ rows: [] });
  };
}

// データベース初期化（Vercel環境のみ実行）
// DDL（CREATE TABLE等）はダイレクト接続で実行する必要があります
// Vercel Postgres: POSTGRES_URL_NON_POOLING / Prisma Postgres: DIRECT_URL または DATABASE_URL
export async function initDatabase(): Promise<
  | { success: true }
  | { success: false; error: string; code?: string; debug: Record<string, unknown> }
> {
  if (!isVercel) {
    return { success: true };
  }

  const directUrl =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DIRECT_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL;
  const directUrlSource = process.env.POSTGRES_URL_NON_POOLING
    ? 'POSTGRES_URL_NON_POOLING'
    : process.env.DIRECT_URL
      ? 'DIRECT_URL'
      : process.env.DATABASE_URL
        ? 'DATABASE_URL'
        : process.env.POSTGRES_URL
          ? 'POSTGRES_URL'
          : 'none';

  const debugBase = {
    directUrlSource,
    hasDirectUrl: !!directUrl,
    directUrlLength: directUrl ? directUrl.length : 0,
  };

  if (!directUrl) {
    return {
      success: false,
      error: '接続用の環境変数がありません。',
      debug: { ...debugBase, step: 'no_url' },
    };
  }

  try {
    const { Client } = require('pg');
    const client = new Client({ connectionString: directUrl });
    try {
      await client.connect();
    } catch (e) {
      const err = e as Error & { code?: string };
      return {
        success: false,
        error: err?.message ?? 'connect failed',
        code: err?.code,
        debug: { ...debugBase, step: 'connect' },
      };
    }

    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS shopping_items (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          category VARCHAR(100),
          quantity VARCHAR(50) DEFAULT '1',
          priority VARCHAR(20) DEFAULT 'normal',
          completed BOOLEAN DEFAULT false,
          added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP
        )
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_user_active
        ON shopping_items(user_id, completed)
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_stores (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          latitude DECIMAL(10, 8) NOT NULL,
          longitude DECIMAL(11, 8) NOT NULL,
          radius INT DEFAULT 100,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } finally {
      await client.end();
    }

    return { success: true };
  } catch (error) {
    const err = error as Error & { code?: string };
    return {
      success: false,
      error: err?.message ?? 'Unknown error',
      code: err?.code,
      debug: { ...debugBase, step: 'createClient_or_ddl', errorName: err?.name },
    };
  }
}

// 型定義
export interface ShoppingItem {
  id: number;
  user_id: string;
  name: string;
  category: string | null;
  quantity: string;
  priority: string;
  completed: boolean;
  added_at: Date;
  completed_at: Date | null;
}

export interface UserStore {
  id: number;
  user_id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  created_at: Date;
}