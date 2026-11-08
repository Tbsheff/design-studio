import { useCallback, useEffect } from "react";
import type { MutableRefObject } from "react";

import { parseVariant, variantPrefix } from "../../../shared/variants.js";
import type {
  Breakpoint,
  ParsedVariant,
  VariantSupport,
} from "../../../shared/variants.js";
import type { PreviewPort } from "../../platform/bridge.js";
import {
  editVariantStore,
  setForceState,
  setFrameWidth,
  useEditVariant,
} from "./use-edit-variant.js";
import {
  ANY_WIDTH,
  BASE,
  isStateId,
  toBreakpoints,
  toFrameWidth,
  toNextStates,
} from "./variant-bar-model.js";

interface VariantBarState {
  readonly breakpoints: Breakpoint[];
  readonly current: ParsedVariant;
  readonly prefix: string;
  readonly handleBase: () => void;
  readonly handleDark: () => void;
  readonly handleState: (id: string) => void;
  readonly handleWidth: (name: string) => void;
}

const useVariantBar = (
  selector: string,
  port: MutableRefObject<PreviewPort | null>,
  support: VariantSupport | null
): VariantBarState => {
  const prefix = useEditVariant();
  const current = parseVariant(prefix) ?? BASE;
  const breakpoints = toBreakpoints(support);

  useEffect(() => {
    if (prefix !== "") {
      setForceState(port.current, selector, prefix);
    }
  }, [port, selector, prefix]);

  const choose = useCallback(
    (next: ParsedVariant): void => {
      const value = variantPrefix(next);

      port.current?.post({ type: "preview-reset" });
      editVariantStore.set(value);
      setFrameWidth(toFrameWidth(next, breakpoints));
      setForceState(port.current, selector, value);
    },
    [breakpoints, port, selector]
  );

  const handleBase = useCallback((): void => {
    choose(BASE);
  }, [choose]);

  const handleDark = useCallback((): void => {
    choose({ ...current, dark: !current.dark });
  }, [choose, current]);

  const handleState = useCallback(
    (id: string): void => {
      if (isStateId(id)) {
        choose({ ...current, states: toNextStates(current.states, id) });
      }
    },
    [choose, current]
  );

  const handleWidth = useCallback(
    (name: string): void => {
      let breakpoint: string | null = name;

      if (name === ANY_WIDTH) {
        breakpoint = null;
      }

      choose({ ...current, breakpoint });
    },
    [choose, current]
  );

  return {
    breakpoints,
    current,
    handleBase,
    handleDark,
    handleState,
    handleWidth,
    prefix,
  };
};

export { useVariantBar };

export type { VariantBarState };
