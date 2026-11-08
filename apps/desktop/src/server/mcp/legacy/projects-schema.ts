import { Schema } from "effect";

import {
  toDefaulted,
  toOptional,
  toOptionalText,
  toTrimmedText,
} from "../../agent-tools/index.js";

const NAME_MAX = 120;
const FOLDER_MAX = 4096;
const URL_MAX = 300;
const APP_DIR_MAX = 300;

const PACK_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/u;

const createProjectFields = {
  designSystemId: toOptional(
    Schema.String.check(Schema.isPattern(PACK_ID_PATTERN)),
    "Design system (pack) id to apply. Leave out for none."
  ),
  kind: toDefaulted(
    Schema.Literals(["html", "react"]),
    "html",
    "html (static pages) or react (Vite + React). Default html."
  ),
  name: toTrimmedText(1, NAME_MAX).annotate({ description: "Project name." }),
};

const attachAppFields = {
  appDir: toOptionalText(
    0,
    APP_DIR_MAX,
    'App folder inside a monorepo, for example "apps/dashboard". Needed when the folder has more than one Next.js app.'
  ),
  folder: toTrimmedText(1, FOLDER_MAX).annotate({
    description:
      'Absolute path of the app folder or the monorepo root, for example "~/code/my-app".',
  }),
  name: Schema.optionalKey(toTrimmedText(1, NAME_MAX)),
  url: toOptionalText(
    0,
    URL_MAX,
    'URL of a dev server you already run, for example "http://localhost:3000". Leave out and the studio starts next dev itself.'
  ),
};

type CreateProjectInput = Schema.Struct.Type<typeof createProjectFields>;

type AttachAppInput = Schema.Struct.Type<typeof attachAppFields>;

export { attachAppFields, createProjectFields };

export type { AttachAppInput, CreateProjectInput };
