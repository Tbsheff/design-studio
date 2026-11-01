import { z } from "zod";

import {
  PUBLISH_DEFAULT_EXPIRY_DAYS,
  PUBLISH_MAX_FRAMES,
  PUBLISH_PASSWORD_MAX,
  PUBLISH_PASSWORD_MIN,
  publishExpiryText,
  publishSize,
  type Publication,
  type PublicationList,
  type PublishPlan,
} from "../../shared/publish.js";
import { readProjectCanvas } from "../canvas/service.js";
import { findFrame } from "../canvas/tools.js";
import {
  approve,
  EditError,
  loadTarget,
  oneLine,
  studioCall,
  type EditDeps,
} from "./edit-deps.js";
import { defineTool, directionId, id, ok, projectId } from "./edit-kit.js";

const PUBLISH_NOTE =
  "Publish puts a static copy of one saved version on the public internet through the user's own publish Worker (one Cloudflare Worker with R2 and D1, set up once in Settings → Publishing), at https://design-studio-publish.<account-subdomain>.workers.dev/d/<name>-<6 letters>/. An HTML prototype goes up as its own pages, styles, scripts, images and fonts (no source files, .env, node_modules, repository data or studio scripts); an attached app or React project goes up as PNG images of its frames, never its code. Republish uploads only changed files and keeps older versions for rollback. The Worker adds noindex and no-referrer headers, runs prototype pages in a CSP sandbox, and can ask for a password, stop on an end date and take viewer comments. The user must click Allow in Design Studio for each publish, rollback and unpublish. These tools never set up the Worker, never sign in, never show a key and never start a studio run.";

const publishInput = z
  .object({
    projectId,
    directionId,
    versionId: id(
      "Saved version id from list_versions. Leave out for the head version."
    ).optional(),
    frames: z
      .array(z.string().trim().min(1).max(80))
      .min(1)
      .max(PUBLISH_MAX_FRAMES)
      .optional()
      .describe(
        "Attached app or React project only: frame ids or @labels from canvas_list to show. Leave out for every visible frame of the direction."
      ),
    title: z
      .string()
      .trim()
      .max(120)
      .optional()
      .describe(
        "Title on the published viewer. Leave out for the project name."
      ),
    password: z
      .string()
      .min(PUBLISH_PASSWORD_MIN)
      .max(PUBLISH_PASSWORD_MAX)
      .optional()
      .describe(
        "Password viewers must type (HTTP Basic, any user name). Only a salted hash goes into the Worker; the reply never repeats it. Leave out for no password, or to keep the password of the publication you republish."
      ),
    expiresInDays: z
      .union([z.literal(0), z.literal(1), z.literal(7), z.literal(30)])
      .optional()
      .describe(
        `Days until the link stops working: 1, 7 or 30, or 0 for no end date. Default ${PUBLISH_DEFAULT_EXPIRY_DAYS} for a new publication; a republish keeps the old end date.`
      ),
    comments: z
      .boolean()
      .optional()
      .describe(
        "Attached app or React project only: show the open comments next to the frames as read-only text."
      ),
    viewerComments: z
      .boolean()
      .optional()
      .describe(
        "Let viewers leave comments on a comments page (rate limited, owner can delete). Leave out for off on a new publication; a republish keeps the old value."
      ),
    noindex: z
      .boolean()
      .optional()
      .describe("Send noindex so search engines skip it. Default true."),
    publicationId: id(
      "Publication id from list_publications to republish into the same URL."
    ).optional(),
  })
  .strict();

const listInput = z.object({ projectId }).strict();
const unpublishInput = z
  .object({
    projectId,
    publicationId: id("Publication id from list_publications."),
  })
  .strict();
const rollbackInput = z
  .object({
    projectId,
    publicationId: id("Publication id from list_publications."),
    versionId: id("Published version id from list_publications versions[].id."),
  })
  .strict();

async function frameRefs(
  deps: EditDeps,
  input: z.output<typeof publishInput>,
  project: Awaited<ReturnType<typeof loadTarget>>["project"]
) {
  if (!input.frames) return {};
  const all =
    (
      await readProjectCanvas(project, (pid) =>
        deps.projects.projectDir(pid)
      ).catch(() => null)
    )?.canvas?.frames ?? [];
  const picked = input.frames.map((ref) => {
    const found = findFrame(all, ref);
    if (!found)
      throw new EditError(
        `No frame ${ref} on the canvas. Call canvas_list for frame ids.`
      );
    return found;
  });
  return {
    frames: picked.map((f) => ({
      name: f.label?.trim() || `${f.width} × ${f.height}`,
      width: f.width,
      height: f.height,
      ...(f.path ? { path: f.path } : {}),
    })),
    frameIds: picked.map((f) => f.id),
  };
}

export function planDetail(plan: PublishPlan): string {
  const pages =
    plan.pages.length > 4
      ? `${plan.pages.slice(0, 4).join(", ")} and ${plan.pages.length - 4} more`
      : plan.pages.join(", ");
  const what =
    plan.kind === "site"
      ? `${plan.pages.length} page${plan.pages.length === 1 ? "" : "s"} (${pages})`
      : `PNG images of ${plan.pages.length} frame${plan.pages.length === 1 ? "" : "s"} (${pages})${plan.comments ? ` and ${plan.comments} comment${plan.comments === 1 ? "" : "s"}` : ""}`;
  const changed =
    plan.changedFiles === null ? "" : ` (${plan.changedFiles} changed)`;
  return `Anyone with the URL can open ${oneLine(what, 220)}: ${plan.fileCount} file${plan.fileCount === 1 ? "" : "s"}${changed}, ${publishSize(plan.bytes)}, at ${plan.url ?? plan.urlPattern}. Password ${plan.password ? "on" : "off"}. ${publishExpiryText(plan.expiresAt)}. Viewer comments ${plan.viewerComments ? "on" : "off"}. ${plan.noindex ? "noindex" : "Search engines may list it"}. Version ${plan.versionId.slice(0, 7)}.${plan.backend === "local" ? " Target: local test server." : ""}`;
}

function publicationView(p: Publication) {
  return {
    id: p.id,
    title: p.title,
    status: p.status,
    url: p.url,
    kind: p.kind,
    backend: p.backend,
    versionId: p.versionId,
    pages: p.pages,
    files: p.fileCount,
    bytes: p.bytes,
    password: p.password,
    expiresAt:
      p.expiresAt === null ? null : new Date(p.expiresAt).toISOString(),
    publishedAt: new Date(p.updatedAt).toISOString(),
    viewerComments: p.viewerComments,
    commentCount: p.commentCount,
    views: p.views ? { total: p.views.total, last7: p.views.last7 } : null,
    versions: p.versions.map((v) => ({
      id: v.id,
      sourceVersion: v.sourceVersion,
      files: v.fileCount,
      publishedAt:
        v.committedAt === null ? null : new Date(v.committedAt).toISOString(),
      live: v.live,
    })),
    lastUpload: p.lastUpload,
    error: p.error,
  };
}

const publishDesign = defineTool(
  "publish_design",
  publishInput,
  {
    title: "Publish design",
    description: `Publish a saved version to a public URL on the user's publish Worker, or republish into an old one (publicationId) as a new version. It first builds the exact files and hashes them, then the user must click Allow in Design Studio on a prompt that shows the pages, file count, size, URL, password and end date; without the window open it is refused. Returns the URL. ${PUBLISH_NOTE}`,
  },
  async (deps, input, client) => {
    const { project, direction } = await loadTarget(
      deps,
      input.projectId,
      input.directionId
    );
    if (!deps.approvals.windowOpen())
      throw new EditError(
        "Design Studio is not open, so nobody can approve this publish. Ask the user to open the project in Design Studio, or to click Share > Publish there."
      );
    const refs = await frameRefs(deps, input, project);
    const base = `/api/projects/${encodeURIComponent(project.id)}`;
    const plan = await studioCall<PublishPlan>(
      deps,
      "POST",
      `${base}/publish/plan`,
      {
        directionId: direction.id,
        versionId: input.versionId,
        title: input.title,
        password: input.password,
        expiresInDays: input.expiresInDays,
        comments: input.comments,
        viewerComments: input.viewerComments,
        noindex: input.noindex,
        publicationId: input.publicationId,
        ...refs,
      }
    );
    await approve(deps, {
      tool: "publish_design",
      action: plan.republishOf
        ? "Republish a design on the internet"
        : "Publish a design on the internet",
      projectId: project.id,
      client,
      title: `${client} wants to publish “${oneLine(plan.title, 80)}” on a public URL`,
      detail: planDetail(plan),
    });
    const done = await studioCall<{ publication: Publication }>(
      deps,
      "POST",
      `${base}/publish`,
      { planId: plan.id }
    );
    if (done.publication.status !== "live")
      throw new EditError(
        done.publication.error ??
          "Publish failed. Ask the user to look at Share > Publish in Design Studio."
      );
    return {
      result: ok({
        publication: publicationView(done.publication),
        note: "Give this URL to the user.",
      }),
    };
  }
);

const listPublications = defineTool(
  "list_publications",
  listInput,
  {
    title: "List publications",
    description: `List the publications of a project: id, title, URL, status (live, failed, ended, removed), source version, pages, size, password on or off, end date, view counts (total and last 7 days, no personal data), viewer comment count and published versions for rollback_publication. Read only. ${PUBLISH_NOTE}`,
    readOnly: true,
    idempotent: true,
  },
  async (deps, input) => {
    const { project } = await loadTarget(deps, input.projectId);
    const list = await studioCall<PublicationList>(
      deps,
      "GET",
      `/api/projects/${encodeURIComponent(project.id)}/publications`
    );
    return {
      result: ok({ publications: list.publications.map(publicationView) }),
    };
  }
);

function unpublishDetail(p: Publication): string {
  if (p.backend === "app")
    return `${p.url ?? "Its URL"} stops working at once (410) and its files are deleted from R2. View counts and comments stay.`;
  return `This deletes the old Cloudflare Worker ${p.workerName ?? ""}. ${p.url ?? "Its URL"} stops working at once.`;
}

async function findPublication(
  deps: EditDeps,
  projectIdValue: string,
  publicationId: string
): Promise<Publication> {
  const list = await studioCall<PublicationList>(
    deps,
    "GET",
    `/api/projects/${encodeURIComponent(projectIdValue)}/publications`
  );
  const found = list.publications.find((p) => p.id === publicationId);
  if (!found)
    throw new EditError(
      `No publication ${publicationId}. Call list_publications.`
    );
  return found;
}

const unpublishDesign = defineTool(
  "unpublish_design",
  unpublishInput,
  {
    title: "Unpublish design",
    description:
      "Turn off a publication so its URL answers 410, and delete its files. The user must click Allow in Design Studio first. The publication stays in list_publications as removed.",
    destructive: true,
    idempotent: true,
  },
  async (deps, input, client) => {
    const { project } = await loadTarget(deps, input.projectId);
    const found = await findPublication(deps, project.id, input.publicationId);
    if (found.status !== "removed") {
      if (!deps.approvals.windowOpen())
        throw new EditError(
          "Design Studio is not open, so nobody can approve this unpublish."
        );
      await approve(deps, {
        tool: "unpublish_design",
        action: "Unpublish a design",
        projectId: project.id,
        client,
        title: `${client} wants to unpublish “${oneLine(found.title, 80)}”`,
        detail: unpublishDetail(found),
      });
    }
    const done = await studioCall<{ publication: Publication }>(
      deps,
      "DELETE",
      `/api/projects/${encodeURIComponent(project.id)}/publications/${encodeURIComponent(found.id)}`
    );
    return { result: ok({ publication: publicationView(done.publication) }) };
  }
);

const rollbackPublication = defineTool(
  "rollback_publication",
  rollbackInput,
  {
    title: "Roll back publication",
    description:
      "Make an older published version live again at the same URL. Nothing uploads; the newer version stays for a later rollback. The user must click Allow in Design Studio first.",
    idempotent: true,
  },
  async (deps, input, client) => {
    const { project } = await loadTarget(deps, input.projectId);
    const found = await findPublication(deps, project.id, input.publicationId);
    const version = found.versions.find((v) => v.id === input.versionId);
    if (!version)
      throw new EditError(
        `Publication ${found.id} has no published version ${input.versionId}. Call list_publications for versions.`
      );
    if (!version.live) {
      if (!deps.approvals.windowOpen())
        throw new EditError(
          "Design Studio is not open, so nobody can approve this rollback."
        );
      const when = version.committedAt
        ? new Date(version.committedAt)
            .toISOString()
            .slice(0, 16)
            .replace("T", " ")
        : "an earlier time";
      await approve(deps, {
        tool: "rollback_publication",
        action: "Roll back a published design",
        projectId: project.id,
        client,
        title: `${client} wants to roll back “${oneLine(found.title, 80)}”`,
        detail: `${found.url ?? "Its URL"} goes back to the version published ${when} (source version ${version.sourceVersion.slice(0, 7)}, ${version.fileCount} files). Anyone with the URL sees it at once.`,
      });
    }
    const done = await studioCall<{ publication: Publication }>(
      deps,
      "POST",
      `/api/projects/${encodeURIComponent(project.id)}/publications/${encodeURIComponent(found.id)}/rollback`,
      { versionId: version.id }
    );
    return { result: ok({ publication: publicationView(done.publication) }) };
  }
);

export const PUBLISH_TOOLS = [
  publishDesign,
  listPublications,
  unpublishDesign,
  rollbackPublication,
];
