import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  assertCanEdit,
  publishVersion,
  saveDeferred,
  savesSettled,
} from "./deps.js";
import type {
  DirectEditDeps,
  Direction,
  Project,
  VersionMeta,
} from "./deps.js";
import type { GalleryCell } from "./engine/index.js";

interface GalleryManifest {
  readonly cells: readonly GalleryCell[];
  readonly component: string;
  readonly height: number;
  readonly page: string;
  readonly schemes: readonly ("dark" | "light")[];
  readonly width: number;
}

interface GalleryVersionScope {
  readonly deps: DirectEditDeps;
  readonly direction: Direction;
  readonly project: Project;
}

interface GalleryLocation {
  readonly dir: string;
  readonly page: string;
}

const FOLDER = "studio-gallery";

const VERSION_TITLE = "Create gallery";

const slugOf = (component: string): string =>
  component.replaceAll(/[^A-Za-z0-9]+/gu, "-").toLowerCase();

const isDirectory = async (target: string): Promise<boolean> => {
  try {
    const info = await stat(target);

    return info.isDirectory();
  } catch {
    return false;
  }
};

const locate = async (
  project: Project,
  direction: Direction,
  component: string
): Promise<GalleryLocation & { readonly slug: string }> => {
  const appRoot = path.join(direction.workTree, project.app?.appDir ?? "");
  const slug = slugOf(component);
  let parent = appRoot;

  if (await isDirectory(path.join(appRoot, "public"))) {
    parent = path.join(appRoot, "public");
  }

  return {
    dir: path.join(parent, FOLDER),
    page: `${FOLDER}/${slug}.html`,
    slug,
  };
};

const writeGallery = async (
  place: GalleryLocation & { readonly slug: string },
  html: string,
  manifest: GalleryManifest
): Promise<readonly string[]> => {
  const htmlFile = path.join(place.dir, `${place.slug}.html`);
  const manifestFile = path.join(place.dir, `${place.slug}.json`);

  await mkdir(place.dir, { recursive: true });
  await writeFile(htmlFile, html);
  await writeFile(manifestFile, JSON.stringify(manifest));

  return [htmlFile, manifestFile];
};

const readManifest = async (
  place: GalleryLocation & { readonly slug: string }
): Promise<GalleryManifest | null> => {
  try {
    const raw = await readFile(
      path.join(place.dir, `${place.slug}.json`),
      "utf-8"
    );

    return JSON.parse(raw) as GalleryManifest;
  } catch {
    return null;
  }
};

const createGalleryVersion = async (
  scope: GalleryVersionScope,
  place: GalleryLocation & { readonly slug: string },
  html: string,
  manifest: GalleryManifest
): Promise<void> => {
  const { deps, direction, project } = scope;
  assertCanEdit(deps, project, direction);
  await savesSettled(project.id);

  const files = await writeGallery(place, html, manifest);

  const meta: VersionMeta = {
    kind: "manual",
    prompt: `${VERSION_TITLE}: ${manifest.component}`,
  };

  const version = saveDeferred(
    deps,
    project,
    direction,
    files.map((file) => path.relative(direction.workTree, file)),
    VERSION_TITLE,
    meta
  );

  await publishVersion(deps, project, direction, version);
};

export { createGalleryVersion, locate, readManifest, writeGallery };

export type { GalleryLocation, GalleryManifest, GalleryVersionScope };
