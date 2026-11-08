import { useRef } from "react";
import type { ReactElement } from "react";

import { MODEL_FOCUS } from "./composer-menu-model.js";
import type { ModelPillProps } from "./composer-menu-model.js";
import { ComposerPill } from "./composer-pill.js";
import { copy } from "./copy.js";
import { ModelName } from "./model-name.js";
import { ModelPopover } from "./model-popover.js";
import { MODEL_OPTIONS } from "./settings-draft-model.js";
import { effectiveModel, shortModel } from "./slash-groups.js";
import { useFocusOnOpen } from "./use-focus-on-open.js";
import { useMenuToggle } from "./use-menu-toggle.js";
import { usePlacedPopover } from "./use-placed-popover.js";

const MODEL_SIZES = MODEL_OPTIONS.map((option) => ({
  key: option.id,
  node: <ModelName name={shortModel(option.id)} />,
}));

const ModelPill = ({
  model,
  level,
  effort,
  onModel,
  onOpen,
}: ModelPillProps): ReactElement => {
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDialogElement>(null);
  const pop = usePlacedPopover(trigger, panel);
  const onToggle = useMenuToggle(pop, onOpen ?? null);
  const shown = effectiveModel(model, level);
  useFocusOnOpen(pop.open, panel, MODEL_FOCUS);

  return (
    <>
      <ComposerPill
        trigger={trigger}
        variant="model"
        label={copy.model}
        ariaLabel={`Model: ${shortModel(shown)}`}
        isOpen={pop.open}
        sizes={MODEL_SIZES}
        onToggle={onToggle}
      >
        <ModelName name={shortModel(shown)} />
      </ComposerPill>
      <ModelPopover
        panel={panel}
        pop={pop}
        shown={shown}
        level={level}
        isLocked={shown !== model}
        effort={effort}
        onModel={onModel}
      />
    </>
  );
};

export { ModelPill };
