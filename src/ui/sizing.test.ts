import { describe, expect, it } from 'vitest';
import { activeCell, alignCell, axisRole, parentLayout, sizeModeOf, sizePatch } from './sizing';

const rowParent = parentLayout({ 'parent-display': 'flex', 'parent-flex-direction': 'row' });
const columnParent = parentLayout({ 'parent-display': 'inline-flex', 'parent-flex-direction': 'column' });
const blockParent = parentLayout({ 'parent-display': 'block', 'parent-flex-direction': 'row' });
const plain = { width: '240px', height: '80px', flex: '0 1 auto', 'align-self': 'auto' };

describe('axisRole', () => {
  it('maps width and height to the main and cross axis of a flex parent', () => {
    expect(axisRole('width', rowParent)).toBe('main');
    expect(axisRole('height', rowParent)).toBe('cross');
    expect(axisRole('width', columnParent)).toBe('cross');
    expect(axisRole('height', columnParent)).toBe('main');
    expect(axisRole('width', blockParent)).toBe('none');
  });
});

describe('sizePatch', () => {
  it('Fill writes flex: 1 on the main axis of a flex parent', () => {
    expect(sizePatch('width', 'fill', plain, rowParent, '240px')).toEqual({ flex: '1' });
    expect(sizePatch('height', 'fill', plain, columnParent, '80px')).toEqual({ flex: '1' });
  });

  it('Fill writes align-self: stretch and clears the size on the cross axis', () => {
    expect(sizePatch('height', 'fill', plain, rowParent, '80px')).toEqual({ 'align-self': 'stretch', height: '' });
  });

  it('Fill writes 100% outside flex', () => {
    expect(sizePatch('width', 'fill', plain, blockParent, '240px')).toEqual({ width: '100%' });
  });

  it('Hug writes fit-content and clears a flex grow', () => {
    expect(sizePatch('width', 'hug', { ...plain, flex: '1 1 0%' }, rowParent, '240px')).toEqual({ width: 'fit-content', flex: '' });
    expect(sizePatch('height', 'hug', plain, blockParent, '80px')).toEqual({ height: 'fit-content' });
  });

  it('Fixed writes the used px and clears stretch', () => {
    expect(sizePatch('height', 'fixed', { ...plain, height: '', 'align-self': 'stretch' }, rowParent, '80px')).toEqual({ height: '80px', 'align-self': '' });
    expect(sizePatch('width', 'fixed', { ...plain, width: 'fit-content' }, blockParent, '132px')).toEqual({ width: '132px' });
  });

  it('round-trips each mode through sizeModeOf', () => {
    for (const parent of [rowParent, columnParent, blockParent]) {
      for (const axis of ['width', 'height'] as const) {
        for (const mode of ['hug', 'fill', 'fixed'] as const) {
          const next = { ...plain, ...sizePatch(axis, mode, plain, parent, '100px') };
          expect(sizeModeOf(axis, next, parent)).toBe(mode);
        }
      }
    }
  });
});

describe('align grid', () => {
  it('maps a cell to justify and align by direction', () => {
    expect(alignCell(1, 2, true)).toEqual({ justify: 'center', align: 'flex-end' });
    expect(alignCell(1, 2, false)).toEqual({ justify: 'flex-end', align: 'center' });
  });

  it('finds the active cell and none for stretch', () => {
    expect(activeCell('center', 'flex-end', true)).toEqual({ col: 1, row: 2 });
    expect(activeCell('flex-end', 'center', false)).toEqual({ col: 1, row: 2 });
    expect(activeCell('normal', 'normal', true)).toBeNull();
  });
});
