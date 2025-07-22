"use client";
import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

import Image from "next/image";

// UI コンポーネント
import Transcript from "./components/Transcript";
import Events from "./components/Events";
import BottomToolbar from "./components/BottomToolbar";

// 型定義
import { SessionStatus } from "@/app/types";
import type { RealtimeAgent } from '@openai/agents/realtime';

// コンテキストプロバイダーとフック
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";
import { useRealtimeSession } from "./hooks/useRealtimeSession";
import { createModerationGuardrail } from "@/app/agentConfigs/guardrails";

// エージェント設定
import { createSimpleChatAgent, SpeechSpeedLevel, VoiceId, voiceOptions, DEFAULT_VOICE_ID } from "@/app/agentConfigs/simpleChat";

// SDK で定義されたシナリオの接続ロジックで使用されるマップ。
const getSdkScenarioMap = (speechSpeed: SpeechSpeedLevel, voiceId: VoiceId): Record<string, RealtimeAgent[]> => {
  return {
    simpleChat: [createSimpleChatAgent(speechSpeed, voiceId)],
  };
};

import useAudioDownload from "./hooks/useAudioDownload";
import { useHandleSessionHistory } from "./hooks/useHandleSessionHistory";

function App() {
  const searchParams = useSearchParams()!;

  // ---------------------------------------------------------------------
  // コーデックセレクター – 広帯域 Opus (48 kHz) と
  // 狭帯域 PCMU/PCMA (8 kHz) を切り替えることで、エージェントが従来の電話回線でどのように聞こえるか、
  // およびその制約下での ASR / VAD の動作を検証できます。
  //
  // `?codec=` クエリパラメータを読み取り、`changePeerConnection` フック
  // (`useRealtimeSession` で設定) を使用して、オファー/アンサーネゴシエーションの前に
  // 優先コーデックを設定します。
  // ---------------------------------------------------------------------
  const urlCodec = searchParams.get("codec") || "opus";

  // Agents SDK は現在コーデック選択をサポートしていないため、
  // モジュールロード時にグローバルな codecPatch を介して強制されます。 

  const {
    addTranscriptMessage,
    addTranscriptBreadcrumb,
  } = useTranscript();
  const { logClientEvent, logServerEvent } = useEvent();

  const [selectedAgentName, setSelectedAgentName] = useState<string>("");
  const [selectedAgentConfigSet, setSelectedAgentConfigSet] = useState<
    RealtimeAgent[] | null
  >(null);

  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  // 最新のエージェント切り替えが自動ハンドオフによるものかどうかを識別するための参照
  const handoffTriggeredRef = useRef(false);

  const sdkAudioElement = React.useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    const el = document.createElement('audio');
    el.autoplay = true;
    el.style.display = 'none';
    document.body.appendChild(el);
    return el;
  }, []);

  // SDK オーディオ要素が存在するようになったら (ブラウザでの初回レンダリング後) 接続する
  useEffect(() => {
    if (sdkAudioElement && !audioElementRef.current) {
      audioElementRef.current = sdkAudioElement;
    }
  }, [sdkAudioElement]);

  const {
    connect,
    disconnect,
    sendUserText,
    sendEvent,
    interrupt,
    mute,
  } = useRealtimeSession({
    onConnectionChange: (s) => setSessionStatus(s as SessionStatus),
    onAgentHandoff: (agentName: string) => {
      handoffTriggeredRef.current = true;
      setSelectedAgentName(agentName);
    },
  });

  const [sessionStatus, setSessionStatus] =
    useState<SessionStatus>("DISCONNECTED");

  const [isEventsPaneExpanded, setIsEventsPaneExpanded] =
    useState<boolean>(true);
  const [userText, setUserText] = useState<string>("");
  const [isPTTActive, setIsPTTActive] = useState<boolean>(false);
  const [isPTTUserSpeaking, setIsPTTUserSpeaking] = useState<boolean>(false);
  const [isAudioPlaybackEnabled, setIsAudioPlaybackEnabled] = useState<boolean>(
    () => {
      if (typeof window === 'undefined') return true;
      const stored = localStorage.getItem('audioPlaybackEnabled');
      return stored ? stored === 'true' : true;
    },
  );

  // 録音フックを初期化します。
  const { startRecording, stopRecording, downloadRecording } =
    useAudioDownload();

  const sendClientEvent = (eventObj: any, eventNameSuffix = "") => {
    try {
      sendEvent(eventObj);
      logClientEvent(eventObj, eventNameSuffix);
    } catch (err) {
      console.error('Failed to send via SDK', err);
    }
  };

  useHandleSessionHistory();

  const [isTranscriptVisible, setIsTranscriptVisible] = useState(true);
  const [speechSpeed, setSpeechSpeed] = useState<SpeechSpeedLevel>('normal');
  const [voiceId, setVoiceId] = useState<VoiceId>(DEFAULT_VOICE_ID);

  useEffect(() => {
    setSelectedAgentName('simpleChat');
    setSelectedAgentConfigSet([createSimpleChatAgent(speechSpeed, voiceId)]);
  }, [speechSpeed, voiceId]);

  useEffect(() => {
    if (selectedAgentName && sessionStatus === "DISCONNECTED") {
      connectToRealtime();
    }
  }, [selectedAgentName]);

  useEffect(() => {
    if (
      sessionStatus === "CONNECTED" &&
      selectedAgentConfigSet &&
      selectedAgentName
    ) {
      const currentAgent = selectedAgentConfigSet.find(
        (a) => a.name === selectedAgentName
      );
      addTranscriptBreadcrumb(`Agent: ${selectedAgentName}`, currentAgent);
      updateSession(!handoffTriggeredRef.current);
      
      // 初期挨拶を中断して翻訳専用モードにする
      setTimeout(() => {
        interrupt();
      }, 100); // 接続直後の短い遅延でinterruptを実行
      
      // 処理後にフラグをリセットし、後続の副作用が正常に動作するようにする
      handoffTriggeredRef.current = false;
    }
  }, [selectedAgentConfigSet, selectedAgentName, sessionStatus, interrupt]);

  useEffect(() => {
    if (sessionStatus === "CONNECTED") {
      updateSession();
    }
  }, [isPTTActive]);

  const fetchEphemeralKey = async (): Promise<string | null> => {
    try {
      logClientEvent({ url: "/session" }, "fetch_session_token_request");
      const tokenResponse = await fetch("/api/session");

      if (!tokenResponse.ok) {
        console.error(`API responded with status ${tokenResponse.status}`);
        const errorText = await tokenResponse.text();
        logClientEvent({ error: errorText, status: tokenResponse.status }, "fetch_session_token_error");
        setSessionStatus("DISCONNECTED");
        return null;
      }

      const responseText = await tokenResponse.text();
      if (!responseText) {
        console.error("Empty response from API");
        logClientEvent({ error: "Empty response" }, "fetch_session_token_error");
        setSessionStatus("DISCONNECTED");
        return null;
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse JSON response:", parseError);
        console.error("Response text:", responseText);
        logClientEvent({ error: "Invalid JSON response", responseText }, "fetch_session_token_error");
        setSessionStatus("DISCONNECTED");
        return null;
      }

      logServerEvent(data, "fetch_session_token_response");

      if (!data.client_secret?.value) {
        logClientEvent(data, "error.no_ephemeral_key");
        console.error("No ephemeral key provided by the server");
        setSessionStatus("DISCONNECTED");
        return null;
      }

      return data.client_secret.value;
    } catch (error) {
      console.error("Error fetching ephemeral key:", error);
      logClientEvent({ error: String(error) }, "fetch_session_token_error");
      setSessionStatus("DISCONNECTED");
      return null;
    }
  };

  const connectToRealtime = async () => {
    const sdkScenarioMap = getSdkScenarioMap(speechSpeed, voiceId);
    
    if (sdkScenarioMap['simpleChat']) {
      if (sessionStatus !== "DISCONNECTED") return;
      setSessionStatus("CONNECTING");

      try {
        const EPHEMERAL_KEY = await fetchEphemeralKey();
        if (!EPHEMERAL_KEY) return;

        // 選択されたエージェント名が最初になるようにして、それがルートになるようにする
        const reorderedAgents = [...sdkScenarioMap['simpleChat']];
        const idx = reorderedAgents.findIndex((a) => a.name === selectedAgentName);
        if (idx > 0) {
          const [agent] = reorderedAgents.splice(idx, 1);
          reorderedAgents.unshift(agent);
        }

        const guardrails = [createModerationGuardrail('Chat')];

        await connect({
          getEphemeralKey: async () => EPHEMERAL_KEY,
          initialAgents: reorderedAgents,
          audioElement: sdkAudioElement,
          outputGuardrails: guardrails,
          extraContext: {
            addTranscriptBreadcrumb,
          },
        });
      } catch (err) {
        console.error("Error connecting via SDK:", err);
        setSessionStatus("DISCONNECTED");
      }
      return;
    }
  };

  const disconnectFromRealtime = () => {
    disconnect();
    setSessionStatus("DISCONNECTED");
    setIsPTTUserSpeaking(false);
  };

  const sendSimulatedUserMessage = (text: string) => {
    const id = uuidv4().slice(0, 32);
    addTranscriptMessage(id, "user", text, true);

    sendClientEvent({
      type: 'conversation.item.create',
      item: {
        id,
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }],
      },
    });
    sendClientEvent({ type: 'response.create' }, '(simulated user text message)');
  };

  const updateSession = (shouldTriggerResponse: boolean = false) => {
    // バックエンドでサーバー VAD を (非) アクティブ化することで、
    // Push-to-Talk UI の状態を反映します。
    // Realtime SDK は `session.update` イベントを介したライブセッション更新をサポートしています。
    const turnDetection = isPTTActive
      ? null
      : {
          type: 'server_vad',
          threshold: 0.7,
          prefix_padding_ms: 500,
          silence_duration_ms: 800,
          create_response: true,
        };

    sendEvent({
      type: 'session.update',
      session: {
        turn_detection: turnDetection,
      },
    });

    // エージェントがユーザーに挨拶するのをトリガーするために、最初の「こんにちは」メッセージを送信します。
    if (shouldTriggerResponse) {
      sendSimulatedUserMessage('こんにちは');
    }
  }

  const handleSendTextMessage = () => {
    if (!userText.trim()) return;
    interrupt();

    try {
      sendUserText(userText.trim());
    } catch (err) {
      console.error('Failed to send via SDK', err);
    }

    setUserText("");
  };

  const handleTalkButtonDown = () => {
    if (sessionStatus !== 'CONNECTED') return;
    interrupt();

    setIsPTTUserSpeaking(true);
    sendClientEvent({ type: 'input_audio_buffer.clear' }, 'clear PTT buffer');

    // プレースホルダーなし。準備ができたらサーバーのトランスクリプトに依存します。
  };

  const handleTalkButtonUp = () => {
    if (sessionStatus !== 'CONNECTED' || !isPTTUserSpeaking)
      return;

    setIsPTTUserSpeaking(false);
    sendClientEvent({ type: 'input_audio_buffer.commit' }, 'commit PTT');
    sendClientEvent({ type: 'response.create' }, 'trigger response PTT');
  };

  const onToggleConnection = () => {
    if (sessionStatus === "CONNECTED" || sessionStatus === "CONNECTING") {
      disconnectFromRealtime();
      setSessionStatus("DISCONNECTED");
    } else {
      connectToRealtime();
    }
  };


  // 新しい接続が必要なため、コーデックが変更されたらページをリフレッシュします。
  const handleCodecChange = (newCodec: string) => {
    const url = new URL(window.location.toString());
    url.searchParams.set("codec", newCodec);
    window.location.replace(url.toString());
  };

  // 音声速度変更ハンドラー
  const handleSpeechSpeedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSpeed = e.target.value as SpeechSpeedLevel;
    setSpeechSpeed(newSpeed);
    // 接続中の場合は再接続が必要
    if (sessionStatus === "CONNECTED") {
      disconnectFromRealtime();
      // 少し待ってから再接続
      setTimeout(() => {
        connectToRealtime();
      }, 500);
    }
  };

  const handleVoiceIdChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newVoiceId = e.target.value as VoiceId;
    setVoiceId(newVoiceId);
    // 接続中の場合は再接続が必要（音声は接続後変更不可のため）
    if (sessionStatus === "CONNECTED") {
      disconnectFromRealtime();
      // 少し待ってから再接続
      setTimeout(() => {
        connectToRealtime();
      }, 500);
    }
  };

  useEffect(() => {
    const storedPushToTalkUI = localStorage.getItem("pushToTalkUI");
    if (storedPushToTalkUI) {
      setIsPTTActive(storedPushToTalkUI === "true");
    }
    const storedLogsExpanded = localStorage.getItem("logsExpanded");
    if (storedLogsExpanded) {
      setIsEventsPaneExpanded(storedLogsExpanded === "true");
    }
    const storedAudioPlaybackEnabled = localStorage.getItem(
      "audioPlaybackEnabled"
    );
    if (storedAudioPlaybackEnabled) {
      setIsAudioPlaybackEnabled(storedAudioPlaybackEnabled === "true");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("pushToTalkUI", isPTTActive.toString());
  }, [isPTTActive]);

  useEffect(() => {
    localStorage.setItem("logsExpanded", isEventsPaneExpanded.toString());
  }, [isEventsPaneExpanded]);

  useEffect(() => {
    localStorage.setItem(
      "audioPlaybackEnabled",
      isAudioPlaybackEnabled.toString()
    );
  }, [isAudioPlaybackEnabled]);

  useEffect(() => {
    if (audioElementRef.current) {
      if (isAudioPlaybackEnabled) {
        audioElementRef.current.muted = false;
        audioElementRef.current.play().catch((err) => {
          console.warn("Autoplay may be blocked by browser:", err);
        });
      } else {
        // ポーズが有効になる前の短い音声の途切れを避けるため、ミュートして一時停止します。
        audioElementRef.current.muted = true;
        audioElementRef.current.pause();
      }
    }

    // ユーザーが再生を無効にしたときに帯域幅を節約するために、サーバー側のオーディオストリームのミュートを切り替えます。
    try {
      mute(!isAudioPlaybackEnabled);
    } catch (err) {
      console.warn('SDK ミュートの切り替えに失敗しました', err);
    }
  }, [isAudioPlaybackEnabled]);

  // 接続後、または SDK クライアント参照が利用可能になったときに、ミュート状態がトランスポートに伝播されるようにします。
  useEffect(() => {
    if (sessionStatus === 'CONNECTED') {
      try {
        mute(!isAudioPlaybackEnabled);
      } catch (err) {
        console.warn('接続後のミュート同期に失敗しました', err);
      }
    }
  }, [sessionStatus, isAudioPlaybackEnabled]);

  useEffect(() => {
    if (sessionStatus === "CONNECTED" && audioElementRef.current?.srcObject) {
      // オーディオ要素からのリモートオーディオストリーム。
      const remoteStream = audioElementRef.current.srcObject as MediaStream;
      startRecording(remoteStream);
    }

    // アンマウント時または sessionStatus が更新されたときにクリーンアップします。
    return () => {
      stopRecording();
    };
  }, [sessionStatus]);

  useEffect(() => {
    // Only run on client
    const stored = localStorage.getItem('transcriptVisible');
    if (stored !== null) {
      setIsTranscriptVisible(stored === 'true');
    } else {
      setIsTranscriptVisible(true);
    }

    // 音声速度の設定をローカルストレージから読み込み
    const storedSpeechSpeed = localStorage.getItem('speechSpeed');
    if (storedSpeechSpeed && ['very_slow', 'slow', 'normal', 'fast', 'very_fast'].includes(storedSpeechSpeed)) {
      setSpeechSpeed(storedSpeechSpeed as SpeechSpeedLevel);
    } else {
      setSpeechSpeed('normal');
    }

    // 音声IDの設定をローカルストレージから読み込み
    const storedVoiceId = localStorage.getItem('voiceId');
    const validVoiceIds = voiceOptions.map(v => v.id);
    if (storedVoiceId && validVoiceIds.includes(storedVoiceId as VoiceId)) {
      setVoiceId(storedVoiceId as VoiceId);
    } else {
      setVoiceId(DEFAULT_VOICE_ID);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('transcriptVisible', isTranscriptVisible.toString());
  }, [isTranscriptVisible]);

  useEffect(() => {
    localStorage.setItem('speechSpeed', speechSpeed);
  }, [speechSpeed]);

  useEffect(() => {
    localStorage.setItem('voiceId', voiceId);
  }, [voiceId]);

  return (
    <div className="text-base flex flex-col h-screen bg-gray-100 text-gray-800 relative">
      <div className="p-5 text-lg font-semibold flex justify-between items-center">
        <div
          className="flex items-center cursor-pointer"
          onClick={() => window.location.reload()}
        >
          <div>
            <Image
              src="/openai-logomark.svg"
              alt="OpenAI Logo"
              width={20}
              height={20}
              className="mr-2"
            />
          </div>
          <div>
            日本語→英語 <span className="text-gray-500">音声翻訳</span>
          </div>
        </div>
        <div className="flex items-center">
          <label className="flex items-center text-base gap-1 mr-2 font-medium">
            音声速度
          </label>
          <div className="relative inline-block mr-4">
            <select
              value={speechSpeed}
              onChange={handleSpeechSpeedChange}
              disabled={sessionStatus === "CONNECTED"}
              className="appearance-none border border-gray-300 rounded-lg text-base px-2 py-1 pr-8 cursor-pointer font-normal focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="very_slow">とても遅い</option>
              <option value="slow">遅い</option>
              <option value="normal">普通</option>
              <option value="fast">速い</option>
              <option value="very_fast">とても速い</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-600">
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 10.44l3.71-3.21a.75.75 0 111.04 1.08l-4.25 3.65a.75.75 0 01-1.04 0L5.21 8.27a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
          <label className="flex items-center text-base gap-1 mr-2 font-medium">
            音声タイプ
          </label>
          <div className="relative inline-block">
            <select
              value={voiceId}
              onChange={handleVoiceIdChange}
              disabled={sessionStatus === "CONNECTED"}
              className="appearance-none border border-gray-300 rounded-lg text-base px-2 py-1 pr-8 cursor-pointer font-normal focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              {voiceOptions.map(voice => (
                <option key={voice.id} value={voice.id}>
                  {voice.name} - {voice.description}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-600">
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 10.44l3.71-3.21a.75.75 0 111.04 1.08l-4.25 3.65a.75.75 0 01-1.04 0L5.21 8.27a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 gap-2 px-2 overflow-hidden relative">
        <Transcript
          userText={userText}
          setUserText={setUserText}
          onSendMessage={handleSendTextMessage}
          downloadRecording={downloadRecording}
          canSend={sessionStatus === "CONNECTED"}
          isVisible={isTranscriptVisible}
        />
        <Events isExpanded={isEventsPaneExpanded} />
      </div>

      <BottomToolbar
        sessionStatus={sessionStatus}
        onToggleConnection={onToggleConnection}
        isPTTActive={isPTTActive}
        setIsPTTActive={setIsPTTActive}
        isPTTUserSpeaking={isPTTUserSpeaking}
        handleTalkButtonDown={handleTalkButtonDown}
        handleTalkButtonUp={handleTalkButtonUp}
        isEventsPaneExpanded={isEventsPaneExpanded}
        setIsEventsPaneExpanded={setIsEventsPaneExpanded}
        isAudioPlaybackEnabled={isAudioPlaybackEnabled}
        setIsAudioPlaybackEnabled={setIsAudioPlaybackEnabled}
        codec={urlCodec}
        onCodecChange={handleCodecChange}
        isTranscriptVisible={isTranscriptVisible}
        setIsTranscriptVisible={setIsTranscriptVisible}
      />
    </div>
  );
}

export default App;
