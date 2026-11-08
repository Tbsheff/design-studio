import type {
  Direction,
  DirectionVariation,
  Project,
} from "@design-studio/contracts";
import type { ElementScope } from "@design-studio/contracts/element-variants";

import { keepVariationFrame } from "./canvas-variations-model.js";
import { money } from "./use-variations.js";
import type { VariationsState } from "./use-variations.js";
import type { FrameVariation } from "./variation-model.js";
import { keepBlocker } from "./variations-layer-model.js";
import type { GroupRun } from "./variations-layer-model.js";

interface ElementVariationInput {
  state: VariationsState;
  project: Project;
  setDirectionId: (id: string) => void;
  direction: Direction;
  variation: DirectionVariation;
  scope: ElementScope;
  group: Direction[];
  run: GroupRun;
}

const toElementError = (
  variation: DirectionVariation,
  run: GroupRun
): string | null => {
  if (variation.rejected) {
    return variation.rejected;
  }

  if (run.status === "failed") {
    return run.error;
  }

  return null;
};

const keepElementVariation = async (
  input: ElementVariationInput
): Promise<void> => {
  const { state, project, setDirectionId, direction, variation, scope, group } =
    input;

  await state.keepElement(variation.groupId, direction.id);
  keepVariationFrame(
    project.id,
    scope.sourceDirectionId,
    group.map((member) => member.id)
  );
  setDirectionId(scope.sourceDirectionId);
  state.setGroupId(null);
  state.keepNotice(
    `Kept variant ${variation.label} (${variation.title}) in the design as one version. The other variants were discarded.`
  );
};

const elementVariation = (input: ElementVariationInput): FrameVariation => {
  const { variation, run } = input;
  const elementError = toElementError(variation, run);

  return {
    costText: `${money(run.costUsd)} spent`,
    error: elementError,
    keepBlocked: keepBlocker(variation, run, elementError),
    label: variation.label,
    onKeep: () => keepElementVariation(input),
    onMix: () => Promise.resolve(),
    scoped: true,
    siblings: [],
    status: run.status,
    title: variation.title,
  };
};

export { elementVariation };
