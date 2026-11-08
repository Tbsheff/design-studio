import type { RunLevel } from "@design-studio/contracts";
import type { IconName } from "@design-studio/ui";
import type { CSSProperties } from "react";

import type {
  ComposerMode,
  DesignsSetting,
  EffortSetting,
} from "./run-settings.js";

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
  onMention: () => void;
  onSkills: () => void;
  onOpen?: () => void;
  mode: ComposerMode;
  onMode: (mode: ComposerMode) => void;
  designs?: DesignsSetting | undefined;
}

const MODES: readonly ComposerMode[] = ["edit", "plan", "critique"];

const MODE_SHORT_HINT: Record<ComposerMode, string> = {
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
  effort: EffortSetting;
  onModel: (id: string) => void;
  onOpen?: () => void;
}

export { ITEM, MODES, MODE_SHORT_HINT };

export type {
  ItemProps,
  ModelPillProps,
  PlusMenuProps,
  UsePlacedPopoverResult,
};
