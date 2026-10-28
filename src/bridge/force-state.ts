const STYLE_ID = 'studio-force-state';
const ATTR = 'data-studio-force';
const REBUILD_MS = 120;
const RESIZE_MS = 150;
const ALWAYS = '(min-width: 0px)';
const DARK_MEDIA = /\(\s*prefers-color-scheme\s*:\s*dark\s*\)/g;
const DARK_TEST = /\(\s*prefers-color-scheme\s*:\s*dark\s*\)/;
const HOVER_MEDIA = /\(\s*hover\s*:\s*hover\s*\)/g;
const CLIMBING = new Set(['hover', 'active']);

export type ForcedState = 'hover' | 'focus' | 'active';

interface Forced {
  selector: string;
  states: ForcedState[];
  dark: boolean;
  track: boolean;
}

export interface ForceStateControl {
  set: (selector: string | null, states: ForcedState[], dark: boolean, track: boolean) => void;
  schedule: () => void;
}

function stateRule(state: ForcedState): RegExp {
  return new RegExp(`:${state}(?![-\\w])`, 'g');
}

function rewrite(text: string, forced: Forced): string | null {
  let out = text;
  let hit = false;
  for (const state of forced.states) {
    const pattern = stateRule(state);
    if (!pattern.test(out)) continue;
    hit = true;
    out = out.replace(stateRule(state), `[${ATTR}~="${state}"]`);
  }
  if (forced.dark && DARK_TEST.test(out)) {
    hit = true;
    out = out.replace(DARK_MEDIA, ALWAYS);
  }
  if (hit && forced.states.includes('hover')) out = out.replace(HOVER_MEDIA, ALWAYS);
  return hit ? out : null;
}

function rulesOf(sheet: CSSStyleSheet | null): CSSRule[] {
  if (!sheet) return [];
  try {
    return Array.from(sheet.cssRules);
  } catch {
    return [];
  }
}

function wrapped(rule: CSSGroupingRule, head: string, forced: Forced, keepAll: boolean): string | null {
  const inner = Array.from(rule.cssRules)
    .map((child) => cloneRule(child, forced) ?? (keepAll ? child.cssText : null))
    .filter((text): text is string => text !== null);
  if (inner.length === 0) return null;
  return head ? `${head} {\n${inner.join('\n')}\n}` : inner.join('\n');
}

function cloneMedia(rule: CSSMediaRule, forced: Forced): string | null {
  const media = rule.media.mediaText;
  const dark = forced.dark && DARK_TEST.test(media);
  const head = `@media ${dark ? media.replace(DARK_MEDIA, ALWAYS) : media}`;
  return wrapped(rule, head, forced, dark);
}

function cloneRule(rule: CSSRule, forced: Forced): string | null {
  if (rule instanceof CSSStyleRule) return rewrite(rule.cssText, forced);
  if (rule instanceof CSSMediaRule) return cloneMedia(rule, forced);
  if (rule instanceof CSSSupportsRule) return wrapped(rule, `@supports ${rule.conditionText}`, forced, false);
  if (typeof CSSLayerBlockRule !== 'undefined' && rule instanceof CSSLayerBlockRule) return wrapped(rule, '', forced, false);
  if (rule instanceof CSSImportRule) {
    const inner = rulesOf(rule.styleSheet).map((child) => cloneRule(child, forced)).filter((text): text is string => text !== null);
    return inner.length > 0 ? inner.join('\n') : null;
  }
  return null;
}

function isStudioSheet(sheet: CSSStyleSheet): boolean {
  const owner = sheet.ownerNode;
  return owner instanceof Element && owner.id.startsWith('studio-');
}

function buildCss(forced: Forced): string {
  const parts: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    if (sheet.disabled || isStudioSheet(sheet)) continue;
    for (const rule of rulesOf(sheet)) {
      const text = cloneRule(rule, forced);
      if (text) parts.push(text);
    }
  }
  return parts.join('\n');
}

function query(selector: string): Element | null {
  try {
    return document.querySelector(selector);
  } catch {
    return null;
  }
}

function clearMarks(): void {
  for (const element of Array.from(document.querySelectorAll(`[${ATTR}]`))) element.removeAttribute(ATTR);
}

function mark(element: Element, states: ForcedState[]): void {
  element.setAttribute(ATTR, states.join(' '));
  const climbing = states.filter((state) => CLIMBING.has(state));
  if (climbing.length === 0) return;
  for (let parent = element.parentElement; parent; parent = parent.parentElement) parent.setAttribute(ATTR, climbing.join(' '));
}

function styleElement(): HTMLStyleElement {
  const existing = document.getElementById(STYLE_ID);
  if (existing instanceof HTMLStyleElement) return existing;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  (document.head ?? document.documentElement).appendChild(style);
  return style;
}

export function createForceState(onChanged: () => void): ForceStateControl {
  let forced: Forced | null = null;
  let timer = 0;
  let resizeTimer = 0;

  const apply = (): boolean => {
    clearMarks();
    const current = forced;
    const needed = current !== null && (current.states.length > 0 || current.dark);
    if (!current || !needed) {
      document.getElementById(STYLE_ID)?.remove();
      return false;
    }
    const element = query(current.selector);
    if (element && current.states.length > 0) mark(element, current.states);
    const css = buildCss(current);
    const style = styleElement();
    if (style.textContent === css) return false;
    style.textContent = css;
    return true;
  };

  const onResize = (): void => {
    if (!forced?.track) return;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(onChanged, RESIZE_MS);
  };
  window.addEventListener('resize', onResize, { passive: true });

  return {
    set: (selector, states, dark, track) => {
      forced = selector ? { selector, states, dark, track } : null;
      apply();
    },
    schedule: () => {
      if (!forced) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (apply()) onChanged();
      }, REBUILD_MS);
    },
  };
}
