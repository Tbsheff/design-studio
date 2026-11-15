import { readFile } from "node:fs/promises";
import path from "node:path";

import type { DirectEditRequest } from "@design-studio/contracts";
import { toGoogleFont } from "@design-studio/contracts/google-fonts";
import type { GoogleFont } from "@design-studio/contracts/google-fonts";

import type { ResolvedSource } from "../../events/index.js";
import { DirectEditError } from "../engine/errors.js";
import {
  hasNextFontImport,
  toNextFontLayoutCode,
  toNextFontNames,
} from "../engine/next-font-import.js";
import { resolveSource } from "./edit-source.js";

interface LayoutFile {
  readonly code: string;
  readonly original: string;
  readonly target: ResolvedSource;
}

interface NextFontLayout {
  readonly families: readonly string[];
  readonly original: string;
  readonly target: ResolvedSource;
}

interface NextFontPlan {
  readonly known: Set<string> | null;
  readonly layouts: readonly NextFontLayout[];
  readonly requests: DirectEditRequest[];
}

interface FoundLayout {
  readonly code: string;
  readonly target: ResolvedSource;
}

const JSX_FILE = /\.[jt]sx?$/u;

const LAYOUT_FILES = [
  "app/layout.tsx",
  "app/layout.jsx",
  "app/layout.js",
  "src/app/layout.tsx",
  "src/app/layout.jsx",
  "src/app/layout.js",
];

const CLASS_IN_CODE =
  "The layout className is built in code. Add the font in the layout by hand, or ask Claude.";

const NO_ROOT =
  "The layout has no <html> or <body> tag. Add the font in the layout by hand, or ask Claude.";

const toAncestors = (relative: string): string[] => {
  const dirs: string[] = [];

  for (
    let dir = path.posix.dirname(relative);
    dir !== "." && dir !== "/";
    dir = path.posix.dirname(dir)
  ) {
    dirs.push(`${dir}/`);
  }

  return [...dirs, ""];
};

const toLayoutCandidates = (relative: string): string[] =>
  toAncestors(relative).flatMap((dir) =>
    LAYOUT_FILES.map((name) => `${dir}${name}`)
  );

const toRequestFont = (request: DirectEditRequest): GoogleFont | null => {
  const value = request.style?.["font-family"] ?? null;

  if (value === null || !JSX_FILE.test(request.source.file)) {
    return null;
  }

  return toGoogleFont(value);
};

const toLayoutTarget = async (
  workTree: string,
  candidate: string
): Promise<ResolvedSource | null> => {
  try {
    return await resolveSource(workTree, candidate);
  } catch {
    return null;
  }
};

const toFoundLayout = async (
  workTree: string,
  relative: string
): Promise<FoundLayout | null> => {
  const found = await Promise.all(
    toLayoutCandidates(relative).map((candidate) =>
      toLayoutTarget(workTree, candidate)
    )
  );

  const target = found.find((item) => item !== null) ?? null;

  if (target === null) {
    return null;
  }

  return { code: await readFile(target.file, "utf-8"), target };
};

const toRequestLayout = (
  workTree: string,
  request: DirectEditRequest
): Promise<FoundLayout | null> => {
  if (toRequestFont(request) === null) {
    return Promise.resolve(null);
  }

  return toFoundLayout(workTree, request.source.file);
};

const isLayoutOwned = (code: string, font: GoogleFont): boolean =>
  hasNextFontImport(code, font.family) &&
  !code.includes(`"${toNextFontNames(font.family).variable}"`);

const toVarRequest = (
  request: DirectEditRequest,
  font: GoogleFont,
  variable: string
): DirectEditRequest => ({
  ...request,
  style: {
    ...request.style,
    "font-family": `var(${variable}, ${font.fallback})`,
  },
});

const toAddedLayout = (
  layouts: Map<string, NextFontLayout>,
  layout: FoundLayout,
  font: GoogleFont
): NextFontLayout => {
  const known = layouts.get(layout.target.relative) ?? {
    families: [],
    original: layout.code,
    target: layout.target,
  };

  if (
    hasNextFontImport(layout.code, font.family) ||
    known.families.includes(font.family)
  ) {
    return known;
  }

  return { ...known, families: [...known.families, font.family] };
};

const toKnown = (
  known: Set<string> | null,
  variables: readonly string[]
): Set<string> | null => {
  if (known === null) {
    return null;
  }

  return new Set([...known, ...variables]);
};

const toNextFontPlan = async (
  workTree: string,
  requests: readonly DirectEditRequest[],
  known: Set<string> | null
): Promise<NextFontPlan> => {
  const layouts = new Map<string, NextFontLayout>();
  const variables: string[] = [];
  const next: DirectEditRequest[] = [];

  const found = await Promise.all(
    requests.map((request) => toRequestLayout(workTree, request))
  );

  for (const [index, request] of requests.entries()) {
    const font = toRequestFont(request);
    const layout = found[index] ?? null;

    if (font === null || layout === null || isLayoutOwned(layout.code, font)) {
      next.push(request);
    } else {
      const { variable } = toNextFontNames(font.family);

      variables.push(variable);
      layouts.set(layout.target.relative, toAddedLayout(layouts, layout, font));
      next.push(toVarRequest(request, font, variable));
    }
  }

  return {
    known: toKnown(known, variables),
    layouts: [...layouts.values()].filter(
      (layout) => layout.families.length > 0
    ),
    requests: next,
  };
};

const toLayoutCode = (code: string, families: readonly string[]): string => {
  let next = code;

  for (const family of families) {
    const result = toNextFontLayoutCode(next, family);

    if (!result.ok && result.code === "class_in_code") {
      throw new DirectEditError("attribute_not_literal", CLASS_IN_CODE);
    }

    if (!result.ok) {
      throw new DirectEditError("element_not_found", NO_ROOT);
    }

    next = result.value;
  }

  return next;
};

const toNextFontFiles = (
  plan: NextFontPlan,
  changed: readonly LayoutFile[]
): LayoutFile[] => {
  const files: LayoutFile[] = [...changed];

  for (const layout of plan.layouts) {
    const at = files.findIndex(
      (file) => file.target.relative === layout.target.relative
    );

    const base = files[at] ?? {
      code: layout.original,
      original: layout.original,
      target: layout.target,
    };

    const file = { ...base, code: toLayoutCode(base.code, layout.families) };

    if (at === -1) {
      files.push(file);
    } else {
      files[at] = file;
    }
  }

  return files.filter((file) => file.code !== file.original);
};

export { toNextFontFiles, toNextFontPlan };

export type { LayoutFile, NextFontLayout, NextFontPlan };
