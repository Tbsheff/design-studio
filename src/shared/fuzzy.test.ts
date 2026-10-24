import { describe, expect, it } from 'vitest';
import { fuzzyRank, fuzzyScore } from './fuzzy';

const files = ['src/hooks/useData.ts', 'src/components/HeroDisplay.tsx', 'src/components/Header.tsx', 'README.md', 'src/headless/render.ts', 'index.html'];

describe('fuzzy match', () => {
  it('ranks Header.tsx first for hdr', () => {
    expect(fuzzyRank(files, 'hdr', (file) => file)[0]).toBe('src/components/Header.tsx');
  });

  it('skips items without the letters in order and keeps all for an empty query', () => {
    expect(fuzzyScore('index.html', 'xyz')).toBeNull();
    expect(fuzzyRank(files, '', (file) => file)).toEqual(files);
  });

  it('prefers a prefix of the file name', () => {
    expect(fuzzyRank(files, 'ind', (file) => file)[0]).toBe('index.html');
  });
});
