import { useEffect, useId, useRef, useState, type ClipboardEvent, type DragEvent, type FormEvent } from 'react';
import { useRovingRadioGroup } from './LevelControl';
import type { ClarifyQuestion } from '../../shared/contracts';
import { Icon } from './Icon';

export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
export const MAX_IMAGES = 4;
export const MAX_REFERENCES = 3;

export interface ImageDraft {
  id: string;
  file: File;
  url: string;
}

export interface ReferenceDraft {
  url: string;
  host: string;
}

export function soleUrl(text: string): ReferenceDraft | null {
  const trimmed = text.trim();
  if (!/^https?:\/\/\S+$/i.test(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    return { url: url.href, host: url.host.replace(/^www\./, '') };
  } catch {
    return null;
  }
}

export function imageFiles(list: FileList | File[] | null | undefined): File[] {
  return [...(list ?? [])].filter((file) => IMAGE_TYPES.includes(file.type));
}

export function ComposerChips({ images, references, onRemoveImage, onRemoveReference }: { images: ImageDraft[]; references: ReferenceDraft[]; onRemoveImage: (id: string) => void; onRemoveReference: (url: string) => void }) {
  if (images.length === 0 && references.length === 0) return null;
  return (
    <ul className="home-chips" aria-label="Attached to this prompt">
      {images.map((image) => (
        <li key={image.id} className="home-chip image" title={image.file.name}>
          <img src={image.url} alt="" />
          <span className="truncate">{image.file.name}</span>
          <button type="button" className="home-chip-remove" aria-label={`Remove ${image.file.name}`} onClick={() => onRemoveImage(image.id)}>
            <Icon name="close" size={12} />
          </button>
        </li>
      ))}
      {references.map((reference) => (
        <li key={reference.url} className="home-chip reference" title={`Use as reference: ${reference.url}`}>
          <Icon name="globe" size={14} />
          <span className="home-chip-label">Use as reference</span>
          <span className="truncate home-chip-host">{reference.host}</span>
          <button type="button" className="home-chip-remove" aria-label={`Remove ${reference.host}`} onClick={() => onRemoveReference(reference.url)}>
            <Icon name="close" size={12} />
          </button>
        </li>
      ))}
    </ul>
  );
}

function ClarifyQuestionField({ item, answer, onAnswer, first }: { item: ClarifyQuestion; answer: string; onAnswer: (value: string) => void; first: boolean }) {
  const legendId = useId();
  const picked = item.options.includes(answer) ? answer : '';
  const radios = useRovingRadioGroup(item.options, picked, onAnswer);
  const firstRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (first) firstRef.current?.focus();
  }, [first]);
  return (
    <div className="clarify-q">
      <span className="clarify-legend" id={legendId}>
        {item.question}
      </span>
      <div className="clarify-options">
        <div className="clarify-choices" role="radiogroup" aria-labelledby={legendId} onKeyDown={radios.onKeyDown}>
          {item.options.map((option, index) => {
            const props = radios.item(option);
            const on = picked === option;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={on}
                className={`chip-toggle${on ? ' on' : ''}`}
                tabIndex={picked === '' ? (index === 0 ? 0 : -1) : props.tabIndex}
                ref={(element) => {
                  props.ref(element);
                  if (index === 0) firstRef.current = element;
                }}
                onClick={() => onAnswer(option)}
              >
                {on && <Icon name="check" size={12} />}
                {option}
              </button>
            );
          })}
        </div>
        <input className="clarify-other" aria-label={`Other answer: ${item.question}`} placeholder="Or type an answer" value={picked ? '' : answer} onChange={(event) => onAnswer(event.target.value)} />
      </div>
    </div>
  );
}

export function ClarifyForm({ questions, busy, onBuild, onSkip, onCancel }: { questions: ClarifyQuestion[]; busy: boolean; onBuild: (answers: Array<{ question: string; answer: string }>) => void; onSkip: () => void; onCancel: () => void }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onBuild(questions.map((item) => ({ question: item.question, answer: answers[item.id] ?? '' })));
  };
  const set = (id: string, value: string) => setAnswers((current) => ({ ...current, [id]: value }));
  return (
    <form className="clarify" aria-labelledby="clarify-heading" onSubmit={submit} onKeyDown={(event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    }}>
      <div className="clarify-head">
        <Icon name="sparkle" size={14} />
        <h2 id="clarify-heading">A few quick questions</h2>
        <span className="clarify-hint">Short briefs build better with these answers. All are optional.</span>
      </div>
      {questions.map((item, index) => (
        <ClarifyQuestionField key={item.id} item={item} answer={answers[item.id] ?? ''} onAnswer={(value) => set(item.id, value)} first={index === 0} />
      ))}
      <div className="clarify-foot">
        <button type="button" className="btn ghost small" onClick={onSkip} disabled={busy}>
          Skip questions
        </button>
        <button type="submit" className="btn primary small has-icon" disabled={busy}>
          {busy ? <span className="spinner" /> : <Icon name="arrowUp" size={14} />}
          {busy ? 'Creating…' : 'Build with answers'}
        </button>
      </div>
    </form>
  );
}

export function useComposerAttachments(setFormError: (message: string | null) => void) {
  const [images, setImages] = useState<ImageDraft[]>([]);
  const [references, setReferences] = useState<ReferenceDraft[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef(images);
  imagesRef.current = images;
  useEffect(() => () => imagesRef.current.forEach((image) => URL.revokeObjectURL(image.url)), []);

  const addImages = (files: File[]) => {
    if (files.length === 0) return;
    setImages((current) => {
      const room = Math.max(0, MAX_IMAGES - current.length);
      if (files.length > room) setFormError(`You can attach up to ${MAX_IMAGES} images.`);
      return [...current, ...files.slice(0, room).map((file) => ({ id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`, file, url: URL.createObjectURL(file) }))];
    });
  };

  const addReference = (reference: ReferenceDraft) => {
    setReferences((current) => {
      if (current.some((item) => item.url === reference.url)) return current;
      if (current.length >= MAX_REFERENCES) {
        setFormError(`You can add up to ${MAX_REFERENCES} reference pages.`);
        return current;
      }
      return [...current, reference];
    });
  };

  const removeImage = (id: string) =>
    setImages((current) => {
      const gone = current.find((image) => image.id === id);
      if (gone) URL.revokeObjectURL(gone.url);
      return current.filter((image) => image.id !== id);
    });

  const onPromptPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = imageFiles(event.clipboardData.files);
    if (files.length > 0) {
      event.preventDefault();
      addImages(files);
      return;
    }
    const reference = soleUrl(event.clipboardData.getData('text/plain'));
    if (reference) {
      event.preventDefault();
      addReference(reference);
    }
  };

  const onDragOver = (event: DragEvent<HTMLFormElement>) => {
    if (![...event.dataTransfer.types].some((type) => type === 'Files' || type === 'text/uri-list')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    if (!dragging) setDragging(true);
  };

  const onDrop = (event: DragEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDragging(false);
    const files = imageFiles(event.dataTransfer.files);
    if (files.length > 0) {
      addImages(files);
      return;
    }
    const reference = soleUrl(event.dataTransfer.getData('text/uri-list').split('\n')[0] ?? '');
    if (reference) addReference(reference);
  };

  const removeReference = (url: string) => setReferences((current) => current.filter((item) => item.url !== url));
  const dropHandlers = {
    onDragOver,
    onDrop,
    onDragLeave: (event: DragEvent<HTMLFormElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
    },
  };
  return { images, references, dragging, fileRef, addImages, removeImage, removeReference, onPromptPaste, dropHandlers };
}
