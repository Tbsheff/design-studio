import type { CommentPrefill } from "@design-studio/contracts";
import { Suspense, useCallback, useState } from "react";
import type { ReactNode } from "react";

import { MarkupOverlay, useMarkupCommand } from "../../features/markup";
import { toMarkupSession } from "./markup-session-model";
import type { MarkupSession } from "./markup-session-model";

interface MarkupLayerProps {
  readonly directionId: string | null;
  readonly onAttach: (prefill: CommentPrefill) => void;
  readonly projectId: string;
}

const MarkupLayer = ({
  directionId,
  onAttach,
  projectId,
}: MarkupLayerProps): ReactNode => {
  const [session, setSession] = useState<MarkupSession | null>(null);

  const handleStart = useCallback(
    (): void => setSession(toMarkupSession(projectId, directionId)),
    [directionId, projectId]
  );

  const handleClose = useCallback((): void => setSession(null), []);

  useMarkupCommand(handleStart);

  if (session === null) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <MarkupOverlay
        onAttach={onAttach}
        onClose={handleClose}
        rect={session.rect}
        target={session.target}
      />
    </Suspense>
  );
};

export { MarkupLayer };
