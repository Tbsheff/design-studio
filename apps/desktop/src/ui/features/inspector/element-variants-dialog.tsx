import type { Project, SelectionContext } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { budgetFor, money } from "../canvas/use-variations.js";
import { maxVariationsFor } from "../canvas/variations-api.js";
import { ElementVariantsCount } from "./element-variants-count.js";
import { ElementVariantsFoot } from "./element-variants-foot.js";
import { ElementVariantsHead } from "./element-variants-head.js";
import { toBudgetLabel } from "./element-variants-model.js";
import { ElementVariantsNote } from "./element-variants-note.js";
import { useElementVariants } from "./use-element-variants.js";

interface Props {
  readonly project: Project;
  readonly element: SelectionContext;
  readonly onStart: (note: string, count: number) => void;
  readonly onCancel: () => void;
}

const ElementVariantsDialog = ({
  project,
  element,
  onStart,
  onCancel,
}: Props): ReactElement => {
  const max = maxVariationsFor(project.kind);
  const state = useElementVariants(max, onStart, onCancel);
  const budget = budgetFor(project, project.settings.defaultLevel, state.count);

  return (
    <dialog
      open
      className="variation-card element-variants"
      aria-modal="false"
      aria-labelledby="element-variants-title"
      data-testid="element-variants-dialog"
      onKeyDown={state.handleKeyDown}
    >
      <ElementVariantsHead tag={element.tag} onCancel={onCancel} />
      <ElementVariantsNote note={state.note} onNote={state.handleNote} />
      <ElementVariantsCount
        count={state.count}
        max={max}
        onPick={state.handleCount}
      />
      <ElementVariantsFoot
        budgetLabel={toBudgetLabel(budget.perRun, budget.total, money)}
        count={state.count}
        onCancel={onCancel}
        onStart={state.handleStart}
      />
    </dialog>
  );
};

export { ElementVariantsDialog };
