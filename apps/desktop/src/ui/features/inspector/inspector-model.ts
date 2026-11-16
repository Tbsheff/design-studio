import type {
  EditSessionEnd,
  SelectionContext,
} from "@design-studio/contracts";
import type { MutableRefObject, ReactNode, ComponentProps } from "react";

import { isSvgDrawingTag } from "../../../shared/vector.js";
import type { ComponentsPanel } from "../../app/components-panel-host.js";
import type { PreviewPort } from "../../platform/bridge.js";
import type { DesignTokens } from "../design-system/use-design-system-state.js";
import { copy } from "./copy.js";
import type { InspectorTweaksProps } from "./inspector-tweaks.js";
import type { DirectEditCommit, DirectEditControl } from "./use-direct-edit.js";
import type { EditSessionHandle, SessionAction } from "./use-edit-session.js";

type InspectorTab =
  | "simple"
  | "prototype"
  | "pro"
  | "components"
  | "code"
  | "tweaks";

interface InspectorProps {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly selection: SelectionContext[];
  readonly isEditable: boolean;
  readonly port: MutableRefObject<PreviewPort | null>;
  readonly control: MutableRefObject<DirectEditControl | null>;
  readonly onCommitted: (commit: DirectEditCommit) => void;
  readonly notice: string | null;
  readonly onStale: (message: string) => void;
  readonly tokens: DesignTokens | null;
  readonly session?: MutableRefObject<EditSessionHandle | null>;
  readonly onExit?: () => void;
  readonly onSessionEnd?: (
    action: SessionAction,
    result: EditSessionEnd
  ) => void;
  readonly layers?: ReactNode;
  readonly tweaks?: InspectorTweaksProps;
  readonly isSelectMode: boolean;
  readonly onSelectMode?: () => void;
  readonly onUndo?: () => void;
  readonly onRedo?: () => void;
  readonly tab?: InspectorTab;
  readonly onTab?: (tab: InspectorTab) => void;
  readonly appDir?: string | null;
  readonly onAskAgent?: (prompt: string) => void;
  readonly components?: ComponentProps<typeof ComponentsPanel>;
}

const TABS: { readonly id: InspectorTab; readonly label: string }[] = [
  { id: "simple", label: copy.tabDesign },
  { id: "tweaks", label: copy.tabTweaks },
  { id: "prototype", label: copy.tabPrototype },
  { id: "code", label: copy.tabCode },
];

const toInspectorTabs = (
  isAppProject: boolean,
  isTweaksShown: boolean
): typeof TABS => {
  if (isAppProject || !isTweaksShown) {
    return TABS.filter((entry) => entry.id !== "tweaks");
  }

  return TABS;
};

const hasTweakControls = (tweaks: InspectorProps["tweaks"]): boolean =>
  (tweaks?.draft.state?.controls.length ?? 0) > 0 || tweaks?.isRunning === true;

const EMPTY_HINT = copy.emptyHint;

const isDirectEditable = (
  source: { readonly kind: string },
  compareOpen: boolean
): boolean => source.kind === "live" && !compareOpen;

const toInspectorEmptyReason = (
  selection: SelectionContext[],
  editable: boolean
): string | null => {
  if (selection.length === 0) {
    return EMPTY_HINT;
  }

  if (selection.length === 1 && !selection[0]?.source) {
    return copy.noSource;
  }

  if (!editable) {
    return copy.notLive;
  }

  return null;
};

const isVectorShown = (selection: SelectionContext[]): boolean =>
  selection.length > 0 &&
  selection.length <= 2 &&
  selection.every((item) => isSvgDrawingTag(item.tag));

export {
  EMPTY_HINT,
  TABS,
  hasTweakControls,
  toInspectorEmptyReason,
  toInspectorTabs,
  isDirectEditable,
  isVectorShown,
};

export type { InspectorProps, InspectorTab };
