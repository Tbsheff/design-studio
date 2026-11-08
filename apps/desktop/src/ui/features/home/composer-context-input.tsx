import { useCallback } from "react";
import type { ChangeEvent, ReactElement, RefObject } from "react";

import { REFERENCE_ACCEPT } from "../../domain/reference-files.js";

interface ComposerContextInputProps {
  readonly fileRef: RefObject<HTMLInputElement | null>;
  readonly onFiles: (files: File[]) => void;
}

const ComposerContextInput = ({
  fileRef,
  onFiles,
}: ComposerContextInputProps): ReactElement => {
  const change = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onFiles([...(event.target.files ?? [])]);
      event.target.value = "";
    },
    [onFiles]
  );

  return (
    <input
      ref={fileRef}
      name="reference-files"
      type="file"
      accept={REFERENCE_ACCEPT}
      multiple
      hidden
      onChange={change}
      data-testid="context-file-input"
    />
  );
};

export { ComposerContextInput };
