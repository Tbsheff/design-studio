import type { ReactElement } from "react";

import { AltField } from "./alt-field.js";
import { ImageActions } from "./image-actions.js";
import { ImageAdjustRow } from "./image-adjust-row.js";
import { ImageFitRow } from "./image-fit-row.js";
import { ImageFocalRow } from "./image-focal-row.js";
import { getAttributeText } from "./image-model.js";
import type { Props } from "./image-model.js";
import { useImageAdjust } from "./use-image-adjust.js";
import type { ImageControls } from "./use-image-controls.js";

interface RowsProps {
  readonly controls: ImageControls;
  readonly props: Props;
}

const ImageRows = ({ controls, props }: RowsProps): ReactElement => {
  const isDisabled = !props.isEditable;
  const adjust = useImageAdjust();

  return (
    <div className="img-rows">
      <ImageActions
        isDisabled={isDisabled}
        isBusy={controls.isBusy}
        onFile={controls.handleFile}
        onPaste={controls.handlePaste}
        onFind={controls.handleFind}
      />
      <ImageFitRow
        fit={controls.fit}
        isDisabled={isDisabled}
        onPick={controls.handleFit}
      />
      <ImageFocalRow
        focal={controls.focal}
        isDisabled={isDisabled}
        onPick={controls.handleFocal}
      />
      {adjust && <ImageAdjustRow adjust={adjust} isDisabled={isDisabled} />}
      {!controls.isBackground && (
        <AltField
          initial={
            controls.alt ??
            getAttributeText(props.selection.outerHTML, "alt") ??
            ""
          }
          isDisabled={isDisabled}
          onSave={controls.handleAlt}
        />
      )}
      {controls.error && (
        <p className="ins-error img-error" role="alert">
          {controls.error}
        </p>
      )}
    </div>
  );
};

export { ImageRows };
