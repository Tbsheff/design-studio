import type { SelectionContext } from "@design-studio/contracts";
import { useCallback, useMemo, useState } from "react";
import type { ReactElement } from "react";

import type { VectorPaint } from "../../../shared/vector.js";
import { copy } from "./copy.js";
import { InspectorSection } from "./inspector-fields.js";
import { useVectorRun } from "./use-vector-run.js";
import { VectorError } from "./vector-error.js";
import { toInsertTarget, toPaint, toSavedPaint } from "./vector-model.js";
import type { SavedPaint, VectorProps } from "./vector-model.js";
import { VectorPaintGrid } from "./vector-paint-grid.js";

const PaintRows = ({
  props,
  target,
}: {
  readonly props: VectorProps;
  readonly target: SelectionContext;
}): ReactElement => {
  const { failureText, isPending, submit } = useVectorRun(
    props.projectId,
    props.directionId
  );

  const [saved, setSaved] = useState<SavedPaint>({});
  const base = useMemo(() => toPaint(target), [target]);
  const paint = useMemo(() => ({ ...base, ...saved }), [base, saved]);

  const save = useCallback(
    (change: VectorPaint): void => {
      submit({ op: "paint", target: toInsertTarget(target), ...change }, () =>
        setSaved((prev) => ({ ...prev, ...toSavedPaint(change) }))
      );
    },
    [submit, target]
  );

  const saveFill = useCallback((fill: string | null) => save({ fill }), [save]);

  const saveStroke = useCallback(
    (stroke: string | null) => save({ stroke }),
    [save]
  );

  const saveWidth = useCallback(
    (strokeWidth: number | null) => save({ strokeWidth }),
    [save]
  );

  return (
    <InspectorSection title={copy.fillAndStroke} modifier="vector-paint">
      <VectorPaintGrid
        paint={paint}
        isDisabled={isPending || !props.isEditable}
        onFill={saveFill}
        onStroke={saveStroke}
        onWidth={saveWidth}
      />
      <VectorError text={failureText} />
    </InspectorSection>
  );
};

export { PaintRows };
