export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.getAttribute('role') === 'combobox';
}

export function canvasHasKeys(): boolean {
  const active = document.activeElement;
  return !active || active === document.body || (active instanceof HTMLElement && active.matches('.canvas .stage'));
}
