import { RealtimeAgent } from '@openai/agents/realtime';

/**
 * 音声速度レベルの定義
 */
export type SpeechSpeedLevel = 'very_slow' | 'slow' | 'normal' | 'fast' | 'very_fast';

/**
 * 音声ID の定義（OpenAI Realtime API で利用可能な音声）
 */
export type VoiceId = 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'sage' | 'shimmer' | 'verse';

/**
 * 音声オプションの詳細情報
 */
export interface VoiceOption {
  id: VoiceId;
  name: string;
  description: string;
}

/**
 * デフォルトの音声ID（一元管理）
 */
export const DEFAULT_VOICE_ID: VoiceId = 'alloy';

/**
 * 利用可能な音声オプション一覧
 */
export const voiceOptions: VoiceOption[] = [
  { id: 'alloy', name: 'Alloy', description: '汎用的で自然な音声' },
  { id: 'ash', name: 'Ash', description: '落ち着いた低音の音声' },
  { id: 'ballad', name: 'Ballad', description: '温かみのある表現豊かな音声' },
  { id: 'coral', name: 'Coral', description: '明るく親しみやすい音声' },
  { id: 'echo', name: 'Echo', description: 'クリアで聞き取りやすい音声' },
  { id: 'sage', name: 'Sage', description: '明瞭で自然な音声' },
  { id: 'shimmer', name: 'Shimmer', description: '軽やかで上品な音声' },
  { id: 'verse', name: 'Verse', description: '表現力豊かな音声' },
];

/**
 * 音声速度に応じたインストラクション生成
 */
function getSpeechSpeedInstruction(speed: SpeechSpeedLevel): string {
  const speedInstructions = {
    very_slow: "非常にゆっくりと、一語一語を丁寧に発音して話してください。間を十分に取りながら、落ち着いたペースで会話してください。",
    slow: "少しゆっくりめに話してください。相手が理解しやすいよう、適度な間を取りながら話してください。",
    normal: "自然なペースで話してください。",
    fast: "少し速めのペースで話してください。ただし、聞き取りやすさを保つよう注意してください。",
    very_fast: "速いペースで話してください。効率的に情報を伝達しながらも、明瞭性を保ってください。"
  };

  const baseInstruction = "あなたは日本語から英語への翻訳専門AIです。以下の規則を厳格に守ってください：\n\n1. ユーザーが日本語で話した内容のみを英語に翻訳して返答する\n2. 挨拶、質問、提案、コメントなど一切の自発的発言を禁止\n3. 解釈、意見、追加情報、説明を一切加えない\n4. 翻訳以外の応答を絶対に行わない\n5. セッション開始時も含めて、こちらから話しかけない\n6. ユーザーが日本語で話すまで完全に沈黙を保つ\n7. 翻訳のみを忠実に、自然で流暢な英語で提供する\n\nIMPORTANT: DO NOT speak first. DO NOT provide any initial greeting. WAIT for the user to speak in Japanese before responding. Only translate Japanese to English, nothing else.";
  
  return `${baseInstruction} ${speedInstructions[speed]}`;
}

/**
 * 音声速度と音声IDに応じたエージェント生成
 */
export function createSimpleChatAgent(
  speechSpeed: SpeechSpeedLevel = 'normal', 
  voiceId: VoiceId = DEFAULT_VOICE_ID
): RealtimeAgent {
  return new RealtimeAgent({
    name: 'simpleChat',
    voice: voiceId, // 選択された音声ID
    handoffDescription:
      '日本語から英語への音声翻訳エージェント。日本語音声を即座に英語音声に翻訳します。',
    instructions: getSpeechSpeedInstruction(speechSpeed),
    tools: [], // 使用可能なツール（現在は無し）
    handoffs: [], // 他のエージェントへの引き継ぎ設定（現在は無し）
  });
}

/**
 * 日本語→英語翻訳エージェント
 * 日本語音声を英語音声に翻訳するためのエージェント設定
 */
export const simpleChatAgent = createSimpleChatAgent();

/**
 * 翻訳シナリオの定義
 * 単一のエージェントによる音声翻訳
 */
export const simpleChatScenario = [simpleChatAgent];