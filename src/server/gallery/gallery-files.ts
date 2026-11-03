import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Direction, Project } from "./deps.js";
import type { GalleryCell } from "./engine/index.js";

interface GalleryManifest {
  readonly cells: readonly GalleryCell[];
  readonly component: string;
  readonly height: number;
  readonly page: string;
  readonly schemes: readonly ("dark" | "light")[];
  readonly width: number;
}

interface GalleryLocation {
  readonly dir: string;
  readonly page: string;
}

const FOLDER = "studio-gallery";

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
): Promise<void> => {
  await mkdir(place.dir, { recursive: true });
  await writeFile(path.join(place.dir, `${place.slug}.html`), html);
  await writeFile(
    path.join(place.dir, `${place.slug}.json`),
    JSON.stringify(manifest)
  );
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

export { locate, readManifest, writeGallery };

export type { GalleryLocation, GalleryManifest };
