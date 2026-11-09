import { useCallback } from "react";
import type { ReactElement } from "react";

import { UrlAttachForm } from "./url-attach-form.js";
import type { ReferenceUrl } from "./use-reference-url.js";

const ReferenceUrlSlot = ({
  url,
}: {
  readonly url: ReferenceUrl;
}): ReactElement | null => {
  const { addReferenceUrl, closeUrlForm, isUrlFormOpen } = url;

  const handleAdd = useCallback(
    (value: string): void => addReferenceUrl(value),
    [addReferenceUrl]
  );

  if (!isUrlFormOpen) {
    return null;
  }

  return <UrlAttachForm onAdd={handleAdd} onCancel={closeUrlForm} />;
};

export { ReferenceUrlSlot };
