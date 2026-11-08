import { readFile } from "node:fs/promises";

import { elementClassInfo, resolveSource, themeForFile } from "./deps.js";
import type { Project, SourceLoc, TailwindTheme } from "./deps.js";

interface LayerSiteScope {
  readonly project: Project;
  readonly workTree: string;
}

interface LayerSite {
  readonly classes: readonly string[];
  readonly isDynamic: boolean;
  readonly isTailwind: boolean;
  readonly theme: TailwindTheme | null;
}

const toLoadLayerSite = async (
  scope: LayerSiteScope,
  loc: SourceLoc
): Promise<LayerSite> => {
  const resolved = await resolveSource(scope.workTree, loc.file);
  const text = await readFile(resolved.file, "utf-8");

  const [info, theme] = await Promise.all([
    elementClassInfo(scope.workTree, scope.project.kind, loc),
    themeForFile(scope.workTree, resolved.relative, text, {
      projectKind: scope.project.kind,
    }),
  ]);

  return {
    classes: info.tailwind?.classes ?? [],
    isDynamic: info.tailwind?.dynamic ?? false,
    isTailwind: info.tailwind?.mode === "classes" && theme !== null,
    theme,
  };
};

export { toLoadLayerSite as loadLayerSite };

export type { LayerSite, LayerSiteScope };
