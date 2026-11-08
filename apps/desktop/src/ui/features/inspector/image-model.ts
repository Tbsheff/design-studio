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

const RESELECT_FIRST_MS = 700;
const RESELECT_SECOND_MS = 1800;
const NAME_LENGTH = 60;

const RESELECT_AFTER_MS = [RESELECT_FIRST_MS, RESELECT_SECOND_MS];

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

const getAttributeText = (html: string, name: string): string | null => {
  const open = /^<[^>]*>/u.exec(html)?.[0] ?? "";
  const match = new RegExp(`\\s${name}="(?<value>[^"]*)"`, "iu").exec(open);

  if (!match) {
    return null;
  }

  const node = document.createElement("textarea");
  node.insertAdjacentHTML("beforeend", match.groups?.value ?? "");

  return node.value;
};

const getCurrentFit = (
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

const getSourceName = (
  selection: SelectionContext,
  background: boolean
): string => {
  let raw = getAttributeText(selection.outerHTML, "src") ?? "";

  if (background) {
    raw =
      /url\(["']?(?<name>[^"')]+)/u.exec(
        selection.styles["background-image"] ?? ""
      )?.groups?.name ?? "";
  }

  const nextUrl = /\/_next\/image\?(?:.*&)?url=(?<name>[^&]+)/u.exec(raw)
    ?.groups?.name;
  let path = raw;

  if (nextUrl) {
    path = decodeURIComponent(nextUrl);
  }

  const last = path.split(/[?#]/u)[0]?.split("/").pop() ?? "";

  if (last.startsWith("data:") || last === "") {
    return "Inline image";
  }

  return decodeURIComponent(last).slice(0, NAME_LENGTH);
};

export {
  RESELECT_AFTER_MS,
  FIT_LABEL,
  FIT_TIP,
  getAttributeText,
  getCurrentFit,
  getSourceName,
};

export type { Props };
