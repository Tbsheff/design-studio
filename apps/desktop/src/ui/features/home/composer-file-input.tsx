import { useCallback } from "react";
import type { ChangeEvent, ReactElement, RefObject } from "react";

interface ComposerFileInputProps {
  readonly fileRef: RefObject<HTMLInputElement | null>;
  readonly onFiles: (files: File[]) => void;
}

const ComposerFileInput = ({
  fileRef,
  onFiles,
}: ComposerFileInputProps): ReactElement => {
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
      name="images"
      type="file"
      accept="image/png,image/jpeg,image/gif,image/webp"
      multiple
      hidden
      onChange={change}
    />
  );
};

export { ComposerFileInput };
