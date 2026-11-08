import type {
  Project,
  StudioEvent,
  WorkTreeStatus,
} from "@design-studio/contracts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useProjectEvents } from "../../platform/events.js";
import type { FilesChange, NewBuildError } from "./build-error-model.js";
import type { ConnectionState } from "./deps.js";
import { updateFirstToken } from "./studio-data-model.js";
import type { SendTimes } from "./studio-data-model.js";
import { runStudioEvent } from "./studio-events-model.js";
import type { EventSink } from "./studio-events-model.js";
import type { DirectionRef } from "./use-direction-data.js";

interface StudioEventsInput {
  readonly projectId: string;
  readonly directionRef: DirectionRef;
  readonly pushEvent: (event: StudioEvent) => void;
  readonly sends: SendTimes;
  readonly addError: (entry: NewBuildError) => void;
  readonly addVersion: EventSink["addVersion"];
  readonly refreshVersions: () => void;
  readonly setStatus: (status: WorkTreeStatus | null) => void;
  readonly updateProject: (
    change: (previous: Project | null) => Project | null
  ) => void;
}

interface StudioEvents {
  readonly connection: ConnectionState;
  readonly lastChange: FilesChange | null;
}

const useStudioEvents = (input: StudioEventsInput): StudioEvents => {
  const [lastChange, setLastChange] = useState<FilesChange | null>(null);
  const mountedAt = useRef(0);
  const { projectId, pushEvent, sends, directionRef } = input;
  const { addError, addVersion, refreshVersions } = input;
  const { setStatus, updateProject } = input;

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  const sink = useMemo<EventSink>(
    () => ({
      addError,
      addVersion,
      directionRef,
      mountedAt,
      refreshVersions,
      setLastChange,
      setStatus,
      updateProject,
    }),
    [
      addError,
      addVersion,
      directionRef,
      refreshVersions,
      setStatus,
      updateProject,
    ]
  );

  const onEvent = useCallback(
    (event: StudioEvent): void => {
      pushEvent(event);
      updateFirstToken(sends, projectId, event);
      runStudioEvent(event, sink);
    },
    [pushEvent, projectId, sends, sink]
  );

  const connection = useProjectEvents(projectId, onEvent);

  return { connection, lastChange };
};

export { useStudioEvents };
