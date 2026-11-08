import { useEffect, useRef, useState } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";

import { toPressedIds } from "./shortcut-model.js";

const MARK_MS = 900;

type MarkSetter = Dispatch<SetStateAction<ReadonlySet<string>>>;

const toWithoutMark = (
  previous: ReadonlySet<string>,
  id: string
): ReadonlySet<string> => {
  const next = new Set(previous);

  next.delete(id);

  return next;
};

const scheduleUnmark = (
  live: Map<string, ReturnType<typeof setTimeout>>,
  id: string,
  setMarked: MarkSetter
): void => {
  globalThis.clearTimeout(live.get(id));
  live.set(
    id,
    globalThis.setTimeout(() => {
      live.delete(id);
      setMarked((previous) => toWithoutMark(previous, id));
    }, MARK_MS)
  );
};

const isCloseKey = (
  event: KeyboardEvent,
  rootRef: RefObject<HTMLElement | null>
): boolean =>
  event.key === "Escape" &&
  Boolean(rootRef.current?.contains(document.activeElement));

const useShortcutMarks = (
  rootRef: RefObject<HTMLElement | null>,
  onClose: () => void
): ReadonlySet<string> => {
  const [marked, setMarked] = useState<ReadonlySet<string>>(new Set());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const live = timers.current;

    const onKey = (event: KeyboardEvent): void => {
      if (event.repeat) {
        return;
      }

      if (isCloseKey(event, rootRef)) {
        event.preventDefault();
        event.stopPropagation();
        onClose();

        return;
      }

      const ids = toPressedIds(event);

      if (ids.length === 0) {
        return;
      }

      setMarked((previous) => new Set([...previous, ...ids]));

      for (const id of ids) {
        scheduleUnmark(live, id, setMarked);
      }
    };

    globalThis.addEventListener("keydown", onKey, true);

    return (): void => {
      globalThis.removeEventListener("keydown", onKey, true);

      for (const timer of live.values()) {
        globalThis.clearTimeout(timer);
      }

      live.clear();
    };
  }, [onClose, rootRef]);

  return marked;
};

export { useShortcutMarks };
