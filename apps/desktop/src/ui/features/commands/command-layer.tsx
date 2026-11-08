import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo } from "react";

import { Palette } from "./palette.js";
import type { CommandLayer as Layer } from "./registry.js";
import { ShortcutSheet } from "./shortcut-sheet.js";

const readActiveElement = (): Element | null =>
  globalThis.document.activeElement;

const CommandLayer = ({
  layer,
  onLayer,
}: {
  layer: Layer;
  onLayer: (next: Layer | null) => void;
}): ReactElement => {
  const opener = useMemo(() => readActiveElement(), []);
  const close = useCallback(() => onLayer(null), [onLayer]);
  const openShortcuts = useCallback(() => onLayer("shortcuts"), [onLayer]);

  useEffect(
    () => (): void => {
      if (
        opener instanceof HTMLElement &&
        opener.isConnected &&
        document.activeElement === document.body
      ) {
        opener.focus({ preventScroll: true });
      }
    },
    [opener]
  );

  if (layer === "palette") {
    return <Palette onClose={close} onShortcuts={openShortcuts} />;
  }

  return <ShortcutSheet onClose={close} />;
};

export { CommandLayer };
