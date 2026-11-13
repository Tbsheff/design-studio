import type { Direction, Project } from "@design-studio/contracts";

import type { CanvasDirections } from "./canvas-types.js";
import { keepVariationFrame } from "./canvas-variations-model.js";
import { elementVariation } from "./element-variation.js";
import { money } from "./use-variations.js";
import type { VariationsState } from "./use-variations.js";
import type { FrameVariation, Sibling } from "./variation-model.js";
import { groupOf } from "./variations-api.js";
import { groupRun, keptText, labelOf } from "./variations-layer-model.js";
import type { GroupRunMap } from "./variations-layer-model.js";

interface CanvasProps {
  state: VariationsState;
  project: Project;
  runs: GroupRunMap;
  setDirectionId: (id: string) => void;
}

const toSibling = (member: Direction, directionId: string): Sibling[] => {
  if (member.id === directionId) {
    return [];
  }

  return [
    {
      id: member.id,
      label: labelOf(member),
      title: member.variation?.title ?? member.name,
    },
  ];
};

const toVariationOf = (
  input: CanvasProps,
  directionId: string
): FrameVariation | undefined => {
  const { state, project, runs, setDirectionId } = input;

  const direction = project.directions.find(
    (member) => member.id === directionId
  );

  const variation = direction?.variation;

  if (!direction || !variation) {
    return;
  }

  const group = groupOf(project, variation.groupId);
  const run = groupRun(runs, directionId);
  const { scope } = variation;

  if (scope) {
    return elementVariation({
      direction,
      group,
      project,
      run,
      scope,
      setDirectionId,
      state,
      variation,
    });
  }

  return {
    costText: `${money(run.costUsd)} spent`,
    label: variation.label,
    onKeep: () => {
      const before = keepVariationFrame(
        project.id,
        directionId,
        group.map((member) => member.id)
      );

      setDirectionId(directionId);
      state.setGroupId(variation.groupId);
      state.keepWithUndo(keptText(direction), before);
    },
    onMix: async (to, element) => {
      await state.mix(directionId, to, element, project.settings.defaultLevel);
    },
    siblings: group.flatMap((member) => toSibling(member, directionId)),
    status: run.status,
    title: variation.title,
  };
};

const canvasVariations = (input: CanvasProps): CanvasDirections => ({
  list: input.project.directions,
  onActivate: input.setDirectionId,
  variationOf: (directionId) => toVariationOf(input, directionId),
});

export { canvasVariations };
