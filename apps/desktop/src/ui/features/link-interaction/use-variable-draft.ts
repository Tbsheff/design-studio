import { useCallback, useMemo, useState } from "react";

import type { LinkVariableOp, PrototypeLink } from "./deps.js";
import type { Interaction } from "./use-link-interaction.js";
import { draftOf, variableChange } from "./variable-model.js";
import type { VariableDraft } from "./variable-model.js";

interface VariableDraftState {
  readonly handleName: (name: string) => void;
  readonly handleOp: (op: LinkVariableOp) => void;
  readonly handleValue: (value: string) => void;
  readonly shown: VariableDraft;
}

const useVariableDraft = (
  link: PrototypeLink,
  interaction: Interaction
): VariableDraftState => {
  const [draft, setDraft] = useState<VariableDraft | null>(null);
  const shown = useMemo(() => draft ?? draftOf(link), [draft, link]);
  const { handleSend } = interaction;

  const commit = useCallback(
    (next: VariableDraft): void => {
      setDraft(next);

      const change = variableChange(next);

      if (change) {
        handleSend(change);
      }
    },
    [handleSend]
  );

  const handleName = useCallback(
    (name: string): void => commit({ ...shown, name }),
    [commit, shown]
  );

  const handleOp = useCallback(
    (op: LinkVariableOp): void => commit({ ...shown, op }),
    [commit, shown]
  );

  const handleValue = useCallback(
    (value: string): void => commit({ ...shown, value }),
    [commit, shown]
  );

  return { handleName, handleOp, handleValue, shown };
};

export { useVariableDraft };

export type { VariableDraftState };
