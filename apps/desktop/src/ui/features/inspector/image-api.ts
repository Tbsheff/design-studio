import { routes } from "@design-studio/actions/direct-edit/routes";
import type { SelectionContext } from "@design-studio/actions/_core/contracts";
import { IMAGE_BYTES_MAX, imageKindOf } from "../../../shared/image.js";
import type { SetImageRequest } from "../../../shared/image.js";
import { call } from "../../platform/http.js";
import { isApiError } from "./api-error.js";

export const imageTargetOf = (
  selection: SelectionContext
): SetImageRequest["target"] => ({
  background: imageKindOf(selection) === "background",
  selector: selection.selector,
  source: selection.source,
  tag: selection.tag.toLowerCase(),
  ...(selection.source ? {} : { html: selection.outerHTML.slice(0, 4000) }),
  ...(selection.owners?.length ? { owners: selection.owners } : {}),
});

export const fileData = async (
  file: Blob & { name?: string }
): Promise<{ name: string; data: string }> => {
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

export const imageFileOf = (
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

export const clipboardImage = async (): Promise<Blob | null> => {
  const items = await navigator.clipboard.read();

  for (const item of items) {
    const type = item.types.find((kind) => kind.startsWith("image/"));

    if (type) {
      return item.getType(type);
    }
  }

  return null;
};

export const imageError = (error: unknown): string => {
  if (
    isApiError(error) &&
    typeof (error.data as { message?: unknown } | undefined)?.message ===
      "string"
  ) {
    return (error.data as { message: string }).message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "The image could not be placed.";
};

export const imageApi = {
  set: (pid: string, did: string, request: SetImageRequest) =>
    call(routes.setImageDirectEdit, {
      ...request,
      directionId: did,
      projectId: pid,
    }),
};
