import type {
  BridgeToParent,
  SelectionContext,
} from "@design-studio/contracts";
import type { ReactElement } from "react";
import { useEffect, useState } from "react";

import { toRectStyle } from "./overlay-styles.js";

const MarqueeLayer = ({
  listen,
}: {
  listen: (handler: (message: BridgeToParent) => void) => () => void;
}): ReactElement | null => {
  const [rect, setRect] = useState<SelectionContext["rect"] | null>(null);
  useEffect(
    () =>
      listen((message) => {
        if (message.type === "marquee") {
          setRect(message.rect);

          return;
        }

        if (message.type === "ready" || message.type === "mode-exited") {
          setRect(null);
        }
      }),
    [listen]
  );
  const shown = rect !== null;
  useEffect(() => {
    if (!shown) {
      return;
    }

    const clear = (): void => setRect(null);
    globalThis.addEventListener("pointerup", clear);

    return (): void => globalThis.removeEventListener("pointerup", clear);
  }, [shown]);

  if (!rect) {
    return null;
  }

  return (
    <div className="overlay" aria-hidden="true">
      <div
        className="box marquee"
        data-testid="marquee"
        style={toRectStyle(rect, null)}
      />
    </div>
  );
};

export { MarqueeLayer };
