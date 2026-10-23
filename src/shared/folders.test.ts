import { describe, expect, it } from 'vitest';
import type { Project } from './contracts.js';
import { isInsideFolder, projectsInFolder, shortenHome, slugCandidate, slugify } from './folders.js';

function project(id: string, sourcePath: string | null): Project {
  return { id, imported: sourcePath ? { sourcePath } : null } as Project;
}

describe('slugify', () => {
  it('makes lowercase hyphen slugs from project names', () => {
    expect(slugify('A pricing page for a developer tool')).toBe('a-pricing-page-for-a-developer-tool');
    expect(slugify('  Café   Menü / 2026!  ')).toBe('cafe-menu-2026');
    expect(slugify('A pricing page for a developer tool with…')).toBe('a-pricing-page-for-a-developer-tool-with');
  });

  it('falls back to untitled when nothing is left', () => {
    expect(slugify('')).toBe('untitled');
    expect(slugify('…')).toBe('untitled');
    expect(slugify('日本語')).toBe('untitled');
  });

  it('never makes a slug that can leave the parent folder', () => {
    for (const name of ['../../etc', '..', '/abs/path', 'a/../b', '.hidden', 'C:\\x']) {
      const slug = slugify(name);
      expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('caps the length without a trailing hyphen', () => {
    const slug = slugify(`${'word '.repeat(20)}end`);
    expect(slug.length).toBeLessThanOrEqual(48);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('slugCandidate', () => {
  it('adds -2, -3 after the first attempt', () => {
    expect(slugCandidate('site', 1)).toBe('site');
    expect(slugCandidate('site', 2)).toBe('site-2');
    expect(slugCandidate('site', 3)).toBe('site-3');
  });
});

describe('folder helpers', () => {
  it('matches folders by path segment, not by prefix text', () => {
    expect(isInsideFolder('/Users/me/work/site', '/Users/me/work')).toBe(true);
    expect(isInsideFolder('/Users/me/work', '/Users/me/work/')).toBe(true);
    expect(isInsideFolder('/Users/me/workshop/site', '/Users/me/work')).toBe(false);
  });

  it('lists the projects that live in a folder', () => {
    const list = [project('a', '/w/one'), project('b', '/w/two/deep'), project('c', '/other'), project('d', null)];
    expect(projectsInFolder(list, '/w').map((item) => item.id)).toEqual(['a', 'b']);
    expect(projectsInFolder(list, '/w/two').map((item) => item.id)).toEqual(['b']);
  });

  it('shortens the home folder to ~', () => {
    expect(shortenHome('/Users/me/Sites/a', '/Users/me')).toBe('~/Sites/a');
    expect(shortenHome('/Users/me', '/Users/me/')).toBe('~');
    expect(shortenHome('/Users/meg/a', '/Users/me')).toBe('/Users/meg/a');
    expect(shortenHome('/tmp/a', null)).toBe('/tmp/a');
  });
});
