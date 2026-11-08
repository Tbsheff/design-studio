import type { TelemetrySample } from "@design-studio/contracts";

import { sendTelemetry } from "../api";
import { desktopBridge } from "./desktop";

interface DesktopBoot {
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

const desktopBoot = (): DesktopBoot | null => {
  const boot = desktopBridge<{ boot?: DesktopBoot }>()?.boot;

  return boot && typeof boot.startedAt === "number" ? boot : null;
};

const afterPaint = (fn: () => void): void => {
  requestAnimationFrame(() => requestAnimationFrame(fn));
};

const reportAppStart = (screen: "home" | "studio"): void => {
  if (appStartSent) {
    return;
  }

  appStartSent = true;
  afterPaint(() => {
    const boot = desktopBoot();
    const ms = boot ? Date.now() - boot.startedAt : performance.now();
    sendTelemetry({
      detail: {
        screen,
        surface: boot ? "desktop" : "web",
        ...boot?.marks,
      },
      kind: "app.start",
      ms: Math.round(ms),
    });
  });
};

const reportFirstToken = (
  projectId: string,
  directionId: string | undefined,
  runId: string,
  sentAt: number
): void => {
  afterPaint(() =>
    sendTelemetry({
      detail: { runId, stage: "visible" },
      directionId,
      kind: "run.first_token",
      ms: Date.now() - sentAt,
      projectId,
    })
  );
};

const longFrameType = (): string | null => {
  if (typeof PerformanceObserver === "undefined") {
    return null;
  }

  const types = PerformanceObserver.supportedEntryTypes ?? [];

  if (types.includes("long-animation-frame")) {
    return "long-animation-frame";
  }

  return types.includes("longtask") ? "longtask" : null;
};

const watchLongFrames = (): (() => void) => {
  const type = longFrameType();

  if (!type) {
    return () => undefined;
  }

  let count = 0;
  let worst = 0;
  let timer: number | undefined;

  const flush = (): void => {
    window.clearTimeout(timer);
    timer = undefined;

    if (count === 0) {
      return;
    }

    const sample: Omit<TelemetrySample, "ts"> = {
      kind: "frame.long",
      ...scope,
      ms: Math.round(worst),
      detail: { count, screen: scope.projectId ? "studio" : "home", type },
    };

    count = 0;
    worst = 0;
    sendTelemetry(sample);
  };

  flushLongFrames = flush;

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.duration < LONG_FRAME_MS) {
        continue;
      }

      count += 1;
      worst = Math.max(worst, entry.duration);
    }

    if (count > 0 && timer === undefined) {
      timer = window.setTimeout(flush, FLUSH_MS);
    }
  });

  observer.observe({ buffered: true, type });

  const onHide = (): void => {
    if (document.visibilityState === "hidden") {
      flush();
    }
  };

  document.addEventListener("visibilitychange", onHide);

  return () => {
    document.removeEventListener("visibilitychange", onHide);
    observer.disconnect();
    flush();
    flushLongFrames = (): undefined => undefined;
  };
};

const setTelemetryScope = (next: Scope): (() => void) => {
  flushLongFrames();
  scope = next;

  return () => {
    if (scope !== next) {
      return;
    }

    flushLongFrames();
    scope = {};
  };
};

export {
  desktopBoot,
  reportAppStart,
  reportFirstToken,
  watchLongFrames,
  setTelemetryScope,
};

export type { DesktopBoot };
