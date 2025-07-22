# 日本語→英語 リアルタイム音声翻訳アプリケーション

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/r3-yamauchi/openai-14-realtime-voice-translator)

このプロジェクトは、OpenAI Realtime API と OpenAI Agents SDK を使用した日本語から英語への専用音声翻訳アプリケーションです。ユーザーが日本語で話した内容を即座に英語音声に翻訳する特化型システムとして設計されており、型安全性、パフォーマンス最適化、保守性を重視した実装となっています。

## 概要

本アプリケーションは、従来の音声チャットシステムとは異なり、**日本語→英語翻訳専用**に特化しています。AI は自発的な発言や質問を一切行わず、ユーザーが日本語で話した内容のみを忠実に英語に翻訳して音声で返答します。リアルタイム処理により、自然な翻訳体験を提供します。

## 主な特徴

### 翻訳専用機能
- **受動的翻訳**: AI は挨拶や質問を行わず、日本語入力があるまで完全に沈黙
- **忠実な翻訳**: 解釈や意見を加えず、原文の意味を正確に英語に翻訳
- **即座の応答**: 日本語音声入力を英語音声出力にリアルタイム変換
- **翻訳履歴**: 過去の翻訳内容を確認可能

### 音声カスタマイゼーション
- **8種類の音声選択**: Alloy、Ash、Ballad、Coral、Echo、Sage、Shimmer、Verse
- **5段階の音声速度**: とても遅い、遅い、普通、速い、とても速い
- **リアルタイム変更**: 設定変更時の自動セッション再接続
- **設定保存**: ブラウザローカルストレージでの設定永続化

### 高品質音声処理
- **低遅延処理**: WebRTC による最適化されたリアルタイム通信
- **多種コーデック対応**: Opus 48kHz（高品質）、PCMU/PCMA 8kHz（電話品質）
- **自動音声検出**: VAD（Voice Activity Detection）による自動録音開始/停止
- **Push-to-Talk**: 手動音声入力モードも選択可能

## OpenAI Agents SDK について

このプロジェクトは [OpenAI Agents SDK](https://github.com/openai/openai-agents) を活用し、以下の機能を実現しています：

- **エージェント定義**: 翻訳専用の動作制御とカスタムインストラクション
- **リアルタイム通信**: OpenAI Realtime API との低遅延統合
- **状態管理**: セッション状態とイベント処理の効率的な管理
- **拡張性**: 音声設定や翻訳ルールの柔軟なカスタマイゼーション

## プロジェクト構造

```
src/app/
├── agentConfigs/            # エージェント設定（翻訳専用）
│   ├── simpleChat.ts        # 翻訳エージェント定義（音声・速度設定）
│   ├── index.ts             # エージェント統合管理
│   ├── guardrails.ts        # コンテンツモデレーション
│   └── types.ts             # 型定義エクスポート
├── api/                     # バックエンドAPIエンドポイント
│   ├── session/             # セッション管理（GET /api/session）
│   └── responses/           # レスポンス処理（POST /api/responses）
├── components/              # UIコンポーネント（分割最適化済み）
│   ├── Transcript.tsx       # 翻訳履歴表示
│   ├── MessageItem.tsx      # 個別翻訳アイテム
│   ├── TranscriptHeader.tsx # 翻訳履歴ヘッダー（コピー・ダウンロード）
│   ├── UserInputSection.tsx # ユーザー入力セクション
│   ├── Events.tsx           # システムイベントログ
│   ├── BottomToolbar.tsx    # 操作パネル（接続・設定制御）
│   └── GuardrailChip.tsx    # モデレーション結果表示
├── contexts/                # React Context（最適化済み）
│   ├── TranscriptContext.tsx # 翻訳履歴状態管理
│   └── EventContext.tsx      # イベントログ状態管理
├── hooks/                   # カスタムReactフック（機能分割済み）
│   ├── useRealtimeSession.ts      # リアルタイムセッション制御
│   ├── useAudioDownload.ts        # オーディオ録音・ダウンロード
│   ├── useHandleSessionHistory.ts # セッション履歴統合管理
│   ├── useMessageHandlers.ts      # メッセージ処理専用
│   └── useToolHandlers.ts         # ツール処理専用
└── lib/                     # ユーティリティ関数（共通化済み）
    ├── envSetup.ts          # 環境設定（型安全性向上）
    ├── audioUtils.ts        # オーディオ処理ユーティリティ
    ├── codecUtils.ts        # オーディオコーデック制御
    ├── sessionUtils.ts      # セッション処理ヘルパー
    ├── formatters.ts        # データフォーマット関数
    └── styles.ts            # 共通スタイル定数
```

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.sample` を `.env` にコピーし、OpenAI API キーを設定：

```bash
cp .env.sample .env
```

`.env` ファイルを編集：

```
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

### 4. アプリケーションへのアクセス

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

## 使用方法

### 基本的な翻訳手順

1. **音声設定**: 画面右上で音声タイプと速度を選択
2. **接続開始**: 「接続」ボタンをクリック
3. **日本語入力**: マイクに向かって日本語で話す
4. **英語翻訳**: 即座に英語音声で翻訳結果を出力
5. **履歴確認**: 翻訳履歴で過去の内容を確認

### 音声設定オプション

#### 音声タイプ（8種類）
- **Alloy**: 汎用的で自然な音声（デフォルト）
- **Ash**: 落ち着いた低音の音声
- **Ballad**: 温かみのある表現豊かな音声
- **Coral**: 明るく親しみやすい音声
- **Echo**: クリアで聞き取りやすい音声
- **Sage**: 明瞭で自然な音声
- **Shimmer**: 軽やかで上品な音声
- **Verse**: 表現力豊かな音声

#### 音声速度（5段階）
- **とても遅い**: 非常にゆっくりと丁寧な発音
- **遅い**: 少しゆっくりめの理解しやすいペース
- **普通**: 自然なペース
- **速い**: 少し速めの効率的なペース
- **とても速い**: 速いペースでの情報伝達

### 高度な機能

#### 音声入力制御
- **自動音声検出（VAD）**: 話し始めを自動検出して録音開始
- **Push-to-Talk**: 手動で音声入力をコントロール
- **音声品質選択**: 高品質またはネットワーク最適化モード

#### データ管理
- **翻訳履歴コピー**: ワンクリックでクリップボードにコピー
- **音声録音ダウンロード**: セッション音声をファイル保存
- **設定の永続化**: ブラウザ再起動後も設定を維持

## カスタマイゼーション

### 翻訳動作の調整

`src/app/agentConfigs/simpleChat.ts` で翻訳の動作をカスタマイズ：

```typescript
// 翻訳専用エージェントの設定
export function createSimpleChatAgent(
  speechSpeed: SpeechSpeedLevel = 'normal', 
  voiceId: VoiceId = DEFAULT_VOICE_ID
): RealtimeAgent {
  return new RealtimeAgent({
    name: 'simpleChat',
    voice: voiceId, // 選択された音声タイプ
    instructions: getSpeechSpeedInstruction(speechSpeed),
    // 翻訳専用の動作制御
  });
}
```

### 新しい音声オプションの追加

```typescript
// 音声オプション拡張例
export const voiceOptions: VoiceOption[] = [
  // 既存オプション...
  { id: 'new_voice', name: 'New Voice', description: '新しい音声タイプ' },
];
```

### 音声速度のカスタマイズ

```typescript
// 速度レベル拡張例
export type SpeechSpeedLevel = 
  'very_slow' | 'slow' | 'normal' | 'fast' | 'very_fast' | 'ultra_fast';

// 対応するインストラクション追加
function getSpeechSpeedInstruction(speed: SpeechSpeedLevel): string {
  const speedInstructions = {
    // ... 既存設定
    ultra_fast: "超高速で翻訳を提供してください。",
  };
  // ...
}
```

## 技術仕様

### 主要ライブラリとバージョン

- **@openai/agents**: OpenAI Agents SDK - エージェント定義・リアルタイム通信
- **openai**: OpenAI API 公式クライアント
- **next**: Next.js フレームワーク（App Router対応）
- **react**: React 18.x UI ライブラリ
- **typescript**: TypeScript 5.x 型安全な開発
- **zod**: データバリデーション・型安全性向上
- **tailwindcss**: Tailwind CSS 3.x スタイリング
- **@radix-ui/react-icons**: Radix UIアイコンライブラリ
- **uuid**: 一意識別子生成
- **react-markdown**: マークダウン表示対応

### パフォーマンス最適化

#### メモリ管理
- **自動リソース解放**: MediaRecorder、AudioContext の適切な廃棄
- **イベント制限**: 最大1000件のイベント履歴保持
- **メモリリーク対策**: useEffect のクリーンアップ関数完備

#### React最適化
- **再レンダリング防止**: useCallback、useMemo による最適化
- **コンポーネント分割**: 機能別の適切な分割設計
- **Context最適化**: 効率的な状態管理とプロバイダー構成

#### ネットワーク最適化
- **WebRTC最適化**: 低遅延音声通信
- **コーデック選択**: ネットワーク状況に応じた品質調整
- **接続状態管理**: 自動再接続とエラー回復

## 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# プロダクションビルド
npm run build

# プロダクション起動
npm start

# コードリント・型チェック
npm run lint
```

## トラブルシューティング

### よくある問題と解決方法

#### 1. API接続エラー
```bash
# API キー確認
echo $OPENAI_API_KEY

# 権限確認
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models
```

#### 2. マイクアクセス問題
- ブラウザでマイクアクセス許可を確認
- HTTPS環境での実行推奨
- システム音声設定の確認

#### 3. 音声出力問題
- ブラウザの自動再生ポリシー確認
- システム音量・ミュート状態確認
- 音声タイプ・速度設定の確認

#### 4. 翻訳品質問題
- 明瞭な発音で話す
- 背景ノイズの最小化
- 適切な音声入力レベル調整

#### 5. セッション接続問題
- ネットワーク接続の安定性確認
- ファイアウォール・プロキシ設定確認
- ブラウザコンソールでエラーログ確認

### デバッグ情報

画面右側のイベントログで技術詳細を確認：

- **WebSocket通信**: 接続状態、メッセージ送受信
- **音声処理**: VAD状態、音声品質情報
- **翻訳処理**: リクエスト・レスポンス詳細
- **エラー詳細**: スタックトレース、エラーコード
- **パフォーマンス**: 遅延時間、メモリ使用量

## セキュリティとプライバシー

### データ保護
- **ローカル処理**: 音声データは端末内で処理
- **一時的通信**: OpenAI APIとの通信は暗号化
- **設定保存**: ブラウザローカルストレージのみ使用
- **ログ管理**: 個人情報を含まないログ設計

### 利用規約準拠
- OpenAI利用規約に準拠した実装
- 適切なレート制限とエラーハンドリング
- コンテンツモデレーション機能の統合

## ライセンスと参考資料

### ライセンス
MIT License - 詳細は LICENSE ファイルを参照

### 関連ドキュメント
- [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime)
- [OpenAI Agents SDK](https://github.com/openai/openai-agents)
- [Next.js App Router](https://nextjs.org/docs/app)
- [React 18 ドキュメント](https://react.dev/)
- [TypeScript ハンドブック](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 貢献とサポート

### 開発ガイドライン
1. **コードスタイル**: ESLint・Prettier設定に準拠
2. **型安全性**: TypeScript厳密モード使用
3. **日本語化**: コメント・ドキュメントは日本語で記述
4. **テスト**: 新機能には適切なテストケース追加
5. **パフォーマンス**: メモリリーク・性能劣化の回避

### 今後の拡張予定
- **多言語対応**: 他言語ペアの翻訳対応
- **音声品質向上**: より高品質な音声合成オプション
- **カスタム音声**: ユーザー独自の音声設定
- **翻訳精度向上**: 専門分野に特化した翻訳モード
- **履歴管理**: クラウド同期機能