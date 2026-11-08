import type { Project, SelectionContext } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";

import { budgetFor, money } from "../canvas/use-variations.js";
import { maxVariationsFor } from "../canvas/variations-api.js";
import { copy } from "./copy.js";

interface Props {
  readonly project: Project;
  readonly element: SelectionContext;
  readonly onStart: (note: string, count: number) => void;
  readonly onCancel: () => void;
}

const COUNTS = [2, 3, 4];

const ElementVariantsDialog = ({
  project,
  element,
  onStart,
  onCancel,
}: Props): ReactElement => {
  const max = maxVariationsFor(project.kind);
  const [note, setNote] = useState("");
  const [count, setCount] = useState(Math.min(3, max));
  const noteRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => noteRef.current?.focus(), []);
  const budget = budgetFor(project, project.settings.defaultLevel, count);
  const start = (): void => onStart(note, count);

  return (
    <section
      className="variation-card element-variants"
      role="dialog"
      aria-modal="false"
      aria-labelledby="element-variants-title"
      data-testid="element-variants-dialog"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onCancel();
        }

        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          start();
        }
      }}
    >
      <header className="variation-card-head">
        <div className="variation-card-heading">
          <h2 id="element-variants-title">Try variants</h2>
          <p className="variation-card-prompt">
            Versions of the selected <code>{element.tag}</code> only. The rest
            of the page stays the same.
          </p>
        </div>
        <button
          className="icon-btn small"
          aria-label={copy.close}
          onClick={onCancel}
        >
          <Icon name="close" size={14} />
        </button>
      </header>
      <label className="element-variants-field">
        <span>What to try (optional)</span>
        <textarea
          ref={noteRef}
          rows={2}
          value={note}
          maxLength={2000}
          placeholder={copy.forExampleMoreCompactOr}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      <div
        className="element-variants-count"
        role="radiogroup"
        aria-label={copy.howManyVariants}
      >
        <span>Variants</span>
        {COUNTS.map((value) => {
          const over = value > max;

          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={count === value}
              aria-disabled={over || undefined}
              className={`btn small${count === value ? " primary" : ""}`}
              data-tip={
                over ? `React projects run at most ${max} at a time` : undefined
              }
              onClick={() => !over && setCount(value)}
            >
              {value}
            </button>
          );
        })}
      </div>
      <footer className="variation-card-foot">
        <span className="variation-budget">
          {budget.perRun === null
            ? "No spending limit"
            : `Up to ${money(budget.perRun)} each, ${money(budget.total ?? 0)} total`}
        </span>
        <div className="variation-card-actions">
          <button className="btn small" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn small primary"
            onClick={start}
            data-testid="element-variants-start"
          >
            Start {count} variants
          </button>
        </div>
      </footer>
    </section>
  );
};

export { ElementVariantsDialog };
