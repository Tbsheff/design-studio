import type {
  CommentPrefill,
  SelectionContext,
  Version,
} from "@design-studio/contracts";
import type { Dispatch, RefObject, SetStateAction } from "react";

import type { CanvasSource } from "../../domain/canvas-presets.js";
import type { MentionRequest } from "../../features/chat/use-mentions";
import type { PrefillRequest } from "../../features/comments";
import type { useRail } from "../../features/home/index.js";
import type { InspectorTab } from "../../features/inspector/inspector";
import type { DirectEditControl } from "../../features/inspector/use-direct-edit";
import type { EditSessionHandle } from "../../features/inspector/use-edit-session";
import type { ShareTarget } from "../../features/share-publish-ship-export/share-dialog";
import type { PreviewPort } from "../../platform/bridge";
import type {
  ColumnTab,
  EditorColumn,
  PanelTab,
} from "../../platform/panel-tab";
import type { DraftStore } from "../../platform/storage";

type Setter<Result> = Dispatch<SetStateAction<Result>>;

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

interface StudioLayout {
  editorColumn: EditorColumn;
  isCommentsShown: boolean;
  isInspectorHidden: boolean;
  isInspectorPinned: boolean;
  pagesHost: HTMLDivElement | null;
  setIsCommentsShown: Setter<boolean>;
  setIsInspectorHidden: Setter<boolean>;
  setIsInspectorPinned: Setter<boolean>;
  setPagesHost: Setter<HTMLDivElement | null>;
  setToolsHost: Setter<HTMLDivElement | null>;
  setTopEnd: Setter<HTMLDivElement | null>;
  setTopStart: Setter<HTMLDivElement | null>;
  setZoomHost: Setter<HTMLDivElement | null>;
  toolsHost: HTMLDivElement | null;
  topEnd: HTMLDivElement | null;
  topStart: HTMLDivElement | null;
  zoomHost: HTMLDivElement | null;
}

interface StudioActing {
  act: <Result>(fn: () => Promise<Result>) => Promise<void>;
  actionError: string | null;
  busy: boolean;
  setActionError: Setter<string | null>;
}

interface StudioUi extends StudioRefs, StudioOpen, StudioActing, StudioLayout {
  chatWidth: number | null;
  composerActive: boolean;
  draft: DraftStore;
  inspectorTab: InspectorTab;
  layersHost: HTMLDivElement | null;
  mentionRequest: MentionRequest | null;
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
  closeColumn: () => void;
  editable: boolean;
  isInspectorOpen: boolean;
  openColumn: (tab: ColumnTab) => void;
  showColumn: (tab: ColumnTab) => void;
  showComments: (isShown: boolean) => Promise<boolean>;
  showInspector: () => Promise<boolean>;
  showPane: (tab: PanelTab) => Promise<boolean>;
  toggleInspector: () => void;
}

export type {
  ColumnTab,
  PanelTab,
  Setter,
  StudioActing,
  StudioLayout,
  StudioOpen,
  StudioPanes,
  StudioRefs,
  StudioUi,
};
