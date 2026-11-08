import { useCallback, useEffect, useMemo } from "react";
import type { MutableRefObject } from "react";

import { editVariantStore, setForceState, useEditVariant } from "./deps.js";
import type {
  PreviewPort,
  SaveStatus,
  SelectionContext,
  StyleState,
} from "./deps.js";
import { sendForced } from "./state-styles-api.js";
import type { StateIds } from "./state-styles-api.js";
import {
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
  readonly error: string | null;
  readonly isOff: boolean;
  readonly handlePick: (chip: ChipId) => void;
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
}

const held: ForcedHolder = { current: null, selector: null };

const layerFor = (
  state: StyleState | null,
  selector: string
): string | null => {
  if (state === null || state === "dark") {
    return null;
  }

  return selector;
};

const pushForced = (
  ids: StateIds,
  selector: string,
  state: StyleState | null
): void => {
  held.current = null;

  if (state !== null) {
    held.current = { ids, selector };
  }

  void sendForced(ids, layerFor(state, selector), state);
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

const applyChip = (
  port: MutableRefObject<PreviewPort | null>,
  ids: StateIds,
  selector: string,
  chip: ChipId
): void => {
  const next = prefixFor(editVariantStore.get(), chip);
  const frame = port.current;

  frame?.post({ type: "preview-reset" });
  editVariantStore.set(next);
  setForceState(frame, selector, next);
  pushForced(ids, selector, stateWire(chip));
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
  const { selector, source } = target;

  const ids = useMemo(
    () => ({ directionId, projectId }),
    [directionId, projectId]
  );

  const loaded = useStateInfo(ids, source, roundOf(status));
  const styled = useMemo(() => styledStates(loaded.info), [loaded.info]);

  const handlePick = useCallback(
    (chip: ChipId) => applyChip(port, ids, selector, chip),
    [ids, port, selector]
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
  const isOff = loaded.info?.layer.mode === "none";
  const reason = loaded.info?.layer.reason ?? null;

  return { active, error, handlePick, isOff, reason, styled };
};

export { useStateStyles };

export type { StateStylesOptions, StateStylesView };
