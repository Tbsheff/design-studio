import { useCallback } from "react";
import type { ReactElement } from "react";

import { AnimationPanel } from "./animation-panel.js";
import { animationTimeline, useLive } from "./deps.js";
import type { ParentMessageBody } from "./deps.js";

interface AnimationEntryProps {
  readonly directionId: string;
  readonly post: (body: ParentMessageBody) => void;
  readonly projectId: string;
  readonly selector: string | null;
}

const AnimationEntry = ({
  directionId,
  post,
  projectId,
  selector,
}: AnimationEntryProps): ReactElement | null => {
  const isOpen = useLive(animationTimeline);

  const handleClose = useCallback((): void => animationTimeline.set(false), []);

  if (!isOpen) {
    return null;
  }

  return (
    <AnimationPanel
      directionId={directionId}
      onClose={handleClose}
      post={post}
      projectId={projectId}
      selector={selector}
    />
  );
};

export { AnimationEntry };

export type { AnimationEntryProps };
