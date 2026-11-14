import path from "node:path";

import type { Plugin } from "esbuild";

const WORKSPACE_PACKAGE = /^@design-studio\//u;
const BARE_SPECIFIER = /^[^./]/u;
const BUNDLED_PACKAGES = new Set(["effect", "culori", "parse5", "entities"]);
const SINGLE_COPY_PACKAGES = new Set(["effect"]);
const MODULES_MARKER = `${path.sep}node_modules${path.sep}`;

const packageName = (specifier: string): string => {
  const parts = specifier.split("/");

  if (specifier.startsWith("@")) {
    return parts.slice(0, 2).join("/");
  }

  return parts[0] ?? specifier;
};

const toModuleSubpath = (dir: string): string =>
  dir.slice(dir.lastIndexOf(MODULES_MARKER) + MODULES_MARKER.length);

const isBundled = (specifier: string): boolean =>
  WORKSPACE_PACKAGE.test(specifier) ||
  path.isAbsolute(specifier) ||
  BUNDLED_PACKAGES.has(packageName(specifier));

const externalizeBare: Plugin = {
  name: "externalize-bare",
  setup: (pluginBuild) => {
    pluginBuild.onResolve({ filter: BARE_SPECIFIER }, (args) => {
      if (isBundled(args.path)) {
        return null;
      }

      return { external: true, path: args.path };
    });
  },
};

const assertSingleCopy = (dirs: string[]): void => {
  const copied = dirs.filter((dir) =>
    SINGLE_COPY_PACKAGES.has(toModuleSubpath(dir))
  );

  if (copied.length > 0) {
    throw new Error(
      `An external server package needs ${copied.join(", ")}, so the app would load 2 copies. fix: add the package that imports it to BUNDLED_PACKAGES in desktop/server-bundle.ts`
    );
  }
};

export { assertSingleCopy, externalizeBare, packageName, toModuleSubpath };
