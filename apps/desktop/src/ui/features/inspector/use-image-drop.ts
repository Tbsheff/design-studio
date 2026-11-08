import type { BridgeToParent, ProjectKind } from "@design-studio/contracts";
import { useRef } from "react";
import type { MutableRefObject } from "react";

import { imageKindOf } from "../../../shared/image.js";
import type { SetImageRequest } from "../../../shared/image.js";
import { useBridge } from "../../platform/bridge.js";
import type { BridgeFrame } from "../../platform/bridge.js";
import { NO_SOURCE } from "./structure-edits.js";

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

const place = async (
  o: Options,
  directionId: string,
  drop: FileDrop,
  file: File
): Promise<void> => {
  const { selection } = drop;

  if (!selection) {
    return;
  }

  const { fileData, imageApi, imageError, imageTargetOf } =
    await import("./image-api.js");

  try {
    const image = await fileData(file);
    const kind = imageKindOf(selection);

    const request: SetImageRequest = {
      image,
      target: imageTargetOf(selection),
      ...(kind
        ? {}
        : {
            alt: "",
            mode: "insert" as const,
            position: drop.inside ? ("inside" as const) : ("after" as const),
          }),
    };

    const result = await imageApi.set(o.projectId, directionId, request);
    o.notify(`${result.title}.`);
  } catch (error) {
    o.notify(imageError(error));
  }
};

const refusal = (o: Options, drop: FileDrop): string | null => {
  if (!drop.files[0]) {
    return "Drop an image file: PNG, JPEG, WebP, AVIF, GIF or SVG.";
  }

  if (!o.isEnabled || !o.directionId) {
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

const useImageDrop = (o: Options): void => {
  const live = useRef(o);
  live.current = o;
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
      const problem = refusal(cur, msg);

      if (problem) {
        return cur.notify(problem);
      }

      if (busy.current) {
        return;
      }

      busy.current = true;
      void place(
        cur,
        cur.directionId as string,
        msg,
        msg.files[0] as File
      ).finally(() => {
        busy.current = false;
      });
    }
  );
};

export { useImageDrop };
