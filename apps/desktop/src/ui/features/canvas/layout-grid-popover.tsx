import type { CanvasLayoutGrid } from "@design-studio/contracts/layout-grid";
import { Button, usePopover } from "@design-studio/ui";
import { useRef } from "react";
import type { CSSProperties, ReactElement } from "react";

import { layoutGridCopy } from "./copy.js";
import { LayoutGridFields } from "./layout-grid-fields.js";
import { LayoutGridPresets } from "./layout-grid-presets.js";
import { useLayoutGridDraft } from "./use-layout-grid.js";

interface LayoutGridPopoverProps {
  readonly frameWidth: number;
  readonly grid: CanvasLayoutGrid | null;
  readonly isPending: boolean;
  readonly onClose: () => void;
  readonly onSet: (grid: CanvasLayoutGrid | null) => void;
  readonly place: CSSProperties;
}

const toRemoveReason = (grid: CanvasLayoutGrid | null): string | null => {
  if (grid === null) {
    return layoutGridCopy.title;
  }

  return null;
};

const LayoutGridPopover = ({
  frameWidth,
  grid,
  isPending,
  onClose,
  onSet,
  place,
}: LayoutGridPopoverProps): ReactElement => {
  const root = useRef<HTMLDialogElement>(null);

  const { change, commit, draft, pick, remove } = useLayoutGridDraft({
    frameWidth,
    grid,
    setGrid: onSet,
  });

  usePopover(true, root, onClose);

  return (
    <dialog
      ref={root}
      open
      className="ui-popover layout-grid-popover"
      aria-label={layoutGridCopy.title}
      aria-busy={isPending}
      style={place}
    >
      <LayoutGridPresets onPick={pick} />
      <LayoutGridFields draft={draft} onChange={change} onCommit={commit} />
      <Button
        disabledReason={toRemoveReason(grid)}
        isLoading={false}
        label={null}
        onClick={remove}
        size="sm"
        tip={null}
        variant="ghost"
      >
        {layoutGridCopy.remove}
      </Button>
    </dialog>
  );
};

export { LayoutGridPopover };
