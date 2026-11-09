import { useCallback, useId } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { PrototypeLink } from "./deps.js";
import { TextCommitField } from "./text-commit-field.js";
import type { Interaction } from "./use-link-interaction.js";
import { useVariableNames } from "./use-variable-names.js";
import { isVariableName, whenChange, whenDraftOf } from "./variable-model.js";
import { VariableNames } from "./variable-names.js";

interface WhenFieldProps {
  readonly interaction: Interaction;
  readonly link: PrototypeLink;
  readonly projectId: string;
}

const isNameOrEmpty = (text: string): boolean =>
  text.trim() === "" || isVariableName(text);

const isFilled = (text: string): boolean => text !== "";

const WhenField = ({
  interaction,
  link,
  projectId,
}: WhenFieldProps): ReactElement => {
  const listId = useId();
  const names = useVariableNames(projectId);
  const shown = whenDraftOf(link);
  const { handleSend } = interaction;

  const send = useCallback(
    (next: { readonly name: string; readonly value: string }): void => {
      const change = whenChange(next);

      if (change) {
        handleSend(change);
      }
    },
    [handleSend]
  );

  const handleName = useCallback(
    (name: string): void => send({ ...shown, name }),
    [send, shown]
  );

  const handleValue = useCallback(
    (value: string): void => send({ ...shown, value }),
    [send, shown]
  );

  return (
    <span className="proto-when" data-testid="link-when">
      <span className="proto-unit">{copy.onlyWhen}</span>
      <TextCommitField
        isValid={isNameOrEmpty}
        label={copy.whenName}
        list={listId}
        placeholder={copy.variableNameHint}
        size="name"
        type="text"
        value={shown.name}
        onCommit={handleName}
      />
      <VariableNames id={listId} names={names} />
      <span className="proto-unit">{copy.whenEqualsSign}</span>
      <TextCommitField
        isValid={isFilled}
        label={copy.whenEquals}
        placeholder={copy.variableValueHint}
        size="value"
        type="text"
        value={shown.value}
        onCommit={handleValue}
      />
    </span>
  );
};

export { WhenField };

export type { WhenFieldProps };
