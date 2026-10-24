import { describe, expect, it } from 'vitest';
import { outlineOf } from './designMdOutline';

describe('outlineOf', () => {
  it('lists headings with line and offset and skips code fences', () => {
    const md = '# Brand\n\nIntro\n\n## Color\n\n```md\n## Not a heading\n```\n\n### Type **scale**\n';
    expect(outlineOf(md)).toEqual([
      { level: 1, text: 'Brand', line: 0, offset: 0 },
      { level: 2, text: 'Color', line: 4, offset: 16 },
      { level: 3, text: 'Type scale', line: 10, offset: md.indexOf('### Type') },
    ]);
  });
});
