import { describe, expect, it } from 'vitest';
import type { AnchorReport, CommentStatus, DesignComment } from '../shared/contracts';
import { createOrphanTracker } from '../shared/comments';
import { parseLoc, reviewReport, type ReviewState } from './commentAnchors';

const rect = { x: 1, y: 2, width: 3, height: 4 };

function comment(status: CommentStatus): DesignComment {
  return {
    id: 'c1',
    n: 1,
    createdAt: 0,
    updatedAt: 0,
    text: 'Bigger',
    status,
    target: { selector: 'body > main > p', sourceLoc: { file: 'index.html', line: 7, col: 5 }, tag: 'p', textSnippet: 'Lede', rectHint: rect },
  };
}

function state(now = 0): ReviewState {
  return { orphans: createOrphanTracker(1000), retargeted: new Map(), now };
}

const found: AnchorReport = { id: 'c1', rect, via: 'source', selector: 'body > main > p', sourceLoc: 'index.html:7:5' };
const missing: AnchorReport = { id: 'c1', rect: null, via: null };

describe('reviewReport', () => {
  it('does nothing for a source match', () => {
    expect(reviewReport(comment('queued'), found, state())).toEqual({ patch: null, missing: false });
  });

  it('writes back a fresh selector and loc after a fallback match, once', () => {
    const shared = state();
    const moved: AnchorReport = { ...found, via: 'text', selector: 'body > main > p:nth-of-type(2)', sourceLoc: 'index.html:8:5' };
    const first = reviewReport(comment('queued'), moved, shared);
    expect(first.patch?.target).toMatchObject({ selector: 'body > main > p:nth-of-type(2)', sourceLoc: { file: 'index.html', line: 8, col: 5 } });
    expect(reviewReport(comment('queued'), moved, shared).patch).toBeNull();
  });

  it('orphans a queued comment only after the grace period', () => {
    const shared = state(0);
    expect(reviewReport(comment('queued'), missing, shared)).toEqual({ patch: null, missing: true });
    shared.now = 1200;
    expect(reviewReport(comment('queued'), missing, shared)).toEqual({ patch: { status: 'orphaned' }, missing: false });
  });

  it('never orphans sent or resolved comments', () => {
    for (const status of ['sent', 'resolved'] as const) {
      const shared = state(0);
      reviewReport(comment(status), missing, shared);
      shared.now = 5000;
      expect(reviewReport(comment(status), missing, shared)).toEqual({ patch: null, missing: false });
    }
  });

  it('puts a matching orphan back in the queue', () => {
    const review = reviewReport(comment('orphaned'), { ...found, via: 'selector' }, state());
    expect(review.patch).toMatchObject({ status: 'queued', target: { selector: 'body > main > p' } });
  });

  it('parses source locations with colons in the path', () => {
    expect(parseLoc('C:/site/index.html:3:9')).toEqual({ file: 'C:/site/index.html', line: 3, col: 9 });
    expect(parseLoc('nope')).toBeNull();
    expect(parseLoc(null)).toBeNull();
  });
});
