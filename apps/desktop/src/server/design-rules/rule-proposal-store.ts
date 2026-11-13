import { PROPOSAL_LAYER_MAX } from "@design-studio/actions/design-rule/proposal/schema";
import type { ChangedLayer } from "@design-studio/actions/version/changes/schema";
import type { Version } from "@design-studio/contracts";
import { Context, Effect, Layer } from "effect";

import { runDirectionRead } from "../direct-edit/index.js";
import type { KnownFailure } from "../platform/attempt/index.js";
import { ChangeStore, VersionStore } from "../store/index.js";
import { toRuleProposals } from "./engine/to-rule-proposals.js";
import type {
  EditHunk,
  RuleProposalDraft,
  StyleEdit,
} from "./engine/to-rule-proposals.js";
import {
  EMPTY_STATUS,
  getProposalStatus,
  toClosedIds,
} from "./rule-proposal-file.js";
import type { ProposalStatusFile } from "./rule-proposal-file.js";

interface RuleProposalQuery {
  readonly directionId: string | null;
  readonly projectId: string;
}

interface OpenRuleProposals {
  readonly directionId: string | null;
  readonly status: ProposalStatusFile;
  readonly items: readonly RuleProposalDraft[];
}

interface RuleProposalStoreApi {
  readonly list: (
    query: RuleProposalQuery
  ) => Effect.Effect<OpenRuleProposals, KnownFailure>;
}

interface VersionReads {
  readonly hunks: (query: {
    readonly file: string;
    readonly from: string;
    readonly projectId: string;
    readonly to: string;
  }) => Effect.Effect<
    { readonly file: string; readonly hunks: readonly EditHunk[] },
    KnownFailure
  >;
  readonly layers: (query: {
    readonly directionId: string;
    readonly from: string | null;
    readonly projectId: string;
    readonly to: string | null;
  }) => Effect.Effect<
    { readonly items: readonly ChangedLayer[] },
    KnownFailure
  >;
}

interface EditTarget {
  readonly parentId: string;
  readonly projectId: string;
  readonly version: Version;
}

const VERSION_SCAN_MAX = 60;

const MANUAL_MAX = 20;

const READ_CONCURRENCY = 4;

const toStyleEdits = (
  version: Version,
  items: readonly ChangedLayer[],
  hunks: ReadonlyMap<string, readonly EditHunk[]>
): readonly StyleEdit[] =>
  items.flatMap((item) => {
    const hunk = hunks.get(item.file)?.[item.hunk - 1] ?? null;

    if (item.kind !== "style" || hunk === null) {
      return [];
    }

    return [
      {
        hunk,
        layerId: item.layerId,
        line: item.line,
        tag: item.tag,
        versionId: version.id,
      },
    ];
  });

const listEdits = Effect.fn("RuleProposalStore.listEdits")(function* run(
  reads: VersionReads,
  target: EditTarget
) {
  const found = yield* reads.layers({
    directionId: target.version.directionId,
    from: target.parentId,
    projectId: target.projectId,
    to: target.version.id,
  });

  const styled = found.items.filter((item) => item.kind === "style");
  const files = [...new Set(styled.map((item) => item.file))];

  const lists = yield* Effect.all(
    files.map((file) =>
      reads.hunks({
        file,
        from: target.parentId,
        projectId: target.projectId,
        to: target.version.id,
      })
    )
  );

  const hunks = new Map(lists.map((list) => [list.file, list.hunks]));

  return toStyleEdits(target.version, styled, hunks);
});

const listVersionEdits = (
  reads: VersionReads,
  projectId: string,
  version: Version
): Effect.Effect<readonly StyleEdit[]> => {
  if (version.parentId === null) {
    return Effect.succeed([]);
  }

  return listEdits(reads, {
    parentId: version.parentId,
    projectId,
    version,
  }).pipe(Effect.orElseSucceed(() => []));
};

const getStatus = (
  directionId: string,
  projectId: string
): Effect.Effect<ProposalStatusFile, KnownFailure> =>
  runDirectionRead<ProposalStatusFile, never>(
    { directionId, projectId },
    ({ runtime }) => getProposalStatus(runtime.projectDir(projectId)),
    () => null
  );

class RuleProposalStore extends Context.Service<
  RuleProposalStore,
  RuleProposalStoreApi
>()("design-studio/design-rules/RuleProposalStore") {
  declare public readonly access: "read";

  public static readonly layer = Layer.effect(
    RuleProposalStore,
    Effect.gen(function* build() {
      const versions = yield* VersionStore;
      const changes = yield* ChangeStore;

      const reads: VersionReads = {
        hunks: versions.hunks,
        layers: changes.layers,
      };

      return RuleProposalStore.of({
        list: Effect.fn("RuleProposalStore.list")(function* run(
          query: RuleProposalQuery
        ) {
          const known = yield* versions.list(query);

          const directionId =
            query.directionId ?? known[0]?.directionId ?? null;

          if (directionId === null) {
            return { directionId, items: [], status: EMPTY_STATUS };
          }

          const manual = known
            .slice(0, VERSION_SCAN_MAX)
            .filter((version) => version.meta.kind === "manual")
            .slice(0, MANUAL_MAX);

          const edits = yield* Effect.all(
            manual.map((version) =>
              listVersionEdits(reads, query.projectId, version)
            ),
            { concurrency: READ_CONCURRENCY }
          );

          const closed = yield* getStatus(directionId, query.projectId);

          return {
            directionId,
            items: toRuleProposals({
              closedIds: toClosedIds(closed),
              edits: edits.flat(),
              layerMax: PROPOSAL_LAYER_MAX,
            }),
            status: closed,
          };
        }),
      });
    })
  );
}

export { RuleProposalStore };

export type { OpenRuleProposals, RuleProposalQuery, RuleProposalStoreApi };
