import type {
  DirectStyleProperty,
  SelectionContext,
  TailwindOutcome,
} from "@design-studio/contracts";
import type { MutableRefObject } from "react";

import type { PreviewPort } from "../../platform/bridge.js";
import type { Shift, ShiftPart, StyleValues } from "./css-value-model.js";
import type { NO_MIXED } from "./edit-request-model.js";

type SaveStatus =
  | { readonly kind: "idle" }
  | { readonly kind: "saving" }
  | { readonly kind: "saved"; readonly at: number }
  | {
      readonly kind: "error";
      readonly message: string;
      readonly code?: string;
    };

interface DirectEditControl {
  readonly cancel: () => void;
  readonly settle: () => Promise<void>;
  readonly commitText: (selector: string, text: string) => boolean;
}

interface DirectEditCommit {
  readonly selector: string;
  readonly style: Partial<StyleValues>;
  readonly text?: string;
}

type StyleRewrite = (style: Partial<StyleValues>) => Partial<StyleValues>;

interface Options {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly selection: SelectionContext;
  readonly port: MutableRefObject<PreviewPort | null>;
  readonly control: MutableRefObject<DirectEditControl | null>;
  readonly onCommitted: (commit: DirectEditCommit) => void;
  readonly onStale: (message: string) => void;
  readonly rewrite: StyleRewrite | null;
  readonly variant?: string;
}

interface DirectEditScope {
  readonly directionId: string | null;
  readonly projectId: string;
}

interface DirectEdit {
  readonly absorb: (style: Partial<StyleValues>) => void;
  readonly commit: () => void;
  readonly commitSoon: () => void;
  readonly dirty: DirectStyleProperty[];
  readonly drain: () => Promise<void>;
  readonly each: readonly StyleValues[] | null;
  readonly mixed: typeof NO_MIXED;
  readonly port: MutableRefObject<PreviewPort | null>;
  readonly preview: (patch: Partial<StyleValues>) => void;
  readonly previewForced: (patch: Partial<StyleValues>) => void;
  readonly previewText: (text: string) => void;
  readonly reselect: () => void;
  readonly reset: () => void;
  readonly revert: (props: DirectStyleProperty[]) => void;
  readonly revertText: () => void;
  readonly scope: DirectEditScope;
  readonly shift: (
    props: readonly DirectStyleProperty[],
    delta: number,
    bounds: Omit<Shift, "delta">,
    part: ShiftPart | null
  ) => void;
  readonly status: SaveStatus;
  readonly tailwind: TailwindOutcome | null;
  readonly text: SelectionContext["text"];
  readonly values: StyleValues;
}

type ControlRef = MutableRefObject<DirectEditControl | null>;

const setControl = (
  control: ControlRef,
  value: DirectEditControl | null
): void => {
  control.current = value;
};

const deleteControl = (
  control: ControlRef,
  cancel: DirectEditControl["cancel"]
): void => {
  if (control.current?.cancel === cancel) {
    control.current = null;
  }
};

const DEBOUNCE_MS = 250;
const AGENT_RUNNING_MESSAGE = "Agent is running. Wait or cancel.";
const STALE_SELECTION_STATUS = 422;

export {
  AGENT_RUNNING_MESSAGE,
  DEBOUNCE_MS,
  STALE_SELECTION_STATUS,
  deleteControl,
  setControl,
};

export type {
  DirectEdit,
  DirectEditCommit,
  DirectEditControl,
  DirectEditScope,
  Options,
  SaveStatus,
  StyleRewrite,
};
