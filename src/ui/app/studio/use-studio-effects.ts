import { useEffect, useState } from "react";

import { setTelemetryScope } from "../../platform/telemetry";
import { prefetchCommandLayer } from "../screen-preload";
import type { StudioBase } from "./studio-core-types";
import type { StudioUi } from "./studio-ui-types";
import { useHomeVariationsHandoff } from "./use-home-variations-handoff";

const PREFETCH_DELAY_MS = 1500;

const telemetryScopeOf = (
  projectId: string,
  directionId: string | null
): Parameters<typeof setTelemetryScope>[0] => {
  if (directionId) {
    return { directionId, projectId };
  }

  return { projectId };
};

const useStudioEffects = (
  projectId: string,
  ui: StudioUi,
  base: StudioBase
): void => {
  const { data, project, direction, directionId, variations } = base;
  const { setStaleNotice } = ui;
  const selectionCount = ui.selection.length;

  useHomeVariationsHandoff(
    projectId,
    project !== null && direction !== null,
    variations.propose
  );

  useEffect((): void => {
    if (selectionCount > 0) {
      setStaleNotice(null);
    }
  }, [selectionCount, setStaleNotice]);

  useEffect(
    (): (() => void) =>
      setTelemetryScope(telemetryScopeOf(projectId, directionId)),
    [projectId, directionId]
  );

  const [seenDirectionId, setSeenDirectionId] = useState(directionId);

  if (seenDirectionId !== directionId) {
    setSeenDirectionId(directionId);
    ui.setSelection([]);
    setStaleNotice(null);
    ui.setSource({ kind: "live" });
    ui.setCompareOpen(false);
    ui.setMentionRequest(null);
    data.clearErrors();
  }

  useEffect((): (() => void) => {
    const timer = globalThis.setTimeout(
      prefetchCommandLayer,
      PREFETCH_DELAY_MS
    );

    return (): void => globalThis.clearTimeout(timer);
  }, []);
};

export { useStudioEffects };
