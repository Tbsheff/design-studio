import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Project } from "../../../shared/contracts.js";
import {
  emptyLinksFile,
  LINKS_FILE,
  parseLinksText,
  serializeLinksFile,
  type LinksFile,
} from "../../../shared/links.js";
import { createKeyedMutex } from "../../store/mutex.js";
import type { EventBus } from "../../types.js";
import {
  canvasOwner,
  writeAtomic,
  type LinksService,
  type LinksWritten,
} from "../service.js";

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
      type: "links.changed",
      projectId: project.id,
      directionId: canvasOwner(project).id,
      links,
      source,
    });
  };

  return {
    read,

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

    async announce(project) {
      const links = await lock(keyOf(project), () => read(project));
      emit(project, links, "restore");
    },
  };
}
