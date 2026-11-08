import type { Project, ProjectSettings } from "@design-studio/contracts";
import { useEffect, useRef, useState, startTransition } from "react";
import type { FormEvent, ReactElement } from "react";

import { api, errorText } from "../../api.js";
import { copy } from "./copy.js";

const PRESETS: (number | null)[] = [null, 0.5, 1, 2, 5];

const money = (value: number): string =>
  Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`;

const limitLabel = (value: number | null): string =>
  value === null ? "No limit" : money(value);

const parseLimit = (raw: string): number | null | "bad" => {
  const text = raw.trim().replace(/^\$/u, "");

  if (text === "") {
    return null;
  }

  const value = Number(text);

  return Number.isFinite(value) && value >= 0.01 && value <= 50
    ? Math.round(value * 100) / 100
    : "bad";
};

interface Props {
  projectId: string;
  settings: ProjectSettings;
  onSaved: (project: Project) => void;
}

const BudgetIndicator = ({
  projectId,
  settings,
  onSaved,
}: Props): ReactElement => {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<number | null | undefined>();
  const [error, setError] = useState<string | null>(null);
  const current = pending === undefined ? settings.maxBudgetUsd : pending;

  const save = (value: number | null): void => {
    setPending(value);
    setError(null);
    startTransition(async () => {
      try {
        const project = await api.updateSettings(projectId, {
          maxBudgetUsd: value,
        });
        onSaved(project);
        setPending(undefined);
        setOpen(false);
      } catch (thrownError: unknown) {
        setPending(undefined);
        setError(errorText(thrownError));
      }
    });
  };

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
        data-tip={
          current === null
            ? "No spending limit per run. Click to set one."
            : `Each run stops at ${money(current)}. Click to change.`
        }
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => setOpen((x) => !x)}
      >
        {limitLabel(current)}
      </button>
      {open && (
        <BudgetMenu
          current={current}
          error={error}
          onPick={save}
          onClose={() => setOpen(false)}
        />
      )}
    </span>
  );
};

const BudgetMenu = ({
  current,
  error,
  onPick,
  onClose,
}: {
  current: number | null;
  error: string | null;
  onPick: (value: number | null) => void;
  onClose: () => void;
}): ReactElement => {
  const ref = useRef<HTMLDivElement>(null);
  const [custom, setCustom] = useState("");
  const [bad, setBad] = useState(false);
  useEffect(() => {
    const onDown = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("mousedown", onDown);
    globalThis.addEventListener("keydown", onKey);

    return (): void => {
      document.removeEventListener("mousedown", onDown);
      globalThis.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const submit = (e: FormEvent): void => {
    e.preventDefault();
    const value = parseLimit(custom);
    setBad(value === "bad");

    if (value !== "bad") {
      onPick(value);
    }
  };

  return (
    <div
      ref={ref}
      className="ui-menu budget-pop"
      role="menu"
      aria-label={copy.spendingLimitPer}
      data-testid="budget-menu"
    >
      <div className="ui-menu-section">
        <div className="ui-menu-label">Spending limit per run</div>
        {PRESETS.map((value) => (
          <button
            key={value ?? "none"}
            type="button"
            role="menuitemradio"
            aria-checked={current === value}
            className="ui-menu-item"
            onClick={() => onPick(value)}
          >
            {value === null ? "No limit" : money(value)}
          </button>
        ))}
      </div>
      <form className="ui-menu-section budget-custom" onSubmit={submit}>
        <label className="budget-custom-row">
          <span>Other</span>
          <input
            aria-label={copy.otherSpendingLimit}
            inputMode="decimal"
            placeholder={copy.text001To}
            value={custom}
            aria-invalid={bad || undefined}
            onChange={(e) => setCustom(e.target.value)}
          />
        </label>
        <button type="submit" className="btn small">
          Set
        </button>
      </form>
      {(bad || error) && (
        <p className="ui-menu-note budget-error" role="alert">
          {error ?? "Enter $0.01 to $50, or leave it empty for no limit."}
        </p>
      )}
    </div>
  );
};

export { BudgetIndicator };
