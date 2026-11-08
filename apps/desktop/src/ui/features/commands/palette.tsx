import { useCallback } from "react";
import type { MouseEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { PaletteError } from "./palette-error.js";
import { PaletteFoot } from "./palette-foot.js";
import { PaletteList } from "./palette-list.js";
import { PaletteSearch } from "./palette-search.js";
import { usePalette } from "./use-palette.js";

const Palette = ({
  onClose,
  onShortcuts,
}: {
  onClose: () => void;
  onShortcuts: () => void;
}): ReactElement => {
  const palette = usePalette(onClose, onShortcuts);
  const { changeQuery, onKeyDown, runRow, setActive } = palette;

  const closeOnBackdrop = useCallback(
    (event: MouseEvent<HTMLDivElement>): void => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <div
      className="cmdk-backdrop"
      role="presentation"
      onMouseDown={closeOnBackdrop}
    >
      <dialog
        open
        className="cmdk"
        aria-label={copy.palette}
        aria-busy={palette.isBusy}
      >
        <PaletteSearch
          inputRef={palette.inputRef}
          listId={palette.listId}
          activeId={palette.activeId}
          query={palette.query}
          isBusy={palette.isBusy}
          onChange={changeQuery}
          onKeyDown={onKeyDown}
        />
        <PaletteError error={palette.error} />
        <PaletteList
          listRef={palette.listRef}
          listId={palette.listId}
          rows={palette.rows}
          current={palette.current}
          query={palette.query}
          isLoading={palette.isLoading}
          onHover={setActive}
          onRun={runRow}
        />
        <PaletteFoot />
      </dialog>
    </div>
  );
};

export { Palette };
