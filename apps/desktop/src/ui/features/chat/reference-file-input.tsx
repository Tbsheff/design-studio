import { useCallback } from "react";
import type { ChangeEvent, ReactElement, RefObject } from "react";

import { REFERENCE_ACCEPT } from "../../domain/reference-files.js";

const ReferenceFileInput = ({
  inputRef,
  onFiles,
}: {
  readonly inputRef: RefObject<HTMLInputElement | null>;
  readonly onFiles: (files: File[]) => void;
}): ReactElement => {
  const change = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onFiles([...(event.target.files ?? [])]);
      event.target.value = "";
    },
    [onFiles]
  );

  return (
    <input
      ref={inputRef}
      type="file"
      accept={REFERENCE_ACCEPT}
      multiple
      hidden
      onChange={change}
      data-testid="reference-file-input"
    />
  );
};

export { ReferenceFileInput };
