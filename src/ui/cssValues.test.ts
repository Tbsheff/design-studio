import { describe, expect, it } from 'vitest';
import {
  changedProps,
  colorToHex,
  displayColor,
  expandBox,
  hasChildElements,
  normalizeLength,
  parseNumber,
  stepValue,
  valuesFromStyles,
} from './cssValues';

describe('cssValues', () => {
  it('parses numbers with units', () => {
    expect(parseNumber('48px')).toEqual({ value: 48, unit: 'px' });
    expect(parseNumber('1.5')).toEqual({ value: 1.5, unit: '' });
    expect(parseNumber('-0.5rem')).toEqual({ value: -0.5, unit: 'rem' });
    expect(parseNumber('auto')).toBeNull();
  });

  it('steps and normalizes lengths', () => {
    expect(stepValue('16px', 10, 'px')).toBe('26px');
    expect(stepValue('normal', 1, 'px')).toBe('1px');
    expect(stepValue('1.2', 0.1, '')).toBe('1.3');
    expect(normalizeLength('48', 'px')).toBe('48px');
    expect(normalizeLength('1.4', '')).toBe('1.4');
    expect(normalizeLength('2rem', 'px')).toBe('2rem');
  });

  it('converts colors for the swatch', () => {
    expect(colorToHex('rgb(194, 65, 12)')).toBe('#c2410c');
    expect(colorToHex('#abc')).toBe('#aabbcc');
    expect(colorToHex('rgba(0, 0, 0, 0.5)')).toBeNull();
    expect(colorToHex('oklch(0.5 0.1 200)')).toBeNull();
    expect(displayColor('rgba(0, 0, 0, 0)')).toBe('transparent');
  });

  it('expands box shorthands and prefers longhands', () => {
    expect(expandBox('1px 2px')).toEqual({ top: '1px', right: '2px', bottom: '1px', left: '2px' });
    expect(expandBox('1px 2px 3px')).toEqual({ top: '1px', right: '2px', bottom: '3px', left: '2px' });
    const values = valuesFromStyles({ padding: '8px 16px', 'padding-top': '4px', height: '61.59375px' });
    expect(values['padding-top']).toBe('4px');
    expect(values['padding-left']).toBe('16px');
    expect(values.height).toBe('61.59px');
  });

  it('detects child elements after the start tag', () => {
    expect(hasChildElements('<h1 class="a">Title</h1>')).toBe(false);
    expect(hasChildElements('<article><h2>A</h2></article>')).toBe(true);
    expect(hasChildElements('<p data-x="a<b">x &lt; y</p>')).toBe(false);
  });

  it('keeps only changed props', () => {
    const base = valuesFromStyles({ color: 'rgb(0, 0, 0)', 'font-size': '16px' });
    expect(changedProps({ color: 'rgb(0, 0, 0)', 'font-size': '18px' }, base)).toEqual({ 'font-size': '18px' });
  });
});
