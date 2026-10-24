import { describe, expect, it } from 'vitest';
import { evaluateMath, resolveNumberInput } from './mathInput';

describe('evaluateMath', () => {
  it('handles operator precedence and parentheses', () => {
    expect(evaluateMath('16*2')).toEqual({ value: 32, unit: '' });
    expect(evaluateMath('12+4*2')).toEqual({ value: 20, unit: '' });
    expect(evaluateMath('(8+4)*2')).toEqual({ value: 24, unit: '' });
    expect(evaluateMath('-(2+3)')).toEqual({ value: -5, unit: '' });
  });

  it('keeps one unit and refuses mixed units', () => {
    expect(evaluateMath('12px+4')).toEqual({ value: 16, unit: 'px' });
    expect(evaluateMath('1rem*2')).toEqual({ value: 2, unit: 'rem' });
    expect(evaluateMath('12px+1rem')).toBeNull();
  });

  it('refuses incomplete or unsafe input', () => {
    expect(evaluateMath('12+')).toBeNull();
    expect(evaluateMath('(1+2')).toBeNull();
    expect(evaluateMath('4/0')).toBeNull();
    expect(evaluateMath('alert(1)')).toBeNull();
    expect(evaluateMath('10px; color: red')).toBeNull();
    expect(evaluateMath('')).toBeNull();
  });
});

describe('resolveNumberInput', () => {
  it('evaluates expressions in the field unit', () => {
    expect(resolveNumberInput('12+4', '0px', 'px')).toBe('16px');
    expect(resolveNumberInput('16*2', '', 'px')).toBe('32px');
    expect(resolveNumberInput('100/3', '0px', 'px')).toBe('33.33px');
    expect(resolveNumberInput('(8+4)*2', '1px', 'px')).toBe('24px');
    expect(resolveNumberInput('0.5*3', '1', '')).toBe('1.5');
  });

  it('adds a leading +N or +=N and subtracts -=N from the current value', () => {
    expect(resolveNumberInput('+8', '16px', 'px')).toBe('24px');
    expect(resolveNumberInput('+=8', '16px', 'px')).toBe('24px');
    expect(resolveNumberInput('-=4', '16px', 'px')).toBe('12px');
    expect(resolveNumberInput('-= 2*3', '16px', 'px')).toBe('10px');
    expect(resolveNumberInput('+2*3', '1rem', 'px')).toBe('7rem');
    expect(resolveNumberInput('+8', 'normal', 'px')).toBe('8px');
    expect(resolveNumberInput('+1rem', '16px', 'px')).toBeNull();
  });

  it('reads a leading -N as a plain negative number', () => {
    expect(resolveNumberInput('-4', '16px', 'px')).toBe('-4px');
    expect(resolveNumberInput('-0.02em', '0em', 'px')).toBe('-0.02em');
    expect(resolveNumberInput('-4*2', '1px', 'px')).toBe('-8px');
    expect(resolveNumberInput('-=1rem', '16px', 'px')).toBeNull();
  });

  it('leaves plain values and non-math text to the caller', () => {
    expect(resolveNumberInput('48', '0px', 'px')).toBeNull();
    expect(resolveNumberInput('auto', '0px', 'px')).toBeNull();
    expect(resolveNumberInput('var(--space-2)', '0px', 'px')).toBeNull();
    expect(resolveNumberInput('10px; color: red', '0px', 'px')).toBeNull();
    expect(resolveNumberInput('+', '16px', 'px')).toBeNull();
    expect(resolveNumberInput('-=', '16px', 'px')).toBeNull();
    expect(resolveNumberInput('+=+', '16px', 'px')).toBeNull();
  });
});
