import type { DesignComment } from "./deps.js";

const SNIPPET_MAX = 32;
const SHARED_TEXT_SNIPPET_MAX = 80;
const LEADING_SLASHES = /^\/+/u;

const shortSnippet = (text: string): string => {
  if (text.length > SNIPPET_MAX) {
    return `${text.slice(0, SNIPPET_MAX).trimEnd()}…`;
  }

  return text;
};

const toTargetWhere = (comment: DesignComment): string => {
  const loc = comment.context?.usedAt ?? comment.target.sourceLoc;

  if (loc) {
    return `${loc.file.split("/").pop()}:${loc.line}`;
  }

  return comment.target.selector;
};

const toSnippetSuffix = (snippet: string | null | undefined): string => {
  if (snippet) {
    return ` “${shortSnippet(snippet)}”`;
  }

  return "";
};

const toTargetLabel = (comment: DesignComment): string => {
  if (comment.drawing) {
    const { box } = comment.drawing;

    return `Drawing · ${box.width} × ${box.height}`;
  }

  const snippet = toSnippetSuffix(comment.target.textSnippet);

  return `${comment.target.tag}${snippet} · ${toTargetWhere(comment)}`;
};

const toPageSuffix = (comment: DesignComment): string => {
  if (!comment.frame) {
    return "";
  }

  const path = comment.frame.path.replace(LEADING_SLASHES, "") || "index";

  return ` · Page ${path}`;
};

const toFullSnippet = (text: string | null | undefined): string => {
  if (!text) {
    return "";
  }

  let ellipsis = "";

  if (text.length >= SHARED_TEXT_SNIPPET_MAX) {
    ellipsis = "…";
  }

  return ` “${text}${ellipsis}”`;
};

const toTargetTip = (comment: DesignComment): string => {
  const page = toPageSuffix(comment);

  if (comment.drawing) {
    return `${toTargetLabel(comment)}${page}`;
  }

  const snippet = toFullSnippet(comment.target.textSnippet);

  return `${comment.target.tag}${snippet} · ${toTargetWhere(comment)}${page}`;
};

export { toTargetLabel, toTargetTip };
