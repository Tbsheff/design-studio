import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { PackIdSchema } from "../_core/ids.js";
import { CheckFailed } from "./errors/check-failed.js";
import { PackExists } from "./errors/pack-exists.js";
import {
  DraftImageSchema,
  DraftResultSchema,
  TokensUploadSchema,
} from "./schema.js";

const KB = 1024;

const BRIEF_MAX = 4000;

const DESIGN_MD_KB = 512;

const DESIGN_MD_MAX = DESIGN_MD_KB * KB;

const URL_MAX = 2000;

const URLS_MAX = 3;

const PATH_MAX = 4096;

const NAME_MAX = 80;

const PathSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(PATH_MAX)
);

const NameSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(NAME_MAX)
);

const BaseFieldSchema = PackIdSchema.annotate({
  description: "Design system to fill gaps from. Leave out for the default.",
});

const BriefFieldSchema = Schema.String.check(
  Schema.isMaxLength(BRIEF_MAX)
).annotate({ description: "A short text brief: brand, mood, audience." });

const DesignMdFieldSchema = Schema.String.check(
  Schema.isMaxLength(DESIGN_MD_MAX)
).annotate({ description: "DESIGN.md text to start from." });

const FolderFieldSchema = PathSchema.annotate({
  description:
    "Absolute path of a code folder to read tokens from (CSS variables, Tailwind theme, next/font). A folder outside the projects folder waits for the user to approve it.",
});

const ImagesFieldSchema = Schema.Array(DraftImageSchema);

const ModeFieldSchema = Schema.Literals(["light", "dark", "auto"]);

const NameFieldSchema = NameSchema.annotate({
  description:
    "Name of the design system. Leave out to take it from the first source.",
});

const TokensFieldSchema = PathSchema.annotate({
  description:
    "Absolute path of a tokens file (.json or .css, at most 2 MB): Figma variables JSON, W3C DTCG, Tokens Studio, or CSS custom properties. Aliases stay token references. A file outside the projects folder waits for the user to approve it.",
});

const UrlSchema = Schema.String.check(Schema.isMaxLength(URL_MAX));

const UrlsFieldSchema = Schema.Array(UrlSchema)
  .check(Schema.isMaxLength(URLS_MAX))
  .annotate({
    description:
      "Up to 3 public website URLs to read colors, fonts and spacing from.",
  });

const createDraftPacks = defineAction({
  access: "edit",
  agent: { off: "ui-bootstrap" },
  confirm: "user",
  description:
    "Start a new design system draft from sources (websites, a brief, a DESIGN.md, a code folder, a tokens file such as a Figma variables export), the same as New design system in the studio. It answers at once with the draft project; the sources are read in the background. Poll design_system_status until sources.done is true, then fix problems with set_token and write_file in that project and save it with save_design_system. The AI step (Improve with AI) is a studio run, so it does not start from here.",
  errors: [BadRequest, CheckFailed, Conflict, NotFound, PackExists],
  http: { method: "POST", path: "/api/design-systems/draft" },
  id: "packs.createDraft",
  input: Schema.Struct({
    basePackId: Schema.optionalKey(BaseFieldSchema),
    brief: Schema.optionalKey(BriefFieldSchema),
    designMd: Schema.optionalKey(DesignMdFieldSchema),
    folderPath: Schema.optionalKey(FolderFieldSchema),
    images: Schema.optionalKey(ImagesFieldSchema),
    improve: Schema.optionalKey(Schema.Boolean),
    mode: Schema.optionalKey(ModeFieldSchema),
    name: Schema.optionalKey(NameFieldSchema),
    tokensFile: Schema.optionalKey(TokensFieldSchema),
    tokensUpload: Schema.optionalKey(TokensUploadSchema),
    urls: Schema.optionalKey(UrlsFieldSchema),
  }),
  invalidates: ["packs.listSummary", "packs.list", "packs.getPack"],
  mcp: { name: "create_design_system" },
  needs: "pack.write",
  output: DraftResultSchema,
  scope: "org",
});

export { createDraftPacks };
