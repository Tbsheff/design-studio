import type {
  Attachment as UploadedAttachment,
  SelectionContext,
} from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { useState } from "react";
import type { ReactElement } from "react";

import { asReferenceName, isReferenceName } from "../../../shared/reference.js";
import { AttachmentMedia } from "../../ai/components/ai/attachment-media.js";
import { AttachmentOverlay } from "../../ai/components/ai/attachment-overlay.js";
import { AttachmentProgress } from "../../ai/components/ai/attachment-progress.js";
import { Attachment } from "../../ai/components/ai/attachment.js";
import { Chip } from "../../ai/components/ai/chip.js";
import { cn } from "../../ai/lib/utils.js";
import { api } from "../../api.js";
import type { PendingAttachment } from "../../domain/pending-attachment.js";
import { readBlob } from "../../platform/http.js";
import { projectFromPath } from "../../platform/router.js";
import { copy } from "./copy.js";
import { modelLabel } from "./settings-draft-model.js";

const SNIPPET_CHARS = 24;
const TAIL_CHARS = 12;

export type { PendingAttachment } from "../../domain/pending-attachment.js";

const SelectionChips = ({
  selection,
  onRemove,
}: {
  selection: SelectionContext[];
  onRemove: (selector: string) => void;
}): ReactElement | null => {
  if (selection.length === 0) {
    return null;
  }

  return (
    <div className="chips flex flex-wrap gap-1 px-2 pt-2">
      {selection.map((selected) => (
        <Chip
          key={selected.selector}
          size="sm"
          className="chip max-w-full py-0.5 pr-0.5 text-primary"
          data-tip={selected.selector}
          data-tip-side="top"
        >
          <Icon name="pointer" size={12} />
          <span className="chip-text min-w-0 truncate font-mono">
            <span className="chip-tag font-bold">{selected.tag}</span>
            {selected.text ? ` "${selected.text.slice(0, SNIPPET_CHARS)}"` : ""}
          </span>
          <button
            type="button"
            className="icon-btn chip-x"
            aria-label={`Remove ${selected.selector}`}
            onClick={() => onRemove(selected.selector)}
          >
            <Icon name="close" size={12} />
          </button>
        </Chip>
      ))}
    </div>
  );
};

const ThumbState = ({
  file,
}: {
  file: PendingAttachment;
}): ReactElement | null => {
  if (file.error) {
    return (
      <AttachmentOverlay className="rounded-outer bg-destructive/15 text-xs font-semibold text-destructive">
        {copy.failed}
      </AttachmentOverlay>
    );
  }

  if (file.attachment) {
    return null;
  }

  return (
    <AttachmentOverlay className="rounded-outer">
      <AttachmentProgress className="size-5" />
      <span className="sr-only">{copy.uploading}</span>
    </AttachmentOverlay>
  );
};

const NAME_ROOM = 30;

const shortName = (name: string): string => {
  if (name.length <= NAME_ROOM) {
    return name;
  }

  const tail = name.slice(-TAIL_CHARS);

  return `${name.slice(0, NAME_ROOM - tail.length - 1)}…${tail}`;
};

const plainUploads = new WeakMap<PendingAttachment, UploadedAttachment>();

const unmark = (file: PendingAttachment): void => {
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

interface UseReferenceToggleResult {
  readonly busy: string | null;
  readonly toggle: (file: PendingAttachment) => Promise<void>;
}

const useReferenceToggle = (
  files: PendingAttachment[]
): UseReferenceToggleResult => {
  const [busy, setBusy] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const toggle = async (file: PendingAttachment): Promise<void> => {
    if (busy || !file.attachment) {
      return;
    }

    const on = isReferenceName(file.attachment.name);
    files.forEach(unmark);

    if (on) {
      return setTick((previous) => previous + 1);
    }

    setBusy(file.localId);

    try {
      await markAsReference(file);
    } catch (error) {
      file.error = error instanceof Error ? error.message : String(error);
    } finally {
      setBusy(null);
      setTick((previous) => previous + 1);
    }
  };

  return { busy, toggle };
};

const ReferenceToggle = ({
  file,
  busy,
  onToggle,
}: {
  file: PendingAttachment;
  busy: boolean;
  onToggle: () => void;
}): ReactElement | null => {
  if (!file.attachment || file.error) {
    return null;
  }

  const on = isReferenceName(file.attachment.name);

  return (
    <button
      type="button"
      className={cn("thumb-ref", on && "on")}
      aria-pressed={on}
      aria-label={
        on
          ? `Stop using ${file.name} as the reference`
          : `Use ${file.name} as reference`
      }
      data-tip={
        on
          ? "Reference: the studio scores the frame against this picture. Click to stop."
          : "Use as reference: the agent rebuilds this picture and the studio scores the match"
      }
      data-tip-side="top"
      disabled={busy}
      onClick={onToggle}
    >
      {busy && "…"}
      {!busy && "Ref"}
    </button>
  );
};

const AttachmentThumbs = ({
  files,
  onRemove,
}: {
  files: PendingAttachment[];
  onRemove: (localId: string) => void;
}): ReactElement | null => {
  const reference = useReferenceToggle(files);

  if (files.length === 0) {
    return null;
  }

  return (
    <div className="thumbs flex flex-wrap gap-2 px-2 pt-2">
      {files.map((found, index) => (
        <Attachment
          key={found.localId}
          layout="card"
          state={found.error ? "error" : "default"}
          className={cn(
            "thumb size-13",
            found.attachment &&
              isReferenceName(found.attachment.name) &&
              "is-reference"
          )}
          data-tip={found.error ?? shortName(found.name)}
          data-tip-side="top"
          data-tip-align={index < 2 ? "start" : "end"}
        >
          <AttachmentMedia>
            <img
              data-slot="attachment-media-img"
              src={found.previewUrl}
              alt={found.name}
              className={cn(found.error && "opacity-35")}
            />
          </AttachmentMedia>
          <ThumbState file={found} />
          <ReferenceToggle
            file={found}
            busy={reference.busy === found.localId}
            onToggle={() => void reference.toggle(found)}
          />
          <button
            type="button"
            aria-label={`Remove ${found.name}`}
            className="icon-btn thumb-x"
            onClick={() => onRemove(found.localId)}
          >
            <Icon name="close" size={10} />
          </button>
        </Attachment>
      ))}
    </div>
  );
};

const ModelTag = ({ model }: { model: string }): ReactElement => (
  <Chip
    size="sm"
    className="model-tag mr-1 shrink-0 font-semibold whitespace-nowrap"
    data-testid="active-model"
    data-tip={`Model: ${model}`}
  >
    <Icon name="sparkle" size={12} />
    {modelLabel(model).replace(/^Claude /u, "")}
    <span className="sr-only">
      {copy.text3}
      {model}
      {copy.text4}
    </span>
  </Chip>
);

export { AttachmentThumbs, ModelTag, SelectionChips };
