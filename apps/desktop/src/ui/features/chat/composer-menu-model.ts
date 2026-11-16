import type { RunLevel } from "@design-studio/contracts";
import type { IconName } from "@design-studio/ui";
import type { CSSProperties } from "react";

import type { ComposerMode } from "./composer-mode-model.js";
import type { StableSize } from "./stable-text.js";
import type { PlusProjectProps } from "./composer-sheet-model.js";

interface ItemProps {
  icon?: IconName;
  label: string;
  meta?: string;
  checked?: boolean;
  disabledReason?: string | null;
  hint?: string;
  onPick: () => void;
}

interface PlusMenuProps {
  onAttach: () => void;
  onAttachFolder: () => void;
  onAttachUrl: () => void;
  onAttachZip: () => void;
  onMention: () => void;
  onFocusSelection: (() => void) | null;
  onSkills: () => void;
  onOpen?: () => void;
  project?: PlusProjectProps | null;
}

const MODE_SHORT_HINT: Record<ComposerMode, string> = {
  ask: "Answers, no changes",
  critique: "Review only",
  edit: "Changes the design",
  plan: "You approve first",
};

const ITEM = '[role^="menuitem"]:not([aria-disabled="true"])';

interface UsePlacedPopoverResult {
  readonly close: (refocus: boolean) => void;
  readonly closing: boolean;
  readonly open: boolean;
  readonly shown: boolean;
  readonly style: CSSProperties;
  readonly toggle: () => void;
}

interface ModelPillProps {
  model: string;
  level: RunLevel;
  onModel: (id: string) => void;
  onOpen?: () => void;
}

const LEVEL_FOCUS: readonly string[] = ['[aria-checked="true"]', ITEM];

const MODEL_FOCUS: readonly string[] = ['[tabindex="0"]:not(:disabled)'];

const ITEM_FOCUS: readonly string[] = [ITEM];

const NO_SIZES: readonly StableSize[] = [];

export {
  ITEM,
  ITEM_FOCUS,
  LEVEL_FOCUS,
  MODEL_FOCUS,
  MODE_SHORT_HINT,
  NO_SIZES,
};

export type {
  ItemProps,
  ModelPillProps,
  PlusMenuProps,
  UsePlacedPopoverResult,
};
