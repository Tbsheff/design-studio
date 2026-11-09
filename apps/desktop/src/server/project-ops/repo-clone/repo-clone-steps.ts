import { mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

import { Unavailable } from "@design-studio/actions/_core/errors/unavailable";
import { Effect } from "effect";

import {
  NETWORK_TIMEOUT_MS,
  execTool,
  userGit,
} from "../../platform/git/index.js";
import { toFreeName } from "../engine/to-free-name.js";
import { toKilobytes } from "../engine/to-kilobytes.js";

const CLONE_TIMEOUT_MS = 90_000;

const MAX_CLONE_KILOBYTES = 512_000;

const BYTES_PER_KILOBYTE = 1024;

const STDERR_LINES = 2;

const toUnavailable = (message: string): Unavailable =>
  new Unavailable({ message });

const runIo = <Value>(
  task: () => Promise<Value>
): Effect.Effect<Value, Unavailable> =>
  Effect.tryPromise({
    catch: (error) => toUnavailable(String(error)),
    try: task,
  });

const toFolderName = Effect.fn("RepoClone.toFolderName")(function* run(
  root: string,
  name: string
) {
  yield* runIo(() => mkdir(root, { recursive: true }));
  const entries = yield* runIo(() => readdir(root));

  return toFreeName(name, new Set(entries));
});

const deleteFolder = (folder: string): Effect.Effect<void, Unavailable> =>
  runIo(() => rm(folder, { force: true, recursive: true }));

const toFolderKilobytes = Effect.fn("RepoClone.toFolderKilobytes")(
  function* run(root: string, folder: string) {
    const result = yield* runIo(() =>
      execTool("du", ["-sk", folder], { cwd: root })
    );

    return toKilobytes(result.stdout);
  }
);

const runClone = Effect.fn("RepoClone.runClone")(function* run(
  root: string,
  url: string,
  folder: string
) {
  const timeoutMs = Math.min(CLONE_TIMEOUT_MS, NETWORK_TIMEOUT_MS);

  const result = yield* runIo(() =>
    userGit(
      root,
      ["clone", "--depth", "1", "--single-branch", "--", url, folder],
      { allowFail: true, timeoutMs }
    )
  ).pipe(
    Effect.tapError(() => deleteFolder(folder).pipe(Effect.ignore)),
    Effect.mapError(
      (error) =>
        new Unavailable({
          message: `The repo could not be cloned. ${error.message}`,
        })
    )
  );

  if (result.code !== 0) {
    yield* deleteFolder(folder);

    return yield* new Unavailable({
      message:
        `The repo could not be cloned. It may be private or missing. ${result.stderr.split("\n").slice(-STDERR_LINES).join(" ")}`.trim(),
    });
  }

  return folder;
});

const checkCloneSize = Effect.fn("RepoClone.checkCloneSize")(function* run(
  root: string,
  folder: string
) {
  const kilobytes = yield* toFolderKilobytes(root, folder);

  if (kilobytes !== null && kilobytes <= MAX_CLONE_KILOBYTES) {
    return folder;
  }

  yield* deleteFolder(folder);

  return yield* new Unavailable({
    message: `The repo is larger than ${MAX_CLONE_KILOBYTES / BYTES_PER_KILOBYTE} MB.`,
  });
});

const cloneRepo = Effect.fn("RepoClone.cloneRepo")(function* run(
  url: string,
  name: string,
  root: string
) {
  const folderName = yield* toFolderName(root, name);
  const folder = path.join(root, folderName);
  yield* runClone(root, url, folder);

  return yield* checkCloneSize(root, folder);
});

export { cloneRepo };
