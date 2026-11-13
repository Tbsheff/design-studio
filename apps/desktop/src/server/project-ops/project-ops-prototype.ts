import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Input } from "@design-studio/actions/_core/action";
import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import type { createPrototypeProject } from "@design-studio/actions/project/create-prototype";
import type { Project, RunRequest } from "@design-studio/contracts";
import {
  isInsideFolder,
  nameFromPrompt,
  slugify,
} from "@design-studio/contracts/folders";
import { Effect } from "effect";

import { harvestNextFonts, loadAppTokens } from "../design-system/index.js";
import { attemptKnown } from "../platform/attempt/index.js";
import { toPrototypeCss } from "./engine/to-prototype-css.js";
import type { PrototypeFonts } from "./engine/to-prototype-css.js";
import { toPrototypePage } from "./engine/to-prototype-page.js";
import {
  getFolderContext,
  getFolderDesignMd,
} from "./project-ops-folder-context.js";
import type { ProjectOpsRuntime } from "./project-ops-runtime.js";

type CreatePrototypeInput = Input<typeof createPrototypeProject>;

interface CreatedPrototype {
  readonly folder: string;
  readonly project: Project;
  readonly runId: string | null;
  readonly tokensFile: string | null;
}

interface PrototypeTokens {
  readonly css: string | null;
  readonly file: string | null;
}

interface FontCandidate {
  readonly token: string;
  readonly value?: string;
}

const PROTOTYPES_FOLDER = "prototypes";
const TOKENS_FILE = "tokens.css";
const ENTRY_FILE = "index.html";
const CONTEXT_FILE = "folder-context.md";
const NO_DESIGN_MD = "";

const toAppProject = Effect.fn("ProjectOpsPrototype.toAppProject")(
  function* run(runtime: ProjectOpsRuntime, projectId: string) {
    const app = yield* attemptKnown(() => runtime.projects.get(projectId));

    if (!app.app && !app.folder) {
      return yield* new BadRequest({
        message: `${app.name} is not a folder workspace or an attached app. Link the folder with import_project and isWorkspace true, then try again.`,
      });
    }

    return app;
  }
);

const toAppFolder = (runtime: ProjectOpsRuntime, app: Project): string =>
  app.folder?.path ??
  app.imported?.sourcePath ??
  runtime.projects.mainDirection(app).workTree;

const toPrototypeParent = Effect.fn("ProjectOpsPrototype.toPrototypeParent")(
  function* run(runtime: ProjectOpsRuntime, app: Project) {
    const root = yield* attemptKnown(() => runtime.defaultFolder.ensure());
    const parent = path.join(root, PROTOTYPES_FOLDER, slugify(app.name));

    if (isInsideFolder(parent, toAppFolder(runtime, app))) {
      return yield* new BadRequest({
        message:
          "The Design Studio projects folder is inside the app repo. Pick another projects folder in Settings.",
      });
    }

    yield* attemptKnown(() => mkdir(parent, { recursive: true }));

    return parent;
  }
);

const isFilled = (text: string | null): text is string =>
  text !== null && text.trim() !== "";

const toAppDesignMd = Effect.fn("ProjectOpsPrototype.toAppDesignMd")(
  function* run(runtime: ProjectOpsRuntime, app: Project) {
    const own = yield* attemptKnown(() =>
      runtime.projects.readDesignMd(app.id)
    );

    if (isFilled(own)) {
      return own;
    }

    const linked = yield* getFolderDesignMd(toAppFolder(runtime, app));

    if (isFilled(linked)) {
      return linked;
    }

    const projects = yield* attemptKnown(() => runtime.projects.list());

    const system = projects.find(
      (project) =>
        project.designSystemFor === app.id &&
        project.designSystemDeleted !== true
    );

    if (!system) {
      return null;
    }

    return yield* attemptKnown(() => runtime.projects.readDesignMd(system.id));
  }
);

const toFontValue = (
  candidates: readonly FontCandidate[],
  token: string
): string | null =>
  candidates.find((candidate) => candidate.token === token)?.value ?? null;

const toPrototypeTokens = Effect.fn("ProjectOpsPrototype.toPrototypeTokens")(
  function* run(runtime: ProjectOpsRuntime, app: Project) {
    const workTree = toAppFolder(runtime, app);

    const [loaded, harvested] = yield* Effect.all(
      [
        attemptKnown(() => loadAppTokens(workTree)).pipe(
          Effect.orElseSucceed(() => null)
        ),
        attemptKnown(() => harvestNextFonts(workTree)).pipe(
          Effect.orElseSucceed(() => null)
        ),
      ],
      { concurrency: "unbounded" }
    );

    const candidates = harvested?.candidates ?? [];

    const fonts: PrototypeFonts = {
      googleFontsUrl: harvested?.googleFontsUrl ?? null,
      mono: toFontValue(candidates, "font.mono"),
      sans: toFontValue(candidates, "font.body"),
    };

    const declarations = (loaded?.sheet.declarations ?? []).map((entry) => ({
      name: entry.name,
      scope: entry.scope,
      value: entry.value,
    }));

    const file = loaded?.file ?? null;
    let css: string | null = null;

    if (file !== null || candidates.length > 0) {
      css = toPrototypeCss({ appName: app.name, declarations, file, fonts });
    }

    const tokens: PrototypeTokens = { css, file };

    return tokens;
  }
);

const toRunRequest = (input: CreatePrototypeInput): RunRequest => {
  const request: RunRequest = { mode: "edit", prompt: input.prompt };

  if (input.level !== null) {
    request.level = input.level;
  }

  return request;
};

const writePrototypeFiles = Effect.fn("ProjectOpsPrototype.writeFiles")(
  function* run(
    folder: string,
    tokens: PrototypeTokens,
    page: string | null,
    context: string
  ) {
    const { css } = tokens;

    if (css !== null) {
      yield* attemptKnown(() =>
        writeFile(path.join(folder, TOKENS_FILE), css, "utf-8")
      );
    }

    if (page !== null) {
      yield* attemptKnown(() =>
        writeFile(path.join(folder, ENTRY_FILE), page, "utf-8")
      );
    }

    yield* attemptKnown(() =>
      writeFile(path.join(folder, CONTEXT_FILE), context, "utf-8")
    );
  }
);

const toCreatedProject = Effect.fn("ProjectOpsPrototype.toCreatedProject")(
  function* run(
    runtime: ProjectOpsRuntime,
    app: Project,
    name: string,
    folderName: string | null
  ) {
    const parentPath = yield* toPrototypeParent(runtime, app);

    const request: Parameters<
      ProjectOpsRuntime["projects"]["createInFolder"]
    >[0] = { appProjectId: app.id, kind: "html", name, parentPath };

    if (folderName !== null) {
      request.folderName = folderName;
    }

    return yield* attemptKnown(() => runtime.projects.createInFolder(request));
  }
);

const createPrototypeWith = Effect.fn("ProjectOpsPrototype.create")(
  function* run(
    runtime: ProjectOpsRuntime,
    input: CreatePrototypeInput,
    folderName: string | null
  ) {
    const app = yield* toAppProject(runtime, input.projectId);
    const name = input.name ?? nameFromPrompt(input.prompt);
    const tokens = yield* toPrototypeTokens(runtime, app);
    let page: string | null = null;

    if (input.routePath === null) {
      page = toPrototypePage(name, app.name, tokens.css !== null);
    }

    const context = yield* getFolderContext(
      toAppFolder(runtime, app),
      app.name
    );

    const created = yield* toCreatedProject(runtime, app, name, folderName);
    const folder = runtime.projects.mainDirection(created).workTree;

    yield* writePrototypeFiles(folder, tokens, page, context);
    const designMd = yield* toAppDesignMd(runtime, app);

    if (isFilled(designMd)) {
      yield* attemptKnown(() =>
        runtime.projects.writeDesignMd(created.id, designMd)
      );
    }

    yield* attemptKnown(() => runtime.versions.ensureRepo(created));

    const project = yield* attemptKnown(() =>
      runtime.prepareCreated(created, null, NO_DESIGN_MD)
    );

    const main = runtime.projects.mainDirection(project);
    runtime.watchDirection(project, main);
    let runId: string | null = null;

    if (input.shouldStartRun && input.routePath === null) {
      runId = yield* attemptKnown(() =>
        runtime.startRun(project, main, toRunRequest(input))
      );
    }

    const result: CreatedPrototype = {
      folder,
      project,
      runId,
      tokensFile: tokens.file,
    };

    return result;
  }
);

const TOKENS_LINK_ATTRS = 'rel="stylesheet" href="tokens.css"';

const HEAD_OPEN = /<head[^>]*>/iu;

const isFilePresent = (file: string): Effect.Effect<boolean> =>
  attemptKnown(() => access(file)).pipe(
    Effect.as(true),
    Effect.orElseSucceed(() => false)
  );

const toLinkedPage = (html: string): string => {
  if (html.includes('href="tokens.css"')) {
    return html;
  }

  return html.replace(
    HEAD_OPEN,
    (head) => `${head}\n<link ${TOKENS_LINK_ATTRS}>`
  );
};

const setPrototypeTokensLink = Effect.fn("ProjectOpsPrototype.setTokensLink")(
  function* run(folder: string, page: string) {
    const hasTokens = yield* isFilePresent(path.join(folder, TOKENS_FILE));

    if (!hasTokens) {
      return false;
    }

    const file = path.join(folder, page);
    const html = yield* attemptKnown(() => readFile(file, "utf-8"));
    const linked = toLinkedPage(html);

    if (linked !== html) {
      yield* attemptKnown(() => writeFile(file, linked, "utf-8"));
    }

    return true;
  }
);

export { createPrototypeWith, setPrototypeTokensLink };

export type { CreatedPrototype };
