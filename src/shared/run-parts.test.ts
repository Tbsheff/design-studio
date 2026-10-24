import { describe, expect, it } from 'vitest';
import { applyPartEvent, closeParts, type PartEvent, withFinalText } from './run-parts';

function play(events: PartEvent[]) {
  return events.reduce(applyPartEvent, [] as ReturnType<typeof applyPartEvent>);
}

describe('run parts', () => {
  it('keeps thinking, tools and text in event order and keeps every thinking block', () => {
    const parts = play([
      { type: 'run.thinking.delta', text: 'Thinking ' },
      { type: 'run.thinking', text: 'Thinking A' },
      { type: 'run.tool.started', toolUseId: 't1' },
      { type: 'run.thinking', text: 'Thinking B' },
      { type: 'run.text.delta', text: 'Hel' },
      { type: 'run.text.delta', text: 'lo' },
      { type: 'run.text', text: 'Hello' },
    ]);
    expect(parts).toEqual([
      { kind: 'thinking', text: 'Thinking A' },
      { kind: 'tool', toolUseId: 't1' },
      { kind: 'thinking', text: 'Thinking B' },
      { kind: 'text', text: 'Hello' },
    ]);
  });

  it('opens a new text part after a tool', () => {
    const parts = play([
      { type: 'run.text.delta', text: 'One' },
      { type: 'run.text', text: 'One' },
      { type: 'run.tool.started', toolUseId: 't1' },
      { type: 'run.text.delta', text: 'Two' },
    ]);
    expect(parts.map((part) => part.kind)).toEqual(['text', 'tool', 'text']);
    expect(closeParts(parts).at(-1)).toEqual({ kind: 'text', text: 'Two' });
  });

  it('adds a final report once and not a copy of the last text', () => {
    const parts = play([{ type: 'run.text', text: 'Done.' }]);
    expect(withFinalText(parts, 'Done.')).toEqual(parts);
    expect(withFinalText(parts, 'Done.\n\nLoop report')).toEqual([...parts, { kind: 'text', text: 'Loop report' }]);
  });
});
