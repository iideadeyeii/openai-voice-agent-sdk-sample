"use client";

import AudioChat from "@/components/AudioChat";
import { ChatHistory } from "@/components/ChatDialog";
import { Composer } from "@/components/Composer";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";
import { useAudio } from "@/hooks/useAudio";
import { useWebsocket } from "@/hooks/useWebsocket";
import { useEffect, useState } from "react";

import "./styles.css";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [wsUrl, setWsUrl] = useState<string | undefined>(undefined);
  const [muted, setMuted] = useState(false);

  // Load persisted values from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem("apiKey");
    if (savedKey) setApiKey(savedKey);
    const savedPrompt = localStorage.getItem("systemPrompt");
    if (savedPrompt) setSystemPrompt(savedPrompt);
  }, []);

  // Persist values when they change
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem("apiKey", apiKey);
    } else {
      localStorage.removeItem("apiKey");
    }
  }, [apiKey]);

  useEffect(() => {
    if (systemPrompt) {
      localStorage.setItem("systemPrompt", systemPrompt);
    } else {
      localStorage.removeItem("systemPrompt");
    }
  }, [systemPrompt]);

  const {
    isReady: audioIsReady,
    playAudio,
    startRecording,
    stopRecording,
    stopPlaying,
    frequencies,
    playbackFrequencies,
  } = useAudio();
  const {
    isReady: websocketReady,
    sendAudioMessage,
    sendTextMessage,
    history: messages,
    resetHistory,
    isLoading,
    agentName,
    disconnect,
  } = useWebsocket({
    url: wsUrl,
    onNewAudio: (audio) => {
      if (!muted) {
        playAudio(audio);
      }
    },
  });

  function handleSubmit() {
    setPrompt("");
    sendTextMessage(prompt);
  }

  async function toggleMute() {
    if (!muted) {
      await stopPlaying();
    }
    setMuted((m) => !m);
  }

  function startConversation() {
    const baseUrl =
      process.env.NEXT_PUBLIC_WEBSOCKET_ENDPOINT ?? "ws://localhost:8000/ws";
    const url = `${baseUrl}?api_key=${encodeURIComponent(apiKey)}&system_prompt=${encodeURIComponent(systemPrompt)}`;
    setWsUrl(url);
    resetHistory();
  }

  function endConversation() {
    disconnect();
    resetHistory();
    setWsUrl(undefined);
  }

  function downloadTranscript() {
    const lines = messages
      .filter((m) => m.type === "message")
      .map((m) => {
        const content = typeof m.content === "string" ? m.content :
          Array.isArray(m.content) && m.content[0]?.type === "output_text"
            ? m.content[0].text
            : "";
        return `${m.role}: ${content}`;
      });
    const blob = new Blob([lines.join("\n\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "transcript.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="w-full h-dvh flex flex-col items-center">
      <Header
        agentName={agentName ?? ""}
        playbackFrequencies={playbackFrequencies}
        stopPlaying={toggleMute}
        resetConversation={resetHistory}
      />
      <div className="flex flex-col gap-2 p-4 w-full max-w-2xl">
        <input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="OpenAI API Key"
          className="border p-2 rounded"
        />
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="System prompt"
          className="border p-2 rounded"
        />
        <div className="flex gap-2 items-center">
          <span
            className={websocketReady ? "text-green-600" : "text-red-600"}
          >
            {websocketReady ? "Connected" : "Disconnected"}
          </span>
          <Button variant="primary" onClick={startConversation}>
            Start
          </Button>
          <Button onClick={endConversation}>End</Button>
          <Button variant="outline" onClick={toggleMute}>
            {muted ? "Unmute" : "Mute"}
          </Button>
          <Button onClick={downloadTranscript}>Download Transcript</Button>
        </div>
      </div>
      <ChatHistory messages={messages} isLoading={isLoading} />
      <Composer
        prompt={prompt}
        setPrompt={setPrompt}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        audioChat={
          <AudioChat
            frequencies={frequencies}
            isReady={websocketReady && audioIsReady}
            startRecording={startRecording}
            stopRecording={stopRecording}
            sendAudioMessage={sendAudioMessage}
          />
        }
      />
    </div>
  );
}
