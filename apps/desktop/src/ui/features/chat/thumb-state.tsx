import type { ReactElement } from "react";

import { cn } from "../../ai/lib/utils.js";
import type { PendingAttachment } from "../../domain/pending-attachment.js";
import { copy } from "./copy.js";
import { ThumbSpinner } from "./thumb-spinner.js";

const OVERLAY_BASE = cn(
  "absolute inset-0 inline-flex items-center justify-center",
  "rounded bg-foreground/45 text-background backdrop-blur-[1px]"
);

const FAILED_CLASS = cn(
  OVERLAY_BASE,
  "rounded-outer bg-destructive/15 text-xs font-semibold text-destructive"
);

const UPLOADING_CLASS = cn(OVERLAY_BASE, "rounded-outer");

const ThumbState = ({
  file,
}: {
  file: PendingAttachment;
}): ReactElement | null => {
  if (file.error) {
    return (
      <div className={FAILED_CLASS} data-slot="attachment-overlay">
        {copy.failed}
      </div>
    );
  }

  if (file.attachment) {
    return null;
  }

  return (
    <div className={UPLOADING_CLASS} data-slot="attachment-overlay">
      <ThumbSpinner />
      <span className="sr-only">{copy.uploading}</span>
    </div>
  );
};

export { ThumbState };
