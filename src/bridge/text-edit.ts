import type { BridgeToParent } from '../shared/contracts.js';

type TextEditBody =
  | Omit<Extract<BridgeToParent, { type: 'text-edit' }>, 'ns' | 'token'>
  | Omit<Extract<BridgeToParent, { type: 'text-commit' }>, 'ns' | 'token'>
  | { type: 'hover'; rect: null };

export interface TextEditDeps {
  post: (body: TextEditBody) => void;
  selectorFor: (element: Element) => string;
  previewText: (selector: string, text: string) => void;
  onStart: (element: Element) => void;
}

export interface TextEditor {
  editing(): boolean;
  owns(element: Element | null): boolean;
  allow(on: boolean): void;
  canEdit(element: Element | null): element is HTMLElement;
  start(element: HTMLElement, at?: { x: number; y: number }): void;
  commit(): void;
  cancel(): void;
  onKeyDown(event: KeyboardEvent): boolean;
}

const MAX_EDIT_TEXT = 5000;
const EDIT_ATTR = 'data-studio-text-edit';
const STYLE_ID = 'studio-text-edit-style';
const CARET_COLOR = 'oklch(0.55 0.18 254)';
const NON_TEXT_TAGS = new Set(['script', 'style', 'template', 'iframe', 'textarea', 'img', 'input', 'select', 'option', 'br', 'hr', 'svg', 'video', 'audio', 'canvas', 'html', 'body', 'head']);

interface Session {
  element: HTMLElement;
  selector: string;
  nodes: Node[];
  data: Map<Node, string>;
  original: string;
  hadEditable: string | null;
}

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `[${EDIT_ATTR}]{outline:none!important;caret-color:${CARET_COLOR}!important;cursor:text!important;-webkit-user-select:text!important;user-select:text!important}`;
  document.head.appendChild(style);
}

function plainText(element: Element): string {
  let text = '';
  for (const node of Array.from(element.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) text += (node as Text).data;
    else if (node instanceof HTMLBRElement) text += '\n';
    else if (node instanceof Element) text += plainText(node);
  }
  return text;
}

function caretAt(x: number, y: number): Range | null {
  const doc = document as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null };
  const position = doc.caretPositionFromPoint?.(x, y);
  if (position) {
    const range = document.createRange();
    range.setStart(position.offsetNode, position.offset);
    return range;
  }
  return document.caretRangeFromPoint?.(x, y) ?? null;
}

function placeCaret(element: HTMLElement, at?: { x: number; y: number }): void {
  const selection = window.getSelection();
  if (!selection) return;
  let range = at ? caretAt(at.x, at.y) : null;
  if (!range || !element.contains(range.startContainer)) {
    range = document.createRange();
    range.selectNodeContents(element);
  } else {
    range.collapse(true);
  }
  selection.removeAllRanges();
  selection.addRange(range);
}

function insertPlain(event: ClipboardEvent): void {
  event.preventDefault();
  const text = event.clipboardData?.getData('text/plain') ?? '';
  document.execCommand('insertText', false, text);
}

export function createTextEditor(deps: TextEditDeps): TextEditor {
  let allowed = false;
  let session: Session | null = null;

  const restore = (current: Session): void => {
    current.element.replaceChildren(...current.nodes);
    for (const [node, data] of current.data) (node as CharacterData).data = data;
  };

  const finish = (current: Session): void => {
    session = null;
    const { element } = current;
    element.removeEventListener('blur', onBlur);
    element.removeEventListener('paste', insertPlain);
    element.removeAttribute(EDIT_ATTR);
    if (current.hadEditable === null) element.removeAttribute('contenteditable');
    else element.setAttribute('contenteditable', current.hadEditable);
    window.getSelection()?.removeAllRanges();
    if (document.activeElement === element) element.blur();
  };

  const cancel = (): void => {
    const current = session;
    if (!current) return;
    finish(current);
    restore(current);
    deps.post({ type: 'text-edit', selector: current.selector, state: 'cancel' });
  };

  const commit = (): void => {
    const current = session;
    if (!current) return;
    const text = plainText(current.element).trim();
    finish(current);
    restore(current);
    if (text === current.original.trim() || text.length > MAX_EDIT_TEXT) {
      deps.post({ type: 'text-edit', selector: current.selector, state: 'cancel' });
      return;
    }
    deps.previewText(current.selector, text);
    deps.post({ type: 'text-commit', selector: current.selector, text, at: performance.timeOrigin + performance.now() });
  };

  function onBlur(): void {
    commit();
  }

  const canEdit = (element: Element | null): element is HTMLElement =>
    allowed &&
    element instanceof HTMLElement &&
    element.isConnected &&
    element.children.length === 0 &&
    !NON_TEXT_TAGS.has(element.tagName.toLowerCase()) &&
    !element.isContentEditable &&
    (element.textContent ?? '').length <= MAX_EDIT_TEXT;

  const start = (element: HTMLElement, at?: { x: number; y: number }): void => {
    if (session?.element === element) return;
    commit();
    if (!canEdit(element)) return;
    const nodes = Array.from(element.childNodes);
    const data = new Map<Node, string>();
    for (const node of nodes) if (node instanceof CharacterData) data.set(node, node.data);
    session = { element, selector: deps.selectorFor(element), nodes, data, original: element.textContent ?? '', hadEditable: element.getAttribute('contenteditable') };
    deps.onStart(element);
    ensureStyle();
    element.setAttribute(EDIT_ATTR, '');
    element.contentEditable = 'plaintext-only';
    if (element.contentEditable !== 'plaintext-only') {
      element.contentEditable = 'true';
      element.addEventListener('paste', insertPlain);
    }
    element.focus({ preventScroll: true });
    placeCaret(element, at);
    element.addEventListener('blur', onBlur);
    deps.post({ type: 'text-edit', selector: session.selector, state: 'start' });
  };

  const onKeyDown = (event: KeyboardEvent): boolean => {
    if (!session) return false;
    const plain = !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
    if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
    } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey || plain)) {
      event.preventDefault();
      if (!event.repeat) commit();
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
    }
    event.stopImmediatePropagation();
    return true;
  };

  return {
    editing: () => session !== null,
    owns: (element) => session !== null && element !== null && session.element.contains(element),
    allow: (on) => {
      allowed = on;
      if (!on) cancel();
    },
    canEdit,
    start,
    commit,
    cancel,
    onKeyDown,
  };
}
