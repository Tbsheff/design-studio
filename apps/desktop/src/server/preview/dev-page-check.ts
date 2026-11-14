import type { Project } from "@design-studio/contracts";

import type { PreviewService } from "../../shared/server-ports.js";

interface PageAnswer {
  readonly isDown: boolean;
  readonly status: number;
  readonly text: string;
}

const CHECK_TIMEOUT_MS = 30_000;

const SERVER_ERROR = 500;

const TEXT_MAX = 400;

const HINT =
  "Call app_doctor to read the dev server status and logs, fix the cause, then call get_screenshot again.";

const HIDDEN_TAGS = ["script", "style", "template"] as const;

const SPACES = /\s+/gu;

const DOCUMENT_HEADERS = {
  accept: "text/html",
  "sec-fetch-dest": "document",
} as const;

const SLOW: PageAnswer = { isDown: false, status: 0, text: "" };

const toWithoutTag = (html: string, tag: string): string => {
  const lower = html.toLowerCase();
  const kept: string[] = [];
  let at = 0;
  let open = lower.indexOf(`<${tag}`, at);

  while (open !== -1) {
    kept.push(html.slice(at, open));

    const close = lower.indexOf(`</${tag}`, open);
    const end = lower.indexOf(">", Math.max(close, open));

    if (close === -1 || end === -1) {
      return kept.join(" ");
    }

    at = end + 1;
    open = lower.indexOf(`<${tag}`, at);
  }

  kept.push(html.slice(at));

  return kept.join(" ");
};

const toWithoutEndDots = (text: string): string => {
  let end = text.length;

  while (end > 0 && text[end - 1] === ".") {
    end -= 1;
  }

  return text.slice(0, end);
};

const toWithoutTags = (html: string): string => {
  const [first = "", ...rest] = html.split("<");
  const texts = rest.map((part) => part.slice(part.indexOf(">") + 1));

  return [first, ...texts].join(" ");
};

const toPageText = (html: string): string => {
  let visible = html;

  for (const tag of HIDDEN_TAGS) {
    visible = toWithoutTag(visible, tag);
  }

  const words = toWithoutTags(visible).replaceAll(SPACES, " ").trim();

  return toWithoutEndDots(words.slice(0, TEXT_MAX).trim());
};

const toPageAnswer = async (url: string): Promise<PageAnswer> => {
  try {
    const answer = await fetch(url, {
      headers: DOCUMENT_HEADERS,
      redirect: "manual",
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    });

    if (answer.status < SERVER_ERROR) {
      await answer.body?.cancel();

      return { isDown: false, status: answer.status, text: "" };
    }

    const text = toPageText(await answer.text());

    return { isDown: false, status: answer.status, text };
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return SLOW;
    }

    return { isDown: true, status: 0, text: "" };
  }
};

const toFailedText = (preview: PreviewService, project: Project): string => {
  const status = preview.apps?.status(project) ?? null;

  if (status?.state !== "failed") {
    return "";
  }

  return ` The dev server failed: ${status.message ?? "no message"}.`;
};

const toDevPageError = async (
  preview: PreviewService,
  project: Project,
  url: string
): Promise<string | null> => {
  if (!project.app) {
    return null;
  }

  const answer = await toPageAnswer(url);
  const route = new URL(url).pathname;

  if (answer.isDown) {
    return `The dev server of ${project.name} does not answer, so get_screenshot cannot show ${route}.${toFailedText(preview, project)} ${HINT}`;
  }

  if (answer.status < SERVER_ERROR) {
    return null;
  }

  const text = answer.text || "no page text";

  return `The dev server answered ${answer.status} for ${route}, so the page shows an error, not the design: ${text}.${toFailedText(preview, project)} ${HINT}`;
};

export { toDevPageError };
