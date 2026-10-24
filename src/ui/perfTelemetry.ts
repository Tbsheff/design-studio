import type { TelemetrySample } from '../shared/contracts';
import { sendTelemetry } from './api';

export interface DesktopBoot {
  startedAt: number;
  marks: Record<string, number>;
}

interface Scope {
  projectId?: string;
  directionId?: string;
}

const LONG_FRAME_MS = 50;
const FLUSH_MS = 5000;

let scope: Scope = {};
let appStartSent = false;
let flushLongFrames: () => void = () => undefined;

export function desktopBoot(): DesktopBoot | null {
  const boot = (window as unknown as { studioDesktop?: { boot?: DesktopBoot } }).studioDesktop?.boot;
  return boot && typeof boot.startedAt === 'number' ? boot : null;
}

function afterPaint(fn: () => void): void {
  requestAnimationFrame(() => requestAnimationFrame(fn));
}

export function reportAppStart(screen: 'home' | 'studio'): void {
  if (appStartSent) return;
  appStartSent = true;
  afterPaint(() => {
    const boot = desktopBoot();
    const ms = boot ? Date.now() - boot.startedAt : performance.now();
    sendTelemetry({ kind: 'app.start', ms: Math.round(ms), detail: { surface: boot ? 'desktop' : 'web', screen, ...(boot?.marks ?? {}) } });
  });
}

export function reportFirstToken(projectId: string, directionId: string | undefined, runId: string, sentAt: number): void {
  afterPaint(() => sendTelemetry({ kind: 'run.first_token', projectId, directionId, ms: Date.now() - sentAt, detail: { runId, stage: 'visible' } }));
}

function longFrameType(): string | null {
  if (typeof PerformanceObserver === 'undefined') return null;
  const types = PerformanceObserver.supportedEntryTypes ?? [];
  if (types.includes('long-animation-frame')) return 'long-animation-frame';
  return types.includes('longtask') ? 'longtask' : null;
}

export function watchLongFrames(): () => void {
  const type = longFrameType();
  if (!type) return () => undefined;
  let count = 0;
  let worst = 0;
  let timer: number | undefined;
  const flush = () => {
    window.clearTimeout(timer);
    timer = undefined;
    if (count === 0) return;
    const sample: Omit<TelemetrySample, 'ts'> = { kind: 'frame.long', ...scope, ms: Math.round(worst), detail: { count, type, screen: scope.projectId ? 'studio' : 'home' } };
    count = 0;
    worst = 0;
    sendTelemetry(sample);
  };
  flushLongFrames = flush;
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.duration < LONG_FRAME_MS) continue;
      count += 1;
      worst = Math.max(worst, entry.duration);
    }
    if (count > 0 && timer === undefined) timer = window.setTimeout(flush, FLUSH_MS);
  });
  observer.observe({ type, buffered: true });
  const onHide = () => {
    if (document.visibilityState === 'hidden') flush();
  };
  document.addEventListener('visibilitychange', onHide);
  return () => {
    document.removeEventListener('visibilitychange', onHide);
    observer.disconnect();
    flush();
    flushLongFrames = () => undefined;
  };
}

export function setTelemetryScope(next: Scope): () => void {
  flushLongFrames();
  scope = next;
  return () => {
    if (scope !== next) return;
    flushLongFrames();
    scope = {};
  };
}
