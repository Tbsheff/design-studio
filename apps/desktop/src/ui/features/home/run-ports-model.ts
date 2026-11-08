import type {
  RunRequest,
  RunSummary,
  StudioEvent,
} from "@design-studio/contracts";

interface RunPageLike {
  readonly runs: RunSummary[];
  readonly nextBefore: number | null;
}

interface RunSeed {
  readonly runId: string;
  readonly directionId: string;
  readonly request: RunRequest;
  readonly isStopped: boolean;
  readonly now: number;
}

interface RunHistoryLike {
  readonly projectId: string;
  readonly through: (runId: string) => Promise<boolean>;
}

interface EventBatcher {
  readonly push: (event: StudioEvent) => void;
  readonly dispose: () => void;
}

interface RunPorts<Runs> {
  readonly initialRuns: Runs;
  readonly createBatcher: (
    update: (change: (runs: Runs) => Runs) => void
  ) => EventBatcher;
  readonly getRunEvents: (
    projectId: string,
    runId: string
  ) => Promise<StudioEvent[]>;
  readonly listPage: (
    projectId: string,
    limit: number,
    before: number | null
  ) => Promise<RunPageLike>;
  readonly publishHistory: (history: RunHistoryLike | null) => void;
  readonly publishOlder: (
    isLoading: boolean,
    hasMore: boolean,
    load: (() => void) | null
  ) => void;
  readonly toMerged: (previous: Runs, list: RunSummary[]) => Runs;
  readonly toSeeded: (previous: Runs, seed: RunSeed) => Runs;
  readonly toWithEvents: (previous: Runs, events: StudioEvent[]) => Runs;
}

export type { EventBatcher, RunHistoryLike, RunPageLike, RunPorts, RunSeed };
