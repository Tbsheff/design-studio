import type { SelectionContext } from "@design-studio/contracts";
import type { MutableRefObject } from "react";

import type { ImageFit } from "../../../shared/image.js";
import type { PreviewPort } from "../../platform/bridge.js";

interface Props {
  readonly projectId: string;
  readonly directionId: string;
  readonly selection: SelectionContext;
  readonly isEditable: boolean;
  readonly port?: MutableRefObject<PreviewPort | null>;
}

const RESELECT_AFTER_MS = [700, 1800];

const FIT_LABEL: Record<ImageFit, string> = {
  contain: "Contain",
  cover: "Cover",
  fill: "Fill",
};

const FIT_TIP: Record<ImageFit, string> = {
  contain: "Show the whole image inside the box",
  cover: "Fill the box and crop the edges",
  fill: "Stretch the image to the box",
};

const attrOf = (html: string, name: string): string | null => {
  const open = /^<[^>]*>/u.exec(html)?.[0] ?? "";
  const match = new RegExp(`\\s${name}="([^"]*)"`, "i").exec(open);

  if (!match) {
    return null;
  }

  const node = document.createElement("textarea");
  node.innerHTML = match[1] ?? "";

  return node.value;
};

const currentFit = (
  selection: SelectionContext,
  background: boolean
): ImageFit | null => {
  let raw = selection.styles["object-fit"] ?? "";

  if (background) {
    raw = selection.styles["background-size"] ?? "";
  }

  if (raw === "cover" || raw === "contain" || raw === "fill") {
    return raw;
  }

  if (background && /^100% 100%$/u.test(raw)) {
    return "fill";
  }

  return null;
};

const sourceName = (
  selection: SelectionContext,
  background: boolean
): string => {
  let raw = attrOf(selection.outerHTML, "src") ?? "";

  if (background) {
    raw =
      /url\(["']?([^"')]+)/u.exec(
        selection.styles["background-image"] ?? ""
      )?.[1] ?? "";
  }

  const nextUrl = /\/_next\/image\?(?:.*&)?url=([^&]+)/u.exec(raw)?.[1];
  let path = raw;

  if (nextUrl) {
    path = decodeURIComponent(nextUrl);
  }

  const last = path.split(/[?#]/u)[0]?.split("/").pop() ?? "";

  if (last.startsWith("data:") || last === "") {
    return "Inline image";
  }

  return decodeURIComponent(last).slice(0, 60);
};

export {
  RESELECT_AFTER_MS,
  FIT_LABEL,
  FIT_TIP,
  attrOf,
  currentFit,
  sourceName,
};

export type { Props };
