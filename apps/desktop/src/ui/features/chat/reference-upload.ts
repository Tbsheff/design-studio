import type { Attachment as UploadedAttachment } from "@design-studio/contracts";

import { asReferenceName } from "../../../shared/reference.js";
import { api } from "../../api.js";
import type { PendingAttachment } from "../../domain/pending-attachment.js";
import { readBlob } from "../../platform/http.js";
import { projectFromPath } from "../../platform/router.js";

const plainUploads = new WeakMap<PendingAttachment, UploadedAttachment>();

const unmarkReference = (file: PendingAttachment): void => {
  const plain = plainUploads.get(file);

  if (plain) {
    file.attachment = plain;
  }
};

const markAsReference = async (file: PendingAttachment): Promise<void> => {
  const projectId = projectFromPath(globalThis.location.pathname);

  if (!projectId || !file.attachment) {
    throw new Error("Open a project first");
  }

  const blob = await readBlob(file.previewUrl);

  const uploaded = await api.uploadAttachment(
    projectId,
    new File([blob], asReferenceName(file.name), {
      type: blob.type || file.attachment.mime,
    })
  );

  if (!plainUploads.has(file)) {
    plainUploads.set(file, file.attachment);
  }

  file.attachment = uploaded;
};

export { markAsReference, unmarkReference };
