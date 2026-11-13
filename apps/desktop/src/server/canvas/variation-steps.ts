import type {
  Direction,
  DirectionVariation,
  Project,
} from "@design-studio/contracts";
import type { LayoutChange } from "@design-studio/contracts/canvas-file";

import type {
  EventBus,
  VariationSettle,
  VariationSettledState,
} from "../events/index.js";
import type { LayoutStep } from "./layout-history.js";

interface SettleProjects {
  readonly get: (projectId: string) => Promise<Project>;
  readonly updateDirection: (
    projectId: string,
    directionId: string,
    patch: Partial<Direction>
  ) => Promise<Direction>;
}

interface SettleUpdate {
  readonly directionId: string;
  readonly variation: DirectionVariation;
  readonly settled: VariationSettledState;
}

const toFrameDirectionIds = (change: LayoutChange): Set<string> => {
  if (change.kind !== "canvas") {
    return new Set();
  }

  const before = new Set(change.before.frames.map((frame) => frame.id));
  const after = new Set(change.after.frames.map((frame) => frame.id));

  const moved = [
    ...change.after.frames.filter((frame) => !before.has(frame.id)),
    ...change.before.frames.filter((frame) => !after.has(frame.id)),
  ];

  return new Set(
    moved.flatMap((frame) => {
      if (frame.directionId) {
        return [frame.directionId];
      }

      return [];
    })
  );
};

const toPageGroupId = (direction: Direction): string | null => {
  const { variation } = direction;

  if (!variation || variation.scope) {
    return null;
  }

  return variation.groupId;
};

const toVariationGroupIds = (
  project: Project,
  change: LayoutChange
): string[] => {
  const touched = toFrameDirectionIds(change);

  const groups = new Set(
    project.directions.flatMap((direction) => {
      const groupId = toPageGroupId(direction);

      if (groupId === null || !touched.has(direction.id)) {
        return [];
      }

      return [groupId];
    })
  );

  return project.directions.flatMap((direction) => {
    const groupId = toPageGroupId(direction);

    if (groupId === null || !groups.has(groupId)) {
      return [];
    }

    return [direction.id];
  });
};

const toRecordVersionId = (
  project: Project,
  owner: Direction,
  groupIds: readonly string[]
): string | null => {
  if (owner.headVersionId !== null) {
    return owner.headVersionId;
  }

  const wanted = new Set(groupIds);

  const head = project.directions.find(
    (direction) => wanted.has(direction.id) && direction.headVersionId !== null
  );

  return head?.headVersionId ?? null;
};

const toSettleUpdate = (
  directions: Map<string, Direction>,
  settle: VariationSettle,
  kind: LayoutStep
): SettleUpdate[] => {
  const direction = directions.get(settle.directionId);
  const variation = direction?.variation;
  let [made, back] = [settle.after, settle.before];

  if (kind === "redo") {
    [made, back] = [settle.before, settle.after];
  }

  if (!direction || !variation || (variation.settled ?? null) !== made) {
    return [];
  }

  return [{ directionId: direction.id, settled: back, variation }];
};

const applySettles = async (
  projects: SettleProjects,
  bus: Pick<EventBus, "emit">,
  project: Project,
  step: {
    readonly settles: readonly VariationSettle[];
    readonly kind: LayoutStep;
  }
): Promise<void> => {
  const latest = await projects.get(project.id);

  const directions = new Map(
    latest.directions.map((direction) => [direction.id, direction])
  );

  const updates = step.settles.flatMap((settle) =>
    toSettleUpdate(directions, settle, step.kind)
  );

  const updated = await Promise.all(
    updates.map(({ directionId, settled, variation }) =>
      projects.updateDirection(project.id, directionId, {
        variation: { ...variation, settled },
      })
    )
  );

  for (const direction of updated) {
    bus.emit({
      direction,
      directionId: direction.id,
      projectId: project.id,
      type: "direction.updated",
    });
  }
};

export { applySettles, toRecordVersionId, toVariationGroupIds };

export type { SettleProjects };
