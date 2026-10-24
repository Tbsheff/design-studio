import { describe, expect, it } from 'vitest';
import type { SelectionContext, Version } from '../shared/contracts';
import { isHistoryStep, refreshedSelection, stepToast } from './useEditHistory';
import { historyKeyOf, routeHistoryCommand, type ShortcutState } from './useUndoShortcut';

function key(over: Partial<KeyboardEvent>): Pick<KeyboardEvent, 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'key'> {
  return { metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, key: 'z', ...over };
}

function shortcut(withRedo: boolean, enabled = true) {
  const calls: string[] = [];
  const state: ShortcutState = {
    enabled,
    onUndo: () => calls.push('undo'),
    redo: withRedo ? { enabled, onRedo: () => calls.push('redo') } : undefined,
  };
  return { calls, state };
}

describe('history shortcut routing', () => {
  it('reads Cmd+Z as undo and Shift+Cmd+Z as redo', () => {
    expect(historyKeyOf(key({ metaKey: true }))).toBe('undo');
    expect(historyKeyOf(key({ ctrlKey: true, key: 'Z', shiftKey: true }))).toBe('redo');
    expect(historyKeyOf(key({ metaKey: true, altKey: true }))).toBeNull();
    expect(historyKeyOf(key({}))).toBeNull();
    expect(historyKeyOf(key({ metaKey: true, key: 'y' }))).toBeNull();
  });

  it('sends the desktop Edit menu undo and redo commands to the app', () => {
    const { calls, state } = shortcut(true);
    expect(routeHistoryCommand('undo', state, () => false)).toBe(true);
    expect(routeHistoryCommand('redo', state, () => false)).toBe(true);
    expect(calls).toEqual(['undo', 'redo']);
  });

  it('lets redo fall through when the app has no redo, and swallows commands under a modal', () => {
    const { calls, state } = shortcut(false);
    expect(routeHistoryCommand('redo', state, () => false)).toBe(false);
    expect(routeHistoryCommand('undo', state, () => true)).toBe(true);
    expect(calls).toEqual([]);
  });

  it('claims the command but does nothing while disabled', () => {
    const { calls, state } = shortcut(true, false);
    expect(routeHistoryCommand('undo', state, () => false)).toBe(true);
    expect(routeHistoryCommand('redo', state, () => false)).toBe(true);
    expect(calls).toEqual([]);
  });
});

describe('edit history helpers', () => {
  it('words the status message plainly', () => {
    expect(stepToast('undo', 'Edit h1: color')).toBe('Undid edit h1: color');
    expect(stepToast('redo', 'Update tokens: --primary')).toBe('Redid update tokens: --primary');
    expect(stepToast('undo', null)).toBe('Undid the last edit');
  });

  it('knows a history step version so a later Cmd+Z does not version-undo it', () => {
    const version = (title: string, kind: Version['meta']['kind']) => ({ title, meta: { kind } }) as Version;
    expect(isHistoryStep(version('Undo: Edit h1: color', 'manual'))).toBe(true);
    expect(isHistoryStep(version('Redo: Update tokens: --primary', 'manual'))).toBe(true);
    expect(isHistoryStep(version('Edit h1: color', 'manual'))).toBe(false);
    expect(isHistoryStep(version('Undo: Edit h1: color', 'undo'))).toBe(false);
    expect(isHistoryStep(undefined)).toBe(false);
  });

  it('refreshes styles and text of the selected elements from the preview', () => {
    const base = { selector: 'h1', tag: 'h1', text: 'New', styles: { color: 'red' }, source: null } as unknown as SelectionContext;
    const other = { ...base, selector: 'p' } as SelectionContext;
    const fresh = { ...base, text: 'Old', styles: { color: 'blue' } } as unknown as SelectionContext;
    const next = refreshedSelection([base, other], ['h1', 'p'], [fresh, null]);
    expect(next[0]).toMatchObject({ selector: 'h1', text: 'Old', styles: { color: 'blue' } });
    expect(next[1]).toBe(other);
  });
});
