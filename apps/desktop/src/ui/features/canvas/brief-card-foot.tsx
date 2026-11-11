import { VARIATION_BRIEF_MAX } from "@design-studio/contracts";
import type { VariationBrief } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { CostLine } from "./cost-line.js";
import type { BriefDraft } from "./use-variations.js";

const MIN_BRIEF_LENGTH = 12;

interface CardFootProps {
  readonly draft: BriefDraft;
  readonly count: number;
  readonly onStart: () => void;
  readonly onSkip: () => void;
}

const isBriefInvalid = (brief: VariationBrief): boolean =>
  !brief.title.trim() ||
  brief.brief.trim().length < MIN_BRIEF_LENGTH ||
  brief.brief.length > VARIATION_BRIEF_MAX;

const isBriefsInvalid = (briefs: VariationBrief[] | null): boolean => {
  if (!briefs) {
    return true;
  }

  return briefs.some((brief) => isBriefInvalid(brief));
};

const toStartLabel = (isBusy: boolean, count: number): string => {
  if (isBusy) {
    return "Starting…";
  }

  return `Start ${count} variations`;
};

const BriefCardFoot = ({
  draft,
  count,
  onStart,
  onSkip,
}: CardFootProps): ReactElement => {
  const isBusy = draft.starting;

  return (
    <footer className="variation-card-foot">
      <CostLine draft={draft} />
      <div className="variation-card-actions">
        <button
          type="button"
          className="btn small"
          onClick={onSkip}
          disabled={isBusy || draft.autoStart}
          data-tip={copy.startNowWith}
        >
          {copy.skipReview}
        </button>
        <button
          type="button"
          className="btn small primary"
          onClick={onStart}
          disabled={isBusy || draft.loading || isBriefsInvalid(draft.briefs)}
        >
          {toStartLabel(isBusy, count)}
        </button>
      </div>
    </footer>
  );
};

export { BriefCardFoot };
