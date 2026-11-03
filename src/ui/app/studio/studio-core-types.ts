import type { Project, Version } from "../../../shared/contracts";
import type { useDraftChrome } from "../../components/DraftSources";
import type { useStudioCommands } from "../../features/commands";
import type { RunView } from "../../runState";
import type { useChatState } from "../../useChatState";
import type { useComments } from "../../useComments";
import type { useComponents } from "../../useComponents";
import type { useDesignSystemState } from "../../useDesignSystemState";
import type { useEditHistory } from "../../useEditHistory";
import type { useExportTarget } from "../../useExportTarget";
import type { useMcpFeed } from "../../useMcpFeed";
import type { usePackActions } from "../../usePackActions";
import type { useRewind } from "../../useRewind";
import type { useRunCanvas } from "../../useRunCanvas";
import type { useStudioData } from "../../useStudioData";
import type { useStudioTokens } from "../../useStudioTokens";
import type { useTryVariants } from "../../useTryVariants";
import type { useTweaks } from "../../useTweaks";
import type { useVariations } from "../../useVariations";
import type { Setter } from "./studio-ui-types";

type StudioData = ReturnType<typeof useStudioData>;

interface StudioRuns {
  activeRun: RunView | null;
  directionRuns: RunView[];
  improveRun: RunView | null;
  pendingRun: RunView | null;
  setPendingRun: Setter<RunView | null>;
}

type StudioDesignSystem = ReturnType<typeof useDesignSystemState>;

interface StudioBase {
  activeRun: RunView | null;
  comments: ReturnType<typeof useComments>;
  data: StudioData;
  designSystem: StudioDesignSystem;
  direction: Project["directions"][number] | null;
  directionId: string | null;
  directionRuns: RunView[];
  improveRun: RunView | null;
  packActions: ReturnType<typeof usePackActions>;
  pendingRun: RunView | null;
  project: StudioData["project"];
  runCanvas: ReturnType<typeof useRunCanvas>;
  runs: StudioData["runs"];
  setPendingRun: Setter<RunView | null>;
  status: StudioData["status"];
  tokens: StudioDesignSystem["tokens"];
  variations: ReturnType<typeof useVariations>;
  versions: Version[];
}

interface StudioHistoryChain {
  canUndo: boolean;
  onUndo: () => void;
}

interface StudioEdit {
  editHistory: ReturnType<typeof useEditHistory>;
  guard: ReturnType<typeof useStudioTokens>["guard"];
  historyChain: StudioHistoryChain;
  studioTokens: ReturnType<typeof useStudioTokens>;
  tweaks: ReturnType<typeof useTweaks>;
}

interface StudioReview {
  reviewVersion: (version: Version) => Promise<void>;
  reviewVersionId: (versionId: string) => Promise<void>;
}

interface StudioHistoryActions {
  refreshAfter: <Result>(fn: () => Promise<Result>) => Promise<void>;
  undo: () => Promise<void>;
  withDid: <Result>(fn: (id: string) => Promise<Result>) => Promise<void>;
}

interface StudioHistory extends StudioHistoryActions, StudioReview {}

interface StudioCore extends StudioBase, StudioEdit, StudioHistory {
  chatState: ReturnType<typeof useChatState>;
  commandActions: ReturnType<typeof useStudioCommands>;
  componentList: ReturnType<typeof useComponents>;
  draftChrome: ReturnType<typeof useDraftChrome>;
  exporter: ReturnType<typeof useExportTarget>;
  mcp: ReturnType<typeof useMcpFeed> & {
    locked: boolean;
    onUndo: (versionId: string) => void;
  };
  rewind: ReturnType<typeof useRewind>;
  tryVariants: ReturnType<typeof useTryVariants>;
}

export type {
  StudioBase,
  StudioCore,
  StudioData,
  StudioEdit,
  StudioHistory,
  StudioHistoryActions,
  StudioReview,
  StudioRuns,
};
