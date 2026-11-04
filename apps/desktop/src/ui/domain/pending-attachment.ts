import type { Attachment } from "@design-studio/contracts";

interface PendingAttachment {
  attachment: Attachment | null;
  error: string | null;
  localId: string;
  name: string;
  previewUrl: string;
}

export type { PendingAttachment };
