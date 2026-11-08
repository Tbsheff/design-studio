import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { ShipInputField } from "./ship-input-field.js";
import type { Draft, Fields } from "./ship-model.js";
import { ShipTextareaField } from "./ship-textarea-field.js";

interface ShipPrFieldsProps {
  readonly fields: Fields;
  readonly onPatch: (next: Partial<Draft>) => void;
}

const BODY_ROWS = 6;

const ShipPrFields = ({ fields, onPatch }: ShipPrFieldsProps): ReactElement => {
  const setTitle = useCallback(
    (title: string): void => {
      onPatch({ title });
    },
    [onPatch]
  );

  const setBody = useCallback(
    (body: string): void => {
      onPatch({ body });
    },
    [onPatch]
  );

  return (
    <>
      <ShipInputField
        label={copy.pullRequestTitle}
        value={fields.title}
        onValue={setTitle}
        isMono={false}
        placeholder={null}
        isWide
      />
      <ShipTextareaField
        label={copy.pullRequestBody}
        value={fields.body}
        rows={BODY_ROWS}
        onValue={setBody}
      />
    </>
  );
};

export { ShipPrFields };
