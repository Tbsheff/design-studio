import { useCallback } from "react";
import type { ChangeEvent, KeyboardEvent, ReactElement } from "react";

import { COPY } from "./copy.js";
import { UrlChips } from "./nds-url-chips.js";
import { MAX_URLS } from "./new-design-system-values.js";
import type { DraftForm, Patch } from "./new-design-system-values.js";

const UrlField = ({
  form,
  set,
}: {
  form: DraftForm;
  set: (patch: Patch) => void;
}): ReactElement => {
  const isFull = form.urls.length >= MAX_URLS;
  const { urlInput, urls } = form;

  const addUrl = useCallback((): void => {
    const url = urlInput.trim();

    if (!url || isFull || urls.includes(url)) {
      return;
    }

    set({ urlInput: "", urls: [...urls, url] });
  }, [isFull, set, urlInput, urls]);

  const submitOnEnter = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      addUrl();
    },
    [addUrl]
  );

  const typeUrl = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void =>
      set({ urlInput: event.target.value }),
    [set]
  );

  return (
    <div className="nds-stack">
      <div className="nds-row">
        <input
          type="url"
          inputMode="url"
          placeholder={COPY.placeholderHttpsExampleCom}
          value={urlInput}
          aria-label={COPY.labelWebsite}
          disabled={isFull}
          onKeyDown={submitOnEnter}
          onChange={typeUrl}
        />
        <button
          type="button"
          className="btn small"
          disabled={!urlInput.trim() || isFull}
          onClick={addUrl}
        >
          {COPY.textAdd}
        </button>
      </div>
      {urls.length > 0 && <UrlChips form={form} set={set} />}
    </div>
  );
};

export { UrlField };
