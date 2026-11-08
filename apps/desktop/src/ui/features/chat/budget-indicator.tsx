import type { Project, ProjectSettings } from "@design-studio/contracts";
import { useCallback, useState, startTransition } from "react";
import type { MouseEvent, ReactElement } from "react";

import { api, errorText } from "../../api.js";
import { limitLabel, money } from "./budget-limit-model.js";
import { BudgetMenu } from "./budget-menu.js";

interface Props {
  projectId: string;
  settings: ProjectSettings;
  onSaved: (project: Project) => void;
}

interface PendingLimit {
  readonly value: number | null;
}

const stopMouseDown = (event: MouseEvent<HTMLElement>): void =>
  event.stopPropagation();

const toTip = (current: number | null): string => {
  if (current === null) {
    return "No spending limit per run. Click to set one.";
  }

  return `Each run stops at ${money(current)}. Click to change.`;
};

const BudgetIndicator = ({
  projectId,
  settings,
  onSaved,
}: Props): ReactElement => {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<PendingLimit | null>(null);
  const [error, setError] = useState<string | null>(null);
  let current = settings.maxBudgetUsd;

  if (pending !== null) {
    current = pending.value;
  }

  const handleSave = useCallback(
    (value: number | null): void => {
      setPending({ value });
      setError(null);
      startTransition(async () => {
        try {
          const project = await api.updateSettings(projectId, {
            maxBudgetUsd: value,
          });

          onSaved(project);
          setPending(null);
          setOpen(false);
        } catch (thrownError: unknown) {
          setPending(null);
          setError(errorText(thrownError));
        }
      });
    },
    [projectId, onSaved]
  );

  const handleToggle = useCallback(() => setOpen((wasOpen) => !wasOpen), []);
  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <span className="budget-ind-wrap">
      <button
        type="button"
        className="skills-ind budget-ind"
        data-testid="budget-indicator"
        aria-expanded={open}
        aria-haspopup="menu"
        data-tip-side="top"
        data-tip-align="end"
        data-tip={toTip(current)}
        onMouseDown={stopMouseDown}
        onClick={handleToggle}
      >
        {limitLabel(current)}
      </button>
      {open && (
        <BudgetMenu
          current={current}
          error={error}
          onPick={handleSave}
          onClose={handleClose}
        />
      )}
    </span>
  );
};

export { BudgetIndicator };
