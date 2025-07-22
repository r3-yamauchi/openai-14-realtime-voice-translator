"use client";

import React, { useState } from "react";
import { DownloadIcon, ClipboardCopyIcon } from "@radix-ui/react-icons";

interface TranscriptHeaderProps {
  transcriptRef: React.RefObject<HTMLDivElement | null>;
  onDownloadRecording: () => void;
}

/**
 * トランスクリプトのヘッダー部分を表示するコンポーネント
 * コピー機能とオーディオダウンロード機能を提供
 */
export function TranscriptHeader({ transcriptRef, onDownloadRecording }: TranscriptHeaderProps) {
  const [justCopied, setJustCopied] = useState(false);

  const handleCopyTranscript = async () => {
    if (!transcriptRef.current) return;
    
    try {
      await navigator.clipboard.writeText(transcriptRef.current.innerText);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1500);
    } catch (error) {
      console.error("翻訳履歴のコピーに失敗しました:", error);
    }
  };

  return (
    <div className="flex items-center justify-between px-6 py-3 sticky top-0 z-10 text-base border-b bg-white rounded-t-xl">
      <span className="font-semibold">翻訳履歴</span>
      <div className="flex gap-x-2">
        <button
          onClick={handleCopyTranscript}
          className="w-24 text-sm px-3 py-1 rounded-md bg-gray-200 hover:bg-gray-300 flex items-center justify-center gap-x-1 transition-colors"
          title="翻訳履歴をクリップボードにコピー"
        >
          <ClipboardCopyIcon />
          {justCopied ? "コピーしました！" : "コピー"}
        </button>
        <button
          onClick={onDownloadRecording}
          className="w-40 text-sm px-3 py-1 rounded-md bg-gray-200 hover:bg-gray-300 flex items-center justify-center gap-x-1 transition-colors"
          title="録音されたオーディオをダウンロード"
        >
          <DownloadIcon />
          <span>オーディオをダウンロード</span>
        </button>
      </div>
    </div>
  );
}