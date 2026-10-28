const EXPAND_SCROLL_ROOT = `(async () => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const doc = document.scrollingElement || document.documentElement;
  const docExtra = doc.scrollHeight - vh;
  let best = null;
  let bestArea = 0;
  for (const el of document.body ? document.body.getElementsByTagName('*') : []) {
    const extra = el.scrollHeight - el.clientHeight;
    if (extra <= 1 || el.clientHeight < vh * 0.4) continue;
    const box = el.getBoundingClientRect();
    if (box.width < vw * 0.4) continue;
    const overflow = getComputedStyle(el).overflowY;
    if (overflow !== 'auto' && overflow !== 'scroll' && overflow !== 'overlay') continue;
    const area = box.width * box.height;
    if (area > bestArea) { best = el; bestArea = area; }
  }
  if (!best || best.scrollHeight - best.clientHeight <= docExtra) return 0;
  const extra = best.scrollHeight - best.clientHeight;
  const set = (el, prop, value) => el.style.setProperty(prop, value, 'important');
  best.scrollTop = 0;
  for (let el = best; el && el !== document.documentElement; el = el.parentElement) {
    const style = getComputedStyle(el);
    const parent = el.parentElement ? getComputedStyle(el.parentElement) : null;
    set(el, 'height', 'auto');
    set(el, 'max-height', 'none');
    set(el, 'overflow-y', 'visible');
    if (style.position === 'fixed') set(el, 'position', 'absolute');
    if (style.position === 'fixed' || style.position === 'absolute') set(el, 'bottom', 'auto');
    if (parent && parent.display.includes('flex') && parent.flexDirection.startsWith('column')) set(el, 'flex-basis', 'auto');
  }
  set(document.documentElement, 'height', 'auto');
  set(document.documentElement, 'overflow-y', 'visible');
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
  return extra;
})()`;

export async function expandScrollRoot(page: { evaluate<T>(expression: string): Promise<T> }): Promise<number> {
  return page.evaluate<number>(EXPAND_SCROLL_ROOT).catch(() => 0);
}
