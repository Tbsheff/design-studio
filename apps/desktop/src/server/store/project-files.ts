import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  Attachment,
  Project,
  ProjectThumbnail,
} from "@design-studio/contracts";
import { nanoid } from "nanoid";

import {
  BadRequestError,
  NotFoundError,
  assertSafeId,
  isNodeError,
} from "../platform/errors/index.js";
import type { ProjectCore } from "./project-core.js";
import {
  DESIGN_MD_FILE,
  attachmentProblem,
  extensionFor,
  mainDirection,
  readJson,
  writeFileAtomic,
} from "./project-helpers.js";

const createProjectFiles = (core: ProjectCore) => {
  const { attachmentsDir, lock, projectFile, readProject, writeProject } = core;

  return {
    async getAttachment(
      projectId: string,
      attachmentId: string
    ): Promise<Attachment> {
      const file = path.join(
        attachmentsDir(projectId),
        `${assertSafeId(attachmentId, "attachmentId")}.json`
      );

      try {
        return (await readJson(file)) as Attachment;
      } catch (error) {
        if (isNodeError(error) && error.code === "ENOENT") {
          throw new NotFoundError(`attachment ${attachmentId} not found`);
        }

        throw error;
      }
    },

    async readDesignMd(projectId: string): Promise<string | null> {
      const project = await readProject(projectId);

      try {
        return await readFile(
          path.join(mainDirection(project).workTree, DESIGN_MD_FILE),
          "utf-8"
        );
      } catch (error) {
        if (isNodeError(error) && error.code === "ENOENT") {
          return null;
        }

        throw error;
      }
    },

    async saveAttachment(
      projectId: string,
      file: { name: string; mime: string; bytes: Uint8Array }
    ): Promise<Attachment> {
      const problem = attachmentProblem(file.name, file.mime);

      if (problem) {
        throw new BadRequestError(problem);
      }

      await readProject(projectId);
      const id = nanoid(12);
      const dir = attachmentsDir(projectId);
      await mkdir(dir, { recursive: true });

      const filePath = path.join(
        dir,
        `${id}.${extensionFor(file.name, file.mime)}`
      );

      await writeFile(filePath, file.bytes);

      const attachment: Attachment = {
        id,
        name: path.basename(file.name || id),
        mime: file.mime || "application/octet-stream",
        path: filePath,
      };

      await writeFileAtomic(
        path.join(dir, `${id}.json`),
        JSON.stringify(attachment)
      );

      return attachment;
    },

    setThumbnail(
      projectId: string,
      thumbnail: ProjectThumbnail
    ): Promise<void> {
      return lock(projectId, async () => {
        if (!existsSync(projectFile(projectId))) {
          return;
        }

        const project: Project = await readProject(projectId);
        project.thumbnail = thumbnail;
        await writeProject(project);
      });
    },

    async writeDesignMd(projectId: string, content: string): Promise<void> {
      const project = await readProject(projectId);
      await writeFileAtomic(
        path.join(mainDirection(project).workTree, DESIGN_MD_FILE),
        content
      );
    },
  };
};

export { createProjectFiles };
