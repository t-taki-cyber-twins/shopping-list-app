# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) and Cursor when working with code in this repository.

This is a Mastra project - an AI framework for building agents, workflows, and tools. The project structure follows Mastra conventions with agents, tools, and workflows organized in the `src/mastra/` directory.

For complete setup and usage instructions, see [AGENTS.md](./AGENTS.md), which includes:

- Quick start commands
- Project structure details
- Mastra skills usage
- Links to relevant documentation

---

## Project overview

- **Application**: ショッピングリスト管理と、そのためのMastraエージェントを含むアプリケーション。
- **Main agent**: `src/mastra/agents/shopping.ts` に定義された `shoppingAgent`（日本語・カジュアルトーンで買い物をサポート）。
- **Tech stack**:
  - TypeScript / Node.js (`"type": "module"`, Node 22以上を想定)
  - Mastra (`@mastra/core`, `@mastra/memory`, `@mastra/pg` など)
  - Next.js (`src/app/**` 配下にAPIルート)
  - DBアクセスレイヤ: `src/lib/db.ts`（Postgres/LibSQLなど）

---

## AI assistant policy

- **Mastraスキル必須**:
  - Mastraコード（`src/mastra/**`）に触れる前に、必ずMastraスキル（`.agents/skills/mastra/SKILL.md`）を読み、必要に応じて`@mastra/*`の埋め込みドキュメント or `https://mastra.ai/llms.txt` を参照すること。
- **型安全とビルド前提**:
  - TypeScript + ES2022モジュール前提でコードを書くこと。
  - `tsconfig.json` の設定（特に `target`, `module`, `moduleResolution`）を壊さない変更を心がけること。
- **エージェントのキャラクター尊重**:
  - `shoppingAgent` は日本語・カジュアル・絵文字を適度に使うスタイルを持つ。挙動やトーンを大きく変える場合は、コメントやドキュメントで意図を明示すること。
- **安全な変更**:
  - 破壊的変更（DBスキーマ変更、永続データ削除、外部APIへの大量リクエストなど）は、テスト用コードと本番用コードを分け、ユーザーから明示的な指示がある場合のみ行うこと。
  - 可能な限り既存のテスト・スクリプト（例: `npm run test:mastra`）を活用してから変更を確定すること。

---

## Directory guide

- **`src/mastra/agents`**:
  - Mastraエージェント定義。`shoppingAgent` など、エージェントの性格・指示文・利用モデル・利用ツールをここで設定する。
- **`src/mastra/tools`**:
  - エージェントから呼び出されるツール群。Zodなどによる入出力バリデーションを推奨。
- **`src/mastra/workflows`**:
  - エージェントやツールを組み合わせたワークフローを定義する場所（必要に応じて利用）。
- **`src/app/api/**`**:
  - Next.jsのAPIルート。HTTPインターフェースの振る舞い（レスポンス形式、エラーハンドリングなど）はここで統一する。
- **`src/lib/db.ts`**:
  - DBアクセスの中心となるレイヤ。可能な限りDB操作はこのファイル（または同レイヤのモジュール）に集約し、APIルートに生SQLを書くことは避ける。

---

## Do & Don't

- **Do**
  - MastraやNext.jsのバージョンに依存するAPIを変更する前に、必ず最新ドキュメントと`package.json`の依存関係を確認する。
  - 変更がMastraエージェントの振る舞いにどう影響するか（ツールの入出力、モデル切り替えなど）を意識して実装する。
  - 環境変数やシークレット（DB接続情報、APIキーなど）は`.env`系ファイルと環境設定で扱い、コードに直書きしない。
- **Don't**
  - `.env.local` や他のシークレットファイルをGitにコミットしない。
  - 本番運用を前提とした環境で、初期化用エンドポイント（例: `/api/init-db`）を無防備に公開しない。
  - Mastraのモデル指定やエージェント構成を、ドキュメントを確認せずに推測だけで書き換えない。

---

このドキュメントは、Claude/Cursorがこのリポジトリで作業する際の「入り口」として機能します。詳細なMastraの使い方やセットアップ、追加のリソースについては `AGENTS.md` を参照してください。
