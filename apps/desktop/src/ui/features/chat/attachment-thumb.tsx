import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { isReferenceName } from "../../../shared/reference.js";
import { AttachmentMedia } from "../../ai/components/ai/attachment-media.js";
import { attachmentVariants } from "../../ai/components/ai/attachment-variants.js";
import { cn } from "../../ai/lib/utils.js";
import type { PendingAttachment } from "../../domain/pending-attachment.js";
import { toShortName } from "./reference-model.js";
import { ReferenceToggle } from "./reference-toggle.js";
import { ThumbState } from "./thumb-state.js";

const REMOVE_ICON = 10;
const START_COUNT = 2;

interface AttachmentThumbProps {
  readonly file: PendingAttachment;
  readonly index: number;
  readonly isBusy: boolean;
  readonly onRemove: (localId: string) => void;
  readonly onToggle: (file: PendingAttachment) => void;
}

const toTipAlign = (index: number): "end" | "start" => {
  if (index < START_COUNT) {
    return "start";
  }

  return "end";
};

const toThumbState = (file: PendingAttachment): "default" | "error" => {
  if (file.error) {
    return "error";
  }

  return "default";
};

const isReferenceFile = (file: PendingAttachment): boolean =>
  file.attachment !== null && isReferenceName(file.attachment.name);

const AttachmentThumb = ({
  file,
  index,
  isBusy,
  onRemove,
  onToggle,
}: AttachmentThumbProps): ReactElement => {
  const remove = useCallback((): void => {
    onRemove(file.localId);
  }, [file.localId, onRemove]);

  const state = toThumbState(file);
  const extra = cn("thumb size-13", isReferenceFile(file) && "is-reference");

  return (
    <div
      className={cn(
        attachmentVariants({
          className: extra,
          layout: "card",
          state,
        })
      )}
      data-layout="card"
      data-slot="attachment"
      data-state={state}
      data-tip={file.error ?? toShortName(file.name)}
      data-tip-align={toTipAlign(index)}
      data-tip-side="top"
    >
      <AttachmentMedia>
        <img
          data-slot="attachment-media-img"
          src={file.previewUrl}
          alt={file.name}
          className={cn(file.error && "opacity-35")}
        />
      </AttachmentMedia>
      <ThumbState file={file} />
      <ReferenceToggle file={file} isBusy={isBusy} onToggle={onToggle} />
      <button
        type="button"
        aria-label={`Remove ${file.name}`}
        className="icon-btn thumb-x"
        onClick={remove}
      >
        <Icon name="close" size={REMOVE_ICON} />
      </button>
    </div>
  );
};

export { AttachmentThumb };
