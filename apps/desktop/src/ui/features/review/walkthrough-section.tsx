import { useCallback } from "react";
import type { FormEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { useWalkthrough } from "./use-walkthrough.js";
import { WalkthroughHead } from "./walkthrough-head.js";
import { WalkthroughResult } from "./walkthrough-result.js";
import { WalkthroughTaskField } from "./walkthrough-task-field.js";

interface SectionProps {
  readonly directionId: string | null;
  readonly frameId: string;
  readonly isLive: boolean;
  readonly projectId: string;
}

const WalkthroughSection = (props: SectionProps): ReactElement => {
  const walk = useWalkthrough({
    directionId: props.directionId,
    frameId: props.frameId,
    projectId: props.projectId,
  });

  const { handleRun, result } = walk;
  const isDisabled = walk.isBusy || !walk.isReady || !props.isLive;

  const submitTask = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      handleRun();
    },
    [handleRun]
  );

  return (
    <section aria-label={copy.walkTitle} className="review-group">
      <form onSubmit={submitTask}>
        <WalkthroughHead
          isBusy={walk.isBusy}
          isDisabled={isDisabled}
          outcome={result?.outcome ?? null}
        />
        <WalkthroughTaskField onTask={walk.handleTask} task={walk.task} />
      </form>
      {walk.error !== null && <div className="alert error">{walk.error}</div>}
      {result !== null && (
        <WalkthroughResult projectId={props.projectId} result={result} />
      )}
    </section>
  );
};

export { WalkthroughSection };

export type { SectionProps };
