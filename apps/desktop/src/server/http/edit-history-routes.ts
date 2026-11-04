import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Context, Hono } from "hono";

import type {
  Direction,
  EditSessionState,
  Project,
  TextSourceAnswer,
} from "@design-studio/actions/_core/contracts";
import { firstVersionWaitText } from "../app/first-version.js";
import {
  elementClassInfo,
  findTextSource,
} from "../direct-edit/commit/index.js";
import type { EditHistory } from "../direct-edit/commit/index.js";
import {
  htmlElementSpan,
  jsxElementSpan,
} from "../direct-edit/engine/index.js";
import {
  DirectEditError,
  parseDirectEditRequest,
  resolveSource,
  type DirectEditDeps,
} from "../direct-edit/index.js";
import { BadRequestError } from "../platform/errors/index.js";
import type { StudioProjectStore } from "../store/projects.js";
import { bindVersionReadRuntime } from "../store/version-read-core.js";

interface EditHistoryRouteDeps {
  history: EditHistory;
  editDeps: DirectEditDeps;
  projects: Pick<StudioProjectStore, "get" | "mainDirection">;
  readBody: (c: Context) => Promise<unknown>;
  loadDirection: (
    pid: string,
    did: string
  ) => Promise<{ project: Project; direction: Direction }>;
}

const SHA = /^[0-9a-f]{40}$/;
const MAX_SNIPPET = 20_000;

interface ElementSource {
  file: string;
  line: number;
  code: string | null;
}

function dedent(text: string): string {
  const lines = text.split("\n");
  const widths = lines
    .filter((line) => line.trim() !== "")
    .map((line) => /^[ \t]*/.exec(line)?.[0].length ?? 0);
  const cut = widths.length > 0 ? Math.min(...widths) : 0;
  return lines
    .map((line) =>
      line.slice(Math.min(cut, /^[ \t]*/.exec(line)?.[0].length ?? 0))
    )
    .join("\n");
}

function baseOf(raw: unknown): string {
  if (typeof raw !== "string" || !SHA.test(raw))
    throw new BadRequestError("baseVersionId must be a version id");
  return raw;
}

export function registerEditHistoryRoutes(
  app: Hono,
  deps: EditHistoryRouteDeps
): void {
  const { history, editDeps } = deps;

  bindVersionReadRuntime({ history });

  app.get("/api/projects/:pid/d/:did/edit-session", async (c) => {
    const raw = c.req.query("base");
    const { project, direction } = await deps.loadDirection(
      c.req.param("pid"),
      c.req.param("did")
    );
    const state = await (async (): Promise<EditSessionState> => {
      const base = raw === undefined ? direction.headVersionId : baseOf(raw);
      if (base === null)
        return {
          baseVersionId: "",
          count: 0,
          dirty: false,
          blocked: project.app
            ? firstVersionWaitText(project.id)
            : "This direction has no saved version yet.",
        };
      const span = editDeps.versions.sessionSince
        ? await editDeps.versions.sessionSince(project, direction, base)
        : null;
      return {
        baseVersionId: base,
        count: span?.count ?? 0,
        dirty: span?.dirty ?? false,
        blocked: span?.foreign ?? null,
        outside: span?.outside ?? 0,
      };
    })();
    return c.json(state);
  });

  app.get("/api/projects/:pid/d/:did/source", async (c) => {
    const file = c.req.query("file") ?? "";
    const line = Number(c.req.query("line"));
    const col = Number(c.req.query("col"));
    if (
      !Number.isInteger(line) ||
      line < 1 ||
      !Number.isInteger(col) ||
      col < 1
    )
      throw new BadRequestError("line and col must be positive whole numbers");
    const read = deps
      .loadDirection(c.req.param("pid"), c.req.param("did"))
      .then(async ({ direction }): Promise<ElementSource> => {
        const target = await resolveSource(direction.workTree, file);
        const code = await readFile(target.file, "utf-8");
        const extension = path.extname(target.relative).toLowerCase();
        const loc = { line, col };
        const span =
          extension === ".html" || extension === ".htm"
            ? htmlElementSpan(code, loc)
            : jsxElementSpan(code, loc, extension === ".tsx");
        if (!span) return { file: target.relative, line, code: null };
        const lineStart = code.lastIndexOf("\n", span.start - 1) + 1;
        const indent =
          /^[ \t]*/.exec(code.slice(lineStart, span.start))?.[0] ?? "";
        const text =
          indent +
          code.slice(span.start, Math.min(span.end, span.start + MAX_SNIPPET));
        return { file: target.relative, line, code: dedent(text) };
      });
    try {
      return c.json(await read);
    } catch (error) {
      if (error instanceof DirectEditError)
        return c.json(
          { error: error.code, message: error.message },
          error.status
        );
      throw error;
    }
  });

  app.get("/api/projects/:pid/d/:did/classes", async (c) => {
    const file = c.req.query("file") ?? "";
    const line = Number(c.req.query("line"));
    const col = Number(c.req.query("col"));
    if (
      !Number.isInteger(line) ||
      line < 1 ||
      !Number.isInteger(col) ||
      col < 1
    )
      throw new BadRequestError("line and col must be positive whole numbers");
    try {
      const { project, direction } = await deps.loadDirection(
        c.req.param("pid"),
        c.req.param("did")
      );
      return c.json(
        await elementClassInfo(
          direction.workTree,
          project.kind,
          { file, line, col },
          c.req.query("variant") ?? ""
        )
      );
    } catch (error) {
      if (error instanceof DirectEditError)
        return c.json(
          { error: error.code, message: error.message },
          error.status
        );
      throw error;
    }
  });

  app.post("/api/projects/:pid/d/:did/text-source", async (c) => {
    const raw = (await deps.readBody(c)) as {
      source?: unknown;
      hints?: { text?: unknown };
    } | null;
    try {
      const request = parseDirectEditRequest({
        source: raw?.source,
        selector: "",
        text: raw?.hints?.text,
        hints: raw?.hints,
      });
      const { project, direction } = await deps.loadDirection(
        c.req.param("pid"),
        c.req.param("did")
      );
      const origin =
        (await editDeps
          .previewOrigin?.(project, direction)
          .catch(() => null)) ?? null;
      const lookup = await findTextSource(
        { workTree: direction.workTree, previewOrigin: origin },
        request.source,
        request.hints ?? null
      );
      return c.json(
        ("hit" in lookup
          ? { found: lookup.hit.info }
          : { reason: lookup.reason }) satisfies TextSourceAnswer
      );
    } catch (error) {
      if (error instanceof DirectEditError)
        return c.json(
          { error: error.code, message: error.message },
          error.status
        );
      throw error;
    }
  });
}
