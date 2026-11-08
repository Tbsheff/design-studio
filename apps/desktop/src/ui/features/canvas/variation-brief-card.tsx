import { VARIATION_BRIEF_MAX, VARIATION_MIN } from "@design-studio/contracts";
import type { Project, VariationBrief } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { LEVEL_PRESETS } from "../../../shared/run-levels.js";
import { copy } from "./copy.js";
import { budgetFor, money } from "./use-variations.js";
import type { BriefDraft } from "./use-variations.js";

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
    {Array.from({ length: count }, (_, index) => (
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
      {briefs.map((brief, index) => (
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
              onChange={(e) => onEdit(index, { title: e.target.value })}
            />
            <textarea
              className="variation-brief-text"
              aria-label={`Direction ${brief.label} brief`}
              value={brief.brief}
              rows={2}
              maxLength={VARIATION_BRIEF_MAX}
              disabled={busy}
              onChange={(e) => onEdit(index, { brief: e.target.value })}
            />
          </div>
          <button
            className="icon-btn small"
            aria-label={`Remove direction ${brief.label}`}
            data-tip={canRemove ? "Remove" : "Keep at least 2 directions"}
            disabled={busy || !canRemove}
            onClick={() => onRemove(index)}
          >
            <Icon name="close" size={14} />
          </button>
        </li>
      ))}
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

  return (
    <p className="variation-budget" data-testid="variation-budget">
      {LEVEL_PRESETS[draft.level].label} ·{" "}
      {limited ? (
        <>
          up to {money(budget.perRun ?? 0)} per run ·{" "}
          <strong>{money(budget.total ?? 0)} total</strong>
        </>
      ) : (
        <>no spending limit</>
      )}
      {briefCost > 0 ? ` + ${money(briefCost)} for the briefs` : ""}
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
      brief.brief.trim().length < 12 ||
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

  return (
    <>
      <p className="variation-card-status" role="status">
        {draft.autoStart
          ? `Writing ${draft.count} directions. The runs start when they are ready.`
          : `Writing ${draft.count} different directions…`}
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
          <h2 id="variation-card-title">
            {draft.element ? "Element variants" : "Directions to try"}
          </h2>
          <p className="variation-card-prompt truncate">
            {draft.element
              ? `${count} versions of the ${draft.element.tag}: “${draft.prompt}”`
              : `${count} designs for “${draft.prompt}”`}
          </p>
        </div>
        <button
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
            className="btn small"
            onClick={onSkip}
            disabled={busy || draft.autoStart}
            data-tip={copy.startNowWith}
          >
            Skip review
          </button>
          <button
            className="btn small primary"
            onClick={onStart}
            disabled={busy || draft.loading || briefsInvalid(draft.briefs)}
          >
            {busy ? "Starting…" : `Start ${count} variations`}
          </button>
        </div>
      </footer>
    </section>
  );
};

export { VariationBriefCard };
