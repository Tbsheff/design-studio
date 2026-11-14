import { useCallback } from "react";
import type { ChangeEvent, FormEvent, ReactElement } from "react";

import { trustedCopy } from "./copy.js";
import type { TrustedFoldersState } from "./use-trusted-folders.js";

interface ConnectTrustedAddProps {
  readonly isBusy: boolean;
  readonly state: TrustedFoldersState;
}

const ConnectTrustedAdd = ({
  isBusy,
  state,
}: ConnectTrustedAddProps): ReactElement => {
  const { draft, handleAdd, handleDraft, handlePick, hasPicker, isPicking } =
    state;

  const changeDraft = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      handleDraft(event.target.value);
    },
    [handleDraft]
  );

  const submit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      handleAdd();
    },
    [handleAdd]
  );

  if (hasPicker) {
    return (
      <button
        type="button"
        className="btn small"
        disabled={isBusy || isPicking}
        onClick={handlePick}
      >
        {trustedCopy.addFolder}
      </button>
    );
  }

  return (
    <form className="connect-trusted-add" onSubmit={submit}>
      <input
        type="text"
        name="trustedFolder"
        aria-label={trustedCopy.pathLabel}
        placeholder={trustedCopy.pathPlaceholder}
        spellCheck={false}
        value={draft}
        onChange={changeDraft}
      />
      <button
        type="submit"
        className="btn small"
        disabled={isBusy || draft.trim() === ""}
      >
        {trustedCopy.add}
      </button>
    </form>
  );
};

export { ConnectTrustedAdd };
