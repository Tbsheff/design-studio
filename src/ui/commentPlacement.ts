import { useLayoutEffect, useState, type RefObject } from 'react';
import type { SelectionContext } from '../shared/contracts';

type Rect = SelectionContext['rect'];
type Size = { width: number; height: number };

export const PIN_SIZE = 28;
export const CARD_WIDTH = 400;
const GAP = 8;

export type CardSide = 'right' | 'left' | 'below' | 'above' | 'over';

export interface PinPlacement {
  left: number;
  top: number;
  flip: boolean;
}

export interface ComposerPlacement {
  side: CardSide;
  pin: PinPlacement;
  card: { left: number; top: number };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, Math.max(min, max)));
}

export function pinPlacement(rect: Rect, zoom: number, frame: Size): PinPlacement {
  const pin = PIN_SIZE / zoom;
  const right = rect.x + rect.width;
  const flip = right + pin > frame.width;
  const left = flip ? rect.x - pin : right;
  return {
    left: clamp(left, 0, frame.width - pin),
    top: clamp(rect.y, 0, frame.height - pin),
    flip,
  };
}

function fits(left: number, top: number, width: number, height: number, frame: Size): boolean {
  return left >= 0 && top >= 0 && left + width <= frame.width && top + height <= frame.height;
}

export function placeComposer(rect: Rect, zoom: number, frame: Size, card: Size, prefer?: CardSide): ComposerPlacement {
  const s = 1 / zoom;
  const pin = PIN_SIZE * s;
  const gap = GAP * s;
  const width = card.width * s;
  const height = card.height * s;
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;
  const vertical = clamp(rect.y, 0, frame.height - height);
  const options: Record<CardSide, ComposerPlacement> = {
    right: {
      side: 'right',
      pin: { left: right, top: rect.y, flip: false },
      card: { left: right + pin + gap, top: vertical },
    },
    left: {
      side: 'left',
      pin: { left: rect.x - pin, top: rect.y, flip: true },
      card: { left: rect.x - pin - gap - width, top: vertical },
    },
    below: {
      side: 'below',
      pin: { left: rect.x, top: bottom + gap, flip: false },
      card: {
        left: clamp(rect.x + pin + gap, 0, frame.width - width),
        top: bottom + gap,
      },
    },
    above: {
      side: 'above',
      pin: { left: rect.x, top: rect.y - gap - pin, flip: false },
      card: {
        left: clamp(rect.x + pin + gap, 0, frame.width - width),
        top: rect.y - gap - height,
      },
    },
    over: {
      side: 'over',
      pin: { left: rect.x, top: rect.y, flip: false },
      card: {
        left: clamp(rect.x + pin + gap, 0, frame.width - width),
        top: vertical,
      },
    },
  };
  const order: CardSide[] = ['right', 'left', 'below', 'above'];
  const fitting = (side: CardSide) => {
    const option = options[side];
    return fits(option.card.left, option.card.top, width, height, frame) && fits(option.pin.left, option.pin.top, pin, pin, frame);
  };
  const side = prefer && prefer !== 'over' && fitting(prefer) ? prefer : (order.find(fitting) ?? 'over');
  const chosen = options[side];
  return {
    side,
    pin: {
      ...chosen.pin,
      left: clamp(chosen.pin.left, 0, frame.width - pin),
      top: clamp(chosen.pin.top, 0, frame.height - pin),
    },
    card: {
      left: clamp(chosen.card.left, 0, frame.width - width),
      top: clamp(chosen.card.top, 0, frame.height - height),
    },
  };
}

const TEXT_TAGS = new Set([
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'span',
  'label',
  'strong',
  'em',
  'small',
  'li',
  'blockquote',
  'figcaption',
  'dt',
  'dd',
  'td',
  'th',
]);

const KIND_OF_TAG: Record<string, string> = {
  a: 'link',
  button: 'button',
  img: 'image',
  picture: 'image',
  video: 'video',
  svg: 'icon',
  input: 'field',
  textarea: 'field',
  select: 'field',
  nav: 'nav',
  header: 'header',
  footer: 'footer',
  form: 'form',
};

function snippet(text: string, max: number): string {
  const line = text.replace(/\s+/g, ' ').trim();
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}

function className(selection: SelectionContext): string | null {
  const match = /^<[^>]*\bclass="([^"]*)"/.exec(selection.outerHTML.slice(0, 4000));
  const first = match?.[1]?.trim().split(/\s+/)[0];
  return first ? first : null;
}

export function elementLabel(selection: SelectionContext): string {
  const tag = selection.tag.toLowerCase();
  const text = snippet(selection.text, 32);
  const kind = TEXT_TAGS.has(tag) ? 'text' : (KIND_OF_TAG[tag] ?? null);
  if (kind && text) return `${kind} “${text}”`;
  if (kind) return kind;
  const cls = className(selection);
  if (cls) return `${tag}.${cls}`;
  return text ? `${tag} “${text}”` : tag;
}

export interface Breadcrumb {
  short: string;
  full: string;
}

function parentLabel(selection: SelectionContext): string | null {
  const meaningful = selection.ancestors.find(
    (label) => label.includes('.') || ['section', 'header', 'footer', 'nav', 'main', 'aside', 'form', 'article'].includes(label),
  );
  return meaningful ?? null;
}

export function breadcrumbOf(page: string, selections: SelectionContext[]): Breadcrumb {
  const last = selections[selections.length - 1];
  if (!last) return { short: page, full: page };
  if (selections.length > 1) {
    const full = [page, ...selections.map(elementLabel)].join(' › ');
    return { short: `${page} › ${selections.length} elements`, full };
  }
  const parent = parentLabel(last);
  const element = elementLabel(last);
  const chain = [...last.ancestors].reverse().filter((label) => label !== 'html');
  return {
    short: [page, parent, element].filter((part): part is string => Boolean(part)).join(' › '),
    full: [page, ...chain, element].join(' › '),
  };
}

export function scopeText(breadcrumb: Breadcrumb, selections: SelectionContext[], text: string): string {
  const selectors = selections.map((selection) => `\`${selection.selector}\``).join(', ');
  return `About ${breadcrumb.short} (${selectors}): ${text}`;
}

export function useCardSize(card: RefObject<HTMLDivElement | null>) {
  const [height, setHeight] = useState(112);
  useLayoutEffect(() => {
    const element = card.current;
    if (!element) return;
    setHeight(element.offsetHeight);
    const observer = new ResizeObserver(() => setHeight(element.offsetHeight));
    observer.observe(element);
    return () => observer.disconnect();
  }, [card]);
  return { width: CARD_WIDTH, height };
}
