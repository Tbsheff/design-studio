import type { EditSessionEnd } from "@design-studio/contracts";
import { useCallback, useEffect } from "react";

import type { InspectorProps } from "./inspector-model.js";
import { useEditSession } from "./use-edit-session.js";
import type { EditSession, SessionAction } from "./use-edit-session.js";
import { restoreEditVariant } from "./use-edit-variant.js";
import { useSessionHandle } from "./use-session-handle.js";

const useInspectorSession = (props: InspectorProps): EditSession => {
  const { onSessionEnd, onStale, selection, port } = props;
  const hasSelection = selection.length > 0;

  const onEnded = useCallback(
    (action: SessionAction, result: EditSessionEnd): void => {
      if (onSessionEnd) {
        onSessionEnd(action, result);

        return;
      }

      if (action === "discard" && hasSelection) {
        onStale("");
      }
    },
    [hasSelection, onSessionEnd, onStale]
  );

  const { control, directionId, projectId } = props;

  const session = useEditSession({
    control,
    directionId,
    onEnded,
    port,
    projectId,
  });

  useSessionHandle(props.session, session);

  useEffect(() => (): void => restoreEditVariant(port.current), [port]);

  return session;
};

export { useInspectorSession };
