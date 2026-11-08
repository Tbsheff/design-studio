import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { toChoice } from "./choose-text.js";
import { COPY } from "./copy.js";
import { DropChips } from "./nds-drop-chips.js";
import { DROP_ACCEPT } from "./new-design-system-values.js";
import type { DraftForm, Patch } from "./new-design-system-values.js";
import { useDropZone } from "./use-drop-zone.js";

const DropZone = ({
  form,
  set,
}: {
  form: DraftForm;
  set: (patch: Patch) => void;
}): ReactElement => {
  const zone = useDropZone(form, set);
  const { dragLeave, dragOver, dropFiles, input, isOver, openPicker } = zone;
  const { pickFiles } = zone;

  const hasFiles =
    form.images.length > 0 ||
    form.tokensFile !== null ||
    form.designMdFile !== null;

  return (
    <div
      className={toChoice(isOver, "nds-dropzone over", "nds-dropzone ")}
      data-drop-target=""
      onDragOver={dragOver}
      onDragLeave={dragLeave}
      onDrop={dropFiles}
    >
      <input
        ref={input}
        type="file"
        accept={DROP_ACCEPT}
        multiple
        hidden
        aria-label={COPY.labelAddFiles}
        onChange={pickFiles}
      />
      <span className="nds-dropzone-art" aria-hidden="true">
        <Icon name="image" size={20} />
      </span>
      <div className="nds-dropzone-text">
        <strong>{COPY.textDropScreenshotsALogo}</strong>
        <span>{COPY.textTheAiStepLooks}</span>
      </div>
      <button type="button" className="btn small" onClick={openPicker}>
        {COPY.textChooseFiles}
      </button>
      {hasFiles && <DropChips form={form} set={set} />}
      {zone.note && <output className="nds-drop-note">{zone.note}</output>}
    </div>
  );
};

export { DropZone };
