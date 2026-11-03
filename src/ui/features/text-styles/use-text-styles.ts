import { useCallback, useState, useTransition } from "react";

import type { SelectionContext, TextStyle } from "./deps.js";
import { applyAll, attempt, createFrom, detachAll } from "./style-edits.js";
import type { Note } from "./style-edits.js";
import { stylesOf, useStyleList } from "./use-style-list.js";
import type { TextStyleIds } from "./use-style-list.js";

interface TextStylesState {
  apply: (name: string) => Promise<void>;
  busy: boolean;
  create: (name: string) => Promise<boolean>;
  detach: () => Promise<void>;
  loading: boolean;
  note: Note | null;
  styles: TextStyle[];
}

const listNote = (message: string | null): Note | null => {
  if (message === null) {
    return null;
  }

  return { kind: "error", text: message };
};

const useTextStyles = (
  ids: TextStyleIds,
  targets: SelectionContext[]
): TextStylesState => {
  const list = useStyleList(ids);
  const [busy, startTransition] = useTransition();
  const [note, setNote] = useState<Note | null>(null);

  const run = useCallback(
    async (work: () => Promise<string>): Promise<boolean> => {
      const pending = attempt(work);

      startTransition(async () => {
        await pending;
      });

      const outcome = await pending;

      setNote(outcome.note);

      return outcome.ok;
    },
    []
  );

  const apply = useCallback(
    async (name: string): Promise<void> => {
      await run(() => applyAll(ids, targets, name));
    },
    [ids, run, targets]
  );

  const detach = useCallback(async (): Promise<void> => {
    await run(() => detachAll(ids, targets));
  }, [ids, run, targets]);

  const { reload } = list;

  const create = useCallback(
    async (name: string): Promise<boolean> => {
      const done = await run(() => createFrom(ids, targets, name));

      reload();

      return done;
    },
    [ids, reload, run, targets]
  );

  const failure = list.state.status === "error" && list.state.message;

  return {
    apply,
    busy,
    create,
    detach,
    loading: list.state.status === "loading",
    note: note ?? listNote(failure || null),
    styles: stylesOf(list.state),
  };
};

export { useTextStyles };

export type { TextStylesState };
