import { describe, expect, it } from 'vitest';
import type { AnchorQuery, CommentStatus } from './contracts.js';
import {
  canTransition,
  commentPrompt,
  createOrphanTracker,
  resolveAnchor,
  snippetOf,
  statusAfterRun,
  targetFromSelection,
  type AnchorDom,
} from './comments.js';

interface FakeElement {
  tag: string;
  loc: string | null;
  selector: string;
  text: string;
}

function dom(elements: FakeElement[]): AnchorDom<FakeElement> {
  return {
    bySource: (loc) => elements.filter((element) => element.loc === loc),
    bySelector: (selector) => elements.find((element) => element.selector === selector) ?? null,
    byTag: (tag) => elements.filter((element) => element.tag === tag),
    tagOf: (element) => element.tag,
    textOf: (element) => element.text,
  };
}

const query = (patch: Partial<AnchorQuery> = {}): AnchorQuery => ({
  id: 'c1',
  selector: 'body > h1',
  sourceLoc: 'index.html:5:3',
  tag: 'h1',
  textSnippet: 'Hello world',
  ...patch,
});

describe('resolveAnchor', () => {
  const h1: FakeElement = { tag: 'h1', loc: 'index.html:5:3', selector: 'body > h1', text: 'Hello world' };

  it('prefers a unique source location', () => {
    const moved: FakeElement = { ...h1, selector: 'main > h1' };
    expect(resolveAnchor(query(), dom([moved]))).toEqual({ element: moved, via: 'source' });
  });

  it('rejects a source match with another tag and falls back to the selector', () => {
    const shifted: FakeElement = { tag: 'p', loc: 'index.html:5:3', selector: 'body > p', text: 'Other' };
    const heading: FakeElement = { ...h1, loc: 'index.html:7:3' };
    expect(resolveAnchor(query(), dom([shifted, heading]))).toEqual({ element: heading, via: 'selector' });
  });

  it('picks the selector match among repeated source locations', () => {
    const items = [1, 2, 3].map((n) => ({ tag: 'li', loc: 'App.tsx:10:9', selector: `ul > li:nth-of-type(${n})`, text: `Item ${n}` }));
    const result = resolveAnchor(query({ tag: 'li', sourceLoc: 'App.tsx:10:9', selector: 'ul > li:nth-of-type(2)', textSnippet: 'Item 2' }), dom(items));
    expect(result).toEqual({ element: items[1], via: 'source' });
  });

  it('picks the text match among repeated source locations when the selector is stale', () => {
    const items = [1, 2, 3].map((n) => ({ tag: 'li', loc: 'App.tsx:10:9', selector: `ul > li:nth-of-type(${n})`, text: `Item ${n}` }));
    const result = resolveAnchor(query({ tag: 'li', sourceLoc: 'App.tsx:10:9', selector: 'ol > li', textSnippet: 'Item 3' }), dom(items));
    expect(result).toEqual({ element: items[2], via: 'source' });
  });

  it('skips a selector hit whose text disagrees when the text matches elsewhere', () => {
    const inserted: FakeElement = { tag: 'p', loc: 'index.html:6:5', selector: 'body > main > p', text: 'New eyebrow' };
    const lede: FakeElement = { tag: 'p', loc: 'index.html:8:5', selector: 'body > main > p:nth-of-type(2)', text: 'A calm lede' };
    const result = resolveAnchor(
      query({ tag: 'p', sourceLoc: 'index.html:7:5', selector: 'body > main > p', textSnippet: 'A calm lede' }),
      dom([inserted, lede]),
    );
    expect(result).toEqual({ element: lede, via: 'text' });
  });

  it('keeps a selector hit with edited text when no text match exists', () => {
    const edited: FakeElement = { ...h1, loc: null, text: 'Edited title' };
    expect(resolveAnchor(query({ sourceLoc: null }), dom([edited]))).toEqual({ element: edited, via: 'selector' });
  });

  it('falls back to the text snippet when source and selector miss', () => {
    const other: FakeElement = { tag: 'h1', loc: 'index.html:9:3', selector: 'section > h1', text: '  Hello\n world ' };
    expect(resolveAnchor(query(), dom([other]))).toEqual({ element: other, via: 'text' });
  });

  it('returns null when nothing matches', () => {
    const other: FakeElement = { tag: 'h2', loc: 'index.html:9:3', selector: 'section > h2', text: 'Hello world' };
    expect(resolveAnchor(query(), dom([other]))).toBeNull();
  });

  it('does not match an empty snippet by text', () => {
    const other: FakeElement = { tag: 'h1', loc: null, selector: 'x', text: '' };
    expect(resolveAnchor(query({ sourceLoc: null, selector: 'nope', textSnippet: '' }), dom([other]))).toBeNull();
  });

  it('matches a long snippet by prefix', () => {
    const long = 'a'.repeat(120);
    const element: FakeElement = { tag: 'p', loc: null, selector: 'p', text: long };
    expect(resolveAnchor(query({ tag: 'p', sourceLoc: null, selector: 'nope', textSnippet: snippetOf(long) }), dom([element]))?.via).toBe('text');
  });
});

describe('status transitions', () => {
  const all: CommentStatus[] = ['draft', 'queued', 'sent', 'resolved', 'orphaned'];

  it('lets only the server send or settle comments', () => {
    for (const from of all) expect(canTransition(from, 'sent', 'user')).toBe(from === 'sent');
    expect(canTransition('queued', 'sent', 'server')).toBe(true);
    expect(canTransition('draft', 'sent', 'server')).toBe(true);
    expect(canTransition('sent', 'resolved', 'server')).toBe(true);
    expect(canTransition('sent', 'queued', 'server')).toBe(true);
    expect(canTransition('sent', 'resolved', 'user')).toBe(false);
  });

  it('never orphans sent or resolved comments', () => {
    expect(canTransition('queued', 'orphaned', 'user')).toBe(true);
    expect(canTransition('draft', 'orphaned', 'user')).toBe(true);
    expect(canTransition('sent', 'orphaned', 'user')).toBe(false);
    expect(canTransition('resolved', 'orphaned', 'user')).toBe(false);
  });

  it('allows re-pin, resolve and reopen', () => {
    expect(canTransition('orphaned', 'queued', 'user')).toBe(true);
    expect(canTransition('queued', 'resolved', 'user')).toBe(true);
    expect(canTransition('resolved', 'queued', 'user')).toBe(true);
    expect(canTransition('resolved', 'queued', 'server')).toBe(false);
  });

  it('maps run status to the next comment status', () => {
    expect(statusAfterRun('completed')).toBe('resolved');
    for (const status of ['failed', 'canceled', 'budget_exceeded']) expect(statusAfterRun(status)).toBe('queued');
  });
});

describe('orphan tracker', () => {
  it('reports an orphan only after the grace period of continuous misses', () => {
    const tracker = createOrphanTracker(1000);
    expect(tracker.observe('a', false, 0)).toBe(false);
    expect(tracker.observe('a', false, 500)).toBe(false);
    expect(tracker.observe('a', true, 700)).toBe(false);
    expect(tracker.observe('a', false, 900)).toBe(false);
    expect(tracker.observe('a', false, 1800)).toBe(false);
    expect(tracker.observe('a', false, 1900)).toBe(true);
  });
});

describe('helpers', () => {
  it('builds a target from a selection', () => {
    const target = targetFromSelection({
      selector: 'body > h1',
      tag: 'h1',
      text: '  Big\n  title ',
      outerHTML: '<h1>Big title</h1>',
      styles: {},
      rect: { x: 1, y: 2, width: 3, height: 4 },
      source: { file: 'index.html', line: 5, col: 3 },
      ancestors: [],
    });
    expect(target).toEqual({
      selector: 'body > h1',
      tag: 'h1',
      textSnippet: 'Big title',
      sourceLoc: { file: 'index.html', line: 5, col: 3 },
      rectHint: { x: 1, y: 2, width: 3, height: 4 },
    });
  });

  it('writes a readable prompt with numbers', () => {
    expect(
      commentPrompt([
        { n: 2, text: 'Bigger' },
        { n: 5, text: 'Say  hi\n' },
      ]),
    ).toBe('Address 2 comments:\n#2 Bigger\n#5 Say hi');
  });
});
