import { waitForPage } from '../export/capture.js';
import type { PreviewService } from '../types.js';
import type { RenderPage } from './render-backend.js';

type ProbePage = Pick<RenderPage, 'evaluate'>;

export function onProbePage<T>(preview: Pick<PreviewService, 'peekPage' | 'withPage'>, url: string, viewport: { width: number; height: number }, task: (page: ProbePage) => Promise<T>): Promise<T> {
  if (preview.peekPage) return preview.peekPage(url, viewport, task);
  if (!preview.withPage) throw new Error('rendering is not available');
  return preview.withPage(url, viewport, async (page) => {
    await waitForPage(page);
    return task(page);
  });
}

export function probeOnPage<T>(preview: Pick<PreviewService, 'peekPage' | 'withPage'>, url: string, viewport: { width: number; height: number }, expression: string): Promise<T> {
  return onProbePage(preview, url, viewport, (page) => page.evaluate<T>(expression));
}
