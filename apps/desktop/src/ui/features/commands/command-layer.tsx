import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo } from "react";

import { Palette } from "./palette.js";
import type { CommandLayer as Layer } from "./registry.js";
import { ShortcutSheet } from "./shortcut-sheet.js";
import type { OpenTarget } from "./use-file-rows.js";

const readActiveElement = (): Element | null =>
  globalThis.document.activeElement;

const toEscape = (
  layer: Layer,
  close: () => void,
  back: () => void
): (() => void) => {
  if (layer === "files") {
    return back;
  }

  return close;
};

const CommandLayer = ({
  layer,
  onLayer,
  onOpenFile,
}: {
  layer: Layer;
  onLayer: (next: Layer | null) => void;
  onOpenFile: (target: OpenTarget) => void;
}): ReactElement => {
  const opener = useMemo(() => readActiveElement(), []);
  const close = useCallback(() => onLayer(null), [onLayer]);
  const openPalette = useCallback(() => onLayer("palette"), [onLayer]);

  const openFile = useCallback(
    (target: OpenTarget): void => {
      onLayer(null);
      onOpenFile(target);
    },
    [onLayer, onOpenFile]
  );

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

  if (layer === "palette" || layer === "projects" || layer === "files") {
    return (
      <Palette
        isFiles={layer === "files"}
        isProjectsOnly={layer === "projects"}
        onClose={close}
        onEscape={toEscape(layer, close, openPalette)}
        onOpenFile={openFile}
        onShortcuts={openShortcuts}
      />
    );
  }

  return <ShortcutSheet onClose={close} />;
};

export { CommandLayer };
