import { useRef } from "react";
import type { ReactElement, RefObject } from "react";

import { copy } from "./copy.js";
import { MODEL_OPTIONS } from "./home-model.js";
import { ModelOption } from "./model-option.js";
import type { ModelSettings } from "./model-settings-model.js";
import { Pop } from "./pop.js";
import type { Close } from "./pop.js";
import { MENU_ITEMS } from "./popover-focus-model.js";
import { useMenuArrowKeys } from "./use-menu-arrow-keys.js";

interface ModelPopoverProps {
  readonly trigger: RefObject<HTMLElement | null>;
  readonly onClose: Close;
  readonly settings: ModelSettings;
  readonly isClosing: boolean;
}

const ModelPopover = ({
  trigger,
  onClose,
  settings,
  isClosing,
}: ModelPopoverProps): ReactElement => {
  const group = useRef<HTMLDivElement>(null);
  useMenuArrowKeys(group, MENU_ITEMS);

  const { onModel } = settings;

  return (
    <Pop
      trigger={trigger}
      closing={isClosing}
      onClose={onClose}
      variant="home-model-pop"
      label="Model and run settings"
    >
      <div
        ref={group}
        className="ui-menu-section"
        role="radiogroup"
        aria-label={copy.model}
      >
        <span className="ui-menu-label">{copy.model}</span>
        {MODEL_OPTIONS.map((option) => (
          <ModelOption
            key={option.id}
            id={option.id}
            label={option.label}
            isChosen={settings.model === option.id}
            onModel={onModel}
          />
        ))}
      </div>
    </Pop>
  );
};

export { ModelPopover };

export type { ModelPopoverProps };
