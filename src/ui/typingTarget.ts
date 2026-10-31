export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.getAttribute('role') === 'combobox';
}

const NON_TEXT_INPUTS = new Set(['button', 'checkbox', 'color', 'file', 'image', 'radio', 'range', 'reset', 'submit']);

export function editsText(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target.tagName === 'TEXTAREA') return true;
  return target instanceof HTMLInputElement && !NON_TEXT_INPUTS.has(target.type);
}

const ARROW_OWNERS = '[role="radiogroup"], [role="radio"], [role="tablist"], [role="tab"], [role="menu"], [role="menubar"], [role="listbox"], [role="option"], [role="tree"], [role="treeitem"], [role="grid"], [role="slider"], [role="spinbutton"], [role="combobox"]';

export function inspectorButtonFocused(): HTMLButtonElement | null {
  const active = document.activeElement;
  return active instanceof HTMLButtonElement && active.closest('.inspector') && !active.closest(ARROW_OWNERS) ? active : null;
}

export function canvasHasKeys(): boolean {
  const active = document.activeElement;
  return !active || active === document.body || (active instanceof HTMLElement && active.matches('.canvas .stage'));
}
