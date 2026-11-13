import { useMemo } from "react";
import type { ReactElement } from "react";

import type { FrameMenuGroupRow } from "./frame-menu-groups-model.js";
import { FrameMenuItemButton } from "./frame-menu-item.js";
import type { FrameMenuEntry } from "./frame-menu-item.js";
import { FrameSubmenu } from "./frame-submenu.js";
import type { PreviewMenuItem } from "./preview-menu-model.js";
import { PreviewSubmenuRow } from "./preview-submenu-row.js";
import { useMenuItemRefs } from "./use-menu-item-refs.js";

interface FrameMenuGroupItemProps {
  readonly close: (refocus: boolean) => void;
  readonly row: FrameMenuGroupRow;
}

const runNothing = (): null => null;

const toBlockedReason = (row: FrameMenuGroupRow): string | null => {
  const reasons = row.entries.map((entry) => entry.disabled ?? "");

  if (reasons.every(Boolean)) {
    return reasons[0] ?? null;
  }

  return null;
};

const FrameMenuGroupItem = ({
  close,
  row,
}: FrameMenuGroupItemProps): ReactElement => {
  const { entries, group } = row;
  const { bind } = useMenuItemRefs();
  const blocked = toBlockedReason(row);

  const item = useMemo(
    (): PreviewMenuItem => ({
      icon: group.icon,
      id: group.id,
      label: group.label,
      run: runNothing,
      submenu: (
        <FrameSubmenu close={close} entries={entries} label={group.label} />
      ),
    }),
    [close, entries, group]
  );

  const blockedEntry = useMemo((): FrameMenuEntry | null => {
    if (blocked === null) {
      return null;
    }

    return { ...group, disabled: blocked, run: runNothing };
  }, [blocked, group]);

  if (blockedEntry) {
    return <FrameMenuItemButton entry={blockedEntry} close={close} />;
  }

  return <PreviewSubmenuRow item={item} bindRef={bind} />;
};

export { FrameMenuGroupItem };
