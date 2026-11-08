import type { PackSummary } from "@design-studio/contracts";
import type { ReactElement, RefObject } from "react";

import { ChipActions } from "./chip-actions.js";
import { ChipFoot } from "./chip-foot.js";
import { ChipHead } from "./chip-head.js";
import type { ChipDialog, TokenLoad } from "./chip-model.js";
import { COPY } from "./copy.js";
import { TokenList } from "./token-list.js";

const ChipPopover = ({
  load,
  name,
  onClose,
  onOpenDesignMd,
  onOpenDialog,
  pack,
  popoverRef,
}: {
  load: TokenLoad;
  name: string;
  onClose: (shouldRefocus: boolean) => void;
  onOpenDesignMd: () => void;
  onOpenDialog: (dialog: ChipDialog) => void;
  pack: PackSummary | null;
  popoverRef: RefObject<HTMLDialogElement | null>;
}): ReactElement => (
  <dialog
    open
    ref={popoverRef}
    className="ds-popover"
    aria-label={COPY.labelDesignSystem}
  >
    <ChipHead name={name} pack={pack} />
    <ChipActions onOpen={onOpenDialog} />
    <div className="ds-body">
      <TokenList load={load} />
    </div>
    <ChipFoot onClose={onClose} onOpenDesignMd={onOpenDesignMd} />
  </dialog>
);

export { ChipPopover };
