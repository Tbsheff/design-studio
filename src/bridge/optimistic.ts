import type { ClassDelta, DomPatch, OptimisticOutcome } from '../shared/contracts.js';

type StyledElement = HTMLElement | SVGElement;

export interface PropBackup {
  value: string;
  priority: string;
}

export interface Released {
  props: Map<string, PropBackup>;
  hadAttribute: boolean | null;
  textNodes: Node[] | null;
}

export interface OptimisticDeps {
  report: (id: string, outcome: OptimisticOutcome, ms: number, reason?: string) => void;
  styleKeys: ReadonlySet<string>;
  release: (element: StyledElement, props: string[], text: boolean) => Released;
  previewing: (element: Element) => boolean;
  sourceOf: (element: Element) => Promise<{ own: string | null; usedAt: string | null }>;
}

interface Spec {
  style: Map<string, string | null>;
  add: Set<string>;
  remove: Set<string>;
  text: string | null;
}

interface Hold {
  element: StyledElement;
  props: Map<string, PropBackup>;
  expected: Map<string, string>;
  hadAttribute: boolean;
  addedByUs: Set<string>;
  removedByUs: Set<string>;
  textNode: Text | null;
  textOriginal: string | null;
}

interface Entry {
  id: string;
  patch: DomPatch;
  spec: Spec;
  hold: Hold | null;
  state: 'pending' | 'written';
  startedAt: number;
  writtenAt: number;
  sawChange: boolean;
}

export interface Optimistic {
  apply(id: string, patch: DomPatch, written: boolean): void;
  settle(id: string, ok: boolean, classes: ClassDelta | undefined, reason: string | undefined): void;
  drop(): void;
}

const WRITTEN_TIMEOUT_MS = 10_000;
const PENDING_TIMEOUT_MS = 30_000;
const MAX_ENTRIES = 50;
const MAX_CLASSES = 40;
const MAX_TEXT = 5000;
const CLASS_NAME = /^[^\s"'<>]{1,120}$/;

function isStyled(element: Element | null): element is StyledElement {
  return element instanceof HTMLElement || element instanceof SVGElement;
}

function query(selector: string): Element | null {
  try {
    return document.querySelector(selector);
  } catch {
    return null;
  }
}

function cleanClasses(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return list.filter((name): name is string => typeof name === 'string' && CLASS_NAME.test(name)).slice(0, MAX_CLASSES);
}

function emptySpec(): Spec {
  return { style: new Map(), add: new Set(), remove: new Set(), text: null };
}

function specOf(patch: DomPatch, keys: ReadonlySet<string>): Spec {
  const spec = emptySpec();
  for (const [prop, value] of Object.entries(patch.style ?? {})) {
    if (keys.has(prop) && (value === null || (typeof value === 'string' && value.length <= 200))) spec.style.set(prop, value);
  }
  mergeClasses(spec, patch.classes);
  if (typeof patch.text === 'string' && patch.text.length <= MAX_TEXT) spec.text = patch.text;
  return spec;
}

function mergeClasses(spec: Spec, delta: ClassDelta | undefined): void {
  for (const name of cleanClasses(delta?.remove)) {
    spec.add.delete(name);
    spec.remove.add(name);
  }
  for (const name of cleanClasses(delta?.add)) {
    spec.remove.delete(name);
    spec.add.add(name);
  }
}

function soleTextNode(element: Element): Text | null {
  if (element.childNodes.length !== 1) return null;
  const node = element.firstChild;
  return node instanceof Text ? node : null;
}

function newHold(element: StyledElement): Hold {
  return { element, props: new Map(), expected: new Map(), hadAttribute: element.hasAttribute('style'), addedByUs: new Set(), removedByUs: new Set(), textNode: null, textOriginal: null };
}

function adoptPreview(hold: Hold, released: Released): void {
  if (released.hadAttribute !== null) hold.hadAttribute = released.hadAttribute;
  for (const [prop, backup] of released.props) if (!hold.props.has(prop)) hold.props.set(prop, backup);
  if (released.textNodes) hold.element.replaceChildren(...released.textNodes);
}

function setStyle(hold: Hold, spec: Spec): void {
  const style = hold.element.style;
  for (const [prop, value] of spec.style) {
    if (!hold.props.has(prop)) hold.props.set(prop, { value: style.getPropertyValue(prop), priority: style.getPropertyPriority(prop) });
    if (value === null) style.removeProperty(prop);
    else style.setProperty(prop, value, 'important');
  }
}

function setClasses(hold: Hold, spec: Spec): void {
  const list = hold.element.classList;
  for (const name of spec.remove) {
    if (!list.contains(name)) continue;
    list.remove(name);
    if (hold.addedByUs.has(name)) hold.addedByUs.delete(name);
    else hold.removedByUs.add(name);
  }
  for (const name of spec.add) {
    if (list.contains(name)) continue;
    list.add(name);
    if (hold.removedByUs.has(name)) hold.removedByUs.delete(name);
    else hold.addedByUs.add(name);
  }
}

function setText(hold: Hold, spec: Spec): void {
  if (spec.text === null) return;
  const node = hold.textNode ?? soleTextNode(hold.element);
  if (!node) return;
  if (hold.textNode === null) {
    hold.textNode = node;
    hold.textOriginal = node.nodeValue;
  }
  if (node.nodeValue !== spec.text) node.nodeValue = spec.text;
}

function recordExpected(hold: Hold, spec: Spec): void {
  if (spec.style.size === 0) return;
  const computed = window.getComputedStyle(hold.element);
  for (const prop of spec.style.keys()) hold.expected.set(prop, computed.getPropertyValue(prop));
}

function paint(hold: Hold, spec: Spec): void {
  setStyle(hold, spec);
  setClasses(hold, spec);
  setText(hold, spec);
  recordExpected(hold, spec);
}

function isOurs(hold: Hold, prop: string, value: string | null): boolean {
  const style = hold.element.style;
  return value !== null && style.getPropertyPriority(prop) === 'important' && style.getPropertyValue(prop) === value;
}

function restoreProp(hold: Hold, prop: string): void {
  const original = hold.props.get(prop);
  const style = hold.element.style;
  if (!original || original.value === '') style.removeProperty(prop);
  else style.setProperty(prop, original.value, original.priority);
}

function tidyStyleAttribute(hold: Hold): void {
  if (!hold.hadAttribute && hold.element.getAttribute('style') === '') hold.element.removeAttribute('style');
}

function liftOurStyle(hold: Hold, spec: Spec): string[] {
  const lifted: string[] = [];
  for (const [prop, value] of spec.style) {
    if (!isOurs(hold, prop, value)) continue;
    restoreProp(hold, prop);
    lifted.push(prop);
  }
  return lifted;
}

function styleMismatch(hold: Hold): string | null {
  const computed = window.getComputedStyle(hold.element);
  for (const [prop, want] of hold.expected) {
    const got = computed.getPropertyValue(prop);
    if (got !== want) return `${prop} is ${got || 'unset'} on the page, not ${want}`;
  }
  return null;
}

function contentMismatch(hold: Hold, spec: Spec): string | null {
  const list = hold.element.classList;
  const missing = [...spec.add].filter((name) => !list.contains(name));
  if (missing.length > 0) return `the page does not have the class ${missing.join(' ')}`;
  const extra = [...spec.remove].filter((name) => list.contains(name));
  if (extra.length > 0) return `the page still has the class ${extra.join(' ')}`;
  if (spec.text !== null && hold.textNode && (hold.element.textContent ?? '') !== spec.text) return 'the page shows different text';
  return null;
}

function rollback(hold: Hold): void {
  for (const prop of hold.props.keys()) restoreProp(hold, prop);
  tidyStyleAttribute(hold);
  const list = hold.element.classList;
  for (const name of hold.addedByUs) list.remove(name);
  for (const name of hold.removedByUs) list.add(name);
  if (hold.textNode && hold.textOriginal !== null) hold.textNode.nodeValue = hold.textOriginal;
}

export function createOptimistic(deps: OptimisticDeps): Optimistic {
  const entries = new Map<string, Entry>();
  let observer: MutationObserver | null = null;
  let frame = 0;
  let timer = 0;

  const quiet = (work: () => void): void => {
    const before = observer?.takeRecords() ?? [];
    if (before.length > 0) noteChanges(before);
    work();
    observer?.takeRecords();
  };

  const finish = (entry: Entry, outcome: OptimisticOutcome, reason?: string): void => {
    entries.delete(entry.id);
    entry.hold?.element.removeAttribute('data-studio-pending');
    deps.report(entry.id, outcome, Math.round(performance.now() - entry.startedAt), reason);
    if (entries.size === 0) stopWatching();
  };

  const holderOf = (element: Element): Entry | undefined => [...entries.values()].find((entry) => entry.hold?.element === element);

  const takeOver = (entry: Entry, element: StyledElement): Hold => {
    const previous = holderOf(element);
    if (!previous?.hold) return newHold(element);
    const hold = previous.hold;
    previous.hold = null;
    for (const [prop, value] of previous.spec.style) if (!entry.spec.style.has(prop)) entry.spec.style.set(prop, value);
    entries.delete(previous.id);
    return hold;
  };

  const place = (entry: Entry, element: StyledElement): void => {
    quiet(() => {
      const hold = takeOver(entry, element);
      adoptPreview(hold, deps.release(element, [...entry.spec.style.keys()], entry.spec.text !== null));
      entry.hold = hold;
      paint(hold, entry.spec);
      element.setAttribute('data-studio-pending', entry.state);
    });
  };

  const reconcile = (entry: Entry, final: boolean): void => {
    const hold = entry.hold;
    if (!hold) return;
    let settled = false;
    let reason: string | null = null;
    quiet(() => {
      const lifted = liftOurStyle(hold, entry.spec);
      reason = styleMismatch(hold) ?? contentMismatch(hold, entry.spec);
      settled = reason === null || final;
      if (!settled) for (const prop of lifted) hold.element.style.setProperty(prop, entry.spec.style.get(prop) ?? '', 'important');
      else tidyStyleAttribute(hold);
    });
    if (!settled) return;
    if (reason === null) finish(entry, 'confirmed');
    else finish(entry, entry.sawChange ? 'mismatch' : 'timeout', entry.sawChange ? `Saved, but ${reason}.` : 'The page did not update after the save.');
  };

  const replaced = (entry: Entry): void => {
    const hold = entry.hold;
    if (!hold || hold.element.isConnected) return;
    entry.hold = null;
    const next = query(entry.patch.selector);
    if (isStyled(next)) place(entry, next);
  };

  const sweep = (): void => {
    frame = 0;
    const now = performance.now();
    for (const entry of [...entries.values()]) {
      replaced(entry);
      if (!entry.hold) {
        if (now - entry.startedAt > PENDING_TIMEOUT_MS) finish(entry, 'timeout', 'The element left the page before the save.');
        continue;
      }
      if (entry.state === 'pending') {
        if (now - entry.startedAt > PENDING_TIMEOUT_MS) settleFailed(entry, 'The save did not answer.');
        continue;
      }
      if (deps.previewing(entry.hold.element)) entry.writtenAt = now;
      else reconcile(entry, now - entry.writtenAt > WRITTEN_TIMEOUT_MS);
    }
  };

  const schedule = (): void => {
    if (frame === 0) frame = window.requestAnimationFrame(sweep);
  };

  function noteChanges(records: MutationRecord[]): void {
    for (const entry of entries.values()) {
      const element = entry.hold?.element;
      if (element && records.some((record) => element === record.target || element.contains(record.target))) entry.sawChange = true;
    }
    schedule();
  }

  function stopWatching(): void {
    observer?.disconnect();
    observer = null;
    window.clearInterval(timer);
    timer = 0;
  }

  const watch = (): void => {
    if (observer) return;
    observer = new MutationObserver(noteChanges);
    observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'style'] });
    timer = window.setInterval(schedule, 1000);
  };

  function settleFailed(entry: Entry, reason: string): void {
    if (entry.hold) quiet(() => entry.hold && rollback(entry.hold));
    finish(entry, 'mismatch', reason);
  }

  const verified = async (patch: DomPatch, element: StyledElement): Promise<boolean> => {
    if (patch.trusted) return true;
    if (patch.tag && element.tagName.toLowerCase() !== patch.tag.toLowerCase()) return false;
    const source = await deps.sourceOf(element);
    return patch.loc !== undefined && (source.own === patch.loc || source.usedAt === patch.loc);
  };

  const apply = (id: string, patch: DomPatch, written: boolean): void => {
    if (typeof id !== 'string' || entries.has(id) || entries.size >= MAX_ENTRIES || typeof patch?.selector !== 'string') return;
    const element = query(patch.selector);
    const now = performance.now();
    const entry: Entry = { id, patch, spec: specOf(patch, deps.styleKeys), hold: null, state: written ? 'written' : 'pending', startedAt: now, writtenAt: now, sawChange: false };
    if (!isStyled(element)) return deps.report(id, 'skipped', 0, 'No element matches the selector in this frame.');
    entries.set(id, entry);
    void verified(patch, element).then((ok) => {
      if (entries.get(id) !== entry) return;
      if (!ok || !element.isConnected) return finish(entry, 'skipped', 'The element in this frame is not the edited one.');
      watch();
      place(entry, element);
    });
  };

  const settle = (id: string, ok: boolean, classes: ClassDelta | undefined, reason: string | undefined): void => {
    const entry = entries.get(id);
    if (!entry) return;
    if (!ok) return settleFailed(entry, typeof reason === 'string' ? reason.slice(0, 300) : 'The save failed.');
    entry.state = 'written';
    entry.writtenAt = performance.now();
    mergeClasses(entry.spec, classes);
    const hold = entry.hold;
    if (hold)
      quiet(() => {
        setClasses(hold, entry.spec);
        hold.element.setAttribute('data-studio-pending', 'written');
      });
    schedule();
  };

  const drop = (): void => {
    for (const entry of [...entries.values()]) {
      if (entry.hold) quiet(() => entry.hold && rollback(entry.hold));
      finish(entry, 'skipped', 'Dropped for undo or discard.');
    }
  };

  return { apply, settle, drop };
}
