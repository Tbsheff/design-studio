import { useCallback, useId } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { UiSelect } from "./deps.js";
import type { PrototypeLink } from "./deps.js";
import { TextCommitField } from "./text-commit-field.js";
import type { Interaction } from "./use-link-interaction.js";
import { useVariableDraft } from "./use-variable-draft.js";
import { useVariableNames } from "./use-variable-names.js";
import {
  isVariableName,
  isVariableValue,
  variableOptions,
} from "./variable-model.js";
import { VariableNames } from "./variable-names.js";

interface VariableFieldProps {
  readonly interaction: Interaction;
  readonly link: PrototypeLink;
  readonly projectId: string;
}

const VariableField = ({
  interaction,
  link,
  projectId,
}: VariableFieldProps): ReactElement => {
  const listId = useId();
  const names = useVariableNames(projectId);

  const { handleName, handleOp, handleValue, shown } = useVariableDraft(
    link,
    interaction
  );

  const isValue = useCallback(
    (text: string): boolean => isVariableValue(shown.op, text),
    [shown.op]
  );

  return (
    <>
      <TextCommitField
        isValid={isVariableName}
        label={copy.variableName}
        list={listId}
        placeholder={copy.variableNameHint}
        size="name"
        type="text"
        value={shown.name}
        onCommit={handleName}
      />
      <VariableNames id={listId} names={names} />
      <UiSelect
        aria-label={copy.operation}
        options={variableOptions}
        value={shown.op}
        onChange={handleOp}
      />
      {shown.op !== "toggle" && (
        <TextCommitField
          isValid={isValue}
          label={copy.variableValue}
          placeholder={copy.variableValueHint}
          size="value"
          type="text"
          value={shown.value}
          onCommit={handleValue}
        />
      )}
    </>
  );
};

export { VariableField };

export type { VariableFieldProps };
