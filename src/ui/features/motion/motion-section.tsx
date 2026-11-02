import { useMemo } from "react";
import type { MutableRefObject, ReactElement } from "react";

import { copy } from "./copy.js";
import { InspectorSection, useEditVariant } from "./deps.js";
import type { PreviewPort, SelectionContext } from "./deps.js";
import { MotionBody } from "./motion-body.js";
import { childCount, stateOf } from "./motion-model.js";
import { useMotion } from "./use-motion.js";
import { useReducedMotion } from "./use-reduced-motion.js";

interface MotionSectionProps {
  readonly directionId: string;
  readonly port: MutableRefObject<PreviewPort | null>;
  readonly projectId: string;
  readonly target: SelectionContext;
}

const MotionSection = ({
  directionId,
  port,
  projectId,
  target,
}: MotionSectionProps): ReactElement => {
  const ids = useMemo(
    () => ({ directionId, projectId }),
    [directionId, projectId]
  );

  const variant = useEditVariant();
  const state = stateOf(variant);
  const reduced = useReducedMotion();

  const hasChildren = useMemo(
    () => childCount(target.outerHTML) > 1,
    [target.outerHTML]
  );

  const motion = useMotion(ids, {
    hasChildren,
    port,
    state,
    target,
    variant,
  });

  return (
    <InspectorSection title={copy.title}>
      <MotionBody
        hasChildren={hasChildren}
        motion={motion}
        noSource={target.source === null}
        reduced={reduced}
        state={state}
      />
    </InspectorSection>
  );
};

export { MotionSection };

export type { MotionSectionProps };
