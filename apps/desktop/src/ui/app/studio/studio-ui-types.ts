import type { Dispatch, RefObject, SetStateAction } from "react";

import type {
  CommentPrefill,
  SelectionContext,
  Version,
} from "../../../shared/actions/_core/contracts";
import type { CanvasSource } from "../../features/canvas/canvas-toolbar";
import type { MentionRequest } from "../../features/chat/use-mentions";
import type { PrefillRequest } from "../../features/comments";
import type { useRail } from "../../features/home/project-rail";
import type { InspectorTab } from "../../features/inspector/inspector";
import type { DirectEditControl } from "../../features/inspector/use-direct-edit";
import type { EditSessionHandle } from "../../features/inspector/use-edit-session";
import type { ShareTarget } from "../../features/share-publish-ship-export/share-dialog";
import type { PreviewPort } from "../../platform/bridge";
import type { DraftStore } from "../../platform/storage";
import type { usePanelTab } from "../../platform/use-panel-tab";

type Setter<Result> = Dispatch<SetStateAction<Result>>;

type PanelTab = Parameters<ReturnType<typeof usePanelTab>["choose"]>[0];

interface StudioRefs {
  columnsRef: RefObject<HTMLDivElement | null>;
  editControl: RefObject<DirectEditControl | null>;
  editSession: RefObject<EditSessionHandle | null>;
  port: RefObject<PreviewPort | null>;
  prefillChat: RefObject<(next: CommentPrefill) => void>;
  undoRef: RefObject<() => void>;
}

interface StudioOpen {
  compare: Version[];
  compareOpen: boolean;
  designOpen: boolean;
  detailsRunId: string | null;
  setCompare: Setter<Version[]>;
  setCompareOpen: Setter<boolean>;
  setDesignOpen: Setter<boolean>;
  setDetailsRunId: Setter<string | null>;
  setSettingsOpen: Setter<boolean>;
  setShareTarget: Setter<ShareTarget | null>;
  setShipOpen: Setter<boolean>;
  settingsOpen: boolean;
  shareTarget: ShareTarget | null;
  shipOpen: boolean;
}

interface StudioActing {
  act: <Result>(fn: () => Promise<Result>) => Promise<void>;
  actionError: string | null;
  busy: boolean;
  setActionError: Setter<string | null>;
}

interface StudioUi extends StudioRefs, StudioOpen, StudioActing {
  chatWidth: number | null;
  composerActive: boolean;
  draft: DraftStore;
  inspectorTab: InspectorTab;
  layersHost: HTMLDivElement | null;
  mentionRequest: MentionRequest | null;
  paneCollapsed: boolean;
  prefill: PrefillRequest | null;
  rail: ReturnType<typeof useRail>;
  selection: SelectionContext[];
  setInspectorTab: Setter<InspectorTab>;
  setLayersHost: Setter<HTMLDivElement | null>;
  setMentionRequest: Setter<MentionRequest | null>;
  setPrefill: Setter<PrefillRequest | null>;
  setSelection: Setter<SelectionContext[]>;
  setSource: Setter<CanvasSource>;
  setStaleNotice: Setter<string | null>;
  source: CanvasSource;
  staleNotice: string | null;
}

interface StudioPanes {
  canvasPane: (tab: PanelTab) => Promise<boolean>;
  editable: boolean;
  panel: ReturnType<typeof usePanelTab>;
  showPane: (tab: PanelTab) => Promise<boolean>;
}

export type {
  PanelTab,
  Setter,
  StudioActing,
  StudioOpen,
  StudioPanes,
  StudioRefs,
  StudioUi,
};
