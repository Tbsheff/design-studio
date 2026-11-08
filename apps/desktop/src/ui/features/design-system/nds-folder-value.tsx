import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { toChoice } from "./choose-text.js";
import { COPY } from "./copy.js";

const FolderValue = ({
  isManual,
  value,
  onChange,
}: {
  isManual: boolean;
  value: string;
  onChange: (value: string) => void;
}): ReactElement => {
  const typeValue = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void =>
      onChange(event.target.value),
    [onChange]
  );

  if (isManual) {
    return (
      <input
        placeholder={COPY.placeholderUsersYouCodeApp}
        value={value}
        aria-label={COPY.labelFolderPath}
        onChange={typeValue}
      />
    );
  }

  return (
    <span
      className={toChoice(
        Boolean(value),
        "nds-file truncate ",
        "nds-file truncate muted"
      )}
    >
      {value || COPY.textNoFolderChosen}
    </span>
  );
};

export { FolderValue };
