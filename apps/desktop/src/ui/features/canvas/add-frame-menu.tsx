import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { AddFrameItem } from "./add-frame-item.js";
import { AddScreenItem } from "./add-screen-item.js";
import { FRAME_PRESETS } from "./canvas-frame-ops.js";
import { copy } from "./copy.js";
import { useAddFrameMenu } from "./use-add-frame-menu.js";

const toAddTip = (isOpen: boolean, isDisabled: boolean): string => {
  if (isOpen) {
    return "";
  }

  if (isDisabled) {
    return "Frame limit reached";
  }

  return "Add frame";
};

const AddFrameMenu = ({
  disabled,
  onAdd,
}: {
  disabled: boolean;
  onAdd: (size: { width: number; height: number }) => void;
}): ReactElement => {
  const {
    button,
    handleKeyDown,
    menu,
    open,
    openScreen,
    pick,
    screenLabel,
    toggle,
  } = useAddFrameMenu(onAdd);

  return (
    <div className="add-frame">
      <button
        ref={button}
        type="button"
        className="icon-btn"
        aria-label={copy.addFrame}
        aria-haspopup="menu"
        aria-expanded={open}
        data-tip={toAddTip(open, disabled) || null}
        disabled={disabled}
        onClick={toggle}
      >
        <Icon name="frame" />
      </button>
      {open && (
        <div
          ref={menu}
          className="project-menu canvas-menu"
          role="menu"
          tabIndex={-1}
          aria-label={copy.addFrame}
          onKeyDown={handleKeyDown}
        >
          {FRAME_PRESETS.map((framePreset) => (
            <AddFrameItem
              key={framePreset.preset}
              preset={framePreset}
              pick={pick}
            />
          ))}
          <AddScreenItem label={screenLabel} onPick={openScreen} />
        </div>
      )}
    </div>
  );
};

export { AddFrameMenu };
