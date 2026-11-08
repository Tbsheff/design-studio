import { routes } from "@design-studio/actions/direct-edit/routes";
import type { SelectionContext } from "@design-studio/contracts";

import { IMAGE_BYTES_MAX, imageKindOf } from "../../../shared/image.js";
import type { SetImageRequest } from "../../../shared/image.js";
import { call } from "../../platform/http.js";
import { isApiError } from "./api-error.js";

const imageTargetOf = (
  selection: SelectionContext
): SetImageRequest["target"] => ({
  background: imageKindOf(selection) === "background",
  selector: selection.selector,
  source: selection.source,
  tag: selection.tag.toLowerCase(),
  ...(selection.source ? {} : { html: selection.outerHTML.slice(0, 4000) }),
  ...(selection.owners?.length ? { owners: selection.owners } : {}),
});

const fileData = async (
  file: Blob & { readonly name?: string }
): Promise<{ readonly name: string; readonly data: string }> => {
  if (file.size > IMAGE_BYTES_MAX) {
    throw new Error("The image is larger than 10 MB.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const step = 0x80_00;

  for (let at = 0; at < bytes.length; at += step) {
    binary += String.fromCharCode(...bytes.subarray(at, at + step));
  }

  const ext =
    file.type.split("/")[1]?.replace("svg+xml", "svg").replace("jpeg", "jpg") ??
    "png";

  return { data: btoa(binary), name: file.name || `pasted-image.${ext}` };
};

const imageFileOf = (
  list: DataTransferItemList | FileList | null | undefined
): File | null => {
  if (!list) {
    return null;
  }

  for (const item of Array.from(list as ArrayLike<DataTransferItem | File>)) {
    const file =
      item instanceof File
        ? item
        : item.kind === "file"
          ? item.getAsFile()
          : null;

    if (file && file.type.startsWith("image/")) {
      return file;
    }
  }

  return null;
};

const clipboardImage = async (): Promise<Blob | null> => {
  const items = await navigator.clipboard.read();

  for (const item of items) {
    const type = item.types.find((kind) => kind.startsWith("image/"));

    if (type) {
      return item.getType(type);
    }
  }

  return null;
};

const imageError = (error: unknown): string => {
  if (
    isApiError(error) &&
    typeof (error.data as { readonly message?: unknown } | undefined)
      ?.message === "string"
  ) {
    return (error.data as { readonly message: string }).message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "The image could not be placed.";
};

const imageApi = {
  set: (pid: string, did: string, request: SetImageRequest) =>
    call(routes.setImageDirectEdit, {
      ...request,
      directionId: did,
      projectId: pid,
    }),
};

export {
  imageTargetOf,
  fileData,
  imageFileOf,
  clipboardImage,
  imageError,
  imageApi,
};
