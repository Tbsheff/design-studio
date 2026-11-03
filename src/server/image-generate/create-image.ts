import { BadRequestError, ConflictError, DirectEditError } from "./deps.js";
import type { Direction, Project } from "./deps.js";
import type { Aspect, Style } from "./engine/sizes.js";
import { generateImage } from "./generate-bytes.js";
import type { Generated } from "./generate-bytes.js";
import type { ImageGenerateRuntime } from "./image-generate-runtime.js";
import { altOf, placeGenerated } from "./place.js";
import type { PlaceCommand } from "./place.js";
import type { ImageProviderName } from "./provider-env.js";
import { readReuse } from "./reuse.js";

interface ImageCommand {
  readonly aspect: Aspect;
  readonly directionId: string;
  readonly layer: unknown;
  readonly projectId: string;
  readonly prompt: string;
  readonly reuse: string | null;
  readonly seed: number;
  readonly style: Style;
}

interface ImageCreated {
  readonly alt: string;
  readonly asset: string;
  readonly isMock: boolean;
  readonly placed: boolean;
  readonly preview: string;
  readonly provider: ImageProviderName;
  readonly src: string | null;
  readonly versionId: string | null;
}

const MIME = {
  jpg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
  webp: "image/webp",
} as const;

const mimeOf = (ext: string): string => {
  if (ext === "jpg" || ext === "svg" || ext === "webp") {
    return MIME[ext];
  }

  return MIME.png;
};

const CONFLICT_CODES = new Set(["history_stale", "run_in_progress"]);

const previewOriginOf = async (
  runtime: ImageGenerateRuntime,
  project: Project,
  direction: Direction
): Promise<string | null> => {
  if (project.kind !== "react") {
    return null;
  }

  try {
    return new URL(await runtime.preview.directionUrl(project, direction))
      .origin;
  } catch {
    return null;
  }
};

const toDataUrl = (bytes: Buffer, ext: string): string =>
  `data:${mimeOf(ext)};base64,${bytes.toString("base64")}`;

const extOf = (asset: string): string => asset.split(".").pop() ?? "png";

const toKnown = (error: Error): Error => {
  if (!(error instanceof DirectEditError)) {
    return error;
  }

  if (CONFLICT_CODES.has(error.code)) {
    return new ConflictError(error.message);
  }

  return new BadRequestError(error.message);
};

const placeCommandOf = (command: ImageCommand): PlaceCommand | null => {
  if (command.layer === null) {
    return null;
  }

  return {
    alt: altOf(command.prompt),
    layer: command.layer,
    prompt: command.prompt,
  };
};

const createImage = async (
  runtime: ImageGenerateRuntime,
  command: ImageCommand
): Promise<ImageCreated> => {
  let generated: Generated | null = null;

  if (command.reuse === null) {
    generated = await generateImage(command);
  }

  try {
    return await runtime.withDirection(
      command.projectId,
      command.directionId,
      async (project, direction) => {
        const { workTree } = direction;

        const image =
          generated?.image ?? (await readReuse(workTree, command.reuse ?? ""));

        const previewOrigin = await previewOriginOf(
          runtime,
          project,
          direction
        );

        const scope = { direction, previewOrigin, project, workTree };

        const place = placeCommandOf(command);

        const done = await placeGenerated(
          runtime.editDeps,
          scope,
          place,
          image
        );

        const used = generated?.provider ?? "mock";

        return {
          alt: altOf(command.prompt),
          asset: done.asset,
          isMock: used === "mock",
          placed: done.versionId !== null,
          preview: toDataUrl(image.bytes, extOf(done.asset)),
          provider: used,
          src: done.src,
          versionId: done.versionId,
        };
      }
    );
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    throw toKnown(error);
  }
};

export { createImage };

export type { ImageCommand, ImageCreated };
