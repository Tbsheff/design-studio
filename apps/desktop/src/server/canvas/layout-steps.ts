import type { LayoutChange } from "../../shared/actions/_core/canvas-file.js";
import type { CanvasWriteSource, Project } from "../../shared/actions/_core/contracts.js";
import type { EditRecorder } from "../direct-edit/index.js";
import {
  layoutLabel,
  recordsLayout,
  revertCanvas,
  revertLinks,
} from "./layout-history.js";
import type { LayoutStep } from "./layout-history.js";
import type { CanvasService } from "./service.js";

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

  if (label === null || owner.headVersionId === null) {
    return;
  }

  history.record({
    directionId: owner.id,
    files: [],
    label,
    layout: change,
    projectId: project.id,
    versionId: owner.headVersionId,
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
