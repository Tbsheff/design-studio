import type {
  PreviewService,
  RenderPage,
  RenderViewport,
} from "../../shared/server-ports.js";

type ShotClip = Parameters<RenderPage["screenshot"]>[1];

const toProbedPage = (
  page: RenderPage,
  expression: string,
  found: string[]
): RenderPage =>
  Object.assign(Object.create(page) as RenderPage, {
    screenshot: async (outPath: string, clip: ShotClip) => {
      found.push(await page.evaluate<string>(expression));
      await page.screenshot(outPath, clip);
    },
  });

const toProbedPreview = (
  preview: PreviewService | null,
  expression: string,
  found: string[]
): PreviewService | null => {
  if (preview === null || !preview.withPage) {
    return preview;
  }

  const run = preview.withPage.bind(preview);

  const withPage = <Value>(
    url: string,
    viewport: RenderViewport,
    task: (page: RenderPage) => Promise<Value>
  ): Promise<Value> =>
    run(url, viewport, (page) => task(toProbedPage(page, expression, found)));

  return Object.assign(Object.create(preview) as PreviewService, {
    withPage,
  });
};

export { toProbedPreview };
