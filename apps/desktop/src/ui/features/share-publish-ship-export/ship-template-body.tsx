import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";

interface Props {
  value: string;
  onChange: (bodyTemplate: string) => void;
}

const BODY_ROWS = 5;

const PLACEHOLDER_HELP =
  "{user} {slug} {issue} (lower case) {ISSUE} (as typed) {title} {summary} {versions} {files}";

const ShipTemplateBody = ({ onChange, value }: Props): ReactElement => {
  const change = useCallback(
    (changeEvent: ChangeEvent<HTMLTextAreaElement>): void => {
      onChange(changeEvent.target.value);
    },
    [onChange]
  );

  return (
    <label className="field">
      <span>{copy.pullRequestBodyTemplate}</span>
      <textarea
        className="mono"
        rows={BODY_ROWS}
        value={value}
        spellCheck={false}
        onChange={change}
      />
      <small className="field-help">
        {copy.placeholders} {PLACEHOLDER_HELP}
        {copy.aLineWhosePlaceholders}
      </small>
    </label>
  );
};

export { ShipTemplateBody };
