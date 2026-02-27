/**
 * スクリプト実行時に .env / .env.local を読み込む。
 * test-mastra.ts などで先頭で import すること。
 */
import { config } from 'dotenv';

config(); // .env
config({ path: '.env.local', override: true }); // .env.local で上書き
