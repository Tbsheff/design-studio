import type {
  Project,
  StudioEvent,
  Version,
  WorkTreeStatus,
} from "@design-studio/contracts";
import type { MutableRefObject } from "react";

import type { FilesChange, NewBuildError } from "./build-error-model.js";
import { toUpdatedProject } from "./studio-data-model.js";

const MOUNT_GRACE_MS = 1000;

interface EventSink {
  readonly directionRef: MutableRefObject<string | null>;
  readonly mountedAt: MutableRefObject<number>;
  readonly addError: (entry: NewBuildError) => void;
  readonly addVersion: (version: Version) => void;
  readonly refreshVersions: () => void;
  readonly setLastChange: (change: FilesChange) => void;
  readonly setStatus: (status: WorkTreeStatus | null) => void;
  readonly updateProject: (
    change: (previous: Project | null) => Project | null
  ) => void;
}

type EventOf<Type extends StudioEvent["type"]> = Extract<
  StudioEvent,
  { readonly type: Type }
>;

interface EventScope {
  readonly isLive: boolean;
  readonly isActive: boolean;
}

const runFilesChanged = (
  event: EventOf<"files.changed">,
  scope: EventScope,
  sink: EventSink
): void => {
  if (scope.isLive && event.directionId) {
    sink.setLastChange({
      changedAt: event.changedAt,
      directionId: event.directionId,
      paths: event.paths,
      receivedAt: Date.now(),
      shouldReload: event.reload === true,
    });
  }
};

const runBuildError = (
  event: EventOf<"preview.build-error">,
  scope: EventScope,
  sink: EventSink
): void => {
  if (scope.isLive && scope.isActive) {
    sink.addError({
      directionId: event.directionId ?? null,
      file: event.file ?? null,
      line: event.line ?? null,
      message: event.message,
      source: "build",
    });
  }
};

const runStudioEvent = (event: StudioEvent, sink: EventSink): void => {
  const eventDirection = event.directionId ?? null;

  const scope: EventScope = {
    isActive:
      eventDirection === null || eventDirection === sink.directionRef.current,
    isLive: event.ts >= sink.mountedAt.current - MOUNT_GRACE_MS,
  };

  if (event.type === "files.changed") {
    runFilesChanged(event, scope, sink);
  }

  if (
    event.type === "version.created" &&
    event.version.directionId === sink.directionRef.current
  ) {
    sink.addVersion(event.version);
  }

  if (event.type === "versions.changed" && scope.isActive) {
    sink.refreshVersions();
  }

  if (event.type === "direction.updated") {
    sink.updateProject((previous) =>
      toUpdatedProject(previous, event.direction)
    );
  }

  if (event.type === "status.changed" && scope.isLive && scope.isActive) {
    sink.setStatus(event.status);
  }

  if (event.type === "preview.build-error") {
    runBuildError(event, scope, sink);
  }
};

export { runStudioEvent };

export type { EventSink };
