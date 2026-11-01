import type { CanvasWriteSource, Project } from "../../shared/contracts.js";
import type { EditRecorder } from "../direct-edit/index.js";
import {
  layoutLabel,
  recordsLayout,
  revertCanvas,
  revertLinks,
  type LayoutChange,
  type LayoutStep,
} from "./layout-history.js";
import type { CanvasService } from "./service.js";

export function recordLayout(
  history: EditRecorder,
  canvas: Pick<CanvasService, "ownerOf">,
  project: Project,
  change: LayoutChange,
  source: CanvasWriteSource
): void {
  if (!recordsLayout(source)) return;
  const owner = canvas.ownerOf(project);
  const label = layoutLabel(change);
  if (label === null || owner.headVersionId === null) return;
  history.record({
    projectId: project.id,
    directionId: owner.id,
    label,
    versionId: owner.headVersionId,
    files: [],
    layout: change,
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
