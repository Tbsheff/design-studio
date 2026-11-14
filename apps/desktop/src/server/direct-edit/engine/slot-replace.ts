import {
  applyTracked,
  assertMovable,
  contains,
  movedTexts,
  refuse,
  replaceSplice,
  ROOT_MESSAGE,
} from "./structure-ops.js";
import type { OpPlan, StructNode } from "./structure-ops.js";

type SlotSplice = ReturnType<typeof replaceSplice>;

const SELF_MESSAGE =
  "A layer cannot be replaced by itself or by a layer it holds";

const toSlotSplice = (
  source: string,
  nodes: StructNode[],
  slot: StructNode
): SlotSplice => {
  if (slot.root) {
    throw refuse(ROOT_MESSAGE);
  }

  if (nodes.some((node) => contains(node, slot) || contains(slot, node))) {
    throw refuse(SELF_MESSAGE);
  }

  return replaceSplice(
    source,
    (indent) => movedTexts(source, nodes, indent),
    slot
  );
};

const toReplacePlan = (
  source: string,
  nodes: StructNode[],
  slots: readonly StructNode[]
): OpPlan => {
  for (const node of nodes) {
    assertMovable(node);
  }

  return applyTracked(
    source,
    slots.map((slot) => toSlotSplice(source, nodes, slot))
  );
};

export { toReplacePlan };
