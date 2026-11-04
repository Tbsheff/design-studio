import type { DirectEditRequest } from "../../../shared/contracts.js";
import { variantLabel } from "../../../shared/variants.js";
import type { PatchResult } from "../engine/errors.js";

const MAX_SUMMARY_TEXT = 120;

const INSERT_LABEL = {
  text: "Text",
  frame: "Frame",
  rect: "Rectangle",
  ellipse: "Ellipse",
} as const;

function visibilityTitle(
  tag: string,
  style: DirectEditRequest["style"]
): string | null {
  const entries = Object.entries(style ?? {});

  if (entries.length !== 1 || entries[0]?.[0] !== "display") {
    return null;
  }

  const value = entries[0][1];

  if (value === "none") {
    return `Hide ${tag}`;
  }

  return value === null ? `Show ${tag}` : null;
}

export function editTitle(
  tag: string,
  applied: PatchResult["applied"],
  request: DirectEditRequest
): string {
  const title = baseTitle(tag, applied, request);

  return request.variant
    ? `${title} (${variantLabel(request.variant)})`
    : title;
}

function baseTitle(
  tag: string,
  applied: PatchResult["applied"],
  request: DirectEditRequest
): string {
  if (request.move !== undefined) {
    return `Move ${tag} ${request.move}`;
  }

  if (request.insert !== undefined) {
    return `Add ${INSERT_LABEL[request.insert].toLowerCase()} to ${tag}`;
  }

  const visibility = visibilityTitle(tag, request.style);

  if (visibility && request.text === undefined && request.name === undefined) {
    return visibility;
  }

  if (
    request.name !== undefined &&
    applied.style.length === 0 &&
    !applied.text &&
    !applied.classes
  ) {
    return request.name === null
      ? `Remove name of ${tag}`
      : `Rename ${tag} to ${request.name}`;
  }

  if (applied.style.length === 0 && !applied.classes) {
    return `Edit text of ${tag}`;
  }

  const parts = [
    ...applied.style,
    ...(applied.classes ? ["classes"] : []),
    ...(applied.text ? ["text"] : []),
  ];

  return `Edit ${tag}: ${parts.join(", ")}`;
}

function otherParts(request: DirectEditRequest): string[] {
  const parts: string[] = [];

  if (request.name !== undefined) {
    parts.push(
      request.name === null ? "remove name" : `name: "${request.name}"`
    );
  }

  if (request.move !== undefined) {
    parts.push(`move ${request.move}`);
  }

  if (request.insert !== undefined) {
    parts.push(`insert ${request.insert}`);
  }

  if (request.variant) {
    parts.push(`variant ${request.variant}`);
  }

  return parts;
}

export function editSummary(request: DirectEditRequest): string {
  const parts = Object.entries(request.style ?? {}).map(([prop, value]) =>
    value === null ? `remove ${prop}` : `${prop}: ${value}`
  );

  if (request.text !== undefined) {
    const text =
      request.text.length > MAX_SUMMARY_TEXT
        ? `${request.text.slice(0, MAX_SUMMARY_TEXT - 1)}…`
        : request.text;

    parts.push(`text: "${text}"`);
  }

  if (request.classes?.add?.length) {
    parts.push(`add class ${request.classes.add.join(" ")}`);
  }

  if (request.classes?.remove?.length) {
    parts.push(`remove class ${request.classes.remove.join(" ")}`);
  }

  parts.push(...otherParts(request));

  for (const token of request.classes?.add ?? []) {
    parts.push(`add class ${token}`);
  }

  for (const token of request.classes?.remove ?? []) {
    parts.push(`remove class ${token}`);
  }

  return `Direct edit of ${request.source.file}:${request.source.line}:${request.source.col}: ${parts.join("; ")}`;
}
