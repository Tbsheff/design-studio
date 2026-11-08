import type { QueuedMessage } from "@design-studio/contracts";

const MAX_ROWS = 4;

const moveQueued = (
  items: QueuedMessage[],
  from: number,
  to: number
): QueuedMessage[] => {
  if (to < 0 || to >= items.length || from === to) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(from, 1);

  if (item) {
    next.splice(to, 0, item);
  }

  return next;
};

const editQueued = (
  items: QueuedMessage[],
  id: string,
  text: string
): QueuedMessage[] =>
  items.map((entry) => {
    if (entry.id === id) {
      return { ...entry, text };
    }

    return entry;
  });

const removeQueued = (items: QueuedMessage[], id: string): QueuedMessage[] =>
  items.filter((entry) => entry.id !== id);

const toEditRows = (text: string): number =>
  Math.min(MAX_ROWS, text.split("\n").length);

const toArrowStep = (key: string): number => {
  if (key === "ArrowDown") {
    return 1;
  }

  if (key === "ArrowUp") {
    return -1;
  }

  return 0;
};

export { editQueued, moveQueued, removeQueued, toArrowStep, toEditRows };
