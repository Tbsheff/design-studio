import { useMemo } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { InspectorSection } from "./deps.js";
import type { SelectionContext } from "./deps.js";
import { StackingBody } from "./stacking-body.js";
import { StackingNote } from "./stacking-note.js";
import { useStackingHandlers } from "./use-stacking-handlers.js";
import { useStacking } from "./use-stacking.js";

interface StackingSectionProps {
  readonly directionId: string;
  readonly projectId: string;
  readonly target: SelectionContext;
}

const StackingSection = ({
  directionId,
  projectId,
  target,
}: StackingSectionProps): ReactElement => {
  const ids = useMemo(
    () => ({ directionId, projectId }),
    [directionId, projectId]
  );

  const stacking = useStacking(ids, target);
  const handlers = useStackingHandlers(stacking);
  const { info } = stacking;
  const isOff = info === null || info.mode === "none";

  return (
    <InspectorSection title={copy.title}>
      {target.source === null && (
        <StackingNote isError={false} text={copy.noSource} />
      )}
      {info !== null && (
        <StackingBody
          disabled={isOff || stacking.isPending}
          handlers={handlers}
          info={info}
        />
      )}
      {info !== null && info.mode === "none" && (
        <StackingNote isError={false} text={info.reason} />
      )}
      <StackingNote isError text={stacking.error} />
    </InspectorSection>
  );
};

export { StackingSection };

export type { StackingSectionProps };
