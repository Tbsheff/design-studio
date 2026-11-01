import { z } from "zod";

import { packId } from "../edit-kit.js";

const NAME_MAX = 120;
const FOLDER_MAX = 4096;
const URL_MAX = 300;
const APP_DIR_MAX = 300;

const createProjectSchema = z.strictObject({
  name: z.string().trim().min(1).max(NAME_MAX).describe("Project name."),
  kind: z
    .enum(["html", "react"])
    .default("html")
    .describe("html (static pages) or react (Vite + React). Default html."),
  designSystemId: packId
    .optional()
    .describe("Design system (pack) id to apply. Leave out for none."),
});

const attachAppSchema = z.strictObject({
  folder: z
    .string()
    .trim()
    .min(1)
    .max(FOLDER_MAX)
    .describe(
      'Absolute path of the app folder or the monorepo root, for example "~/code/my-app".'
    ),
  url: z
    .string()
    .trim()
    .max(URL_MAX)
    .optional()
    .describe(
      'URL of a dev server you already run, for example "http://localhost:3000". Leave out and the studio starts next dev itself.'
    ),
  appDir: z
    .string()
    .trim()
    .max(APP_DIR_MAX)
    .optional()
    .describe(
      'App folder inside a monorepo, for example "apps/dashboard". Needed when the folder has more than one Next.js app.'
    ),
  name: z.string().trim().min(1).max(NAME_MAX).optional(),
});

type CreateProjectInput = z.output<typeof createProjectSchema>;

type AttachAppInput = z.output<typeof attachAppSchema>;

export { attachAppSchema, createProjectSchema };

export type { AttachAppInput, CreateProjectInput };
