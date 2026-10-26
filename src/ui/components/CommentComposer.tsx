import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from 'react';
import type { CompiledTokenEntry, ComponentInfo, RunMention, SelectionContext } from '../../shared/contracts';
import { api } from '../api';
import { CARD_WIDTH, placeComposer, useCardSize, type Breadcrumb, type CardSide } from '../commentPlacement';
import { useMentions } from '../useMentions';
import { AvatarFace } from './CommentAvatar';
import { MOD_LABEL, trapTab } from './CommentPopover';
import { Icon } from './Icon';
import { MentionList, mentionIcon, mentionKey, mentionLabel, mentionTitle, type MentionOption } from './MentionPicker';

type Rect = SelectionContext['rect'];

export interface ComposerSources {
  projectId: string;
  directionId: string | null;
  tokens?: readonly CompiledTokenEntry[];
  components?: readonly ComponentInfo[] | null;
}

export interface ComposerSubmit {
  text: string;
  toClaude: boolean;
  now: boolean;
  mentions: RunMention[];
  attachmentIds: string[];
}

interface ComposerProps {
  label: string;
  testId: string;
  anchor: Rect;
  zoom: number;
  frame: { width: number; height: number };
  breadcrumb: Breadcrumb;
  initial: string | null;
  autoFocus: boolean;
  trap: boolean;
  focusRef?: RefObject<HTMLTextAreaElement | null>;
  draftKey: string;
  running: boolean;
  busy: boolean;
  sources: ComposerSources;
  images: boolean;
  steer: boolean;
  onSubmit: (input: ComposerSubmit) => Promise<boolean>;
  onCancel: () => void;
}

interface ImageChip {
  key: string;
  url: string;
  name: string;
  id: string | null;
  failed: boolean;
}

const SEND_KEY = 'studio.comments.sendToClaude';
const IMAGE_MAX = 4;
const CLOSE_MS = 120;
const drafts = new Map<string, string>();

const CLAUDE_OPTION: MentionOption = {
  key: 'agent:claude',
  label: 'Claude',
  detail: 'Send to Claude',
  icon: 'sparkle',
  mention: { kind: 'component', name: 'Claude', file: null, selector: null },
};

function readSend(): boolean {
  try {
    return window.localStorage.getItem(SEND_KEY) !== '0';
  } catch {
    return true;
  }
}

function writeSend(on: boolean): void {
  try {
    window.localStorage.setItem(SEND_KEY, on ? '1' : '0');
  } catch {
    return;
  }
}

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

function imageFiles(list: FileList | null | undefined): File[] {
  return Array.from(list ?? []).filter((file) => file.type.startsWith('image/'));
}

let imageCounter = 0;

function useImages(projectId: string) {
  const [images, setImages] = useState<ImageChip[]>([]);
  const live = useRef(images);
  live.current = images;
  useEffect(() => () => live.current.forEach((image) => URL.revokeObjectURL(image.url)), []);
  const add = (files: File[]) => {
    const room = IMAGE_MAX - live.current.length;
    for (const file of files.slice(0, Math.max(0, room))) {
      imageCounter += 1;
      const key = `img${imageCounter}`;
      setImages((prev) => [
        ...prev,
        {
          key,
          url: URL.createObjectURL(file),
          name: file.name || 'Pasted image',
          id: null,
          failed: false,
        },
      ]);
      api.uploadAttachment(projectId, file).then(
        (attachment) => setImages((prev) => prev.map((image) => (image.key === key ? { ...image, id: attachment.id } : image))),
        () => setImages((prev) => prev.map((image) => (image.key === key ? { ...image, failed: true } : image))),
      );
    }
  };
  const remove = (key: string) =>
    setImages((prev) => {
      const gone = prev.find((image) => image.key === key);
      if (gone) URL.revokeObjectURL(gone.url);
      return prev.filter((image) => image.key !== key);
    });
  return {
    images,
    add,
    remove,
    pending: images.some((image) => image.id === null && !image.failed),
  };
}

const LEAD_GAP = 6;
const MIN_FIRST_LINE = 140;

function useLeadWidth(leadRef: RefObject<HTMLSpanElement | null>, card: RefObject<HTMLDivElement | null>) {
  const [state, setState] = useState({ width: 0, inline: false });
  useLayoutEffect(() => {
    const measure = () => {
      const lead = leadRef.current;
      const field = lead?.parentElement;
      if (!lead || !field) {
        setState((prev) => (prev.width === 0 && !prev.inline ? prev : { width: 0, inline: false }));
        return;
      }
      const width = Math.ceil(lead.scrollWidth);
      const inline = lead.querySelector('.comment-thumb') === null && width + LEAD_GAP + MIN_FIRST_LINE <= field.clientWidth;
      setState((prev) => (prev.width === width && prev.inline === inline ? prev : { width, inline }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (leadRef.current) observer.observe(leadRef.current);
    if (card.current) observer.observe(card.current);
    return () => observer.disconnect();
  });
  return state;
}

function Pill({
  icon,
  label,
  title,
  tip,
  tone,
  onRemove,
}: {
  icon?: Parameters<typeof Icon>[0]['name'];
  label: string;
  title?: string;
  tip?: string;
  tone?: string;
  onRemove: () => void;
}) {
  return (
    <span className={`comment-pill ${tone ?? ''}`} title={title} data-tip={tip} data-tip-side="top" data-testid="comment-pill">
      {icon && <Icon name={icon} size={12} />}
      <span className="comment-pill-label">{label}</span>
      <button type="button" tabIndex={-1} aria-label={`Remove ${label}`} onClick={onRemove}>
        <Icon name="close" size={10} />
      </button>
    </span>
  );
}

function RunHint({ queueOnly }: { queueOnly: boolean }) {
  return (
    <p className="comment-card-hint" role="note" data-testid="comment-run-hint">
      <span className="comment-card-live" aria-hidden="true" />
      {queueOnly ? (
        <>
          Claude is working. <kbd>↵</kbd> queues this for after the run.
        </>
      ) : (
        <>
          Claude is working. <kbd>↵</kbd> queues this · <kbd>{MOD_LABEL}↵</kbd> sends it now
        </>
      )}
    </p>
  );
}

interface FootProps {
  toClaude: boolean;
  onToClaude: (on: boolean) => void;
  blocked: boolean;
  submitting: boolean;
  onSubmit: () => void;
  hint: { queueOnly: boolean } | null;
}

function ComposerFoot({ toClaude, onToClaude, blocked, submitting, onSubmit, hint }: FootProps) {
  return (
    <>
      <div className="comment-card-foot">
        <label className="comment-check">
          <input type="checkbox" checked={toClaude} onChange={(event) => onToClaude(event.target.checked)} />
          <span>Send to Claude</span>
        </label>
        <button
          type="button"
          className={`comment-submit${toClaude ? ' to-claude' : ''}`}
          aria-label={toClaude ? 'Send' : 'Save comment'}
          aria-keyshortcuts="Enter"
          data-tip={toClaude ? 'Send  ↵' : 'Save comment  ↵'}
          data-tip-side="top"
          disabled={blocked}
          onClick={onSubmit}
        >
          {submitting ? <span className="spinner" /> : <Icon name={toClaude ? 'arrowUp' : 'check'} size={14} />}
        </button>
      </div>
      {hint && <RunHint queueOnly={hint.queueOnly} />}
    </>
  );
}

export function CommentComposer(props: ComposerProps) {
  const [text, setTextState] = useState(() => drafts.get(props.draftKey) ?? '');
  const [toClaude, setToClaudeState] = useState(readSend);
  const [closing, setClosing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const own = useRef<HTMLTextAreaElement>(null);
  const area = props.focusRef ?? own;
  const card = useRef<HTMLDivElement>(null);
  const side = useRef<CardSide | undefined>(undefined);
  const size = useCardSize(card);
  const images = useImages(props.sources.projectId);
  const leadRef = useRef<HTMLSpanElement>(null);
  const leadBox = useLeadWidth(leadRef, card);

  const setText = (value: string) => {
    setTextState(value);
    if (value.trim() === '') drafts.delete(props.draftKey);
    else drafts.set(props.draftKey, value);
  };
  const setToClaude = (on: boolean) => {
    setToClaudeState(on);
    writeSend(on);
  };
  const lead = useMemo(() => (toClaude ? [] : [CLAUDE_OPTION]), [toClaude]);
  const mentions = useMentions({
    projectId: props.sources.projectId,
    directionId: props.sources.directionId,
    tokens: props.sources.tokens,
    components: props.sources.components,
    draft: text,
    setDraft: setText,
    lead,
    onLead: () => setToClaude(true),
  });

  useEffect(() => {
    if (props.autoFocus) area.current?.focus({ preventScroll: true });
  }, [props.autoFocus, area]);

  const placement = placeComposer(props.anchor, props.zoom, props.frame, size, side.current);
  side.current = placement.side;
  const scale = 1 / props.zoom;
  const empty = text.trim() === '';
  const blocked = empty || props.busy || submitting || images.pending;
  const readyImages = images.images.filter((image) => image.id !== null).map((image) => image.id as string);

  const closeTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    },
    [],
  );
  const closeWith = (finish: () => void) => {
    if (reducedMotion()) {
      finish();
      return;
    }
    setClosing(true);
    closeTimer.current = window.setTimeout(finish, CLOSE_MS);
  };

  const submit = async (now: boolean) => {
    if (blocked) return;
    setSubmitting(true);
    const ok = await props.onSubmit({
      text: text.trim(),
      toClaude,
      now,
      mentions: mentions.mentions,
      attachmentIds: readyImages,
    });
    setSubmitting(false);
    if (!ok) return;
    drafts.delete(props.draftKey);
    setTextState('');
    mentions.clear();
  };

  const removeLast = (): boolean => {
    const lastImage = images.images[images.images.length - 1];
    if (lastImage) {
      images.remove(lastImage.key);
      return true;
    }
    const lastMention = mentions.mentions[mentions.mentions.length - 1];
    if (lastMention) {
      mentions.remove(mentionKey(lastMention));
      return true;
    }
    if (toClaude) {
      setToClaude(false);
      return true;
    }
    return false;
  };

  const onCardKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (mentions.onKeyDown(event)) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeWith(props.onCancel);
      return;
    }
    if (props.trap) trapTab(event, card.current);
  };

  const onAreaKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing || mentions.onKeyDown(event)) return;
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submit(event.metaKey || event.ctrlKey);
      return;
    }
    const caretAtStart = event.currentTarget.selectionStart === 0 && event.currentTarget.selectionEnd === 0;
    if (event.key === 'Backspace' && caretAtStart && removeLast()) event.preventDefault();
  };

  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    if (!props.images) return;
    const files = imageFiles(event.clipboardData.files);
    if (files.length === 0) return;
    event.preventDefault();
    images.add(files);
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (props.images && event.dataTransfer.types.includes('Files')) event.preventDefault();
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!props.images) return;
    const files = imageFiles(event.dataTransfer.files);
    if (files.length === 0) return;
    event.preventDefault();
    images.add(files);
    area.current?.focus();
  };

  const focusField = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    area.current?.focus();
  };

  const state = closing ? ' closing' : '';
  const hasLead = toClaude || mentions.mentions.length > 0 || images.images.length > 0;
  return (
    <>
      <div
        className={`composer-pin${state}`}
        style={{
          left: placement.pin.left,
          top: placement.pin.top,
          transform: `scale(${scale})`,
        }}
        aria-hidden="true"
      >
        <AvatarFace initial={props.initial} flip={placement.pin.flip} />
      </div>
      <div
        ref={card}
        className={`comment-card${state}`}
        role="dialog"
        aria-label={props.label}
        aria-describedby={`${props.testId}-crumb`}
        data-testid={props.testId}
        data-side={placement.side}
        style={{
          left: placement.card.left,
          top: placement.card.top,
          width: CARD_WIDTH,
          transform: `scale(${scale})`,
        }}
        onKeyDown={onCardKey}
        onPointerDown={(event) => event.stopPropagation()}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <p className="comment-card-crumb" id={`${props.testId}-crumb`} title={props.breadcrumb.full}>
          {props.breadcrumb.short}
        </p>
        <div className={`comment-field${leadBox.inline ? ' inline' : ''}`} onPointerDown={focusField}>
          {hasLead && (
            <span ref={leadRef} className="comment-lead">
              {toClaude && <Pill label="@Claude" tone="claude" tip="This goes to Claude" onRemove={() => setToClaude(false)} />}
              {mentions.mentions.map((mention) => (
                <Pill
                  key={mentionKey(mention)}
                  icon={mentionIcon(mention)}
                  label={mentionLabel(mention)}
                  title={mentionTitle(mention)}
                  onRemove={() => mentions.remove(mentionKey(mention))}
                />
              ))}
              {images.images.map((image) => (
                <span
                  key={image.key}
                  className={`comment-thumb${image.id ? '' : ' loading'}${image.failed ? ' failed' : ''}`}
                  title={image.failed ? `${image.name} did not upload` : image.name}
                  data-testid="comment-image"
                >
                  <img src={image.url} alt="" />
                  <button type="button" tabIndex={-1} aria-label={`Remove ${image.name}`} onClick={() => images.remove(image.key)}>
                    <Icon name="close" size={10} />
                  </button>
                </span>
              ))}
            </span>
          )}
          <textarea
            ref={area}
            className="comment-area"
            style={leadBox.inline ? { textIndent: leadBox.width + LEAD_GAP } : undefined}
            rows={1}
            aria-label={props.label}
            placeholder="Add a comment or ask Claude…"
            value={text}
            maxLength={2000}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onAreaKey}
            onPaste={onPaste}
          />
        </div>
        {mentions.picker.open && (
          <MentionList
            className="comment-mentions"
            shown={mentions.picker.shown}
            current={mentions.picker.current}
            loading={mentions.loading}
            onPick={mentions.pick}
            onHover={mentions.picker.setActive}
          />
        )}
        <ComposerFoot
          toClaude={toClaude}
          onToClaude={setToClaude}
          blocked={blocked}
          submitting={submitting}
          onSubmit={() => void submit(false)}
          hint={props.running && toClaude ? { queueOnly: !props.steer || readyImages.length > 0 } : null}
        />
      </div>
    </>
  );
}
