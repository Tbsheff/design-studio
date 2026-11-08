import { VARIATION_BRIEF_MAX } from "@design-studio/contracts";
import type { VariationBrief } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

const TITLE_MAX = 40;

const REMOVE_TIP = "Remove";

const KEEP_TIP = "Keep at least 2 directions";

interface BriefPatch {
  readonly title?: string;
  readonly brief?: string;
}

interface BriefRowProps {
  readonly brief: VariationBrief;
  readonly index: number;
  readonly isBusy: boolean;
  readonly canRemove: boolean;
  readonly onEdit: (index: number, patch: BriefPatch) => void;
  readonly onRemove: (index: number) => void;
}

const toRemoveTip = (canRemove: boolean): string => {
  if (canRemove) {
    return REMOVE_TIP;
  }

  return KEEP_TIP;
};

const BriefRow = ({
  brief,
  index,
  isBusy,
  canRemove,
  onEdit,
  onRemove,
}: BriefRowProps): ReactElement => {
  const onTitleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void =>
      onEdit(index, { title: event.target.value }),
    [onEdit, index]
  );

  const onBriefChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void =>
      onEdit(index, { brief: event.target.value }),
    [onEdit, index]
  );

  const onRemoveClick = useCallback(
    (): void => onRemove(index),
    [onRemove, index]
  );

  return (
    <li className="variation-brief-row">
      <span className="badge accent" aria-hidden="true">
        {brief.label}
      </span>
      <div className="variation-brief-fields">
        <input
          className="variation-brief-title"
          aria-label={`Direction ${brief.label} name`}
          value={brief.title}
          maxLength={TITLE_MAX}
          disabled={isBusy}
          onChange={onTitleChange}
        />
        <textarea
          className="variation-brief-text"
          aria-label={`Direction ${brief.label} brief`}
          value={brief.brief}
          rows={2}
          maxLength={VARIATION_BRIEF_MAX}
          disabled={isBusy}
          onChange={onBriefChange}
        />
      </div>
      <button
        type="button"
        className="icon-btn small"
        aria-label={`Remove direction ${brief.label}`}
        data-tip={toRemoveTip(canRemove)}
        disabled={isBusy || !canRemove}
        onClick={onRemoveClick}
      >
        <Icon name="close" size={14} />
      </button>
    </li>
  );
};

export { BriefRow };

export type { BriefPatch };
