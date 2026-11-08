import { useCallback } from "react";
import type { ReactElement } from "react";

import { Chip } from "./chip.js";
import { COPY } from "./copy.js";
import { toUrlLabel } from "./nds-model.js";
import type { DraftForm, Patch } from "./new-design-system-values.js";

const UrlChips = ({
  form,
  set,
}: {
  form: DraftForm;
  set: (patch: Patch) => void;
}): ReactElement => {
  const { urls } = form;

  const removeUrl = useCallback(
    (url: string): void => set({ urls: urls.filter((item) => item !== url) }),
    [set, urls]
  );

  return (
    <ul className="nds-chips" aria-label={COPY.labelWebsites}>
      {urls.map((url) => (
        <Chip
          key={url}
          icon="globe"
          label={toUrlLabel(url)}
          value={url}
          onRemove={removeUrl}
        />
      ))}
    </ul>
  );
};

export { UrlChips };
