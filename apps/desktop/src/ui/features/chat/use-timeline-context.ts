import { useStableProps } from "../../platform/use-stable-props.js";
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

interface TimelineContextOptions {
  readonly actions: TurnActions | null;
  readonly detailsSource: (runId: string) => void;
  readonly isOffline: boolean;
  readonly lastId: string | null;
  readonly polish: PolishProps;
  readonly reviewSource: ((versionId: string) => void) | undefined;
  readonly rewind: RewindControl | undefined;
  readonly stopSource: (() => void) | undefined;
  readonly titles: Readonly<Record<string, string>>;
  readonly workTree: string | null;
}

const NO_NESTED: ReadonlySet<string> = new Set<string>();

const useTimelineContext = (
  options: TimelineContextOptions
): TimelineRunContext => {
  const { actions, isOffline, lastId, polish, rewind, titles, workTree } =
    options;

  const onDetails = options.detailsSource;
  const onReview = options.reviewSource ?? null;
  const onStop = options.stopSource;

  return useStableProps(
    {
      actions,
      isOffline,
      lastId,
      onDetails,
      onReview,
      onStop,
      polish,
      rewind,
      titles,
      workTree,
    },
    NO_NESTED
  );
};

export { useTimelineContext };

export type { TimelineRunContext };
