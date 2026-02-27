// lib/db.ts

// Vercel環境かどうかをチェック
const isVercel = process.env.VERCEL === '1';

// Vercel環境の場合のみPostgresをインポート
let sql: any;

if (isVercel) {
  const { createClient, postgresConnectionString } =
    require('@vercel/postgres');
  // Prisma Postgres / Vercel Postgres いずれも接続文字列がダイレクトのことがあるため、
  // createPool は使わず createClient に統一（invalid_connection_string を防ぐ）
  const connectionUrl =
    process.env.DATABASE_URL ||
    postgresConnectionString('pool') ||
    postgresConnectionString('direct');
  if (connectionUrl) {
    sql = createClient({ connectionString: connectionUrl });
  } else {
    sql = require('@vercel/postgres').sql;
  }
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
export async function initDatabase() {
  if (!isVercel) {
    console.log('⚠️ ローカル環境: データベース初期化スキップ');
    return { success: true, message: 'モック環境で実行中' };
  }

  try {
    const { createClient, postgresConnectionString } = require('@vercel/postgres');
    const directUrl =
      postgresConnectionString('direct') ||
      process.env.DIRECT_URL ||
      process.env.DATABASE_URL;
    if (!directUrl) {
      throw new Error(
        '接続用の環境変数がありません。Vercel Postgres の場合は POSTGRES_URL_NON_POOLING、Prisma Postgres の場合は DIRECT_URL または DATABASE_URL を設定してください。'
      );
    }
    const client = createClient({ connectionString: directUrl });
    await client.connect();

    try {
      await client.sql`
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
    `;

      await client.sql`
      CREATE INDEX IF NOT EXISTS idx_user_active 
      ON shopping_items(user_id, completed)
    `;

      await client.sql`
      CREATE TABLE IF NOT EXISTS user_stores (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        radius INT DEFAULT 100,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    } finally {
      await client.end();
    }

    console.log('✅ Database initialized successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
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