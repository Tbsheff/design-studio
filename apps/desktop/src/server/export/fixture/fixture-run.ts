import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { Effect } from "effect";

import {
  runDirectionWrite,
  toDirectEditStatusFailure,
} from "../../direct-edit/index.js";
import { createFixturePage, deleteFixturePage } from "./fixture-commit.js";
import type {
  CreateFixtureCommand,
  DeleteFixtureCommand,
} from "./fixture-model.js";
import { listSavedFixtures, setSavedFixtures } from "./fixture-saved.js";

const runFixtureCreate = Effect.fn("FixtureRun.create")(function* run(
  command: CreateFixtureCommand
) {
  const done = yield* runDirectionWrite(
    command,
    (scope) => createFixturePage(scope, command),
    toDirectEditStatusFailure
  );

  const saved = yield* listSavedFixtures(command.projectId);
  yield* setSavedFixtures(command.projectId, [...saved, done.stored]);

  return done.created;
});

const runFixtureDelete = Effect.fn("FixtureRun.delete")(function* run(
  command: DeleteFixtureCommand
) {
  const saved = yield* listSavedFixtures(command.projectId);
  const stored = saved.find((item) => item.id === command.fixtureId) ?? null;

  if (stored === null) {
    return yield* new NotFound({
      message: `No fixture has the id ${command.fixtureId}. Call list_fixture to see the ids.`,
    });
  }

  const done = yield* runDirectionWrite(
    { directionId: stored.directionId, projectId: command.projectId },
    (scope) => deleteFixturePage(scope, stored, command),
    toDirectEditStatusFailure
  );

  yield* setSavedFixtures(
    command.projectId,
    saved.filter((item) => item.id !== command.fixtureId)
  );

  return done;
});

export { runFixtureCreate, runFixtureDelete };
