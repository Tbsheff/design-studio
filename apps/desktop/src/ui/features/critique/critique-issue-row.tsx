import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { IssueView } from "./critique-model.js";

interface IssueRowProps {
  readonly issue: IssueView;
  readonly onSelect: (selector: string) => void;
}

const CritiqueIssueRow = ({ issue, onSelect }: IssueRowProps): ReactElement => {
  const { selector } = issue;

  const handleSelect = useCallback(() => {
    if (selector !== null) {
      onSelect(selector);
    }
  }, [onSelect, selector]);

  return (
    <li className="review-row">
      <button
        aria-label={`${copy.severity[issue.severity]}: ${issue.message}`}
        className="review-target"
        data-tip={copy.select}
        disabled={selector === null}
        onClick={handleSelect}
        type="button"
      >
        <span aria-hidden="true" className={`review-sev ${issue.severity}`} />
        <span className="truncate">{issue.message}</span>
      </button>
      <p className="review-msg">{issue.fix}</p>
    </li>
  );
};

export { CritiqueIssueRow };
