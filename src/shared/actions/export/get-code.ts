import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  DirectionIdSchema,
  ProjectIdSchema,
  VersionIdSchema,
} from "../_core/ids.js";
import {
  CopyCodeFormatSchema,
  CopyCodeResultSchema,
  CopySelectorSchema,
  FrameSideSchema,
  PagePathSchema,
} from "./schema.js";

const DirectionFieldSchema = Schema.NullOr(DirectionIdSchema).annotate({
  description: "Direction id. Leave out for the main direction.",
});

const FormatFieldSchema = CopyCodeFormatSchema.annotate({
  description: "html, tailwind or react. Default html.",
});

const HeightFieldSchema = FrameSideSchema.annotate({
  description: "Frame height. Default 900.",
});

const PathFieldSchema = PagePathSchema.annotate({
  description:
    'Page path in the project, for example "about.html". Leave out for the entry page.',
});

const ProjectFieldSchema = ProjectIdSchema.annotate({
  description: "Project id from list_projects.",
});

const SelectorFieldSchema = CopySelectorSchema.annotate({
  description: "CSS selector or layer id of the element to copy.",
});

const VersionFieldSchema = Schema.NullOr(VersionIdSchema).annotate({
  description: "Version id. Leave out for the live files of the direction.",
});

const WidthFieldSchema = FrameSideSchema.annotate({
  description: "Frame width. Default 1440.",
});

const getCodeExport = defineAction({
  access: "read",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Copy one element as code with the same server code as Copy as code in the studio. format html: markup with a <style> block of classes from the computed styles. tailwind: markup with Tailwind classes. react: a JSX component named after the layer with className or style objects, and kit components such as <Button> with their import lines. Read only: changes no file.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/copy-code" },
  id: "export.getCode",
  input: Schema.Struct({
    directionId: Schema.optionalKey(DirectionFieldSchema),
    format: Schema.optionalKey(FormatFieldSchema),
    height: Schema.optionalKey(HeightFieldSchema),
    path: Schema.optionalKey(PathFieldSchema),
    projectId: ProjectFieldSchema,
    targetSelector: SelectorFieldSchema,
    versionId: Schema.optionalKey(VersionFieldSchema),
    width: Schema.optionalKey(WidthFieldSchema),
  }),
  invalidates: [],
  mcp: { name: "copy_code" },
  needs: "project.read",
  output: CopyCodeResultSchema,
  scope: "project",
});

export { getCodeExport };
