import type {
  DirectStyleProperty,
  SelectionContext,
} from "@design-studio/contracts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";

import { api, errorText } from "../../api.js";
import type { PreviewPort } from "../../platform/bridge.js";
import { isApiConflict, isApiError } from "./api-error.js";
import { changedProps, valuesFromStyles } from "./css-values.js";
import type { StyleValues } from "./css-values.js";
import {
  addShift,
  mergeValues,
  multiBlockReason,
  ownEdits,
  shiftedStyle,
  withoutShifts,
} from "./mixed-values.js";
import type { Shift, ShiftPart, Shifts } from "./mixed-values.js";
import { startOptimistic } from "./optimistic-edit.js";
import type {
  DirectEdit,
  DirectEditCommit,
  DirectEditControl,
  SaveStatus,
} from "./use-direct-edit.js";

interface Options {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly selections: SelectionContext[];
  readonly port: MutableRefObject<PreviewPort | null>;
  readonly control: MutableRefObject<DirectEditControl | null>;
  readonly onCommitted: (commit: DirectEditCommit) => void;
  readonly onStale: (message: string) => void;
  readonly rewrite?: (style: Partial<StyleValues>) => Partial<StyleValues>;
}

const DEBOUNCE_MS = 250;

const failureText = (err: unknown): string => {
  if (isApiConflict(err)) {
    return "Agent is running. Wait or cancel.";
  }

  return errorText(err);
};

const useDirectEdits = (
  o: Options
): DirectEdit & { readonly blocked: string | null } => {
  const opts = useRef(o);
  opts.current = o;

  const bases = useMemo(
    () => o.selections.map((s) => valuesFromStyles(s.styles)),
    [o.selections]
  );

  const basesRef = useRef(bases);
  basesRef.current = bases;
  const merged = useMemo(() => mergeValues(bases), [bases]);
  const mergedRef = useRef(merged);
  mergedRef.current = merged;
  const blocked = useMemo(() => multiBlockReason(o.selections), [o.selections]);
  const [draft, setDraftState] = useState<Partial<StyleValues>>({});
  const draftRef = useRef(draft);
  const [status, setStatus] = useState<SaveStatus>({ kind: "idle" });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef<Promise<void> | null>(null);
  const again = useRef(false);
  const shifts = useRef<Shifts>({});
  const [shifted, setShifted] = useState<readonly DirectStyleProperty[]>([]);

  const setShifts = useCallback((next: Shifts) => {
    shifts.current = next;
    setShifted(Object.keys(next) as DirectStyleProperty[]);
  }, []);

  const setDraft = useCallback((next: Partial<StyleValues>) => {
    draftRef.current = next;
    setDraftState(next);
  }, []);

  const postAll = useCallback((style: Record<string, string | null>) => {
    const port = opts.current.port.current;

    for (const s of opts.current.selections) {
      port?.post({ selector: s.selector, style, type: "preview-style" });
    }
  }, []);

  const resetPreview = useCallback(
    () => opts.current.port.current?.post({ type: "preview-reset" }),
    []
  );

  const cancel = useCallback(() => {
    if (timer.current !== null) {
      globalThis.clearTimeout(timer.current);
    }

    timer.current = null;
    again.current = false;
    setDraft({});
    setShifts({});
  }, [setDraft, setShifts]);

  const fail = useCallback(
    (err: unknown) => {
      if (
        isApiError(err) &&
        err.status === 422 &&
        err.code === "stale_selection"
      ) {
        cancel();
        opts.current.port.current?.post({ type: "preview-reset" });
        opts.current.onStale(err.message);

        return;
      }

      resetPreview();
      setDraft({});
      setShifts({});
      setStatus({ kind: "error", message: failureText(err) });
    },
    [cancel, resetPreview, setDraft, setShifts]
  );

  const pendingStyle = useCallback(() => {
    const style = changedProps(draftRef.current, mergedRef.current.values);
    const { rewrite } = opts.current;

    if (!rewrite || Object.keys(style).length === 0) {
      return style;
    }

    const next = changedProps(rewrite(style), mergedRef.current.values);
    const moved = changedProps(next, { ...mergedRef.current.values, ...style });

    if (Object.keys(moved).length > 0) {
      setDraft({ ...draftRef.current, ...moved });
      postAll(moved);
    }

    return next;
  }, [postAll, setDraft]);

  const flush = useCallback(async () => {
    timer.current = null;

    if (inflight.current) {
      again.current = true;

      return;
    }

    const cur = opts.current;

    if (blocked || !cur.directionId) {
      return;
    }

    const style = pendingStyle();
    const sent = shifts.current;
    const items = ownEdits(cur.selections, basesRef.current, style, sent);
    const edits = items.map((item) => item.edit);

    if (edits.length === 0) {
      return;
    }

    setStatus({ kind: "saving" });

    const problem = (message: string): void =>
      setStatus({ code: "optimistic_mismatch", kind: "error", message });

    const optimistic = edits.map((edit) =>
      startOptimistic(cur.port.current, edit, problem)
    );

    const request = api
      .directEditBatch(cur.projectId, cur.directionId, { edits })
      .then((result) => {
        optimistic.forEach((one, index) =>
          one.saved(result.applied[index]?.tailwind)
        );

        for (const item of items) {
          cur.onCommitted({ selector: item.edit.selector, style: item.style });
        }

        setShifts(withoutShifts(shifts.current, [], sent));
        setStatus({ at: Date.now(), kind: "saved" });
      })
      .catch((error: unknown) => {
        for (const one of optimistic) {
          one.failed(failureText(error));
        }

        fail(error);
      });

    inflight.current = request;
    await request;
    inflight.current = null;

    if (again.current) {
      again.current = false;
      void flush();
    }
  }, [blocked, fail, pendingStyle, setShifts]);

  const commitSoon = useCallback(() => {
    if (timer.current !== null) {
      globalThis.clearTimeout(timer.current);
    }

    timer.current = globalThis.setTimeout(() => void flush(), DEBOUNCE_MS);
  }, [flush]);

  const commit = useCallback(() => {
    if (timer.current !== null) {
      globalThis.clearTimeout(timer.current);
    }

    void flush();
  }, [flush]);

  const preview = useCallback(
    (patch: Partial<StyleValues>) => {
      if (blocked) {
        return;
      }

      if (Object.keys(patch).some((prop) => prop in shifts.current)) {
        setShifts(withoutShifts(shifts.current, Object.keys(patch)));
      }

      setDraft({ ...draftRef.current, ...patch });
      postAll(patch);
      setStatus((s) => (s.kind === "error" ? { kind: "idle" } : s));
    },
    [blocked, postAll, setDraft, setShifts]
  );

  const shift = useCallback(
    (
      props: readonly DirectStyleProperty[],
      delta: number,
      bounds: Omit<Shift, "delta"> = {},
      part?: ShiftPart
    ) => {
      if (blocked) {
        return;
      }

      const next = addShift(shifts.current, props, delta, bounds, part);
      setShifts(next);
      const draft = { ...draftRef.current };

      for (const prop of props) {
        delete draft[prop];
      }

      setDraft(draft);
      const port = opts.current.port.current;

      const only = Object.fromEntries(
        props.flatMap((prop) => (next[prop] ? [[prop, next[prop]]] : []))
      ) as Shifts;

      opts.current.selections.forEach((s, i) => {
        const own = basesRef.current[i];
        const style = own ? shiftedStyle(own, only) : {};

        if (Object.keys(style).length > 0) {
          port?.post({ selector: s.selector, style, type: "preview-style" });
        }
      });
      setStatus((s) => (s.kind === "error" ? { kind: "idle" } : s));
    },
    [blocked, setDraft, setShifts]
  );

  const revert = useCallback(
    (props: DirectStyleProperty[]) => {
      const next = { ...draftRef.current };

      for (const prop of props) {
        delete next[prop];
      }

      setDraft(next);
      setShifts(withoutShifts(shifts.current, props));
      const port = opts.current.port.current;
      opts.current.selections.forEach((s, i) => {
        const own = basesRef.current[i];

        const style = Object.fromEntries(
          props.map((prop) => [prop, own?.[prop] ? own[prop] : null])
        );

        port?.post({ selector: s.selector, style, type: "preview-style" });
      });
    },
    [setDraft, setShifts]
  );

  const reset = useCallback(() => {
    cancel();
    resetPreview();
    setStatus({ kind: "idle" });
  }, [cancel, resetPreview]);

  const settle = useCallback(async () => {
    cancel();

    while (inflight.current) {
      await inflight.current;
    }
  }, [cancel]);

  const drain = useCallback(async () => {
    if (timer.current !== null) {
      globalThis.clearTimeout(timer.current);
      await flush();
    }

    while (inflight.current) {
      await inflight.current;
    }
  }, [flush]);

  const absorb = useCallback(
    (style: Partial<StyleValues>) => {
      const next = { ...draftRef.current };

      for (const prop of Object.keys(style) as DirectStyleProperty[]) {
        delete next[prop];
      }

      setDraft(next);
      setShifts(withoutShifts(shifts.current, Object.keys(style)));
      setStatus({ at: Date.now(), kind: "saved" });
    },
    [setDraft, setShifts]
  );

  const commitText = useCallback(() => false, []);
  const noop = useCallback(() => undefined, []);

  useEffect(() => {
    o.control.current = { cancel, commitText, settle };

    return (): void => {
      if (o.control.current?.cancel === cancel) {
        o.control.current = null;
      }

      if (timer.current !== null) {
        globalThis.clearTimeout(timer.current);
        void flush();
      }
    };
  }, [cancel, settle, commitText, flush, o.control]);

  const values = useMemo(
    () => ({ ...merged.values, ...draft }),
    [merged, draft]
  );

  const mixed = useMemo(() => {
    const set = new Set(merged.mixed);

    for (const prop of Object.keys(draft) as DirectStyleProperty[]) {
      set.delete(prop);
    }

    return set as ReadonlySet<DirectStyleProperty>;
  }, [merged, draft]);

  const dirty = useMemo(
    () => [
      ...new Set([
        ...(Object.keys(draft) as DirectStyleProperty[]),
        ...shifted,
      ]),
    ],
    [draft, shifted]
  );

  const scope = useMemo(
    () => ({ directionId: o.directionId, projectId: o.projectId }),
    [o.projectId, o.directionId]
  );

  return {
    absorb,
    blocked,
    commit,
    commitSoon,
    dirty,
    drain,
    each: bases,
    mixed,
    preview,
    previewText: noop,
    reselect: noop,
    reset,
    revert,
    revertText: noop,
    scope,
    shift,
    status,
    tailwind: null,
    text: "",
    values,
  };
};

export { useDirectEdits };
