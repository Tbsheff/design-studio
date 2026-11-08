import { Icon } from "@design-studio/ui";
import { useCallback, useRef } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { IMAGE_ACCEPT } from "../../../shared/image.js";
import { copy } from "./copy.js";
import { toReplaceLabel } from "./image-model.js";

interface Props {
  readonly isDisabled: boolean;
  readonly isBusy: boolean;
  readonly onFile: (file: Blob) => void;
  readonly onPaste: () => void;
  readonly onFind: () => void;
}

const ICON_SIZE = 12;

const ImageActions = ({
  isDisabled,
  isBusy,
  onFile,
  onPaste,
  onFind,
}: Props): ReactElement => {
  const fileInput = useRef<HTMLInputElement>(null);

  const handleReplace = useCallback((): void => {
    fileInput.current?.click();
  }, []);

  const handleFilePicked = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const file = event.target.files?.[0];

      event.target.value = "";

      if (file) {
        onFile(file);
      }
    },
    [onFile]
  );

  return (
    <div className="img-actions">
      <button
        type="button"
        className="btn small"
        disabled={isDisabled}
        data-tip={copy.pickAnImageFileYou}
        onClick={handleReplace}
      >
        <Icon name="image" size={ICON_SIZE} />
        {toReplaceLabel(isBusy)}
      </button>
      <button
        type="button"
        className="btn ghost small"
        disabled={isDisabled}
        data-tip={copy.textUseTheImageOnThe}
        onClick={onPaste}
      >
        {copy.paste}
      </button>
      <button
        type="button"
        className="btn ghost small"
        disabled={isDisabled}
        data-tip={copy.searchFreeStockPhotosAnd}
        onClick={onFind}
      >
        {copy.findPhoto}
      </button>
      <input
        ref={fileInput}
        type="file"
        accept={IMAGE_ACCEPT}
        hidden
        aria-label={copy.imageFile}
        onChange={handleFilePicked}
      />
    </div>
  );
};

export { ImageActions };
