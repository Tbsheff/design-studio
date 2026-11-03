import type { Project } from "../../shared/contracts.js";
import type { PreviewService } from "../types.js";
import { attemptNull, toOptional } from "./attempt-null.js";
import { noteRenderedPage } from "./render-wait.js";

const WARM_TIMEOUT_MS = 120_000;

const SCRIPT_SRC = /<script[^>]+src="(?<src>\/_next\/[^"]+)"/gu;

const WARM_SCRIPTS_MAX = 40;

const toSignal = (signal: AbortSignal | undefined): AbortSignal => {
  const timeout = AbortSignal.timeout(WARM_TIMEOUT_MS);

  if (!signal) {
    return timeout;
  }

  return AbortSignal.any([signal, timeout]);
};

const touch = async (
  url: URL,
  signal?: AbortSignal
): Promise<string | null> => {
  const answer = await attemptNull(() =>
    fetch(url, { redirect: "manual", signal: toSignal(signal) })
  );

  if (!answer) {
    return null;
  }

  if (!(answer.headers.get("content-type") ?? "").includes("text/html")) {
    await attemptNull(() => answer.body?.cancel() ?? Promise.resolve());

    return null;
  }

  return attemptNull(() => answer.text());
};

const warmUpstream = async (
  upstream: string,
  page: string | undefined,
  signal?: AbortSignal
): Promise<void> => {
  const html = await touch(new URL(`/${page ?? ""}`, upstream), signal);

  if (!html) {
    return;
  }

  const scripts = [
    ...new Set(
      [...html.matchAll(SCRIPT_SRC)].map((match) =>
        (match.groups?.src ?? "").replaceAll("&amp;", "&")
      )
    ),
  ].slice(0, WARM_SCRIPTS_MAX);

  await Promise.all(
    scripts.map((src) => touch(new URL(src, upstream), signal))
  );
};

const isLive = async (
  preview: PreviewService,
  project: Project,
  page: string | null
): Promise<boolean> => {
  if (!project.app) {
    return true;
  }

  const pages = await preview.livePages?.(project.id);

  return pages?.includes(`/${page ?? ""}`) ?? false;
};

const warmAppPage = async (
  preview: PreviewService,
  project: Project,
  page: string | null
): Promise<void> => {
  noteRenderedPage(project.id, toOptional(page));

  if (await isLive(preview, project, page)) {
    return;
  }

  const upstream = await attemptNull(
    async () => (await preview.apps?.ensure(project)) ?? null
  );

  if (upstream) {
    await warmUpstream(upstream, toOptional(page));
  }
};

export { warmAppPage, warmUpstream };
