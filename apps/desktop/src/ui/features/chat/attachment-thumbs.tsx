import type { ReactElement } from "react";

import type { PendingAttachment } from "../../domain/pending-attachment.js";
import { AttachmentThumb } from "./attachment-thumb.js";
import { useReferenceToggle } from "./use-reference-toggle.js";

interface AttachmentThumbsProps {
  readonly files: PendingAttachment[];
  readonly onRemove: (localId: string) => void;
}

const AttachmentThumbs = ({
  files,
  onRemove,
}: AttachmentThumbsProps): ReactElement | null => {
  const { busyId, toggle: onToggle } = useReferenceToggle(files);

  if (files.length === 0) {
    return null;
  }

  return (
    <div className="thumbs flex flex-wrap gap-2 px-2 pt-2">
      {files.map((file, index) => (
        <AttachmentThumb
          key={file.localId}
          file={file}
          index={index}
          isBusy={busyId === file.localId}
          onRemove={onRemove}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
};

export { AttachmentThumbs };
