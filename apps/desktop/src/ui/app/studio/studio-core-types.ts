import type { Project, Version } from "../../../shared/contracts";
import type { useTryVariants } from "../../features/canvas/use-try-variants";
import type { useVariations } from "../../features/canvas/use-variations";
import type { useDraftChrome } from "../../features/chat/draft-sources";
import type { RunView } from "../../features/chat/run-state-model";
import type { useChatState } from "../../features/chat/use-chat-state";
import type { useMcpFeed } from "../../features/chat/use-mcp-feed";
import type { useRewind } from "../../features/chat/use-rewind";
import type { useRunCanvas } from "../../features/chat/use-run-canvas";
import type { useStudioCommands } from "../../features/commands";
import type { useComments } from "../../features/comments";
import type {
  useComponents,
  useDesignSystemState,
  usePackActions,
} from "../../features/design-system";
import type { useStudioData } from "../../features/home/use-studio-data";
import type { useEditHistory } from "../../features/inspector/use-edit-history";
import type { useTweaks } from "../../features/inspector/use-tweaks";
import type { useExportTarget } from "../../features/share-publish-ship-export/use-export-target";
import type { useStudioTokens } from "../../features/versions-layers-tokens/use-studio-tokens";
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
