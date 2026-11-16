import type { IconName } from "@design-studio/ui";

import { pick } from "../../platform/pick.js";
import { copy } from "./copy.js";

type CopyState =
  | { readonly kind: "busy" }
  | { readonly kind: "copied"; readonly label: string }
  | { readonly kind: "failed"; readonly message: string }
  | { readonly kind: "idle" };

type CopyVariant = "icon" | "row";

const RESET_MS = 1600;
const ICON_TRIGGER_CLASS = "icon-btn small copy-code-trigger";

const toStatusLabel = (state: CopyState): string => {
  switch (state.kind) {
    case "busy": {
      return copy.copyingCode;
    }

    case "copied": {
      return `Copied ${state.label}`;
    }

    case "failed": {
      return `Could not copy: ${state.message}`;
    }

    default: {
      return copy.copyAsCode;
    }
  }
};

const toStatusIcon = (state: CopyState): IconName => {
  if (state.kind === "copied") {
    return "check";
  }

  return pick(state.kind === "failed", "alert", "code");
};

const toTriggerClass = (variant: CopyVariant, isBusy: boolean): string => {
  const base = pick(variant === "row", "ins-export-row", ICON_TRIGGER_CLASS);

  return `${base}${pick(isBusy, " busy", "")}`;
};

export { RESET_MS, toStatusIcon, toStatusLabel, toTriggerClass };

export type { CopyState, CopyVariant };
