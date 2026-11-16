import { useCallback, useRef } from "react";
import type { ReactElement } from "react";

import { toDraftsLabel } from "../../domain/draft-counts.js";
import { LEVEL_FOCUS, NO_SIZES } from "./composer-menu-model.js";
import { ComposerPill } from "./composer-pill.js";
import { copy } from "./copy.js";
import { DraftsList } from "./drafts-list.js";
import { MenuPanel } from "./menu-panel.js";
import type { DesignsSetting } from "./run-settings-model.js";
import { useFocusOnOpen } from "./use-focus-on-open.js";
import { useMenuToggle } from "./use-menu-toggle.js";
import { usePlacedPopover } from "./use-placed-popover.js";

const DraftsPill = ({
  designs,
  onOpen,
}: {
  readonly designs: DesignsSetting;
  readonly onOpen: () => void;
}): ReactElement => {
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const menu = usePlacedPopover(trigger, panel);
  const { close } = menu;
  const { disabledReason, onChange } = designs;
  const onToggle = useMenuToggle(menu, onOpen);
  useFocusOnOpen(menu.open, panel, LEVEL_FOCUS);

  const pick = useCallback(
    (count: number): void => {
      onChange(count);
      close(true);
    },
    [close, onChange]
  );

  let shown = designs.value;

  if (disabledReason !== null) {
    shown = 1;
  }

  return (
    <>
      <ComposerPill
        trigger={trigger}
        variant="drafts"
        label={copy.drafts}
        ariaLabel={`${copy.drafts}: ${toDraftsLabel(shown)}`}
        isOpen={menu.open}
        sizes={NO_SIZES}
        onToggle={onToggle}
      >
        {toDraftsLabel(shown)}
      </ComposerPill>
      <MenuPanel
        panel={panel}
        menu={menu}
        menuClass="drafts-menu"
        label={copy.drafts}
      >
        <DraftsList designs={designs} shown={shown} onPick={pick} />
        {disabledReason !== null && (
          <p className="ui-menu-hint">{disabledReason}</p>
        )}
      </MenuPanel>
    </>
  );
};

export { DraftsPill };
