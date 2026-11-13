import { readFile } from "node:fs/promises";
import path from "node:path";

import type { RunRequest } from "@design-studio/contracts";

interface MockPageSession {
  readonly say: (text: string) => Promise<void>;
  readonly writeFileAsTool: (
    toolName: "Write" | "Edit",
    relativePath: string,
    content: string
  ) => Promise<void>;
}

interface MockHtmlInput {
  readonly request: RunRequest;
  readonly text: string;
  readonly workTree: string;
}

type WriteHtmlChange<Session> = (
  session: Session,
  indexPath: string,
  text: string
) => Promise<string>;

const LT = "\u003C";

const GT = "\u003E";

const LINKED_MARK = "data-linked-page";

const BODY_BLOCK = /<body\b[^>]*>[\s\S]*<\/body>/iu;

const HEADING = /<h1\b[^>]*>(?<title>[^<]*)<\/h1>/iu;

const toTag = (inner: string): string => `${LT}${inner}${GT}`;

const toLinkedTarget = (request: RunRequest): string | null => {
  const paths = request.focusPaths ?? [];
  const only = paths.at(0) ?? "";

  if (paths.length !== 1 || !only.endsWith(".html")) {
    return null;
  }

  return only;
};

const toReadPage = async (file: string): Promise<string | null> => {
  try {
    return await readFile(file, "utf-8");
  } catch {
    return null;
  }
};

const toMockBody = (title: string): string =>
  [
    toTag('body class="mock-linked"'),
    `  ${toTag('main style="max-width:720px;margin:64px auto;padding:0 24px;font-family:inherit"')}`,
    `    ${toTag("h1")}${title}${toTag("/h1")}`,
    `    ${toTag('p style="opacity:.7"')}Pick a day and a time.${toTag("/p")}`,
    `    ${toTag('form style="display:grid;gap:16px;margin-top:24px"')}`,
    `      ${toTag("label")}Date ${toTag('input type="date" name="date"')}${toTag("/label")}`,
    `      ${toTag("label")}Time ${toTag('input type="time" name="time"')}${toTag("/label")}`,
    `      ${toTag('button type="submit" id="confirm"')}Confirm${toTag("/button")}`,
    `    ${toTag("/form")}`,
    `  ${toTag("/main")}`,
    toTag("/body"),
  ].join("\n");

const runMockLinkedPage = async (
  session: MockPageSession,
  input: MockHtmlInput,
  target: string
): Promise<string | null> => {
  const source = await toReadPage(path.join(input.workTree, target));

  if (source === null || !source.includes(LINKED_MARK)) {
    return null;
  }

  const title = HEADING.exec(source)?.groups?.title ?? "New screen";

  await session.say(`Designing ${target} for "${title}".`);
  await session.writeFileAsTool(
    "Write",
    target,
    source.replace(BODY_BLOCK, toMockBody(title))
  );

  return `Designed \`${target}\`.`;
};

const toLinkedText = async <Session extends MockPageSession>(
  session: Session,
  input: MockHtmlInput,
  writeHtmlChange: WriteHtmlChange<Session>
): Promise<string> => {
  const target = toLinkedTarget(input.request);

  if (target !== null) {
    const linked = await runMockLinkedPage(session, input, target);

    if (linked !== null) {
      return linked;
    }
  }

  return writeHtmlChange(
    session,
    path.join(input.workTree, "index.html"),
    input.text
  );
};

const runMockHtml = async <Session extends MockPageSession>(
  session: Session,
  input: MockHtmlInput,
  writeHtmlChange: WriteHtmlChange<Session>
): Promise<string> => {
  const finalText = await toLinkedText(session, input, writeHtmlChange);

  await session.say(finalText);

  return finalText;
};

export { runMockHtml };

export type { MockHtmlInput, MockPageSession };
