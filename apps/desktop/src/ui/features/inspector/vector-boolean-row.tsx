import { useCallback } from "react";
import type { ReactElement } from "react";

import { BOOLEAN_OPS } from "../../../shared/vector.js";
import type { BooleanOpName } from "../../../shared/vector.js";
import { copy } from "./copy.js";
import { InspectorSection } from "./inspector-fields.js";
import { useVectorRun } from "./use-vector-run.js";
import { BooleanButton } from "./vector-boolean-button.js";
import { VectorError } from "./vector-error.js";
import { toInsertTarget } from "./vector-model.js";
import type { VectorProps } from "./vector-model.js";

const VectorBooleanRow = ({
  props,
}: {
  readonly props: VectorProps;
}): ReactElement | null => {
  const { failureText, isPending, submit } = useVectorRun(
    props.projectId,
    props.directionId
  );

  const [first, second] = props.selection;

  const run = useCallback(
    (op: BooleanOpName): void => {
      if (!first || !second) {
        return;
      }

      submit(
        {
          boolean: op,
          op: "boolean",
          rects: [first.rect, second.rect],
          targets: [toInsertTarget(first), toInsertTarget(second)],
        },
        null
      );
    },
    [first, second, submit]
  );

  return (
    <InspectorSection title={copy.boolean}>
      <fieldset className="segmented icons vector-boolean">
        <legend className="sr-only">{copy.boolean}</legend>
        {BOOLEAN_OPS.map((op) => (
          <BooleanButton
            key={op}
            op={op}
            isDisabled={isPending || !props.isEditable}
            onRun={run}
          />
        ))}
      </fieldset>
      <VectorError text={failureText} />
    </InspectorSection>
  );
};

export { VectorBooleanRow };
