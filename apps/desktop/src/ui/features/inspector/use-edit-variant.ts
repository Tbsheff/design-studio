import type { DirectStyleProperty } from "@design-studio/contracts";
import { createContext, useContext, useSyncExternalStore } from "react";

import { parseVariant } from "../../../shared/variants.js";
import type { PreviewPort } from "../../platform/bridge.js";
import { uiStore } from "../../platform/storage.js";

interface Restore {
  readonly width: number;
  readonly set: number;
}

let prefix = "";
let restore: Restore | null = null;
const listeners = new Set<() => void>();

const runListeners = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

const editVariantStore = {
  get: (): string => prefix,
  set: (next: string): void => {
    if (next === prefix) {
      return;
    }

    prefix = next;
    runListeners();
  },
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  },
};

const useEditVariant = (): string =>
  useSyncExternalStore(editVariantStore.subscribe, editVariantStore.get);

const toRestore = (
  current: Restore | null,
  width: number,
  viewportWidth: number
): Restore => {
  if (!current || viewportWidth !== current.set) {
    return { set: width, width: viewportWidth };
  }

  return { ...current, set: width };
};

const setFrameWidth = (width: number | null): void => {
  const { viewport } = uiStore.get();

  if (width === null) {
    if (restore && viewport.width === restore.set) {
      uiStore.set({
        viewport: {
          height: viewport.height,
          preset: "custom",
          width: restore.width,
        },
      });
    }

    restore = null;

    return;
  }

  restore = toRestore(restore, width, viewport.width);

  if (viewport.width !== width) {
    uiStore.set({
      viewport: { height: viewport.height, preset: "custom", width },
    });
  }
};

const setForceState = (
  port: PreviewPort | null,
  selector: string | null,
  variant: string
): void => {
  const parsed = parseVariant(variant);
  const states = parsed?.states ?? [];
  const dark = parsed?.dark ?? false;
  port?.post({
    dark,
    selector,
    states,
    track: selector !== null && variant !== "",
    type: "force-state",
  });
};

const restoreEditVariant = (port: PreviewPort | null): void => {
  if (prefix === "") {
    return;
  }

  editVariantStore.set("");
  setFrameWidth(null);
  setForceState(port, null, "");
};

interface VariantScope {
  readonly prefix: string;
  readonly props: ReadonlySet<string>;
}

const VariantScopeContext = createContext<VariantScope>({
  prefix: "",
  props: new Set(),
});

const useVariantScope = (): VariantScope => useContext(VariantScopeContext);

const isInherited = (scope: VariantScope, prop: DirectStyleProperty): boolean =>
  scope.prefix !== "" && !scope.props.has(prop);

export {
  editVariantStore,
  useEditVariant,
  setFrameWidth,
  setForceState,
  restoreEditVariant,
  VariantScopeContext,
  useVariantScope,
  isInherited,
};

export type { VariantScope };
