import { readFile } from "node:fs/promises";
import path from "node:path";

import type { CanvasWriteSource, Project } from "@design-studio/actions/_core/contracts";
import {
  emptyLinksFile,
  LINKS_FILE,
  parseLinksText,
  serializeLinksFile,
} from "@design-studio/actions/_core/links";
import type { LinksFile } from "@design-studio/actions/_core/links";
import { createKeyedMutex } from "../../platform/mutex/index.js";
import type { EventBus } from "../../types.js";
import { canvasOwner, writeAtomic } from "../service.js";
import type { LinksService, LinksWritten } from "../service.js";

export function linksPath(workTree: string): string {
  return path.join(workTree, ...LINKS_FILE.split("/"));
}

export async function readLinksAt(workTree: string): Promise<LinksFile> {
  const text = await readFile(linksPath(workTree), "utf-8").catch(() => null);

  return (text === null ? null : parseLinksText(text)) ?? emptyLinksFile();
}

export function createLinksService(
  bus: EventBus,
  written?: LinksWritten
): LinksService {
  const lock = createKeyedMutex();

  const keyOf = (project: Project): string =>
    `${project.id}/${canvasOwner(project).id}/links`;

  const read = (project: Project): Promise<LinksFile> =>
    readLinksAt(canvasOwner(project).workTree);

  const emit = (
    project: Project,
    links: LinksFile,
    source: CanvasWriteSource
  ): void => {
    bus.emit({
      directionId: canvasOwner(project).id,
      projectId: project.id,
      type: "links.changed",
      links,
      source,
    });
  };

  return {
    async announce(project) {
      const links = await lock(keyOf(project), () => read(project));
      emit(project, links, "restore");
    },

    update(project, change, source) {
      return lock(keyOf(project), async () => {
        const current = await read(project);
        const next = change(current);

        if (next === null) {
          return current;
        }

        const text = serializeLinksFile(next);
        const saved = parseLinksText(text) ?? emptyLinksFile();

        if (text === serializeLinksFile(current)) {
          return saved;
        }

        await writeAtomic(linksPath(canvasOwner(project).workTree), text);
        emit(project, saved, source);
        written?.(project, current, saved, source);

        return saved;
      });
    },

    read,
  };
}
