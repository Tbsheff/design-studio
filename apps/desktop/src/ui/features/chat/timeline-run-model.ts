import type { PolishProps, TurnActions } from "./chat-turn-model.js";
import type { RewindControl } from "./use-rewind.js";

interface TimelineRunContext {
  readonly actions: TurnActions | null;
  readonly isOffline: boolean;
  readonly lastId: string | null;
  readonly onDetails: (runId: string) => void;
  readonly onReview: ((versionId: string) => void) | null;
  readonly onStop: (() => void) | undefined;
  readonly polish: PolishProps;
  readonly rewind: RewindControl | undefined;
  readonly titles: Readonly<Record<string, string>>;
  readonly workTree: string | null;
}

export type { TimelineRunContext };
