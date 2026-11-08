import type { BridgeToParent, ProjectKind } from "@design-studio/contracts";
import { startTransition, useRef } from "react";
import type { MutableRefObject } from "react";

import { imageKindOf } from "../../../shared/image.js";
import type { SetImageRequest } from "../../../shared/image.js";
import { useBridge } from "../../platform/bridge.js";
import type { BridgeFrame } from "../../platform/bridge.js";
import { NO_SOURCE } from "./structure-edits-model.js";
import { useLatestRef } from "./use-latest-ref.js";

interface Options {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly kind: ProjectKind;
  readonly isEnabled: boolean;
  readonly frames: {
    readonly slots: { readonly token: string; readonly src: string }[];
    readonly frontToken: string | null;
    readonly elements: MutableRefObject<
      Record<string, HTMLIFrameElement | null>
    >;
  };
  readonly notify: (message: string) => void;
}

type FileDrop = Extract<BridgeToParent, { readonly type: "file-drop" }>;

const toInsertPosition = (isInside: boolean): "inside" | "after" => {
  if (isInside) {
    return "inside";
  }

  return "after";
};

const toImageRequest = (
  imageFile: NonNullable<SetImageRequest["image"]>,
  imageTarget: SetImageRequest["target"],
  hasKind: boolean,
  isInside: boolean
): SetImageRequest => {
  if (hasKind) {
    return { image: imageFile, target: imageTarget };
  }

  return {
    alt: "",
    image: imageFile,
    mode: "insert",
    position: toInsertPosition(isInside),
    target: imageTarget,
  };
};

const insertImage = async (
  options: Options,
  directionId: string,
  drop: FileDrop,
  file: File
): Promise<void> => {
  const { selection } = drop;

  if (!selection) {
    return;
  }

  try {
    const { fileData, imageApi, imageTargetOf } =
      await import("./image-api.js");

    const image = await fileData(file);
    const kind = imageKindOf(selection);

    const request = toImageRequest(
      image,
      imageTargetOf(selection),
      Boolean(kind),
      Boolean(drop.inside)
    );

    const result = await imageApi.set(options.projectId, directionId, request);
    options.notify(`${result.title}.`);
  } catch (error) {
    const { imageError } = await import("./image-api.js");
    options.notify(imageError(error));
  }
};

const toRefusal = (options: Options, drop: FileDrop): string | null => {
  if (!drop.files[0]) {
    return "Drop an image file: PNG, JPEG, WebP, AVIF, GIF or SVG.";
  }

  if (!options.isEnabled || !options.directionId) {
    return "Edits are paused here. Wait for the run to finish, or open the latest version.";
  }

  if (!drop.selection) {
    return "Drop the image on an element in the frame.";
  }

  if (!drop.selection.source && !drop.selection.owners?.length) {
    return NO_SOURCE;
  }

  return null;
};

const useImageDrop = (options: Options): void => {
  const live = useLatestRef(options);
  const busy = useRef(false);
  useBridge(
    () =>
      live.current.frames.slots.map((slot): BridgeFrame => ({
        element: live.current.frames.elements.current[slot.token] ?? null,
        key: slot.token,
        kind: live.current.kind,
        token: slot.token,
        url: slot.src,
      })),
    (frame, msg: BridgeToParent) => {
      if (
        msg.type !== "file-drop" ||
        frame.token !== live.current.frames.frontToken
      ) {
        return;
      }

      const cur = live.current;
      const problem = toRefusal(cur, msg);

      if (problem) {
        return cur.notify(problem);
      }

      if (busy.current) {
        return;
      }

      busy.current = true;
      startTransition(async () => {
        await insertImage(
          cur,
          cur.directionId as string,
          msg,
          msg.files[0] as File
        );
        busy.current = false;
      });
    }
  );
};

export { useImageDrop };
