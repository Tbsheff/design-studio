import type { TelemetrySample } from "@design-studio/contracts";

import { sendTelemetry } from "../api-telemetry";
import { desktopBridge } from "./desktop";
import { pick } from "./pick.js";
import { isNumber } from "./value-guards.js";

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
const flushNothing = (): null => null;

let flushLongFrames: () => void = flushNothing;

const desktopBoot = (): DesktopBoot | null => {
  const boot = desktopBridge<{ boot?: DesktopBoot }>()?.boot;

  if (boot && isNumber(boot.startedAt)) {
    return boot;
  }

  return null;
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

    const ms = pick(
      Boolean(boot),
      Date.now() - (boot?.startedAt ?? 0),
      performance.now()
    );

    const surface = pick(Boolean(boot), "desktop", "web");

    sendTelemetry({
      detail: {
        screen,
        surface,
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
  const stage = "visible";
  const ids = { directionId, projectId };

  afterPaint(() =>
    sendTelemetry({
      ...ids,
      detail: { runId, stage },
      kind: "run.first_token",
      ms: Date.now() - sentAt,
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

  if (types.includes("longtask")) {
    return "longtask";
  }

  return null;
};

const watchLongFrames = (): (() => void) => {
  const type = longFrameType();

  if (!type) {
    return () => false;
  }

  let count = 0;
  let worst = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = (): void => {
    if (timer !== null) {
      globalThis.clearTimeout(timer);
    }

    timer = null;

    if (count === 0) {
      return;
    }

    const screen = pick(Boolean(scope.projectId), "studio", "home");

    const sample: Omit<TelemetrySample, "ts"> = {
      ...scope,
      detail: {
        count,
        screen,
        type,
      },
      kind: "frame.long",
      ms: Math.round(worst),
    };

    count = 0;
    worst = 0;
    sendTelemetry(sample);
  };

  flushLongFrames = flush;

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.duration >= LONG_FRAME_MS) {
        count += 1;
        worst = Math.max(worst, entry.duration);
      }
    }

    if (count > 0 && timer === null) {
      timer = globalThis.setTimeout(flush, FLUSH_MS);
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
    flushLongFrames = flushNothing;
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
