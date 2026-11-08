import { useCallback, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";

import { placeFixed } from "./popover-placement.js";
import { HIDDEN } from "./ui-select-model.js";

interface SelectPlacement {
  readonly attach: (node: HTMLDivElement | null) => void;
  readonly hide: () => void;
  readonly panel: RefObject<HTMLDivElement | null>;
  readonly style: CSSProperties;
}

const useSelectPlacement = (
  button: RefObject<HTMLButtonElement | null>
): SelectPlacement => {
  const [style, setStyle] = useState<CSSProperties>(HIDDEN);
  const panel = useRef<HTMLDivElement | null>(null);
  const hide = useCallback(() => setStyle(HIDDEN), []);

  const attach = useCallback(
    (node: HTMLDivElement | null) => {
      panel.current = node;

      if (!node || !button.current) {
        return;
      }

      const placed = placeFixed(button.current, node, { align: "start" });

      setStyle({ ...placed, minWidth: button.current.offsetWidth });
    },
    [button]
  );

  return { attach, hide, panel, style };
};

export { useSelectPlacement };

export type { SelectPlacement };
