import { z } from "zod";

import { COPY_CODE_FORMATS } from "../../shared/export.js";
import type { CopyCodeFormat } from "../../shared/export.js";
import { COPY_FRAME, copyCode } from "../export/copy-handler.js";
import { loadTarget } from "./edit-deps.js";
import type { EditDeps } from "./edit-deps.js";
import {
  defineTool,
  directionId as directionIdSchema,
  ok,
  pagePath,
  pageUrl,
  plain,
  projectId as projectIdSchema,
  selector,
} from "./edit-kit.js";
import type { Done } from "./edit-kit.js";

const COPY_CODE_TEXT =
  "Copy one element as code with the same server code as Copy as code in the studio. format html: markup with a <style> block of classes from the computed styles. tailwind: markup with Tailwind classes. react: a JSX component (export function named after the layer) with className (the source Tailwind classes when it has them), style objects otherwise, self-closing void tags and htmlFor; elements whose data-name or class matches a project kit component become <Button> and similar, with their import lines. Read only: changes no file.";

const schema = z.strictObject({
  directionId: directionIdSchema,
  format: z
    .enum(COPY_CODE_FORMATS as [CopyCodeFormat, ...CopyCodeFormat[]])
    .default("html")
    .describe("html, tailwind or react."),
  path: pagePath,
  projectId: projectIdSchema,
  targetSelector: selector.describe(
    "CSS selector or layer id of the element to copy."
  ),
});

type Input = z.output<typeof schema>;

const run = async (deps: EditDeps, input: Input): Promise<Done> => {
  const { direction, project } = await loadTarget(
    deps,
    input.projectId,
    input.directionId
  );

  const url = await pageUrl(deps, project, direction, input.path);

  const code = await copyCode(
    deps.preview,
    { project, url, workTree: direction.workTree },
    { format: input.format, frame: COPY_FRAME, selector: input.targetSelector }
  );

  return plain(ok({ code, format: input.format }));
};

const copyCodeTool = defineTool(
  "copy_code",
  schema,
  { description: COPY_CODE_TEXT, readOnly: true, title: "Copy as code" },
  run
);

const COPY_CODE_TOOLS = [copyCodeTool];

export { COPY_CODE_TOOLS };
