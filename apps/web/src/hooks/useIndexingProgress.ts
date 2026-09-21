import { useEffect, useRef, useState } from 'react';
import { useRepoStore } from '../stores/repoStore';

export interface IndexingProgressState {
  progress: number;
  stage: string;
  message: string;
  isConnected: boolean;
}

export function useIndexingProgress(repoId: string | null): IndexingProgressState {
  const [progress, setProgress] = useState<number>(0);
  const [stage, setStage] = useState<string>('idle');
  const [message, setMessage] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const updateIndexingProgress = useRepoStore((state) => state.updateIndexingProgress);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryCountRef = useRef<number>(0);

  useEffect(() => {
    if (!repoId) {
      setProgress(0);
      setStage('idle');
      setMessage('');
      setIsConnected(false);
      return;
    }

    let isUnmounted = false;

    const connectWebSocket = () => {
      if (isUnmounted) return;

      // Build WS URL dynamically supporting Vite proxy or direct host
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/v1/repos/${repoId}/progress`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isUnmounted) return;
        setIsConnected(true);
        retryCountRef.current = 0; // Reset exponential backoff on successful connection

        // Setup 30s heartbeat ping
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        if (isUnmounted) return;
        try {
          const data = JSON.parse(event.data);
          if (data.progress !== undefined) {
            const numProgress = Number(data.progress);
            setProgress(numProgress);
            const statusStage = data.status || data.stage || 'indexing';
            setStage(statusStage);
            setMessage(data.message || '');
            updateIndexingProgress(repoId, statusStage, numProgress);
          }
        } catch (e) {
          console.debug('Received non-JSON websocket frame:', event.data); // oklog
        }
      };

      ws.onclose = () => {
        if (isUnmounted) return;
        setIsConnected(false);
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }

        // Exponential backoff: 1s, 2s, 4s, 8s, up to max 30s
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
        retryCountRef.current += 1;

        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, delay);
      };

      ws.onerror = (err) => {
        console.debug('WebSocket error encountered, closing socket:', err); // oklog
        ws.close();
      };
    };

    connectWebSocket();

    return () => {
      isUnmounted = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [repoId, updateIndexingProgress]);

  return { progress, stage, message, isConnected };
}
