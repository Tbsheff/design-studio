import type {
  BridgeToParent,
  SelectionContext,
} from "@design-studio/contracts";

type SelectMessage = Extract<BridgeToParent, { type: "select" }>;

type SelectManyMessage = Extract<BridgeToParent, { type: "select-many" }>;

const isSelectMessage = (
  msg: BridgeToParent
): msg is SelectMessage | SelectManyMessage =>
  msg.type === "select" || msg.type === "select-many";

const nextSelection = (
  prev: SelectionContext[],
  picked: SelectionContext,
  additive: boolean
): SelectionContext[] => {
  if (!additive) {
    return [picked];
  }

  const has = prev.some(
    (selectionContext) => selectionContext.selector === picked.selector
  );

  if (has) {
    return prev.filter(
      (selectionContext2) => selectionContext2.selector !== picked.selector
    );
  }

  return [...prev, picked];
};

const manySelection = (
  prev: SelectionContext[],
  picked: SelectionContext[],
  additive: boolean
): SelectionContext[] => {
  if (!additive) {
    return picked;
  }

  const known = new Set(
    prev.map((selectionContext3) => selectionContext3.selector)
  );

  return [
    ...prev,
    ...picked.filter(
      (selectionContext4) => !known.has(selectionContext4.selector)
    ),
  ];
};

const nodeAfterSelect = (
  msg: SelectMessage,
  selection: SelectionContext[]
): number | null => {
  if (
    msg.additive &&
    selection.some(
      (selectionContext5) =>
        selectionContext5.selector === msg.selection.selector
    )
  ) {
    return null;
  }

  return msg.node ?? null;
};

export { isSelectMessage, manySelection, nextSelection, nodeAfterSelect };

export type { SelectManyMessage, SelectMessage };
