import { lazy } from "react";

import { chatWidthStyle } from "./chat-splitter-model.js";
import {
  createDeltaBatcher,
  toFrameSchedule,
  toMergedDeltas,
} from "./delta-batch-model.js";
import { runStepText } from "./live-status-model.js";
import { parseDraft, toDraft } from "./settings-draft-model.js";
import type { SettingsDraft } from "./settings-draft-model.js";

const ChatPanel = lazy(async () => {
  const loaded = await import("./chat-panel.js");

  return { default: loaded.ChatPanel };
});

const UnfinishedBanner = lazy(async () => {
  const loaded = await import("./unfinished-banner.js");

  return { default: loaded.UnfinishedBanner };
});

const ClarifyForm = lazy(async () => {
  const loaded = await import("./clarify-form.js");

  return { default: loaded.ClarifyForm };
});

const McpToasts = lazy(async () => {
  const loaded = await import("./mcp-toasts.js");

  return { default: loaded.McpToasts };
});

const McpPointBadge = lazy(async () => {
  const loaded = await import("./mcp-point-badge.js");

  return { default: loaded.McpPointBadge };
});

const InlinePrompt = lazy(() => import("./inline-prompt.js"));

export {
  ChatPanel,
  ClarifyForm,
  InlinePrompt,
  McpPointBadge,
  McpToasts,
  chatWidthStyle,
  createDeltaBatcher,
  parseDraft,
  runStepText,
  toDraft,
  toFrameSchedule,
  toMergedDeltas,
  UnfinishedBanner,
};

export type { SettingsDraft };

export type { InlinePromptView } from "./use-inline-prompt.js";

export { applyRunEvent, runText } from "./run-state-model.js";

export type { RunMap } from "./run-state-model.js";

export type { DeltaBatcher } from "./delta-batch-model.js";
