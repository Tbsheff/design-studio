import { routes } from "@design-studio/actions/direct-edit/routes";
import type { SelectionContext } from "@design-studio/contracts";

import { IMAGE_BYTES_MAX, imageKindOf } from "../../../shared/image.js";
import type { SetImageRequest } from "../../../shared/image.js";
import { call } from "../../platform/http.js";
import type { ApiError } from "../../platform/http.js";
import { isText } from "../../platform/json-guard.js";
import { isApiError } from "./use-api-error.js";

const HTML_LIMIT = 4000;

const toImageTarget = (
  selection: SelectionContext
): SetImageRequest["target"] => {
  const base = {
    background: imageKindOf(selection) === "background",
    selector: selection.selector,
    source: selection.source,
    tag: selection.tag.toLowerCase(),
  };

  const html = selection.outerHTML.slice(0, HTML_LIMIT);
  const { owners } = selection;

  if (owners && owners.length > 0) {
    if (selection.source) {
      return { ...base, owners };
    }

    return { ...base, html, owners };
  }

  if (selection.source) {
    return base;
  }

  return { ...base, html };
};

const toFileData = async (
  file: Blob & { readonly name?: string }
): Promise<{ readonly name: string; readonly data: string }> => {
  if (file.size > IMAGE_BYTES_MAX) {
    throw new Error("The image is larger than 10 MB.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const step = 0x80_00;

  for (let at = 0; at < bytes.length; at += step) {
    binary += String.fromCodePoint(...bytes.subarray(at, at + step));
  }

  const ext =
    file.type.split("/")[1]?.replace("svg+xml", "svg").replace("jpeg", "jpg") ??
    "png";

  return { data: btoa(binary), name: file.name || `pasted-image.${ext}` };
};

const toItemFile = (item: DataTransferItem | File): File | null => {
  if (item instanceof File) {
    return item;
  }

  if (item.kind === "file") {
    return item.getAsFile();
  }

  return null;
};

const toImageFile = (
  list: DataTransferItemList | FileList | null
): File | null => {
  if (!list) {
    return null;
  }

  for (const item of list) {
    const file = toItemFile(item);

    if (file?.type.startsWith("image/")) {
      return file;
    }
  }

  return null;
};

const getClipboardImage = async (): Promise<Blob | null> => {
  const items = await navigator.clipboard.read();

  for (const item of items) {
    const type = item.types.find((kind) => kind.startsWith("image/"));

    if (type) {
      return item.getType(type);
    }
  }

  return null;
};

const toApiMessage = (error: ApiError): string | null => {
  const { data } = error;

  if (data instanceof Object && "message" in data && isText(data.message)) {
    return data.message;
  }

  return null;
};

const toImageError = <Caught>(error: Caught): string => {
  if (isApiError(error)) {
    const message = toApiMessage(error);

    if (message !== null) {
      return message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "The image could not be placed.";
};

const imageApi = {
  set: (
    pid: string,
    did: string,
    request: SetImageRequest
  ): ReturnType<typeof call<typeof routes.setImageDirectEdit>> =>
    call(routes.setImageDirectEdit, {
      ...request,
      directionId: did,
      projectId: pid,
    }),
};

export {
  getClipboardImage,
  imageApi,
  toFileData,
  toImageError,
  toImageFile,
  toImageTarget,
};
