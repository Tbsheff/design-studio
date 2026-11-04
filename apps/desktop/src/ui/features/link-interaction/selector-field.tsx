import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { UiSelect } from "./deps.js";
import type { LinkAction, PrototypeLink } from "./deps.js";
import {
  selectorOf,
  visibilityOf,
  visibilityOptions,
} from "./interaction-model.js";
import { PickButton } from "./pick-button.js";
import { TextCommitField } from "./text-commit-field.js";
import type { Interaction } from "./use-link-interaction.js";

interface SelectorFieldProps {
  readonly action: LinkAction;
  readonly interaction: Interaction;
  readonly link: PrototypeLink;
}

const isSelector = (text: string): boolean => text.trim() !== "";

const SelectorField = ({
  action,
  interaction,
  link,
}: SelectorFieldProps): ReactElement => (
  <>
    <TextCommitField
      isValid={isSelector}
      label={copy.target}
      placeholder={copy.targetHint}
      size="target"
      type="text"
      value={selectorOf(link.to) ?? ""}
      onCommit={interaction.handleTarget}
    />
    <PickButton interaction={interaction} />
    {action === "toggle" && (
      <UiSelect
        aria-label={copy.visibility}
        options={visibilityOptions}
        value={visibilityOf(link.to)}
        onChange={interaction.handleVisibility}
      />
    )}
  </>
);

export { SelectorField };

export type { SelectorFieldProps };
