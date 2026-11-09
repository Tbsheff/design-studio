import { useCallback } from "react";
import type { MouseEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { PaletteError } from "./palette-error.js";
import { PaletteFoot } from "./palette-foot.js";
import { PaletteList } from "./palette-list.js";
import { PaletteSearch } from "./palette-search.js";
import type { OpenTarget } from "./use-file-rows.js";
import { usePalette } from "./use-palette.js";

const toSearchLabel = (isFiles: boolean): string => {
  if (isFiles) {
    return copy.filesInput;
  }

  return copy.paletteInput;
};

const Palette = ({
  isFiles,
  isProjectsOnly,
  onClose,
  onEscape,
  onOpenFile,
  onShortcuts,
}: {
  readonly isFiles: boolean;
  readonly isProjectsOnly: boolean;
  readonly onClose: () => void;
  readonly onEscape: () => void;
  readonly onOpenFile: (target: OpenTarget) => void;
  readonly onShortcuts: () => void;
}): ReactElement => {
  const palette = usePalette({
    isFiles,
    isProjectsOnly,
    onClose,
    onEscape,
    onOpenFile,
    onShortcuts,
  });

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
          label={toSearchLabel(isFiles)}
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
          isFiles={isFiles}
          onHover={setActive}
          onRun={runRow}
        />
        <PaletteFoot />
      </dialog>
    </div>
  );
};

export { Palette };
