import { useState } from 'react';
import type { Attachment as UploadedAttachment, SelectionContext } from '../../shared/contracts';
import { asReferenceName, isReferenceName } from '../../shared/reference';
import { api } from '../api';
import { projectFromPath } from '../route';
import '../styles/reference.css';
import { Attachment, AttachmentMedia, AttachmentOverlay, AttachmentProgress } from '../ai/components/ai/attachment';
import { Chip } from '../ai/components/ai/chip';
import { Icon } from './Icon';
import { modelLabel } from '../settingsDraft';

export interface PendingAttachment {
  localId: string;
  name: string;
  previewUrl: string;
  attachment: UploadedAttachment | null;
  error: string | null;
}

export function SelectionChips({ selection, onRemove }: { selection: SelectionContext[]; onRemove: (selector: string) => void }) {
  if (selection.length === 0) return null;
  return (
    <div className="chips flex flex-wrap gap-1 px-2 pt-2">
      {selection.map((s) => (
        <Chip key={s.selector} size="sm" className="chip max-w-full py-0.5 pr-0.5 text-primary" data-tip={s.selector} data-tip-side="top">
          <Icon name="pointer" size={12} />
          <span className="chip-text min-w-0 truncate font-mono">
            <span className="chip-tag font-bold">{s.tag}</span>
            {s.text ? ` "${s.text.slice(0, 24)}"` : ''}
          </span>
          <button type="button" className="icon-btn chip-x" aria-label={`Remove ${s.selector}`} onClick={() => onRemove(s.selector)}>
            <Icon name="close" size={12} />
          </button>
        </Chip>
      ))}
    </div>
  );
}

function ThumbState({ file }: { file: PendingAttachment }) {
  if (file.error) {
    return <AttachmentOverlay className="rounded-outer bg-destructive/15 text-xs font-semibold text-destructive">Failed</AttachmentOverlay>;
  }
  if (file.attachment) return null;
  return (
    <AttachmentOverlay className="rounded-outer">
      <AttachmentProgress className="size-5" />
      <span className="sr-only">Uploading</span>
    </AttachmentOverlay>
  );
}

const NAME_ROOM = 30;

function shortName(name: string): string {
  if (name.length <= NAME_ROOM) return name;
  const tail = name.slice(-12);
  return `${name.slice(0, NAME_ROOM - tail.length - 1)}…${tail}`;
}

const plainUploads = new WeakMap<PendingAttachment, UploadedAttachment>();

function unmark(file: PendingAttachment): void {
  const plain = plainUploads.get(file);
  if (plain) file.attachment = plain;
}

async function markAsReference(file: PendingAttachment): Promise<void> {
  const projectId = projectFromPath(window.location.pathname);
  if (!projectId || !file.attachment) throw new Error('Open a project first');
  const blob = await (await fetch(file.previewUrl)).blob();
  const uploaded = await api.uploadAttachment(projectId, new File([blob], asReferenceName(file.name), { type: blob.type || file.attachment.mime }));
  if (!plainUploads.has(file)) plainUploads.set(file, file.attachment);
  file.attachment = uploaded;
}

function useReferenceToggle(files: PendingAttachment[]) {
  const [busy, setBusy] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const toggle = async (file: PendingAttachment) => {
    if (busy || !file.attachment) return;
    const on = isReferenceName(file.attachment.name);
    files.forEach(unmark);
    if (on) return setTick((n) => n + 1);
    setBusy(file.localId);
    try {
      await markAsReference(file);
    } catch (error) {
      file.error = error instanceof Error ? error.message : String(error);
    } finally {
      setBusy(null);
      setTick((n) => n + 1);
    }
  };
  return { busy, toggle };
}

function ReferenceToggle({ file, busy, onToggle }: { file: PendingAttachment; busy: boolean; onToggle: () => void }) {
  if (!file.attachment || file.error) return null;
  const on = isReferenceName(file.attachment.name);
  return (
    <button
      type="button"
      className={`thumb-ref ${on ? 'on' : ''}`}
      aria-pressed={on}
      aria-label={on ? `Stop using ${file.name} as the reference` : `Use ${file.name} as reference`}
      data-tip={on ? 'Reference: the studio scores the frame against this picture. Click to stop.' : 'Use as reference: the agent rebuilds this picture and the studio scores the match'}
      data-tip-side="top"
      disabled={busy}
      onClick={onToggle}
    >
      {busy ? '…' : 'Ref'}
    </button>
  );
}

export function AttachmentThumbs({ files, onRemove }: { files: PendingAttachment[]; onRemove: (localId: string) => void }) {
  const reference = useReferenceToggle(files);
  if (files.length === 0) return null;
  return (
    <div className="thumbs flex flex-wrap gap-2 px-2 pt-2">
      {files.map((f, index) => (
        <Attachment key={f.localId} layout="card" state={f.error ? 'error' : 'default'} className={`thumb size-13 ${f.attachment && isReferenceName(f.attachment.name) ? 'is-reference' : ''}`} data-tip={f.error ?? shortName(f.name)} data-tip-side="top" data-tip-align={index < 2 ? 'start' : 'end'}>
          <AttachmentMedia>
            <img data-slot="attachment-media-img" src={f.previewUrl} alt={f.name} className={f.error ? 'opacity-35' : ''} />
          </AttachmentMedia>
          <ThumbState file={f} />
          <ReferenceToggle file={f} busy={reference.busy === f.localId} onToggle={() => void reference.toggle(f)} />
          <button
            type="button"
            aria-label={`Remove ${f.name}`}
            className="icon-btn thumb-x"
            onClick={() => onRemove(f.localId)}
          >
            <Icon name="close" size={10} />
          </button>
        </Attachment>
      ))}
    </div>
  );
}

export function ModelTag({ model }: { model: string }) {
  return (
    <Chip size="sm" className="model-tag mr-1 shrink-0 font-semibold whitespace-nowrap" data-testid="active-model" data-tip={`Model: ${model}`}>
      <Icon name="sparkle" size={12} />
      {modelLabel(model).replace(/^Claude /, '')}
      <span className="sr-only">({model})</span>
    </Chip>
  );
}
