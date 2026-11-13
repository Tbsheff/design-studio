import type { LinksFile } from "@design-studio/contracts/links";
import { toStartPoints } from "@design-studio/contracts/start-points";
import type { StartPoint } from "@design-studio/contracts/start-points";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { linksApi } from "./links-api.js";
import type { PlayModeProps } from "./play-model.js";
import { runOrReport } from "./settle-model.js";
import {
  toAddedPoints,
  toCurrentStart,
  toNextPick,
  toRemovedPoints,
  toRenamedPoints,
} from "./start-points-model.js";
import type { StartPick } from "./start-points-model.js";

interface StartPointEdits {
  readonly points: readonly StartPoint[];
  readonly isPending: boolean;
  readonly add: (frame: string, name: string) => void;
  readonly rename: (index: number, name: string) => void;
  readonly remove: (index: number) => void;
}

interface PlayStart {
  readonly playProps: PlayModeProps;
  readonly points: readonly StartPoint[];
  readonly currentId: string;
  readonly pick: StartPick | null;
  readonly onPick: (frame: string) => void;
}

const useStartPointEdits = (
  projectId: string,
  file: LinksFile,
  onError: (message: string) => void
): StartPointEdits => {
  const points = toStartPoints(file);
  const [isPending, startTransition] = useTransition();

  const save = useCallback(
    (next: readonly StartPoint[]): void => {
      startTransition(async () => {
        await runOrReport(linksApi.setStartPoints(projectId, next), (error) =>
          onError(error.message)
        );
      });
    },
    [onError, projectId]
  );

  const add = useCallback(
    (frame: string, name: string): void =>
      save(toAddedPoints(points, frame, name)),
    [points, save]
  );

  const rename = useCallback(
    (index: number, name: string): void =>
      save(toRenamedPoints(points, index, name)),
    [points, save]
  );

  const remove = useCallback(
    (index: number): void => save(toRemovedPoints(points, index)),
    [points, save]
  );

  return { add, isPending, points, remove, rename };
};

const toPlayProps = (
  props: PlayModeProps,
  pick: StartPick | null
): PlayModeProps => {
  if (pick === null) {
    return props;
  }

  return { ...props, startId: pick.frame };
};

const usePlayStart = (props: PlayModeProps): PlayStart => {
  const [pick, setPick] = useState<StartPick | null>(null);

  const onPick = useCallback(
    (frame: string): void => setPick((before) => toNextPick(before, frame)),
    []
  );

  const currentId = toCurrentStart(pick, props.startId);
  const playProps = toPlayProps(props, pick);
  const points = toStartPoints(props.file);

  return { currentId, onPick, pick, playProps, points };
};

const useRestartOnPick = (
  pick: StartPick | null,
  restart: () => void
): void => {
  const handled = useRef<StartPick | null>(null);

  useEffect(() => {
    if (pick === null || handled.current === pick) {
      return;
    }

    handled.current = pick;
    restart();
  }, [pick, restart]);
};

export { usePlayStart, useRestartOnPick, useStartPointEdits };

export type { PlayStart, StartPointEdits };
