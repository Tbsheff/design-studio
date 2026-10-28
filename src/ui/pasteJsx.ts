import type { SelectionContext } from '../shared/contracts';
import type { InsertTarget, JsxInsertPosition } from '../shared/insert';
import { insertApi, insertError } from './componentInsert';

const VOID = new Set(['img', 'input', 'hr', 'br', 'textarea', 'select', 'meta', 'link', 'source', 'track', 'wbr', 'col', 'area', 'embed']);

function targetOf(selection: SelectionContext): InsertTarget {
  return { source: selection.source, tag: selection.tag.toLowerCase(), selector: selection.selector, ...(selection.owners?.length ? { owners: selection.owners } : {}) };
}

async function clipboardText(): Promise<string | null> {
  try {
    return await navigator.clipboard.readText();
  } catch {
    return null;
  }
}

export async function pasteJsx(ids: { projectId: string; directionId: string }, selection: SelectionContext, notify: (message: string) => void): Promise<void> {
  const jsx = (await clipboardText())?.trim();
  if (jsx === undefined) return notify('The studio cannot read the clipboard. Allow clipboard access, then try again.');
  if (!jsx.startsWith('<')) return notify('The clipboard has no JSX. Copy a snippet such as <Card>…</Card>, then try again.');
  const position: JsxInsertPosition = VOID.has(selection.tag.toLowerCase()) ? 'after' : 'inside';
  try {
    const result = await insertApi.insertJsx(ids.projectId, ids.directionId, { target: targetOf(selection), position, jsx });
    const added = result.imports.filter((item) => item.added).length;
    notify(`${result.title}${added > 0 ? `, ${added} import${added === 1 ? '' : 's'} added` : ''}.`);
  } catch (error) {
    notify(insertError(error));
  }
}
