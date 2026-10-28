import { useEffect, useRef, useState, type KeyboardEvent, type MutableRefObject, type PointerEvent } from 'react';
import type { PreviewPort } from '../bridge';
import type { SelectionContext } from '../../shared/contracts';
import { IMAGE_ACCEPT, IMAGE_FITS, focalOf, focalText, imageKindOf, type ImageFit, type SetImageRequest } from '../../shared/image';
import { clipboardImage, fileData, imageApi, imageError, imageFileOf, imageTargetOf } from '../imageApi';
import { isTypingTarget } from '../typingTarget';
import { Icon } from './Icon';
import { InspectorSection } from './InspectorFields';
import '../styles/inspector-image.css';

interface Props {
  projectId: string;
  directionId: string;
  selection: SelectionContext;
  editable: boolean;
  port?: MutableRefObject<PreviewPort | null>;
}

const RESELECT_AFTER_MS = [700, 1800];

const FIT_LABEL: Record<ImageFit, string> = { cover: 'Cover', contain: 'Contain', fill: 'Fill' };
const FIT_TIP: Record<ImageFit, string> = { cover: 'Fill the box and crop the edges', contain: 'Show the whole image inside the box', fill: 'Stretch the image to the box' };

function attrOf(html: string, name: string): string | null {
  const open = /^<[^>]*>/.exec(html)?.[0] ?? '';
  const match = new RegExp(`\\s${name}="([^"]*)"`, 'i').exec(open);
  if (!match) return null;
  const node = document.createElement('textarea');
  node.innerHTML = match[1] ?? '';
  return node.value;
}

function currentFit(selection: SelectionContext, background: boolean): ImageFit | null {
  const raw = (background ? selection.styles['background-size'] : selection.styles['object-fit']) ?? '';
  if (raw === 'cover' || raw === 'contain' || raw === 'fill') return raw;
  return background && /^100% 100%$/.test(raw) ? 'fill' : null;
}

function sourceName(selection: SelectionContext, background: boolean): string {
  const raw = background ? (/url\(["']?([^"')]+)/.exec(selection.styles['background-image'] ?? '')?.[1] ?? '') : (attrOf(selection.outerHTML, 'src') ?? '');
  const last = raw.split(/[?#]/)[0]?.split('/').pop() ?? '';
  return last.startsWith('data:') || last === '' ? 'Inline image' : decodeURIComponent(last).slice(0, 60);
}

function useImageSet(props: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<string | null>(null);
  const reselect = () => {
    for (const wait of RESELECT_AFTER_MS) window.setTimeout(() => props.port?.current?.post({ type: 'select-selector', selector: props.selection.selector }), wait);
  };
  const run = async (change: Omit<SetImageRequest, 'target'>, file?: Blob | null) => {
    if (!props.editable || busy) return;
    setBusy(true);
    setError(null);
    try {
      const image = file ? await fileData(file) : undefined;
      const result = await imageApi.set(props.projectId, props.directionId, { target: imageTargetOf(props.selection), ...change, ...(image ? { image } : {}) });
      if (result.src) setPlaced(result.src.split('/').pop() ?? null);
      if (result.changed) reselect();
    } catch (failure) {
      setError(imageError(failure));
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run, setError, placed };
}

function usePasteImage(enabled: boolean, onImage: (file: File) => void) {
  const live = useRef(onImage);
  live.current = onImage;
  useEffect(() => {
    if (!enabled) return;
    const onPaste = (event: ClipboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const file = imageFileOf(event.clipboardData?.items);
      if (!file) return;
      event.preventDefault();
      live.current(file);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [enabled]);
}

function FocalPad({ value, disabled, onPick }: { value: string; disabled: boolean; onPick: (focal: string) => void }) {
  const [drag, setDrag] = useState<string | null>(null);
  const point = focalOf(drag ?? value);
  const at = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return focalText(((event.clientX - rect.left) / rect.width) * 100, ((event.clientY - rect.top) / rect.height) * 100);
  };
  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 5;
    const move = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
    if (!move) return;
    event.preventDefault();
    onPick(focalText(point.x + (move[0] ?? 0), point.y + (move[1] ?? 0)));
  };
  return (
    <div
      className={`img-focal${disabled ? ' off' : ''}`}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label="Focal point"
      aria-valuetext={focalText(point.x, point.y)}
      data-tip="Click or drag to set the part of the image that stays in view"
      onPointerDown={(event) => {
        if (disabled) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        setDrag(at(event));
      }}
      onPointerMove={(event) => drag !== null && setDrag(at(event))}
      onPointerUp={(event) => {
        if (drag === null) return;
        const next = at(event);
        setDrag(null);
        onPick(next);
      }}
      onKeyDown={onKey}
    >
      <span className="img-focal-dot" style={{ left: `${point.x}%`, top: `${point.y}%` }} />
    </div>
  );
}

function AltField({ initial, disabled, onSave }: { initial: string; disabled: boolean; onSave: (alt: string) => void }) {
  const [text, setText] = useState<string | null>(null);
  const commit = () => {
    if (text !== null && text !== initial) onSave(text);
    setText(null);
  };
  return (
    <div className="ins-field wide">
      <label htmlFor="img-alt" className="ins-scrub static">
        Alt
      </label>
      <input
        id="img-alt"
        className="ins-input"
        aria-label="Alt text"
        value={text ?? initial}
        placeholder="Describe the image"
        disabled={disabled}
        spellCheck
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') setText(null);
        }}
      />
    </div>
  );
}

export default function InspectorImage(props: Props) {
  const kind = imageKindOf(props.selection);
  const background = kind === 'background';
  const { busy, error, run, setError, placed } = useImageSet(props);
  const [alt, setAlt] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [fit, setFit] = useState<ImageFit | null>(() => currentFit(props.selection, background));
  const [focal, setFocal] = useState(() => (background ? props.selection.styles['background-position'] : props.selection.styles['object-position']) ?? '50% 50%');
  usePasteImage(props.editable && kind !== null, (file) => void run({}, file));
  if (!kind) return null;
  const disabled = !props.editable || busy;
  const paste = async () => {
    try {
      const blob = await clipboardImage();
      if (blob) await run({}, blob);
      else setError('The clipboard has no image. Copy an image, then try again.');
    } catch {
      setError('The studio cannot read the clipboard. Allow clipboard access, then try again.');
    }
  };
  return (
    <InspectorSection title={background ? 'Background image' : 'Image'} label={<span className="img-name">{placed ?? sourceName(props.selection, background)}</span>}>
      <div className="img-rows">
        <div className="img-actions">
          <button type="button" className="btn small" disabled={disabled} data-tip="Pick an image file. You can also drop one on the canvas." onClick={() => fileInput.current?.click()}>
            <Icon name="image" size={12} />
            {busy ? 'Placing…' : 'Replace'}
          </button>
          <button type="button" className="btn ghost small" disabled={disabled} data-tip="Use the image on the clipboard" onClick={() => void paste()}>
            Paste
          </button>
          <input
            ref={fileInput}
            type="file"
            accept={IMAGE_ACCEPT}
            hidden
            aria-label="Image file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void run({}, file);
            }}
          />
        </div>
        <div className="segmented img-fit" role="group" aria-label="Fit">
          {IMAGE_FITS.map((option) => (
            <button
              key={option}
              type="button"
              className={fit === option ? 'on' : ''}
              aria-pressed={fit === option}
              disabled={disabled}
              data-tip={FIT_TIP[option]}
              onClick={() => {
                setFit(option);
                void run({ fit: option });
              }}
            >
              {FIT_LABEL[option]}
            </button>
          ))}
        </div>
        <div className="img-focal-row">
          <FocalPad
            value={focal}
            disabled={disabled}
            onPick={(next) => {
              setFocal(next);
              void run({ focal: next });
            }}
          />
          <span className="img-focal-text">{focalText(focalOf(focal).x, focalOf(focal).y)}</span>
        </div>
        {!background && (
          <AltField
            initial={alt ?? attrOf(props.selection.outerHTML, 'alt') ?? ''}
            disabled={disabled}
            onSave={(next) => {
              setAlt(next);
              void run({ alt: next });
            }}
          />
        )}
        {error && (
          <p className="ins-error img-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </InspectorSection>
  );
}
