/**
 * useAudioMonitor — Microphone audio level monitoring hook
 *
 * Uses the Web Audio API to measure ambient sound levels during an exam.
 * If sustained loud audio is detected it fires an onAlert callback so the
 * exam page / teacher dashboard can log a violation.
 *
 * Usage:
 *   const { level, status } = useAudioMonitor({ enabled, onAlert });
 *
 * Returns:
 *   level  — 0-100 rolling audio level (for UI meter)
 *   status — 'active' | 'denied' | 'unavailable'
 */
import { useEffect, useRef, useState } from 'react';

const LOUD_THRESHOLD   = 55;   // dB-equivalent (0-100 scale)
const SUSTAINED_FRAMES = 8;    // consecutive "loud" samples → violation
const SAMPLE_INTERVAL  = 300;  // ms

export function useAudioMonitor({ enabled = true, onAlert }) {
  const [level,  setLevel]  = useState(0);
  const [status, setStatus] = useState('inactive');

  const streamRef    = useRef(null);
  const contextRef   = useRef(null);
  const analyserRef  = useRef(null);
  const timerRef     = useRef(null);
  const loudCount    = useRef(0);
  const mountedRef   = useRef(true);

  useEffect(() => {
    if (!enabled) return;
    mountedRef.current = true;

    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(stream => {
        if (!mountedRef.current) { stream.getTracks().forEach(t=>t.stop()); return; }

        streamRef.current  = stream;
        const ctx          = new (window.AudioContext || window.webkitAudioContext)();
        contextRef.current = ctx;

        const source   = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize           = 256;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);
        analyserRef.current = analyser;

        setStatus('active');

        const buf = new Uint8Array(analyser.frequencyBinCount);

        timerRef.current = setInterval(() => {
          if (!mountedRef.current) return;
          analyser.getByteFrequencyData(buf);
          const avg = buf.reduce((s,v)=>s+v,0) / buf.length;
          const scaled = Math.min(100, Math.round((avg / 128) * 100));
          setLevel(scaled);

          if (scaled >= LOUD_THRESHOLD) {
            loudCount.current += 1;
            if (loudCount.current === SUSTAINED_FRAMES && onAlert) {
              onAlert({
                type:        'audio_disturbance',
                description: `Sustained loud audio detected (level ${scaled}/100)`,
                severity:    scaled >= 80 ? 'high' : 'medium',
                confidence:  0.75,
              });
            }
          } else {
            loudCount.current = 0;
          }
        }, SAMPLE_INTERVAL);
      })
      .catch(err => {
        const s = err.name === 'NotAllowedError' ? 'denied' : 'unavailable';
        if (mountedRef.current) setStatus(s);
      });

    return () => {
      mountedRef.current = false;
      clearInterval(timerRef.current);
      try { streamRef.current?.getTracks().forEach(t=>t.stop()); } catch {}
      try { contextRef.current?.close(); } catch {}
    };
  }, [enabled, onAlert]);

  return { level, status };
}
