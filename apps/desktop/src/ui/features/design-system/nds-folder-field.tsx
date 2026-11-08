import { useCallback } from "react";
import type { ReactElement } from "react";

import { hasNativePicker } from "../../platform/desktop.js";
import { COPY } from "./copy.js";
import { FolderValue } from "./nds-folder-value.js";
import { useFolderPick } from "./use-folder-pick.js";

const FolderField = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}): ReactElement => {
  const { choose, failure, isManual } = useFolderPick(onChange);
  const clearValue = useCallback((): void => onChange(""), [onChange]);

  return (
    <div className="nds-stack">
      <div className="nds-row">
        <FolderValue isManual={isManual} value={value} onChange={onChange} />
        {hasNativePicker() && (
          <button type="button" className="btn small" onClick={choose}>
            {COPY.textChooseFolder}
          </button>
        )}
        {value && (
          <button
            type="button"
            className="btn ghost small"
            onClick={clearValue}
          >
            {COPY.textClear}
          </button>
        )}
      </div>
      {failure && <span className="alert error small">{failure}</span>}
    </div>
  );
};

export { FolderField };
