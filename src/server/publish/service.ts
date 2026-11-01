import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

import { nanoid } from "nanoid";

import type {
  PublicationSettings,
  RemotePublication,
} from "../../../cloud/publish-worker/src/protocol.js";
import type { Direction, Project } from "../../shared/contracts.js";
import {
  PUBLISH_EXPIRY_DAYS,
  PUBLISH_PASSWORD_MAX,
  PUBLISH_PASSWORD_MIN,
  type Publication,
  type PublicationComment,
  type PublicationList,
  type PublishExpiryDays,
  type PublishPlan,
  type PublishPlanInput,
} from "../../shared/publish.js";
import { resolveSource } from "../export/source.js";
import {
  BadRequestError,
  NotFoundError,
  assertSafeId,
} from "../store/errors.js";
import { createKeyedMutex } from "../store/mutex.js";
import { cliFailure, runCf } from "./cli.js";
import { hashPassword } from "./password.js";
import {
  buildSite,
  buildViewer,
  kindOf,
  stageManifest,
  titleOf,
  type BuildDeps,
  type Built,
  type StagedFile,
} from "./plan-build.js";
import { remoteClient, studioErrors, type RemoteClient } from "./remote.js";
import { scrubCliText, tailLines } from "./scrub.js";
import { createCliSession, type CliSession } from "./session.js";
import { createPublishBackend, type PublishBackend } from "./setup.js";
import {
  createPublishStore,
  toPublication,
  type PublicationRecord,
  type PublishStore,
} from "./store.js";
import { createKeyVault } from "./vault.js";

export interface PublishDeps extends BuildDeps {
  dataDir: string;
}

interface HeldPlan {
  plan: PublishPlan;
  stage: string;
  files: StagedFile[];
  passwordHash: string | null | undefined;
  frames: PublicationRecord["frames"];
  frameIds: string[] | null;
  withComments: boolean;
}

export interface PublishService {
  cli: CliSession;
  backend: PublishBackend;
  list(projectId: string): Promise<PublicationList>;
  plan(projectId: string, input: PublishPlanInput): Promise<PublishPlan>;
  publish(projectId: string, planId: string): Promise<Publication>;
  unpublish(projectId: string, id: string): Promise<Publication>;
  rollback(
    projectId: string,
    id: string,
    versionId: string
  ): Promise<Publication>;
  comments(projectId: string, id: string): Promise<PublicationComment[]>;
  deleteComment(
    projectId: string,
    id: string,
    commentId: string
  ): Promise<void>;
}

const PLAN_TTL_MS = 30 * 60_000;
const MAX_PLANS = 6;
const UPLOAD_PARALLEL = 4;

function expiryOf(
  input: PublishPlanInput,
  prior: PublicationRecord | null
): number | null {
  if (input.expiresInDays === undefined)
    return prior ? prior.expiresAt : Date.now() + 7 * 86_400_000;
  if (!PUBLISH_EXPIRY_DAYS.includes(input.expiresInDays))
    throw new BadRequestError(
      `expiresInDays must be one of ${PUBLISH_EXPIRY_DAYS.join(", ")}`
    );
  const days: PublishExpiryDays = input.expiresInDays;
  return days === 0 ? null : Date.now() + days * 86_400_000;
}

function passwordOf(
  input: PublishPlanInput,
  prior: PublicationRecord | null
): { hash: string | null | undefined; on: boolean } {
  if (typeof input.password === "string" && input.password !== "") {
    if (
      input.password.length < PUBLISH_PASSWORD_MIN ||
      input.password.length > PUBLISH_PASSWORD_MAX
    )
      throw new BadRequestError(
        `The password must be ${PUBLISH_PASSWORD_MIN} to ${PUBLISH_PASSWORD_MAX} characters.`
      );
    return { hash: hashPassword(input.password), on: true };
  }
  if (prior && input.keepPassword !== false)
    return { hash: undefined, on: prior.password };
  return { hash: null, on: false };
}

function directionOf(project: Project, raw: unknown): Direction {
  const did =
    typeof raw === "string"
      ? assertSafeId(raw, "directionId")
      : (
          project.directions.find((d) => d.id === "main") ??
          project.directions[0]
        )?.id;
  const direction = project.directions.find((d) => d.id === did);
  if (!direction) throw new NotFoundError("direction not found");
  return direction;
}

function statusOf(remote: RemotePublication): Publication["status"] {
  if (remote.revokedAt !== null) return "removed";
  if (remote.expiresAt !== null && remote.expiresAt < Date.now())
    return "ended";
  return remote.currentVersion ? "live" : "failed";
}

export function mergeRemote(
  record: PublicationRecord,
  remote: RemotePublication,
  baseUrl: string
): PublicationRecord {
  const url = new URL(remote.path, baseUrl).href;
  const live = remote.versions.find((v) => v.id === remote.currentVersion);
  return {
    ...record,
    title: remote.title,
    url,
    commentsUrl: remote.comments ? `${url}~/comments` : null,
    password: remote.password,
    expiresAt: remote.expiresAt,
    noindex: remote.noindex,
    viewerComments: remote.comments,
    status: statusOf(remote),
    versionId: live?.sourceVersion ?? record.versionId,
    fileCount: live?.fileCount ?? record.fileCount,
    bytes: live?.bytes ?? record.bytes,
    versions: remote.versions.map((v) => ({
      id: v.id,
      label: v.label,
      sourceVersion: v.sourceVersion,
      fileCount: v.fileCount,
      bytes: v.bytes,
      committedAt: v.committedAt,
      live: v.id === remote.currentVersion,
    })),
    views: remote.views,
    commentCount: remote.commentCount,
  };
}

async function uploadMissing(
  client: RemoteClient,
  pid: string,
  files: StagedFile[],
  missing: string[]
): Promise<number> {
  const bySha = new Map(files.map((f) => [f.sha256, f]));
  const queue = missing
    .map((sha) => bySha.get(sha))
    .filter((f): f is StagedFile => Boolean(f));
  let sent = 0;
  const worker = async () => {
    for (let next = queue.shift(); next; next = queue.shift()) {
      await client.upload(pid, next.sha256, next.abs, next.size);
      sent += 1;
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(UPLOAD_PARALLEL, queue.length) }, worker)
  );
  return sent;
}

interface PlanArgs {
  id: string;
  project: Project;
  direction: Direction;
  input: PublishPlanInput;
  prior: PublicationRecord | null;
  built: Built;
  files: StagedFile[];
  passwordOn: boolean;
  viewerComments: boolean;
  endpoint: { url: string; mode: PublishPlan["backend"] };
}

function planOf(a: PlanArgs): PublishPlan {
  const known = a.prior?.hashes ? new Set(a.prior.hashes) : null;
  const now = Date.now();
  return {
    id: a.id,
    projectId: a.project.id,
    directionId: a.direction.id,
    versionId:
      typeof a.input.versionId === "string"
        ? a.input.versionId
        : (a.direction.headVersionId as string),
    kind: a.built.kind,
    title: titleOf(a.input.title, a.prior?.title ?? a.project.name),
    url: a.prior?.url ?? null,
    urlPattern: `${new URL("/d/", a.endpoint.url).href}<name>-<6 letters>/`,
    pages: a.built.pages,
    fileCount: a.files.length,
    bytes: a.files.reduce((s, f) => s + f.size, 0),
    changedFiles: known
      ? a.files.filter((f) => !known.has(f.sha256)).length
      : null,
    password: a.passwordOn,
    expiresAt: expiryOf(a.input, a.prior),
    comments: a.built.comments,
    viewerComments: a.viewerComments,
    noindex: a.input.noindex ?? a.prior?.noindex ?? true,
    warnings: a.built.warnings,
    createdAt: now,
    planExpiresAt: now + PLAN_TTL_MS,
    republishOf: a.prior?.id ?? null,
    backend: a.endpoint.mode,
  };
}

export function createPublishService(deps: PublishDeps): PublishService {
  const store: PublishStore = createPublishStore(deps.dataDir);
  const cli = createCliSession(store);
  const backend = createPublishBackend(store, cli, createKeyVault(store.dir));
  const plans = new Map<string, HeldPlan>();
  const lock = createKeyedMutex();
  const stagingRoot = path.join(store.dir, "staging");
  void rm(stagingRoot, { recursive: true, force: true });

  const sweep = async (): Promise<void> => {
    const now = Date.now();
    const old = [...plans.values()]
      .filter((p) => p.plan.planExpiresAt < now)
      .concat(
        [...plans.values()].slice(0, Math.max(0, plans.size - MAX_PLANS + 1))
      );
    for (const held of old) {
      plans.delete(held.plan.id);
      await rm(held.stage, { recursive: true, force: true });
    }
  };

  const owned = async (
    projectId: string,
    raw: unknown
  ): Promise<PublicationRecord> => {
    const found = await store.get(assertSafeId(String(raw), "publicationId"));
    if (!found || found.projectId !== projectId)
      throw new NotFoundError("publication not found");
    return found;
  };

  const priorOf = async (
    projectId: string,
    raw: unknown
  ): Promise<PublicationRecord | null> => {
    if (raw === undefined || raw === null) return null;
    const found = await owned(projectId, raw);
    if (found.status === "removed")
      throw new BadRequestError(
        "This publication was unpublished. Publish it as a new link."
      );
    if (found.backend !== "app")
      throw new BadRequestError(
        "This publication uses an old per-design Worker. Publish it as a new link, then unpublish the old one."
      );
    return found;
  };

  const buildFor = async (
    project: Project,
    direction: Direction,
    input: PublishPlanInput,
    prior: PublicationRecord | null,
    stage: string,
    viewerComments: boolean
  ): Promise<Built> => {
    const versionId =
      typeof input.versionId === "string"
        ? input.versionId
        : direction.headVersionId;
    if (!versionId)
      throw new BadRequestError("Save a version before you publish it.");
    const source = await resolveSource(deps, project.id, versionId);
    const assets = path.join(stage, "assets");
    await mkdir(assets, { recursive: true });
    return kindOf(project) === "site"
      ? buildSite(deps, source, assets)
      : buildViewer(deps, {
          source,
          direction,
          input,
          prior,
          assets,
          stage,
          viewerComments,
        });
  };

  const plan = async (
    projectId: string,
    input: PublishPlanInput
  ): Promise<PublishPlan> => {
    const endpoint = await backend.endpoint();
    const project = await deps.projects.get(
      assertSafeId(projectId, "projectId")
    );
    const prior = await priorOf(project.id, input.publicationId);
    const direction = directionOf(
      project,
      input.directionId ?? prior?.directionId
    );
    await sweep();
    const id = nanoid(12);
    const stage = path.join(stagingRoot, id);
    try {
      const viewerComments =
        input.viewerComments ?? prior?.viewerComments ?? false;
      const pass = passwordOf(input, prior);
      const built = await buildFor(
        project,
        direction,
        input,
        prior,
        stage,
        viewerComments
      );
      const files = await stageManifest(
        path.join(stage, "assets"),
        built.files
      );
      const result = planOf({
        id,
        project,
        direction,
        input,
        prior,
        built,
        files,
        passwordOn: pass.on,
        viewerComments,
        endpoint,
      });
      plans.set(id, {
        plan: result,
        stage,
        files,
        passwordHash: pass.hash,
        frames: built.frames,
        frameIds: built.frameIds,
        withComments: input.comments ?? prior?.withComments ?? false,
      });
      return result;
    } catch (error) {
      await rm(stage, { recursive: true, force: true });
      throw error;
    }
  };

  const baseRecord = (
    held: HeldPlan,
    remote: RemotePublication,
    prior: PublicationRecord | null
  ): PublicationRecord => {
    const p = held.plan;
    return {
      id: remote.id,
      projectId: p.projectId,
      directionId: p.directionId,
      versionId: p.versionId,
      kind: p.kind,
      title: p.title,
      backend: "app",
      workerName: null,
      accountId: null,
      url: null,
      commentsUrl: null,
      pages: p.pages,
      fileCount: p.fileCount,
      bytes: p.bytes,
      password: p.password,
      expiresAt: p.expiresAt,
      noindex: p.noindex,
      viewerComments: p.viewerComments,
      createdAt: prior?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
      status: "publishing",
      error: null,
      log: "",
      versions: [],
      views: null,
      commentCount: 0,
      lastUpload: null,
      frames: held.frames,
      frameIds: held.frameIds,
      withComments: held.withComments,
      hashes: prior?.hashes,
    };
  };

  const settingsOf = (held: HeldPlan): PublicationSettings => ({
    title: held.plan.title,
    expiresAt: held.plan.expiresAt,
    noindex: held.plan.noindex,
    comments: held.plan.viewerComments,
    ...(held.passwordHash !== undefined
      ? { passwordHash: held.passwordHash }
      : {}),
  });

  const push = async (held: HeldPlan): Promise<PublicationRecord> => {
    const endpoint = await backend.endpoint();
    const client = remoteClient(endpoint);
    const p = held.plan;
    const prior = p.republishOf ? await store.get(p.republishOf) : null;
    const project = await deps.projects.get(p.projectId);
    const created = prior
      ? null
      : await studioErrors(() =>
          client.create({
            projectId: p.projectId,
            projectName: project.name,
            title: p.title,
            kind: p.kind,
          })
        );
    const pid = prior?.id ?? (created as RemotePublication).id;
    let record = baseRecord(
      held,
      created ?? ({ id: pid } as RemotePublication),
      prior
    );
    try {
      const version = await studioErrors(() =>
        client.createVersion(pid, {
          label: (p.title || "Version").slice(0, 80),
          sourceVersion: p.versionId.slice(0, 80),
          files: held.files.map(({ path: fp, sha256, size }) => ({
            path: fp,
            sha256,
            size,
          })),
        })
      );
      const sent = await studioErrors(() =>
        uploadMissing(client, pid, held.files, version.missing)
      );
      const remote = await studioErrors(() =>
        client.commit(pid, version.versionId, settingsOf(held))
      );
      record = {
        ...mergeRemote(record, remote, endpoint.url),
        hashes: held.files.map((f) => f.sha256),
        lastUpload: { sent, reused: held.files.length - sent },
        error: null,
        updatedAt: Date.now(),
      };
    } catch (error) {
      record = {
        ...record,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        updatedAt: Date.now(),
      };
    }
    return store.put(record);
  };

  const publish = async (
    projectId: string,
    planId: string
  ): Promise<Publication> => {
    const held = plans.get(assertSafeId(planId, "planId"));
    if (!held || held.plan.projectId !== projectId)
      throw new NotFoundError("This publish check ended. Check it again.");
    if (held.plan.planExpiresAt < Date.now())
      throw new BadRequestError(
        "This publish check is older than 30 minutes. Check it again."
      );
    plans.delete(planId);
    try {
      return toPublication(
        await lock(held.plan.republishOf ?? `new:${planId}`, () => push(held))
      );
    } finally {
      await rm(held.stage, { recursive: true, force: true });
    }
  };

  const list = async (projectId: string): Promise<PublicationList> => {
    const records = await store.list(assertSafeId(projectId, "projectId"));
    if (!records.some((r) => r.backend === "app"))
      return { publications: records.map(toPublication), backendError: null };
    try {
      const endpoint = await backend.endpoint();
      const remote = new Map(
        (await remoteClient(endpoint).list(projectId)).publications.map((r) => [
          r.id,
          r,
        ])
      );
      const merged = records.map((r) =>
        r.backend === "app" && remote.has(r.id)
          ? mergeRemote(r, remote.get(r.id) as RemotePublication, endpoint.url)
          : r
      );
      return { publications: merged.map(toPublication), backendError: null };
    } catch (error) {
      return {
        publications: records.map(toPublication),
        backendError: error instanceof Error ? error.message : String(error),
      };
    }
  };

  const unpublishLegacy = async (
    found: PublicationRecord
  ): Promise<PublicationRecord> => {
    const ready = await cli.ready(found.accountId ?? undefined);
    const out = await runCf(
      ready.bin,
      ["workers", "delete", found.workerName as string, "--force"],
      { cwd: store.dir, accountId: found.accountId }
    );
    const text = scrubCliText(`${out.stderr}\n${out.stdout}`, deps.secrets);
    if (out.code !== 0 && !/not found|does not exist|10007/i.test(text))
      throw new BadRequestError(cliFailure(out, "Unpublish failed."));
    return {
      ...found,
      status: "removed",
      error: null,
      log: tailLines(text, 20),
      updatedAt: Date.now(),
    };
  };

  const unpublish = async (
    projectId: string,
    id: string
  ): Promise<Publication> => {
    const found = await owned(projectId, id);
    if (found.status === "removed") return toPublication(found);
    return toPublication(
      await lock(found.id, async () => {
        if (found.backend !== "app")
          return store.put(await unpublishLegacy(found));
        const endpoint = await backend.endpoint();
        const out = await studioErrors(() =>
          remoteClient(endpoint).revoke(found.id)
        );
        return store.put({
          ...mergeRemote(found, out.publication, endpoint.url),
          status: "removed",
          hashes: [],
          updatedAt: Date.now(),
        });
      })
    );
  };

  const rollback = async (
    projectId: string,
    id: string,
    versionId: string
  ): Promise<Publication> => {
    const found = await owned(projectId, id);
    if (found.backend !== "app")
      throw new BadRequestError(
        "Old per-design Workers have no versions to roll back to."
      );
    return toPublication(
      await lock(found.id, async () => {
        const endpoint = await backend.endpoint();
        const remote = await studioErrors(() =>
          remoteClient(endpoint).rollback(
            found.id,
            assertSafeId(versionId, "versionId")
          )
        );
        return store.put({
          ...mergeRemote(found, remote, endpoint.url),
          updatedAt: Date.now(),
        });
      })
    );
  };

  const comments = async (
    projectId: string,
    id: string
  ): Promise<PublicationComment[]> => {
    const found = await owned(projectId, id);
    if (found.backend !== "app") return [];
    return (
      await studioErrors(async () =>
        remoteClient(await backend.endpoint()).comments(found.id)
      )
    ).comments;
  };

  const deleteComment = async (
    projectId: string,
    id: string,
    commentId: string
  ): Promise<void> => {
    const found = await owned(projectId, id);
    await studioErrors(async () =>
      remoteClient(await backend.endpoint()).deleteComment(
        found.id,
        assertSafeId(commentId, "commentId")
      )
    );
  };

  return {
    cli,
    backend,
    list,
    plan,
    publish,
    unpublish,
    rollback,
    comments,
    deleteComment,
  };
}
