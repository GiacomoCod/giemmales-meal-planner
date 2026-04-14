import { useEffect, useMemo, useRef, useState } from 'react';

interface PerformanceHUDProps {
  activeTab: string;
}

interface PerfSnapshot {
  fps: number;
  frameBudgetMisses120: number;
  frameBudgetMisses60: number;
  worstFrameMs: number;
  longTasks: number;
  worstLongTaskMs: number;
  heapMb: number | null;
}

const INITIAL_SNAPSHOT: PerfSnapshot = {
  fps: 0,
  frameBudgetMisses120: 0,
  frameBudgetMisses60: 0,
  worstFrameMs: 0,
  longTasks: 0,
  worstLongTaskMs: 0,
  heapMb: null
};

export function PerformanceHUD({ activeTab }: PerformanceHUDProps) {
  const [enabled, setEnabled] = useState(false);
  const [snapshot, setSnapshot] = useState<PerfSnapshot>(INITIAL_SNAPSHOT);
  const framesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const longTaskCountRef = useRef(0);
  const worstLongTaskRef = useRef(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryEnabled = params.get('perf') === '1';
    const storedEnabled = window.localStorage.getItem('vp_perf_hud') === '1';
    setEnabled(queryEnabled || storedEnabled);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'p') return;
      const nextValue = window.localStorage.getItem('vp_perf_hud') === '1' ? '0' : '1';
      window.localStorage.setItem('vp_perf_hud', nextValue);
      window.location.reload();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    let sampleStart = performance.now();

    const updateSnapshot = (now: number) => {
      const frameDurations = framesRef.current;
      if (frameDurations.length === 0) return;

      const avgFrame = frameDurations.reduce((total, value) => total + value, 0) / frameDurations.length;
      const fps = 1000 / avgFrame;
      const frameBudgetMisses120 = frameDurations.filter((value) => value > 8.34).length;
      const frameBudgetMisses60 = frameDurations.filter((value) => value > 16.67).length;
      const worstFrameMs = Math.max(...frameDurations);
      const heapMb = (() => {
        const perfWithMemory = performance as Performance & {
          memory?: { usedJSHeapSize: number };
        };
        if (!perfWithMemory.memory) return null;
        return perfWithMemory.memory.usedJSHeapSize / (1024 * 1024);
      })();

      setSnapshot({
        fps,
        frameBudgetMisses120,
        frameBudgetMisses60,
        worstFrameMs,
        longTasks: longTaskCountRef.current,
        worstLongTaskMs: worstLongTaskRef.current,
        heapMb
      });

      framesRef.current = [];
      longTaskCountRef.current = 0;
      worstLongTaskRef.current = 0;
      sampleStart = now;
    };

    const loop = (now: number) => {
      if (lastFrameTimeRef.current !== null) {
        framesRef.current.push(now - lastFrameTimeRef.current);
      }
      lastFrameTimeRef.current = now;

      if (now - sampleStart >= 1000) {
        updateSnapshot(now);
      }

      rafIdRef.current = window.requestAnimationFrame(loop);
    };

    rafIdRef.current = window.requestAnimationFrame(loop);

    let observer: PerformanceObserver | null = null;
    if ('PerformanceObserver' in window && PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
      observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          longTaskCountRef.current += 1;
          worstLongTaskRef.current = Math.max(worstLongTaskRef.current, entry.duration);
        });
      });
      observer.observe({ type: 'longtask', buffered: true });
    }

    return () => {
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
      }
      observer?.disconnect();
    };
  }, [enabled]);

  const grade = useMemo(() => {
    if (snapshot.fps >= 110 && snapshot.frameBudgetMisses120 <= 6) return '120 Hz OK';
    if (snapshot.fps >= 75) return 'Quasi 120 Hz';
    if (snapshot.fps >= 55) return '60 Hz OK';
    return 'Da ottimizzare';
  }, [snapshot.fps, snapshot.frameBudgetMisses120]);

  if (!enabled) return null;

  return (
    <aside
      style={{
        position: 'fixed',
        right: 12,
        bottom: 96,
        zIndex: 6000,
        width: 210,
        padding: '12px 14px',
        borderRadius: 18,
        background: 'rgba(15, 23, 42, 0.9)',
        color: '#f8fafc',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        boxShadow: '0 12px 34px rgba(15, 23, 42, 0.28)',
        border: '1px solid rgba(255,255,255,0.08)',
        fontSize: 12,
        lineHeight: 1.45
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <strong style={{ fontSize: 13, letterSpacing: '0.02em' }}>Perf HUD</strong>
        <span style={{ opacity: 0.7 }}>{grade}</span>
      </div>
      <div style={{ opacity: 0.75, marginBottom: 10 }}>Tab: {activeTab}</div>
      <div>FPS medi: <strong>{snapshot.fps.toFixed(1)}</strong></div>
      <div>Frame oltre 8.3ms: <strong>{snapshot.frameBudgetMisses120}</strong></div>
      <div>Frame oltre 16.7ms: <strong>{snapshot.frameBudgetMisses60}</strong></div>
      <div>Worst frame: <strong>{snapshot.worstFrameMs.toFixed(1)} ms</strong></div>
      <div>Long tasks: <strong>{snapshot.longTasks}</strong></div>
      <div>Worst long task: <strong>{snapshot.worstLongTaskMs.toFixed(1)} ms</strong></div>
      {snapshot.heapMb !== null && (
        <div>Heap JS: <strong>{snapshot.heapMb.toFixed(1)} MB</strong></div>
      )}
      <div style={{ opacity: 0.6, marginTop: 10 }}>
        Attiva con <code>?perf=1</code> o <code>Cmd/Ctrl+P</code>.
      </div>
    </aside>
  );
}
