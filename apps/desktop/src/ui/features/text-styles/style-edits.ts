import { copy } from "./copy.js";
import { api, insertError } from "./deps.js";
import type { SelectionContext, TextStyleTargetBody } from "./deps.js";
import { targetBody } from "./style-match.js";
import type { TextStyleIds } from "./use-style-list.js";

interface Note {
  kind: "error" | "info";
  text: string;
}

interface Outcome {
  note: Note;
  ok: boolean;
}

interface Sourced {
  body: TextStyleTargetBody;
  target: SelectionContext;
}

const sourced = (targets: SelectionContext[]): Sourced[] =>
  targets.flatMap((target) => {
    const body = targetBody(target);

    if (!body) {
      return [];
    }

    return [{ body, target }];
  });

const inOrder = async (
  items: Sourced[],
  work: (item: Sourced) => Promise<void>,
  index = 0
): Promise<void> => {
  const item = items[index];

  if (!item) {
    return;
  }

  await work(item);
  await inOrder(items, work, index + 1);
};

const applyAll = async (
  ids: TextStyleIds,
  targets: SelectionContext[],
  name: string
): Promise<string> => {
  await inOrder(sourced(targets), async ({ body }) => {
    await api.applyTextStyle(ids.projectId, ids.directionId, {
      style: name,
      target: body,
    });
  });

  return `${copy.applied} ${name}`;
};

const detachAll = async (
  ids: TextStyleIds,
  targets: SelectionContext[]
): Promise<string> => {
  await inOrder(sourced(targets), async ({ body, target }) => {
    await api.detachTextStyle(ids.projectId, ids.directionId, {
      styles: target.styles,
      target: body,
    });
  });

  return copy.detached;
};

const createFrom = async (
  ids: TextStyleIds,
  targets: SelectionContext[],
  name: string
): Promise<string> => {
  const [first] = sourced(targets);

  if (!first) {
    throw new Error(copy.noSource);
  }

  const made = await api.createTextStyle(ids.projectId, ids.directionId, {
    name,
    styles: first.target.styles,
  });

  await api.applyTextStyle(ids.projectId, ids.directionId, {
    style: made.name,
    target: first.body,
  });

  return `${copy.created} ${made.name}`;
};

const attempt = async (work: () => Promise<string>): Promise<Outcome> => {
  try {
    return { note: { kind: "info", text: await work() }, ok: true };
  } catch (error) {
    return { note: { kind: "error", text: insertError(error) }, ok: false };
  }
};

export { applyAll, attempt, createFrom, detachAll };

export type { Note };
