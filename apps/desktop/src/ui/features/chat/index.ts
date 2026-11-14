import { lazy } from "react";

import { chatWidthStyle } from "./chat-splitter-model.js";
import {
  createDeltaBatcher,
  toFrameSchedule,
  toMergedDeltas,
} from "./delta-batch-model.js";
import { levelGist, levelHint, levelLabel } from "./level-model.js";
import { runStepText } from "./live-status-model.js";
import type { McpToasts as McpToastsView } from "./mcp-toasts.js";
import { parseDraft, toDraft } from "./settings-draft-model.js";
import type { SettingsDraft } from "./settings-draft-model.js";
import type { useAskChat as UseAskChat } from "./use-ask-chat.js";

const loadAskChat = async (): Promise<typeof UseAskChat> => {
  const loaded = await import("./use-ask-chat.js");

  return loaded.useAskChat;
};

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

const loadMcpToasts = async (): Promise<typeof McpToastsView> => {
  const loaded = await import("./mcp-toasts.js");

  return loaded.McpToasts;
};

const McpToasts = lazy(async () => ({ default: await loadMcpToasts() }));

const McpEditStrip = lazy(async () => {
  const loaded = await import("./mcp-feed.js");

  return { default: loaded.McpEditStrip };
});

const McpPointBadge = lazy(async () => {
  const loaded = await import("./mcp-point-badge.js");

  return { default: loaded.McpPointBadge };
});

export {
  ChatPanel,
  ClarifyForm,
  McpEditStrip,
  McpPointBadge,
  McpToasts,
  chatWidthStyle,
  createDeltaBatcher,
  levelGist,
  levelHint,
  levelLabel,
  loadAskChat,
  loadMcpToasts,
  parseDraft,
  runStepText,
  toDraft,
  toFrameSchedule,
  toMergedDeltas,
  UnfinishedBanner,
};

export type { SettingsDraft };

export { useActiveRun } from "./use-active-run.js";

export { applyRunEvent, runText } from "./run-state-model.js";

export type { RunMap } from "./run-state-model.js";

export type { DeltaBatcher } from "./delta-batch-model.js";

export { useSlashMenu } from "./use-slash-menu.js";

export { improveRequest, lastImproveRun } from "./draft-improve-model.js";
