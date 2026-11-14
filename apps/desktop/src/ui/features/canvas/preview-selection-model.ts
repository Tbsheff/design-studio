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

type NodeMap = ReadonlyMap<string, number>;

const toNodeEntries = (
  message: SelectMessage | SelectManyMessage
): (readonly [string, number])[] => {
  if (message.type === "select") {
    const node = message.node ?? null;

    if (node === null) {
      return [];
    }

    return [[message.selection.selector, node]];
  }

  const nodes = message.nodes ?? [];

  return message.selections.flatMap((entry, index) => {
    const node = nodes[index] ?? null;

    if (node === null) {
      return [];
    }

    return [[entry.selector, node] as const];
  });
};

const toNextNodeMap = (
  prev: NodeMap,
  message: SelectMessage | SelectManyMessage
): NodeMap => {
  const entries = toNodeEntries(message);

  if (!message.additive) {
    return new Map(entries);
  }

  return new Map([...prev, ...entries]);
};

const toSelectedNodes = (
  selection: readonly SelectionContext[],
  nodes: NodeMap,
  last: number | null
): ReadonlySet<number> => {
  const ids = selection.flatMap((entry) => {
    const node = nodes.get(entry.selector) ?? null;

    if (node === null) {
      return [];
    }

    return [node];
  });

  if (last !== null) {
    ids.push(last);
  }

  return new Set(ids);
};

export {
  isSelectMessage,
  manySelection,
  nextSelection,
  nodeAfterSelect,
  toNextNodeMap,
  toSelectedNodes,
};

export type { NodeMap, SelectManyMessage, SelectMessage };
