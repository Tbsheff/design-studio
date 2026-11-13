import type { ReactElement } from "react";

import { FrameMenuGroupItem } from "./frame-menu-group-item.js";
import type { FrameMenuRow } from "./frame-menu-groups-model.js";
import { FrameMenuItemButton } from "./frame-menu-item.js";

interface FrameMenuRowsProps {
  readonly close: (refocus: boolean) => void;
  readonly rows: readonly FrameMenuRow[];
}

const FrameMenuRows = ({ close, rows }: FrameMenuRowsProps): ReactElement => (
  <>
    {rows.map((row) => {
      if (row.kind === "group") {
        return (
          <FrameMenuGroupItem key={row.group.id} row={row} close={close} />
        );
      }

      return (
        <FrameMenuItemButton
          key={row.entry.id}
          entry={row.entry}
          close={close}
        />
      );
    })}
  </>
);

export { FrameMenuRows };
