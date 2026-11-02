import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { DelayField } from "./delay-field.js";
import { UiSelect } from "./deps.js";
import type { LinkTriggerKind, PrototypeLink } from "./deps.js";
import { triggerOf, triggerOptions } from "./interaction-model.js";
import { KeyButton } from "./key-button.js";
import type { Interaction } from "./use-link-interaction.js";

interface TriggerFieldProps {
  readonly interaction: Interaction;
  readonly link: PrototypeLink;
}

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
        options={triggerOptions}
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
