import { useCallback, useEffect, useMemo } from "react";
import type { MutableRefObject } from "react";

import { editVariantStore, setForceState, useEditVariant } from "./deps.js";
import type {
  PreviewPort,
  SaveStatus,
  SelectionContext,
  StateListResult,
  StyleState,
} from "./deps.js";
import { sendForced } from "./state-styles-api.js";
import type { StateIds } from "./state-styles-api.js";
import {
  chipsFor,
  isTypingTarget,
  prefixFor,
  roundOf,
  stateOf,
  stateWire,
  styledStates,
} from "./state-styles-model.js";
import type { ChipId } from "./state-styles-model.js";
import { useStateInfo } from "./use-state-info.js";

interface StateStylesOptions {
  readonly directionId: string;
  readonly port: MutableRefObject<PreviewPort | null>;
  readonly projectId: string;
  readonly status: SaveStatus;
  readonly target: SelectionContext;
}

interface StateStylesView {
  readonly active: ChipId | null;
  readonly chips: readonly ChipId[];
  readonly error: string | null;
  readonly isOff: boolean;
  readonly handlePick: (chip: ChipId) => void;
  readonly info: StateListResult | null;
  readonly reason: string | null;
  readonly styled: ReadonlySet<StyleState>;
}

interface ForcedOn {
  readonly ids: StateIds;
  readonly selector: string;
}

interface ForcedHolder {
  current: ForcedOn | null;
  selector: string | null;
  stopWatch: (() => void) | null;
}

const held: ForcedHolder = { current: null, selector: null, stopWatch: null };

const layerFor = (
  state: StyleState | null,
  selector: string
): string | null => {
  if (state === null || state === "dark") {
    return null;
  }

  return selector;
};

const clearStale = (selector: string, active: ChipId | null): void => {
  const last = held.current;

  if (last === null) {
    return;
  }

  if (last.selector === selector && active !== "default") {
    return;
  }

  held.current = null;
  void sendForced(last.ids, null, null);
};

const clearOnReset = (): void => {
  if (editVariantStore.get() !== "") {
    return;
  }

  held.stopWatch?.();
  held.stopWatch = null;
  clearStale("", null);
};

const watchReset = (): void => {
  if (held.stopWatch === null) {
    held.stopWatch = editVariantStore.subscribe(clearOnReset);
  }
};

const pushForced = (
  ids: StateIds,
  selector: string,
  state: StyleState | null
): void => {
  held.current = null;

  if (state !== null) {
    held.current = { ids, selector };
    watchReset();
  }

  void sendForced(ids, layerFor(state, selector), state);
};

interface ChipTarget {
  readonly ids: StateIds;
  readonly info: StateListResult | null;
  readonly selector: string;
}

const applyChip = (
  port: MutableRefObject<PreviewPort | null>,
  { ids, info, selector }: ChipTarget,
  chip: ChipId
): void => {
  const next = prefixFor(editVariantStore.get(), chip, info);
  const frame = port.current;

  frame?.post({ type: "preview-reset" });
  pushForced(ids, selector, stateWire(chip));
  editVariantStore.set(next);
  setForceState(frame, selector, next);
};

const isStateChip = (active: ChipId | null): boolean =>
  active !== null && active !== "default";

const useEscape = (
  active: ChipId | null,
  onPick: (chip: ChipId) => void
): void => {
  useEffect(() => {
    if (!isStateChip(active)) {
      return;
    }

    const onKey = (event: KeyboardEvent): void => {
      if (
        event.key !== "Escape" ||
        event.defaultPrevented ||
        isTypingTarget(event.target)
      ) {
        return;
      }

      onPick("default");
    };

    globalThis.addEventListener("keydown", onKey);

    return (): void => {
      globalThis.removeEventListener("keydown", onKey);
    };
  }, [active, onPick]);
};

const useStateStyles = (options: StateStylesOptions): StateStylesView => {
  const { directionId, port, projectId, status, target } = options;
  const prefix = useEditVariant();
  const active = stateOf(prefix);
  const { outerHTML, selector, source } = target;

  const ids = useMemo(
    () => ({ directionId, projectId }),
    [directionId, projectId]
  );

  const loaded = useStateInfo(ids, source, roundOf(status));
  const { info } = loaded;
  const styled = useMemo(() => styledStates(info), [info]);
  const chips = useMemo(() => chipsFor(outerHTML, info), [info, outerHTML]);

  const handlePick = useCallback(
    (chip: ChipId) => applyChip(port, { ids, info, selector }, chip),
    [ids, info, port, selector]
  );

  useEffect(() => {
    const moved = held.selector !== null && held.selector !== selector;

    held.selector = selector;

    if (moved && isStateChip(active)) {
      handlePick("default");

      return;
    }

    clearStale(selector, active);
  }, [active, handlePick, selector]);

  useEscape(active, handlePick);

  const { error } = loaded;
  const isOff = info?.layer.mode === "none";
  const reason = info?.layer.reason ?? null;

  return { active, chips, error, handlePick, info, isOff, reason, styled };
};

export { useStateStyles };

export type { StateStylesOptions, StateStylesView };
