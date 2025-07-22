/**
 * コーデック名に基づいて対応するオーディオフォーマットを返す
 * @param codec - コーデック名（opus, pcmu, pcma）
 * @returns 対応するオーディオフォーマット
 */
export function audioFormatForCodec(codec: string): 'pcm16' | 'g711_ulaw' | 'g711_alaw' {
  let audioFormat: 'pcm16' | 'g711_ulaw' | 'g711_alaw' = 'pcm16';
  if (typeof window !== 'undefined') {
    const c = codec.toLowerCase();
    if (c === 'pcmu') audioFormat = 'g711_ulaw';
    else if (c === 'pcma') audioFormat = 'g711_alaw';
  }
  return audioFormat;
}

/**
 * Peer Connectionのオーディオトランシーバーに優先コーデックを適用
 * 複数回呼び出しても安全な設計
 * @param pc - RTCPeerConnection インスタンス
 * @param codec - 適用したいコーデック名
 */
export function applyCodecPreferences(
  pc: RTCPeerConnection,
  codec: string,
): void {
  try {
    // オーディオ機能の取得
    const caps = (RTCRtpSender as any).getCapabilities?.('audio');
    if (!caps) return;

    // 指定されたコーデックを検索
    const pref = caps.codecs.find(
      (c: any) => c.mimeType.toLowerCase() === `audio/${codec.toLowerCase()}`,
    );
    if (!pref) return;

    // 全てのオーディオトランシーバーにコーデック設定を適用
    pc
      .getTransceivers()
      .filter((t) => t.sender && t.sender.track?.kind === 'audio')
      .forEach((t) => t.setCodecPreferences([pref]));
  } catch (err) {
    console.error('[codecUtils] applyCodecPreferences エラー', err);
  }
}
