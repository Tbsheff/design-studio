import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { DelayField } from "./delay-field.js";
import { Icon, UiSelect } from "./deps.js";
import type { LinkTriggerKind, PrototypeLink, UiSelectOption } from "./deps.js";
import { triggerOf, triggerOptions } from "./interaction-model.js";
import { KeyButton } from "./key-button.js";
import type { Interaction } from "./use-link-interaction.js";

interface TriggerFieldProps {
  readonly interaction: Interaction;
  readonly link: PrototypeLink;
}

const SWIPE_ICONS = {
  "swipe-down": "arrowDown",
  "swipe-left": "arrowLeft",
  "swipe-right": "arrowRight",
  "swipe-up": "arrowUp",
} as const;

const ICON_SIZE = 12;

const toOption = (
  option: UiSelectOption<LinkTriggerKind>
): UiSelectOption<LinkTriggerKind> => {
  if (option.value in SWIPE_ICONS) {
    const name = SWIPE_ICONS[option.value as keyof typeof SWIPE_ICONS];

    return { ...option, icon: <Icon name={name} size={ICON_SIZE} /> };
  }

  return option;
};

const iconOptions = triggerOptions.map((option) => toOption(option));

const shownTrigger = (
  link: PrototypeLink,
  interaction: Interaction
): LinkTriggerKind => {
  if (interaction.pending.kind === "key") {
    return "key";
  }

  return triggerOf(link);
};

const TriggerField = ({
  interaction,
  link,
}: TriggerFieldProps): ReactElement => {
  const shown = shownTrigger(link, interaction);

  return (
    <>
      <UiSelect
        aria-label={copy.trigger}
        options={iconOptions}
        value={shown}
        onChange={interaction.handleTrigger}
      />
      {shown === "delay" && (
        <DelayField interaction={interaction} link={link} />
      )}
      {shown === "key" && <KeyButton interaction={interaction} link={link} />}
    </>
  );
};

export { TriggerField };

export type { TriggerFieldProps };
