import type { Attachment } from "./deps.js";

interface PendingAttachment {
  attachment: Attachment | null;
  error: string | null;
  localId: string;
  name: string;
  previewUrl: string;
}

export type { PendingAttachment };
