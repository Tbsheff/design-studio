const OFF = 'data-tip-off';
const AUTO = 'data-tip-auto';
const EDGE = 4;

function release(host: Element): void {
  const clear = (): void => {
    if (host.getAttribute('aria-expanded') === 'true' || host.matches(':hover') || host.matches(':focus-visible')) return;
    host.removeAttribute(OFF);
    host.removeEventListener('pointerleave', clear);
    host.removeEventListener('focusout', clear);
  };
  host.addEventListener('pointerleave', clear);
  host.addEventListener('focusout', clear);
}

function clipBox(host: Element): { left: number; right: number; bottom: number } {
  const box = { left: 0, right: window.innerWidth, bottom: window.innerHeight };
  for (let node = host.parentElement; node && node !== document.body; node = node.parentElement) {
    const style = getComputedStyle(node);
    const clipsX = style.overflowX !== 'visible';
    const clipsY = style.overflowY !== 'visible';
    if (!clipsX && !clipsY) continue;
    const rect = node.getBoundingClientRect();
    if (clipsX) {
      box.left = Math.max(box.left, rect.left);
      box.right = Math.min(box.right, rect.right);
    }
    if (clipsY) box.bottom = Math.min(box.bottom, rect.bottom);
  }
  return box;
}

function fitTip(host: Element): void {
  const auto = host.getAttribute(AUTO);
  if (auto !== null) {
    if (auto.includes('align')) host.removeAttribute('data-tip-align');
    if (auto.includes('side')) host.removeAttribute('data-tip-side');
    host.removeAttribute(AUTO);
  }
  const tip = getComputedStyle(host, '::after');
  const width = parseFloat(tip.width);
  const height = parseFloat(tip.height);
  if (!width || !height) return;
  const rect = host.getBoundingClientRect();
  const box = clipBox(host);
  const moved: string[] = [];
  if (!host.hasAttribute('data-tip-align')) {
    const middle = rect.left + rect.width / 2;
    const align = middle + width / 2 > box.right - EDGE ? 'end' : middle - width / 2 < box.left + EDGE ? 'start' : null;
    if (align) {
      host.setAttribute('data-tip-align', align);
      moved.push('align');
    }
  }
  if (!host.hasAttribute('data-tip-side') && rect.bottom + 6 + height > box.bottom - EDGE) {
    host.setAttribute('data-tip-side', 'top');
    moved.push('side');
  }
  if (moved.length > 0) host.setAttribute(AUTO, moved.join(' '));
}

function tipHost(target: EventTarget | null): Element | null {
  return target instanceof Element ? target.closest('[data-tip]') : null;
}

export function installTipGuard(): void {
  document.addEventListener(
    'pointerdown',
    (event) => {
      const host = tipHost(event.target);
      if (!host || host.hasAttribute(OFF)) return;
      host.setAttribute(OFF, '');
      release(host);
    },
    true,
  );
  const onEnter = (event: Event): void => {
    const host = tipHost(event.target);
    if (host && !host.hasAttribute(OFF)) fitTip(host);
  };
  document.addEventListener('pointerover', onEnter, true);
  document.addEventListener('focusin', onEnter, true);
}
