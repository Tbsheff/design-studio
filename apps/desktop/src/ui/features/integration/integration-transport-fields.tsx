import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { IntegrationField } from "./integration-field.js";
import type { IntegrationDraft } from "./integration-model.js";

interface IntegrationTransportFieldsProps {
  readonly draft: IntegrationDraft;
  readonly onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

const IntegrationTransportFields = ({
  draft,
  onChange,
}: IntegrationTransportFieldsProps): ReactElement => {
  if (draft.transport === "http") {
    return (
      <IntegrationField
        isInvalid={false}
        label={copy.urlLabel}
        name="url"
        onChange={onChange}
        placeholder={copy.urlPlaceholder}
        type="text"
        value={draft.url}
      />
    );
  }

  return (
    <>
      <IntegrationField
        isInvalid={false}
        label={copy.commandLabel}
        name="command"
        onChange={onChange}
        placeholder={copy.commandPlaceholder}
        type="text"
        value={draft.command}
      />
      <IntegrationField
        isInvalid={false}
        label={copy.argsLabel}
        name="args"
        onChange={onChange}
        placeholder={copy.argsPlaceholder}
        type="text"
        value={draft.args}
      />
    </>
  );
};

export { IntegrationTransportFields };
