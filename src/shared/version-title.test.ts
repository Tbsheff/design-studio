import { describe, expect, it } from 'vitest';
import { RUN_TITLE_MAX, baseTitle, restoreTitle, runTitle } from './version-title';

describe('runTitle', () => {
  it('keeps the first clause of a prompt', () => {
    expect(runTitle('A landing page for a small independent bookshop: hero, featured books, events')).toBe('A landing page for a small independent bookshop');
    expect(runTitle('Make the hero darker. Then add a footer')).toBe('Make the hero darker');
  });

  it('cuts long clauses at a word and stays idempotent', () => {
    const long = 'Rebuild the whole pricing section with three tiers and a comparison table that scrolls sideways on phones';
    const title = runTitle(long);
    expect(title.length).toBeLessThanOrEqual(RUN_TITLE_MAX);
    expect(title.endsWith('…')).toBe(true);
    expect(runTitle(title)).toBe(title);
  });

  it('names empty prompts', () => {
    expect(runTitle('   ')).toBe('Untitled run');
  });
});

describe('baseTitle', () => {
  it('unwraps legacy nested undo and restore titles', () => {
    expect(baseTitle('Undo to "Undo to "A landing page for a small bookshop""', 'undo')).toBe('A landing page for a small bookshop');
    expect(baseTitle('Restore "Undo to "Edit h1: color""', 'restore')).toBe('Edit h1: color');
  });

  it('unwraps current titles and leaves other kinds alone', () => {
    expect(baseTitle('Back to Restored Edit h1', 'undo')).toBe('Edit h1');
    expect(baseTitle('Back to basics', 'run')).toBe('Back to basics');
  });
});

describe('restoreTitle', () => {
  it('builds one level of wording', () => {
    expect(restoreTitle('undo', 'Edit h1: color')).toBe('Back to Edit h1: color');
    expect(restoreTitle('restore', '')).toBe('Restored an earlier version');
  });
});
