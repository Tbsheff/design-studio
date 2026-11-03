import { useEffect, useRef } from "react";

import { Palette } from "./palette.js";
import type { CommandLayer as Layer } from "./registry.js";
import { ShortcutSheet } from "./shortcut-sheet.js";

import "./commands.css";

const CommandLayer = ({
  layer,
  onLayer,
}: {
  layer: Layer;
  onLayer: (next: Layer | null) => void;
}) => {
  const opener = useRef<Element | null>(null);

  if (opener.current === null) {
    opener.current = document.activeElement;
  }

  useEffect(
    () => () => {
      const back = opener.current;

      if (
        back instanceof HTMLElement &&
        back.isConnected &&
        document.activeElement === document.body
      ) {
        back.focus({ preventScroll: true });
      }
    },
    []
  );

  if (layer === "palette") {
    return (
      <Palette
        onClose={() => onLayer(null)}
        onShortcuts={() => onLayer("shortcuts")}
      />
    );
  }

  return <ShortcutSheet onClose={() => onLayer(null)} />;
};

export { CommandLayer };
