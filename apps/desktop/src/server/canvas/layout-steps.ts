import type { CanvasWriteSource, Project } from "@design-studio/contracts";
import type { LayoutChange } from "@design-studio/contracts/canvas-file";

import type { EditRecorder } from "../direct-edit/index.js";
import type {
  EventBus,
  HistoryStep,
  VariationSettle,
} from "../events/index.js";
import {
  layoutLabel,
  recordsLayout,
  revertCanvas,
  revertLinks,
} from "./layout-history.js";
import type { LayoutStep } from "./layout-history.js";
import type { CanvasService } from "./service.js";
import {
  applySettles,
  toRecordVersionId,
  toVariationGroupIds,
} from "./variation-steps.js";
import type { SettleProjects } from "./variation-steps.js";

interface LayoutSteps {
  readonly layout: (
    project: Project,
    change: LayoutChange,
    kind: HistoryStep
  ) => Promise<boolean>;
  readonly settle: (
    project: Project,
    settles: readonly VariationSettle[],
    kind: HistoryStep
  ) => Promise<void>;
}

export function recordLayout(
  history: EditRecorder,
  canvas: Pick<CanvasService, "ownerOf">,
  project: Project,
  change: LayoutChange,
  source: CanvasWriteSource
): void {
  if (!recordsLayout(source)) {
    return;
  }

  const owner = canvas.ownerOf(project);
  const label = layoutLabel(change);
  const groupIds = toVariationGroupIds(project, change);
  const versionId = toRecordVersionId(project, owner, groupIds);

  if (label === null || versionId === null) {
    return;
  }

  history.record({
    directionId: owner.id,
    directionIds: groupIds,
    files: [],
    label,
    layout: change,
    projectId: project.id,
    versionId,
  });
}

export async function stepLayout(
  canvas: Pick<CanvasService, "update" | "links">,
  project: Project,
  change: LayoutChange,
  kind: LayoutStep
): Promise<boolean> {
  let applied = false;

  if (change.kind === "canvas") {
    const [made, back] =
      kind === "undo"
        ? [change.after, change.before]
        : [change.before, change.after];

    await canvas.update(
      project,
      (current) => {
        const next = revertCanvas(current, made, back);
        applied = next !== null;

        return next;
      },
      { source: "restore" }
    );

    return applied;
  }

  const [made, back] =
    kind === "undo"
      ? [change.after, change.before]
      : [change.before, change.after];

  await canvas.links.update(
    project,
    (current) => {
      const next = revertLinks(current, made, back);
      applied = next !== null;

      return next;
    },
    "restore"
  );

  return applied;
}

export function toLayoutSteps(
  canvasOf: () => Pick<CanvasService, "update" | "links">,
  projects: SettleProjects,
  bus: Pick<EventBus, "emit">
): LayoutSteps {
  return {
    layout: (project, change, kind) =>
      stepLayout(canvasOf(), project, change, kind),
    settle: (project, settles, kind) =>
      applySettles(projects, bus, project, { kind, settles }),
  };
}
