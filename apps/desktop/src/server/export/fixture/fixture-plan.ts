import { randomBytes } from "node:crypto";
import path from "node:path";

import { parseModuleFile } from "../../components/index.js";
import { BadRequestError } from "../../platform/errors/index.js";
import {
  toStrippedPage,
  toTidiedSource,
  toUrlSegments,
} from "./engine/index.js";
import { FIXTURE_FOLDER, FIXTURE_URL_SEGMENT } from "./fixture-model.js";
import type { CreateFixtureCommand, FixturePlan } from "./fixture-model.js";
import { getSourcePage, toParentFolder } from "./fixture-source.js";
import type { SourcePage, SourceScope } from "./fixture-source.js";
import { toViteFixturePlan } from "./fixture-vite.js";

const ID_BYTES = 3;

const LABEL_MAX = 40;

const toPosix = (value: string): string => value.split(path.sep).join("/");

const toCreatedId = (): string => `fx-${randomBytes(ID_BYTES).toString("hex")}`;

const toExtension = (file: string): string => {
  if (/\.(?:jsx|js)$/u.test(file)) {
    return "jsx";
  }

  return "tsx";
};

const hasCatchAll = (segments: readonly string[]): boolean =>
  segments.some(
    (segment) => segment.startsWith("[...") || segment.startsWith("[[")
  );

interface StrippedCode {
  readonly code: string;
  readonly removed: readonly string[];
  readonly unresolved: readonly string[];
}

const toStrippedCode = (
  source: SourcePage,
  command: CreateFixtureCommand
): StrippedCode => {
  const stripped = toStrippedPage({
    ast: source.ast,
    code: source.code,
    params: source.params,
    searchParams: command.searchParams,
  });

  if (!stripped.isOk) {
    throw new BadRequestError(stripped.message);
  }

  const { removed, unresolved } = stripped;

  return { code: stripped.source, removed, unresolved };
};

const toNextFixturePlan = async (
  scope: SourceScope,
  command: CreateFixtureCommand
): Promise<FixturePlan> => {
  const { direction } = scope;
  const source = await getSourcePage(scope, command.route, command.params);
  const stripped = toStrippedCode(source, command);

  let parent = source.routerDir;

  if (command.shell === "inherit") {
    parent = await toParentFolder(source.routerDir, path.dirname(source.file));
  }

  const parentSegments = toPosix(path.relative(source.routerDir, parent))
    .split("/")
    .filter(Boolean);

  if (hasCatchAll(parentSegments)) {
    throw new BadRequestError(
      "The layout group of this route has a catch-all segment. Use shell root."
    );
  }

  const id = toCreatedId();
  const folder = path.join(parent, FIXTURE_FOLDER, id);
  const file = path.join(folder, `page.${toExtension(source.file)}`);
  const folderRelative = toPosix(path.relative(direction.workTree, folder));
  const after = parseModuleFile(stripped.code, source.file);

  if (after === null) {
    throw new BadRequestError(
      "The fixture page did not parse after the server calls were removed."
    );
  }

  const code = toTidiedSource({
    after,
    afterCode: stripped.code,
    before: source.ast,
    fromDir: toPosix(path.dirname(source.relative)),
    toDir: folderRelative,
  });

  const url = [
    ...toUrlSegments(parentSegments, source.params),
    FIXTURE_URL_SEGMENT,
    id,
  ].join("/");

  const { removed, unresolved } = stripped;
  const sourceRoute = source.route;
  const label = `Fixture ${source.route}`.slice(0, LABEL_MAX);
  const relative = toPosix(path.relative(direction.workTree, file));

  return {
    files: [{ code, relative }],
    folder: folderRelative,
    id,
    label,
    removed,
    sourceRoute,
    unresolved,
    url,
  };
};

const toFixturePlan = (
  scope: SourceScope,
  command: CreateFixtureCommand
): Promise<FixturePlan> => {
  if (scope.project.app?.framework === "next") {
    return toNextFixturePlan(scope, command);
  }

  return toViteFixturePlan(scope, command, toCreatedId());
};

export { toCreatedId, toFixturePlan };
