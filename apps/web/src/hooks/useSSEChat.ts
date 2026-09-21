import { useCallback, useRef, useState } from 'react';
import { getToken } from '../lib/auth';
import { parseSSEStream } from '../lib/sse';

export interface Citation {
  file_path: string;
  start_line: number;
  end_line: number;
  function_name: string | null;
  snippet: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  timestamp: string;
}

export function useSSEChat(repoId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [currentResponse, setCurrentResponse] = useState<string>('');
  const [citations, setCitations] = useState<Citation[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setStatus(null);
  }, []);

  const sendMessage = useCallback(
    async (messageText: string, sessionId?: string): Promise<void> => {
      if (!messageText.trim() || !repoId) return;

      // 1. Abort any active stream
      cancelStream();

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: messageText,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsStreaming(true);
      setCurrentResponse('');
      setCitations([]);
      setStatus('Connecting to CodeLens agent...');
      setError(null);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        };

        const token = getToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`/api/v1/repos/${repoId}/chat`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            message: messageText,
            session_id: sessionId,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          throw new Error(errBody.detail || `Server responded with status ${response.status}`);
        }

        if (!response.body) {
          throw new Error('ReadableStream not supported by server response');
        }

        const reader = response.body.getReader();
        let accumulatedTokens = '';
        let receivedCitations: Citation[] = [];

        for await (const event of parseSSEStream(reader, controller.signal)) {
          if (event.event === 'status') {
            try {
              const statusData = JSON.parse(event.data);
              setStatus(statusData.message || statusData.stage || 'Processing...');
            } catch {
              setStatus(event.data);
            }
          } else if (event.event === 'citations') {
            try {
              const parsedCitations: Citation[] = JSON.parse(event.data);
              receivedCitations = parsedCitations;
              setCitations(parsedCitations);
            } catch (e) {
              console.warn('Failed to parse citations payload', e); // oklog
            }
          } else if (event.event === 'token') {
            try {
              const tokenData = JSON.parse(event.data);
              const text = tokenData.text || '';
              accumulatedTokens += text;
              setCurrentResponse(accumulatedTokens);
            } catch {
              accumulatedTokens += event.data;
              setCurrentResponse(accumulatedTokens);
            }
          } else if (event.event === 'done') {
            setStatus(null);
            setIsStreaming(false);
          }
        }

        // Add completed assistant message to history
        if (accumulatedTokens) {
          const assistantMessage: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: accumulatedTokens,
            citations: receivedCitations,
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          // Stream was intentionally cancelled by user
          return;
        }
        const errorMsg = err.message || 'Stream connection failed';
        setError(errorMsg);
        setStatus(null);
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [repoId, cancelStream]
  );

  return {
    messages,
    isStreaming,
    currentResponse,
    citations,
    status,
    error,
    sendMessage,
    cancelStream,
    setMessages,
  };
}
