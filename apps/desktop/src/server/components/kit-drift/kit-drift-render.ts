import { setTimeout as toDelay } from "node:timers/promises";

import { SOURCE_LOC_ATTR } from "@design-studio/contracts";
import type { Direction, Project } from "@design-studio/contracts";

import type { PreviewService } from "../../../shared/server-ports.js";
import { probeOnPage } from "../../page-probe/index.js";
import { withPagePath } from "../../project-source/index.js";
import { toMarkupDrift, toScriptDrift } from "./engine/index.js";
import type { MarkupDrift, PackRecipe } from "./engine/index.js";

interface RenderSource {
  readonly direction: Direction;
  readonly preview: PreviewService;
}

interface RenderedPage {
  readonly css: string;
  readonly file: string;
  readonly html: string;
  readonly recipes: readonly PackRecipe[];
}

interface RenderedDrift {
  readonly finds: readonly MarkupDrift[];
  readonly isSkipped: boolean;
}

const RENDER_TIMEOUT_MS = 8000;
const RENDER_VIEWPORT = { height: 900, width: 1280 };
const RENDER_EXPRESSION = "document.documentElement.outerHTML";

const getRenderedHtml = async (
  source: RenderSource,
  project: Project,
  file: string
): Promise<string | null> => {
  const timer = new AbortController();

  try {
    const base = await source.preview.directionUrl(project, source.direction);
    const url = withPagePath(base, file);

    const probe = probeOnPage<string>(
      source.preview,
      url,
      RENDER_VIEWPORT,
      RENDER_EXPRESSION
    );

    const html = await Promise.race([
      probe,
      toDelay(RENDER_TIMEOUT_MS, null, { signal: timer.signal }),
    ]);

    if (html === null || html === "") {
      return null;
    }

    return html;
  } catch {
    return null;
  } finally {
    timer.abort();
  }
};

const listRenderedDrift = async (
  source: RenderSource | null,
  project: Project,
  page: RenderedPage
): Promise<RenderedDrift> => {
  if (source === null) {
    return { finds: [], isSkipped: false };
  }

  const renderedHtml = await getRenderedHtml(source, project, page.file);

  if (renderedHtml === null) {
    return { finds: [], isSkipped: true };
  }

  const rendered = toMarkupDrift({ ...page, html: renderedHtml });

  const { file, html: staticHtml } = page;
  const locAttribute = SOURCE_LOC_ATTR;

  const finds = toScriptDrift({
    file,
    locAttribute,
    rendered,
    renderedHtml,
    staticHtml,
  });

  return { finds, isSkipped: false };
};

export { listRenderedDrift };

export type { RenderSource, RenderedDrift };
