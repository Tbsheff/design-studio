import type { Dispatch, RefObject, SetStateAction } from "react";

import type {
  CommentPrefill,
  SelectionContext,
  Version,
} from "../../../shared/contracts";
import type { PreviewPort } from "../../bridge";
import type { CanvasSource } from "../../components/CanvasToolbar";
import type { InspectorTab } from "../../components/Inspector";
import type { useRail } from "../../components/ProjectRail";
import type { ShareTarget } from "../../components/ShareDialog";
import type { DraftStore } from "../../storage";
import type { PrefillRequest } from "../../useCommentPrefill";
import type { DirectEditControl } from "../../useDirectEdit";
import type { EditSessionHandle } from "../../useEditSession";
import type { MentionRequest } from "../../useMentions";
import type { usePanelTab } from "../../usePanelTab";

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
