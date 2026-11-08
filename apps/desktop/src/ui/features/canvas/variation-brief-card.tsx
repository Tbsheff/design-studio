import { VARIATION_BRIEF_MAX, VARIATION_MIN } from "@design-studio/contracts";
import type { Project, VariationBrief } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import type { ReactElement, ReactNode } from "react";

import { LEVEL_PRESETS } from "../../../shared/run-levels.js";
import { copy } from "./copy.js";
import { budgetFor, money } from "./use-variations.js";
import type { BriefDraft } from "./use-variations.js";

const LENGTH_12 = 12;

interface Props {
  project: Project;
  draft: BriefDraft;
  onEdit: (index: number, patch: { title?: string; brief?: string }) => void;
  onRemove: (index: number) => void;
  onStart: () => void;
  onSkip: () => void;
  onDismiss: () => void;
}

const BriefSkeleton = ({ count }: { count: number }): ReactElement => (
  <ol className="variation-briefs" aria-busy="true">
    {Array.from({ length: count }, (value, index) => (
      <li key={index} className="variation-brief-row skeleton">
        <span className="badge">{"ABCD"[index]}</span>
        <span className="skeleton-lines" aria-hidden="true">
          <span />
          <span />
        </span>
      </li>
    ))}
  </ol>
);

const BriefRows = ({
  briefs,
  busy,
  onEdit,
  onRemove,
}: {
  briefs: VariationBrief[];
  busy: boolean;
  onEdit: Props["onEdit"];
  onRemove: Props["onRemove"];
}): ReactElement => {
  const canRemove = briefs.length > VARIATION_MIN;

  return (
    <ol className="variation-briefs">
      {briefs.map((brief, index) => {
        let datatip: "Remove" | "Keep at least 2 directions" =
          "Keep at least 2 directions";

        if (canRemove) {
          datatip = "Remove";
        }

        return (
          <li key={brief.label + index} className="variation-brief-row">
            <span className="badge accent" aria-hidden="true">
              {brief.label}
            </span>
            <div className="variation-brief-fields">
              <input
                className="variation-brief-title"
                aria-label={`Direction ${brief.label} name`}
                value={brief.title}
                maxLength={40}
                disabled={busy}
                onChange={(event) =>
                  onEdit(index, { title: event.target.value })
                }
              />
              <textarea
                className="variation-brief-text"
                aria-label={`Direction ${brief.label} brief`}
                value={brief.brief}
                rows={2}
                maxLength={VARIATION_BRIEF_MAX}
                disabled={busy}
                onChange={(eventValue) =>
                  onEdit(index, { brief: eventValue.target.value })
                }
              />
            </div>
            <button
              type="button"
              className="icon-btn small"
              aria-label={`Remove direction ${brief.label}`}
              data-tip={datatip}
              disabled={busy || !canRemove}
              onClick={() => onRemove(index)}
            >
              <Icon name="close" size={14} />
            </button>
          </li>
        );
      })}
    </ol>
  );
};

const BudgetLine = ({
  project,
  draft,
  count,
}: {
  project: Project;
  draft: BriefDraft;
  count: number;
}): ReactElement => {
  const budget = budgetFor(project, draft.level, count);
  const briefCost = draft.result?.costUsd ?? 0;
  const limited = budget.perRun !== null && budget.total !== null;

  let content: ReactNode = <>{copy.noSpendingLimit}</>;

  if (limited) {
    content = (
      <>
        {copy.upTo}
        {money(budget.perRun ?? 0)}
        {copy.perRun}{" "}
        <strong>
          {money(budget.total ?? 0)}
          {copy.total}
        </strong>
      </>
    );
  }

  let content4 = "";

  if (briefCost > 0) {
    content4 = ` + ${money(briefCost)} for the briefs`;
  }

  return (
    <p className="variation-budget" data-testid="variation-budget">
      {LEVEL_PRESETS[draft.level].label}
      {copy.middot} {content}
      {content4}
    </p>
  );
};

const briefsInvalid = (briefs: VariationBrief[] | null): boolean => {
  if (!briefs) {
    return true;
  }

  return briefs.some(
    (brief) =>
      !brief.title.trim() ||
      brief.brief.trim().length < LENGTH_12 ||
      brief.brief.length > VARIATION_BRIEF_MAX
  );
};

const CardBody = ({
  draft,
  onEdit,
  onRemove,
}: Pick<Props, "draft" | "onEdit" | "onRemove">): ReactElement | null => {
  if (draft.briefs) {
    return (
      <BriefRows
        briefs={draft.briefs}
        busy={draft.starting}
        onEdit={onEdit}
        onRemove={onRemove}
      />
    );
  }

  if (!draft.loading) {
    return null;
  }

  let content2 = `Writing ${draft.count} different directions…`;

  if (draft.autoStart) {
    content2 = `Writing ${draft.count} directions. The runs start when they are ready.`;
  }

  return (
    <>
      <p className="variation-card-status" role="status">
        {content2}
      </p>
      <BriefSkeleton count={draft.count} />
    </>
  );
};

const VariationBriefCard = ({
  project,
  draft,
  onEdit,
  onRemove,
  onStart,
  onSkip,
  onDismiss,
}: Props): ReactElement => {
  const count = draft.briefs?.length ?? draft.count;
  const busy = draft.starting;

  let content3: "Element variants" | "Directions to try" = "Directions to try";

  if (draft.element) {
    content3 = "Element variants";
  }

  let content5 = `${count} designs for “${draft.prompt}”`;

  if (draft.element) {
    content5 = `${count} versions of the ${draft.element.tag}: “${draft.prompt}”`;
  }

  let content6 = `Start ${count} variations`;

  if (busy) {
    content6 = "Starting…";
  }

  return (
    <section
      className="variation-card"
      role="dialog"
      aria-modal="false"
      aria-labelledby="variation-card-title"
      data-testid="variation-brief-card"
    >
      <header className="variation-card-head">
        <div
          className="variation-card-heading"
          data-tip={draft.prompt}
          data-tip-align="start"
        >
          <h2 id="variation-card-title">{content3}</h2>
          <p className="variation-card-prompt truncate">{content5}</p>
        </div>
        <button
          type="button"
          className="icon-btn small"
          aria-label={copy.closeDirections}
          onClick={onDismiss}
          disabled={busy}
        >
          <Icon name="close" size={14} />
        </button>
      </header>
      <CardBody draft={draft} onEdit={onEdit} onRemove={onRemove} />
      {draft.result?.error && (
        <p className="alert inline variation-card-note">{draft.result.error}</p>
      )}
      {draft.error && (
        <p className="alert error variation-card-note" role="alert">
          {draft.error}
        </p>
      )}
      <footer className="variation-card-foot">
        <BudgetLine project={project} draft={draft} count={count} />
        <div className="variation-card-actions">
          <button
            type="button"
            className="btn small"
            onClick={onSkip}
            disabled={busy || draft.autoStart}
            data-tip={copy.startNowWith}
          >
            {copy.skipReview}
          </button>
          <button
            type="button"
            className="btn small primary"
            onClick={onStart}
            disabled={busy || draft.loading || briefsInvalid(draft.briefs)}
          >
            {content6}
          </button>
        </div>
      </footer>
    </section>
  );
};

export { VariationBriefCard };
