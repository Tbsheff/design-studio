import { createContext, useContext, useSyncExternalStore } from "react";

import type { DirectStyleProperty } from "../../../shared/actions/_core/contracts.js";
import { parseVariant } from "../../../shared/variants.js";
import type { PreviewPort } from "../../platform/bridge.js";
import { uiStore } from "../../platform/storage.js";

let prefix = "";
let restore: { width: number; set: number } | null = null;
const listeners = new Set<() => void>();

const emit = (): void => {
  listeners.forEach((listener) => listener());
};

export const editVariantStore = {
  get: (): string => prefix,
  set: (next: string): void => {
    if (next === prefix) {
      return;
    }

    prefix = next;
    emit();
  },
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  },
};

export const useEditVariant = (): string =>
  useSyncExternalStore(editVariantStore.subscribe, editVariantStore.get);

export const fitFrameTo = (width: number | null): void => {
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

  restore =
    !restore || viewport.width !== restore.set
      ? { set: width, width: viewport.width }
      : { ...restore, set: width };

  if (viewport.width !== width) {
    uiStore.set({
      viewport: { height: viewport.height, preset: "custom", width },
    });
  }
};

export const postForceState = (
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

export const resetEditVariant = (port: PreviewPort | null): void => {
  if (prefix === "") {
    return;
  }

  editVariantStore.set("");
  fitFrameTo(null);
  postForceState(port, null, "");
};

export interface VariantScope {
  prefix: string;
  props: ReadonlySet<string>;
}

export const VariantScopeContext = createContext<VariantScope>({
  prefix: "",
  props: new Set(),
});

export const useInherited = (prop: DirectStyleProperty): boolean => {
  const scope = useContext(VariantScopeContext);

  return scope.prefix !== "" && !scope.props.has(prop);
};
