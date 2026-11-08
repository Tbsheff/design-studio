import { useCallback, useRef } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { toChoice } from "./choose-text.js";
import { COPY } from "./copy.js";

const TokensField = ({
  file,
  onChange,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
}): ReactElement => {
  const input = useRef<HTMLInputElement>(null);

  const pickFile = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void =>
      onChange(event.target.files?.[0] ?? null),
    [onChange]
  );

  const openPicker = useCallback((): void => input.current?.click(), []);
  const clearFile = useCallback((): void => onChange(null), [onChange]);

  return (
    <div className="nds-row">
      <input
        ref={input}
        type="file"
        accept=".json,application/json,.css,text/css"
        hidden
        aria-label={COPY.labelTokensFileUpload}
        onChange={pickFile}
      />
      <span
        className={toChoice(
          file !== null,
          "nds-file truncate ",
          "nds-file truncate muted"
        )}
      >
        {file?.name ?? COPY.textNoTokensFile}
      </span>
      <button type="button" className="btn small" onClick={openPicker}>
        {COPY.textChooseFile}
      </button>
      {file && (
        <button type="button" className="btn ghost small" onClick={clearFile}>
          {COPY.textRemove}
        </button>
      )}
    </div>
  );
};

export { TokensField };
