import type { ChangeEvent, KeyboardEvent, ReactElement } from "react";
import { useCallback } from "react";

import { hasNativePicker } from "../../platform/desktop.js";
import { toChoice } from "./choose-text.js";
import { COPY } from "./copy.js";
import type { Attach } from "./use-port-attach.js";

const ROW_STYLE = { display: "flex", gap: "var(--s-2)" } as const;
const INPUT_STYLE = { flex: 1, minWidth: 0 } as const;

const AttachRow = ({
  attach,
  isWaiting,
}: {
  attach: Attach;
  isWaiting: boolean;
}): ReactElement => {
  const { choose, edit, isBusy, path, run } = attach;

  const editPath = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      edit(event.target.value);
    },
    [edit]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      run(path);
    },
    [path, run]
  );

  const handleAttach = useCallback((): void => run(path), [path, run]);

  return (
    <div className="port-attach-row" style={ROW_STYLE}>
      <input
        aria-labelledby="port-attach-label"
        className="mono"
        style={INPUT_STYLE}
        value={path}
        placeholder={COPY.placeholderCodeMyApp}
        spellCheck={false}
        autoComplete="off"
        aria-invalid={Boolean(attach.failure)}
        onChange={editPath}
        onKeyDown={handleKeyDown}
      />
      {hasNativePicker() && (
        <button
          type="button"
          className="btn"
          disabled={isBusy}
          onClick={choose}
        >
          {COPY.textChoose}
        </button>
      )}
      <button
        type="button"
        className="btn"
        disabled={isBusy || !path.trim() || isWaiting}
        onClick={handleAttach}
      >
        {toChoice(isBusy, COPY.textAttaching, COPY.textAttach)}
      </button>
    </div>
  );
};

export { AttachRow };
