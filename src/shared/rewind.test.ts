import { describe, expect, it } from 'vitest';
import { forkBaseOf, runMatches, runQueryTerms } from './rewind';

const versions = [
  { id: 'v3', parentId: 'v2', createdAt: 300 },
  { id: 'v2', parentId: 'v1', createdAt: 200 },
  { id: 'v1', parentId: null, createdAt: 100 },
];

describe('forkBaseOf', () => {
  it('forks from the parent of the version the run made', () => {
    expect(forkBaseOf({ versionId: 'v3', startedAt: 250 }, versions)).toBe('v2');
    expect(forkBaseOf({ versionId: 'v1', startedAt: 50 }, versions)).toBeNull();
  });

  it('forks from the head at run start when the run made no version', () => {
    expect(forkBaseOf({ versionId: null, startedAt: 250 }, versions)).toBe('v2');
    expect(forkBaseOf({ versionId: null, startedAt: 50 }, versions)).toBeNull();
  });

  it('returns null for a version that is not in the list', () => {
    expect(forkBaseOf({ versionId: 'other', startedAt: 250 }, versions)).toBeNull();
  });
});

describe('runMatches', () => {
  it('matches every word in the prompt or title, any case', () => {
    expect(runMatches(runQueryTerms('MENU'), 'Add a menu section')).toBe(true);
    expect(runMatches(runQueryTerms('menu hours'), 'Add a menu section')).toBe(false);
    expect(runMatches(runQueryTerms('hero'), 'Add a menu section', 'Hero pass')).toBe(true);
    expect(runMatches(runQueryTerms('  '), 'anything')).toBe(true);
  });
});
