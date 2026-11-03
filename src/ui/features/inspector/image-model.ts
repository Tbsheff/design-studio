import { type MutableRefObject } from "react";

import type { SelectionContext } from "../../../shared/contracts.js";
import { type ImageFit } from "../../../shared/image.js";
import type { PreviewPort } from "../../bridge.js";

interface Props {
  projectId: string;
  directionId: string;
  selection: SelectionContext;
  editable: boolean;
  port?: MutableRefObject<PreviewPort | null>;
}

const RESELECT_AFTER_MS = [700, 1800];

const FIT_LABEL: Record<ImageFit, string> = {
  cover: "Cover",
  contain: "Contain",
  fill: "Fill",
};

const FIT_TIP: Record<ImageFit, string> = {
  cover: "Fill the box and crop the edges",
  contain: "Show the whole image inside the box",
  fill: "Stretch the image to the box",
};

const attrOf = (html: string, name: string): string | null => {
  const open = /^<[^>]*>/.exec(html)?.[0] ?? "";
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
  const raw =
    (background
      ? selection.styles["background-size"]
      : selection.styles["object-fit"]) ?? "";

  if (raw === "cover" || raw === "contain" || raw === "fill") {
    return raw;
  }

  return background && /^100% 100%$/.test(raw) ? "fill" : null;
};

const sourceName = (
  selection: SelectionContext,
  background: boolean
): string => {
  const raw = background
    ? (/url\(["']?([^"')]+)/.exec(
        selection.styles["background-image"] ?? ""
      )?.[1] ?? "")
    : (attrOf(selection.outerHTML, "src") ?? "");

  const nextUrl = /\/_next\/image\?(?:.*&)?url=([^&]+)/.exec(raw)?.[1];
  const path = nextUrl ? decodeURIComponent(nextUrl) : raw;
  const last = path.split(/[?#]/)[0]?.split("/").pop() ?? "";

  return last.startsWith("data:") || last === ""
    ? "Inline image"
    : decodeURIComponent(last).slice(0, 60);
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
