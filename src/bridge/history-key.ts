type HistoryKeyBody = { type: 'history-key'; redo: boolean };

function typingTarget(event: KeyboardEvent): boolean {
  const target = event.composedPath()[0] ?? event.target;
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

export function historyKeyBody(event: KeyboardEvent): HistoryKeyBody | null {
  if (!(event.metaKey || event.ctrlKey) || event.altKey || event.key.toLowerCase() !== 'z') return null;
  if (typingTarget(event)) return null;
  return { type: 'history-key', redo: event.shiftKey };
}

export function forwardHistoryKeys(post: (body: HistoryKeyBody) => void): void {
  window.addEventListener(
    'keydown',
    (event) => {
      const body = historyKeyBody(event);
      if (!body) return;
      event.preventDefault();
      post(body);
    },
    { capture: true },
  );
}
