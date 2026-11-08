import type { RunLevel } from "@design-studio/contracts";
import type { IconName } from "@design-studio/ui";
import { lazy } from "react";

import type { ComposerMode } from "./run-settings.js";

const RepoContextChip = lazy(() => import("./repo-context-chip.js"));

interface VariationsPromptProps {
  count: number;
  max: number;
  onCount: (count: number) => void;
  onSend: (
    prompt: string,
    level: RunLevel,
    attachmentIds: string[]
  ) => Promise<void>;
  onElement?: (prompt: string, count: number, level: RunLevel) => Promise<void>;
}

type SendState = "send" | "queue" | "stop";

const SEND_LABEL: Record<SendState, string> = {
  queue: "Queue",
  send: "Send",
  stop: "Stop",
};

interface SendProps {
  running: boolean;
  sending: boolean;
  canSend: boolean;
  canQueue: boolean;
  hasDraft: boolean;
  tip: string;
  onSend: () => void;
  onQueue: () => void;
  onStop: () => void;
}

interface SendView {
  state: SendState;
  busy: boolean;
  disabled: boolean;
  tip: string;
  keys?: string;
  onClick: () => void;
}

const SEND_CLASS: Record<SendState, string> = {
  queue: "icon-btn send send-btn",
  send: "icon-btn send send-btn",
  stop: "icon-btn send-btn stop-btn",
};

const SEND_ICON: Record<SendState, IconName> = {
  queue: "history",
  send: "arrowUp",
  stop: "stop",
};

const MODE_ICON: Record<ComposerMode, IconName> = {
  critique: "eye",
  edit: "pencil",
  plan: "doc",
};

const MODES: readonly ComposerMode[] = ["edit", "plan", "critique"];

const INPUT_COPY: Record<ComposerMode, { label: string; placeholder: string }> =
  {
    critique: {
      label: "Ask for a critique",
      placeholder: "Ask for a critique…",
    },
    edit: {
      label: "Describe what you want to create",
      placeholder: "Describe what you want to create…",
    },
    plan: {
      label: "Describe what to plan",
      placeholder: "Describe what to plan…",
    },
  };

const EMPTY_REASON = "Type a message to send";

interface SendStatus {
  tip: string;
  spoken: string | null;
}

export {
  EMPTY_REASON,
  INPUT_COPY,
  MODES,
  MODE_ICON,
  RepoContextChip,
  SEND_CLASS,
  SEND_ICON,
  SEND_LABEL,
};

export type {
  SendProps,
  SendState,
  SendStatus,
  SendView,
  VariationsPromptProps,
};
