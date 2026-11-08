import { slashCommands } from "../../chat-slots.js";
import type { Command } from "../../chat-slots.js";
import { MODE_SHORT_HINT } from "./composer-menu-model.js";
import { MODE_LABEL } from "./composer-mode-model.js";
import type { ComposerMode } from "./composer-mode-model.js";
import { MOD_LABEL } from "./mod-label.js";
import { EMPTY_REASON, MODES, MODE_ICON } from "./prompt-box-model.js";
import type { SendStatus } from "./prompt-box-model.js";
import type { SlashGroup } from "./slash-menu.js";

const SLASH_HIDDEN = /^composer\.(?:mode|level)-/u;

const RUNNING_PLACEHOLDER = `Add a note for Claude (↵), or send it now (${MOD_LABEL}↵)`;

interface SendBlockerState {
  readonly waitReason: string | null | undefined;
  readonly loading: boolean;
  readonly uploading: boolean;
  readonly empty: boolean;
}

interface SendStatusState extends SendBlockerState {
  readonly running: boolean;
}

interface SendReadyState {
  readonly running: boolean;
  readonly blocked: boolean;
  readonly busy: boolean;
  readonly empty: boolean;
}

const modeGroup = (
  mode: ComposerMode,
  onMode: (mode: ComposerMode) => void
): SlashGroup => ({
  choices: MODES.map((item) => ({
    checked: item === mode,
    hint: MODE_SHORT_HINT[item],
    icon: MODE_ICON[item],
    id: item,
    label: MODE_LABEL[item],
    pick: () => onMode(item),
  })),
  icon: "chat",
  id: "mode",
  label: "Mode",
  value: MODE_LABEL[mode],
});

const addSkillId = (previous: string[], id: string): string[] => {
  if (previous.includes(id)) {
    return previous;
  }

  return [...previous, id];
};

const toSlashCommands = (): Command[] =>
  slashCommands().filter((command) => !SLASH_HIDDEN.test(command.id));

const toDropClass = (isDragging: boolean, base: string): string => {
  if (isDragging) {
    return `${base} dragging`;
  }

  return base;
};

const sendReady = (state: SendReadyState): boolean =>
  !state.running && !state.blocked && !state.busy && !state.empty;

const inputPlaceholder = (
  running: boolean,
  waitReason: string | null | undefined,
  placeholder: string
): string => {
  if (waitReason) {
    return waitReason;
  }

  if (running) {
    return RUNNING_PLACEHOLDER;
  }

  return `${placeholder} (${MOD_LABEL}↵ to send)`;
};

const sendBlocker = (state: SendBlockerState): string | null => {
  if (state.waitReason) {
    return state.waitReason;
  }

  if (state.loading) {
    return "Wait for the design to load";
  }

  if (state.uploading) {
    return "Wait for the images to upload";
  }

  if (state.empty) {
    return EMPTY_REASON;
  }

  return null;
};

const sendStatus = (state: SendStatusState): SendStatus => {
  let blocker: string | null = null;

  if (!state.running) {
    blocker = sendBlocker(state);
  }

  let spoken = blocker;

  if (blocker === EMPTY_REASON) {
    spoken = null;
  }

  return {
    spoken,
    tip: blocker ?? `Send (${MOD_LABEL}↵)`,
  };
};

const designsBlocker = (
  mode: ComposerMode,
  selectionCount: number
): string | null => {
  if (mode === "critique") {
    return "Critique makes one review.";
  }

  if (mode === "plan") {
    return "Plan makes one plan.";
  }

  if (selectionCount > 0) {
    return "Variations need an empty selection.";
  }

  return null;
};

export {
  addSkillId,
  designsBlocker,
  inputPlaceholder,
  modeGroup,
  sendReady,
  sendStatus,
  toDropClass,
  toSlashCommands,
};
