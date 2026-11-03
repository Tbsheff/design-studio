import path from "node:path";

import {
  BadRequestError,
  componentSchema,
  humanize,
  loadLibrary,
  propsFor,
} from "./deps.js";
import type {
  ComponentSchema,
  Direction,
  LibraryEntry,
  Project,
  PropValue,
} from "./deps.js";
import { toAxes } from "./engine/index.js";
import type { GalleryAxes } from "./engine/index.js";

interface ComponentRef {
  readonly component: string;
  readonly file: string | null;
}

interface ResolvedComponent {
  readonly appDir: string;
  readonly axes: GalleryAxes;
  readonly base: Record<string, PropValue>;
  readonly entry: LibraryEntry;
  readonly root: string;
  readonly text: string | null;
}

const matchesRef = (entry: LibraryEntry, ref: ComponentRef): boolean =>
  entry.name === ref.component &&
  (ref.file === null || entry.file === ref.file);

const pickEntry = (
  entries: readonly LibraryEntry[],
  ref: ComponentRef
): LibraryEntry => {
  const matches = entries.filter((entry) => matchesRef(entry, ref));
  const [first] = matches;

  if (matches.length === 1 && first) {
    return first;
  }

  if (matches.length === 0) {
    throw new BadRequestError(
      `The project has no exported component named ${ref.component}. List the components to see the names.`
    );
  }

  throw new BadRequestError(
    `More than one component is named ${ref.component} (${matches.map((entry) => entry.file).join(", ")}). Pass its file too.`
  );
};

const schemaOf = async (
  workTree: string,
  entry: LibraryEntry
): Promise<ComponentSchema | null> => {
  try {
    return await componentSchema(workTree, {
      file: entry.absolute,
      name: entry.local,
    });
  } catch {
    return null;
  }
};

const textOf = (
  overrides: Record<string, PropValue>,
  entry: LibraryEntry
): string | null => {
  if ("children" in overrides) {
    return String(overrides["children"]);
  }

  if (entry.children) {
    return humanize(entry.name);
  }

  return null;
};

const appDirOf = (project: Project, root: string): string => {
  if (project.app?.appDir) {
    return path.join(root, project.app.appDir);
  }

  return root;
};

const resolveComponent = async (
  project: Project,
  direction: Direction,
  ref: ComponentRef,
  overrides: Record<string, PropValue>
): Promise<ResolvedComponent> => {
  if (project.kind !== "react") {
    throw new BadRequestError(
      "This is an HTML project. A component gallery needs a React project or an attached app."
    );
  }

  const library = await loadLibrary(project, direction.workTree);
  const entry = pickEntry(library.entries, ref);
  const schema = await schemaOf(direction.workTree, entry);
  const { root } = library;
  const appDir = appDirOf(project, root);
  const base = propsFor(schema, overrides);
  const axes = toAxes(schema);
  const text = textOf(overrides, entry);

  return { appDir, axes, base, entry, root, text };
};

export { resolveComponent };

export type { ComponentRef, ResolvedComponent };
