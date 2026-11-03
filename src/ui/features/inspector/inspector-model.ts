import type { MutableRefObject, ReactNode, ComponentProps } from "react";

import type {
  EditSessionEnd,
  SelectionContext,
} from "../../../shared/contracts.js";
import { isSvgShapeTag } from "../../../shared/vector.js";
import type { PreviewPort } from "../../bridge.js";
import type { ComponentsPanel } from "../../components/ComponentsPanel.js";
import type { InspectorTweaksProps } from "../../components/InspectorTweaks.js";
import type { DesignTokens } from "../../useDesignSystemState.js";
import type {
  DirectEditCommit,
  DirectEditControl,
} from "../../useDirectEdit.js";
import type { EditSessionHandle, SessionAction } from "../../useEditSession.js";
import { copy } from "./copy.js";

type InspectorTab = "simple" | "pro" | "components" | "code" | "tweaks";

interface InspectorProps {
  projectId: string;
  directionId: string | null;
  selection: SelectionContext[];
  editable: boolean;
  port: MutableRefObject<PreviewPort | null>;
  control: MutableRefObject<DirectEditControl | null>;
  onCommitted: (commit: DirectEditCommit) => void;
  notice: string | null;
  onStale: (message: string) => void;
  tokens: DesignTokens | null;
  session?: MutableRefObject<EditSessionHandle | null>;
  onExit?: () => void;
  onSessionEnd?: (action: SessionAction, result: EditSessionEnd) => void;
  layers?: ReactNode;
  tweaks?: InspectorTweaksProps;
  selectMode?: boolean;
  onSelectMode?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  tab?: InspectorTab;
  onTab?: (tab: InspectorTab) => void;
  appDir?: string | null;
  onAskAgent?: (prompt: string) => void;
  components?: ComponentProps<typeof ComponentsPanel>;
}

const TABS: { id: InspectorTab; label: string }[] = [
  { id: "simple", label: copy.tabSimple },
  { id: "pro", label: copy.tabLayers },
  { id: "components", label: copy.tabComponents },
  { id: "code", label: copy.tabCode },
  { id: "tweaks", label: copy.tabTweaks },
];

const EMPTY_HINT = copy.emptyHint;

const isDirectEditable = (
  source: { kind: string },
  compareOpen: boolean
): boolean => source.kind === "live" && !compareOpen;

const inspectorEmptyReason = (
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

const vectorShown = (selection: SelectionContext[]): boolean => {
  return (
    selection.length > 0 &&
    selection.length <= 2 &&
    selection.every((item) => isSvgShapeTag(item.tag))
  );
};

export {
  EMPTY_HINT,
  TABS,
  inspectorEmptyReason,
  isDirectEditable,
  vectorShown,
};

export type { InspectorProps, InspectorTab };
