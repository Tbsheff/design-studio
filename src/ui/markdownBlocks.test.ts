import { describe, expect, it } from 'vitest';
import { splitMarkdownBlocks } from './markdownBlocks';

describe('splitMarkdownBlocks', () => {
  it('splits paragraphs on blank lines', () => {
    expect(splitMarkdownBlocks('One.\n\nTwo.\n\nThree')).toEqual(['One.', 'Two.', 'Three']);
  });

  it('keeps a code fence with blank lines in one block, also while it is open', () => {
    expect(splitMarkdownBlocks('Intro\n\n```ts\nconst a = 1;\n\nconst b = 2;\n```\n\nAfter')).toEqual(['Intro', '```ts\nconst a = 1;\n\nconst b = 2;\n```', 'After']);
    expect(splitMarkdownBlocks('Intro\n\n```ts\nconst a = 1;\n\nconst b')).toEqual(['Intro', '```ts\nconst a = 1;\n\nconst b']);
  });

  it('keeps list items and indented lines with their block', () => {
    expect(splitMarkdownBlocks('- a\n\n- b\n\n  more\n\nEnd')).toEqual(['- a\n\n- b\n\n  more', 'End']);
  });

  it('gives the same earlier blocks as the text grows', () => {
    const full = 'First para.\n\nSecond para here.\n\nThird.';
    const early = splitMarkdownBlocks(full.slice(0, 25));
    expect(splitMarkdownBlocks(full).slice(0, early.length - 1)).toEqual(early.slice(0, -1));
  });
});
