import type { RenderColorScheme } from "../../shared/render-rpc.js";
import type {
  PreviewService,
  RenderPage,
  RenderViewport,
} from "../../shared/server-ports.js";

const DARK_CLASS = "dark";

const THEME_ATTRIBUTE = "data-theme";

const toSchemeExpression = (colorScheme: RenderColorScheme): string => {
  const scheme = JSON.stringify(colorScheme);
  const isDark = JSON.stringify(colorScheme === "dark");

  return `(async () => { const root = document.documentElement; root.classList.toggle(${JSON.stringify(DARK_CLASS)}, ${isDark}); root.setAttribute(${JSON.stringify(THEME_ATTRIBUTE)}, ${scheme}); await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))); return true; })()`;
};

const toSchemedPreview = (
  preview: PreviewService,
  colorScheme: RenderColorScheme | null
): PreviewService => {
  if (colorScheme === null || !preview.withPage) {
    return preview;
  }

  const run = preview.withPage.bind(preview);
  const expression = toSchemeExpression(colorScheme);

  const withPage = <Value>(
    url: string,
    viewport: RenderViewport,
    task: (page: RenderPage) => Promise<Value>
  ): Promise<Value> =>
    run(url, { ...viewport, colorScheme }, async (page) => {
      await page.evaluate(expression);

      return task(page);
    });

  return Object.assign(Object.create(preview) as PreviewService, {
    withPage,
  });
};

export { toSchemedPreview };
