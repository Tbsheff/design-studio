import type { Attachment as UploadedAttachment, SelectionContext } from '../../shared/contracts';
import { Attachment, AttachmentMedia, AttachmentOverlay, AttachmentProgress } from '../ai/components/ai/attachment';
import { Chip } from '../ai/components/ai/chip';
import { Icon } from './Icon';
import { modelLabel } from './SettingsFields';

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
        <Chip key={s.selector} size="sm" className="chip max-w-full py-0.5 pr-0.5 text-primary" title={s.selector}>
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

export function AttachmentThumbs({ files, onRemove }: { files: PendingAttachment[]; onRemove: (localId: string) => void }) {
  if (files.length === 0) return null;
  return (
    <div className="thumbs flex flex-wrap gap-2 px-2 pt-2">
      {files.map((f) => (
        <Attachment key={f.localId} layout="card" state={f.error ? 'error' : 'default'} className="thumb size-13" title={f.error ?? f.name}>
          <AttachmentMedia>
            <img data-slot="attachment-media-img" src={f.previewUrl} alt={f.name} className={f.error ? 'opacity-35' : ''} />
          </AttachmentMedia>
          <ThumbState file={f} />
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
    <Chip size="sm" className="model-tag mr-1 shrink-0 font-semibold whitespace-nowrap" data-testid="active-model" title={`Model: ${model}`}>
      <Icon name="sparkle" size={12} />
      {modelLabel(model).replace(/^Claude /, '')}
      <span className="sr-only">({model})</span>
    </Chip>
  );
}
