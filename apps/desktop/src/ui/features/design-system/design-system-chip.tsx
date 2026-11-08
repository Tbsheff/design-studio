import type { ReactElement } from "react";

import { Swatches } from "../inspector/swatches.js";
import { ChipAddButton } from "./chip-add-button.js";
import { ChipDialogs } from "./chip-dialogs.js";
import { toChipName } from "./chip-model.js";
import { ChipPopover } from "./chip-popover.js";
import { ChipTrigger } from "./chip-trigger.js";
import type { DesignSystemActions } from "./design-system-model.js";
import type { DesignSystemRef } from "./design-system-ref.js";
import { findPack, keySwatches, usePacks } from "./packs.js";
import { useChip } from "./use-chip.js";
import { useDesignSystemLoad } from "./use-design-system-load.js";

const SWATCH_MAX = 4;

const DesignSystemChip = ({
  actions,
  onOpenDesignMd,
  system,
}: {
  actions: DesignSystemActions;
  onOpenDesignMd: () => void;
  system: DesignSystemRef;
}): ReactElement | null => {
  const {
    close,
    closeDialog,
    dialog: openedDialog,
    isOpen,
    openChange,
    openDialog,
    popover,
    root,
    toggle,
    trigger,
  } = useChip();

  const { packs } = usePacks();
  const load = useDesignSystemLoad(system, isOpen);
  const pack = findPack(packs, system.packId);
  const name = toChipName(system, pack, load);

  const dialogs = (
    <ChipDialogs
      actions={actions}
      dialog={openedDialog}
      isUserPack={pack?.source === "user"}
      name={name}
      onClose={closeDialog}
      system={system}
    />
  );

  if (!system.directionId) {
    return null;
  }

  if (!system.packId) {
    return (
      <>
        <ChipAddButton onAdd={openChange} />
        {dialogs}
      </>
    );
  }

  return (
    <div className="ds-chip-wrap" ref={root}>
      <ChipTrigger
        isOpen={isOpen}
        name={name}
        onToggle={toggle}
        triggerRef={trigger}
      >
        {pack && (
          <Swatches swatches={keySwatches(pack)} max={SWATCH_MAX} size="sm" />
        )}
      </ChipTrigger>
      {isOpen && (
        <ChipPopover
          load={load}
          name={name}
          onClose={close}
          onOpenDesignMd={onOpenDesignMd}
          onOpenDialog={openDialog}
          pack={pack}
          popoverRef={popover}
        />
      )}
      {dialogs}
    </div>
  );
};

export { DesignSystemChip };
