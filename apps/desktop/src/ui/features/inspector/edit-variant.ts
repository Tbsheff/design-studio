import type { DirectStyleProperty } from "@design-studio/contracts";
import { createContext, useContext, useSyncExternalStore } from "react";

import { parseVariant } from "../../../shared/variants.js";
import type { PreviewPort } from "../../platform/bridge.js";
import { uiStore } from "../../platform/storage.js";

let prefix = "";
let restore: { readonly width: number; readonly set: number } | null = null;
const listeners = new Set<() => void>();

const emit = (): void => {
  listeners.forEach((listener) => listener());
};

const editVariantStore = {
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

const useEditVariant = (): string =>
  useSyncExternalStore(editVariantStore.subscribe, editVariantStore.get);

const fitFrameTo = (width: number | null): void => {
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

const postForceState = (
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

const resetEditVariant = (port: PreviewPort | null): void => {
  if (prefix === "") {
    return;
  }

  editVariantStore.set("");
  fitFrameTo(null);
  postForceState(port, null, "");
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
  fitFrameTo,
  postForceState,
  resetEditVariant,
  VariantScopeContext,
  useVariantScope,
  isInherited,
};

export type { VariantScope };
