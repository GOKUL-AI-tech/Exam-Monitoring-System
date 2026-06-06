/**
 * useProctoring — Enhanced AI proctoring hook
 *
 * Connects to the Python AI service via WebSocket for deeper server-side
 * analysis (MediaPipe, DeepFace) while the exam page runs its own
 * client-side face-api.js loop.
 *
 * Responsibilities:
 *  • Maintain WS connection to /ws/{sessionId}
 *  • Send webcam frames every FRAME_INTERVAL_MS
 *  • Parse AI result and call onViolation for any server-side violations
 *  • Report AI service status (connected / degraded)
 */
import { useEffect, useRef, useCallback } from 'react';
import { sessionAPI } from '../services/api';

const AI_SERVICE_WS  = process.env.REACT_APP_AI_WS_URL || 'ws://localhost:8000/ws';
const FRAME_INTERVAL = 2500;   // ms between frames sent to Python AI
const RECONNECT_DELAY= 5000;   // ms before WS reconnect attempt

export function useProctoring({ sessionId, webcamRef, enabled = true, onStatusChange }) {
  const wsRef          = useRef(null);
  const frameTimerRef  = useRef(null);
  const reconnectRef   = useRef(null);
  const mountedRef     = useRef(true);

  const reportStatus = useCallback((status) => {
    if (onStatusChange) onStatusChange(status);
  }, [onStatusChange]);

  const sendFrame = useCallback(() => {
    if (!webcamRef?.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    try {
      const screenshot = webcamRef.current.getScreenshot({ width: 320, height: 240 });
      if (!screenshot) return;
      const base64 = screenshot.split(',')[1];
      wsRef.current.send(JSON.stringify({ frame_base64: base64 }));
    } catch {}
  }, [webcamRef]);

  const handleAIResult = useCallback(async (result) => {
    if (!sessionId || !mountedRef.current) return;
    const violations = result.violations || [];
    for (const v of violations) {
      try {
        await sessionAPI.logViolation(sessionId, {
          violation_type:   v.type,
          severity:         v.severity,
          description:      v.description,
          confidence_score: v.confidence,
        });
      } catch {}
    }
  }, [sessionId]);

  const connect = useCallback(() => {
    if (!enabled || !sessionId || !mountedRef.current) return;

    try {
      const ws = new WebSocket(`${AI_SERVICE_WS}/${sessionId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        reportStatus('connected');
        frameTimerRef.current = setInterval(sendFrame, FRAME_INTERVAL);
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try { handleAIResult(JSON.parse(event.data)); } catch {}
      };

      ws.onerror = () => {
        reportStatus('degraded');
      };

      ws.onclose = () => {
        reportStatus('disconnected');
        clearInterval(frameTimerRef.current);
        if (mountedRef.current && enabled) {
          reconnectRef.current = setTimeout(connect, RECONNECT_DELAY);
        }
      };
    } catch {
      reportStatus('unavailable');
      reconnectRef.current = setTimeout(connect, RECONNECT_DELAY * 2);
    }
  }, [enabled, sessionId, sendFrame, handleAIResult, reportStatus]);

  useEffect(() => {
    if (!enabled || !sessionId) return;
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      clearInterval(frameTimerRef.current);
      clearTimeout(reconnectRef.current);
      try { wsRef.current?.close(); } catch {}
    };
  }, [enabled, sessionId, connect]);
}
