import { useCallback, useMemo, useRef } from "react";

import type { DirectEdit } from "./deps.js";

type Patch = Parameters<DirectEdit["preview"]>[0];

interface PaintLive {
  readonly onCommit: (color: string) => void;
  readonly onRevert: () => void;
}

const PAINT_PROP = "background-color";

const noop = (): null => null;

const usePaintEdit = (
  edit: DirectEdit,
  color: string,
  onColor: (color: string) => void,
  live: PaintLive | null
): DirectEdit => {
  const latest = useRef(color);
  const isTouched = useRef(false);

  const preview = useCallback(
    (patch: Patch): void => {
      const next = patch[PAINT_PROP];

      if (next) {
        latest.current = next;
        isTouched.current = true;
        onColor(next);
      }
    },
    [onColor]
  );

  const commit = useCallback((): void => {
    if (live && isTouched.current) {
      isTouched.current = false;
      live.onCommit(latest.current);
    }
  }, [live]);

  const revert = useCallback((): void => {
    isTouched.current = false;
    live?.onRevert();
  }, [live]);

  return useMemo(
    () => ({
      ...edit,
      commit,
      commitSoon: commit,
      dirty: [],
      preview,
      revert,
      shift: noop,
      values: { ...edit.values, [PAINT_PROP]: color },
    }),
    [color, commit, edit, preview, revert]
  );
};

export { PAINT_PROP, usePaintEdit };

export type { PaintLive };
