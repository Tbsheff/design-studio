import { sendTelemetry } from "../../api.js";
import type { BridgeFrame } from "../../platform/bridge.js";
import { reportAppStart } from "../../platform/telemetry.js";
import { settleSwap } from "./preview-frames-swap.js";
import type { PreviewState } from "./preview-frames-types.js";

const REACT_LATENCY_WINDOW_MS = 10_000;

interface TelemetryBase {
  directionId?: string;
  projectId: string;
}

const toTelemetryBase = (state: PreviewState): TelemetryBase => {
  const { directionId, projectId } = state.opts;

  if (directionId === null) {
    return { projectId };
  }

  return { directionId, projectId };
};

const flushSelectLatency = (state: PreviewState): void => {
  const at = state.pendingSelectAt;

  if (at === null) {
    return;
  }

  state.pendingSelectAt = null;
  requestAnimationFrame(() => {
    sendTelemetry({
      ...toTelemetryBase(state),
      kind: "select.latency",
      ms: Date.now() - at,
    });
  });
};

const reportOpen = (state: PreviewState, isFront: boolean): void => {
  if (state.openReported || !isFront) {
    return;
  }

  state.openReported = true;
  reportAppStart("studio");
  sendTelemetry({
    ...toTelemetryBase(state),
    kind: "studio.open",
    ms: Date.now() - state.mountedAt,
  });
};

const reportSwapLatency = (state: PreviewState, frame: BridgeFrame): void => {
  const swap = state.pendingSwap;

  if (swap?.token !== frame.token) {
    return;
  }

  settleSwap(state, frame.token);
  sendTelemetry({
    ...toTelemetryBase(state),
    detail: { kind: "html" },
    kind: "preview.latency",
    ms: Date.now() - swap.changedAt,
  });
};

const reportReactLatency = (state: PreviewState, isFront: boolean): void => {
  const react = state.pendingReact;

  if (!react || !isFront || state.opts.kind !== "react") {
    return;
  }

  state.pendingReact = null;

  if (Date.now() - react.receivedAt < REACT_LATENCY_WINDOW_MS) {
    sendTelemetry({
      ...toTelemetryBase(state),
      detail: { kind: "react" },
      kind: "preview.latency",
      ms: Date.now() - react.changedAt,
    });
  }
};

const onPainted = (state: PreviewState, frame: BridgeFrame): void => {
  const isFront = frame.token === state.front;
  state.lastPaintAt[frame.token] = Date.now();
  reportOpen(state, isFront);
  reportSwapLatency(state, frame);
  reportReactLatency(state, isFront);
};

export { flushSelectLatency, onPainted };
