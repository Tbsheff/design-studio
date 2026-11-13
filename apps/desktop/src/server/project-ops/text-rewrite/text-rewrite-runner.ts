import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { Context, Effect, Layer } from "effect";

import type { DirectWriteFailure } from "../../direct-edit/index.js";
import { DirectEditWriter } from "../../share/index.js";
import { ProjectStore } from "../../store/index.js";
import type { LocalOrgScope } from "../../store/index.js";
import { TextSearchStore } from "../../style-scope/index.js";
import { applyOption } from "./text-rewrite-apply.js";
import { getLayerText } from "./text-rewrite-layer.js";
import type { RewriteResult, RunCommand } from "./text-rewrite-model.js";
import { runRewriteModel } from "./text-rewrite-run.js";
import { getVoiceGuide, isTranslationText } from "./text-rewrite-source.js";

interface TextRewriteRunnerApi {
  readonly run: (
    command: RunCommand
  ) => Effect.Effect<RewriteResult, DirectWriteFailure, LocalOrgScope>;
}

const TRANSLATION_MESSAGE = "This text comes from a translation file.";

const LANGUAGE_MESSAGE = "Translate needs a language, such as es or fr-CA.";

class TextRewriteRunner extends Context.Service<
  TextRewriteRunner,
  TextRewriteRunnerApi
>()("design-studio/project-ops/TextRewriteRunner") {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    TextRewriteRunner,
    Effect.gen(function* build() {
      const projects = yield* ProjectStore;
      const writer = yield* DirectEditWriter;
      const search = yield* TextSearchStore;

      return TextRewriteRunner.of({
        run: Effect.fn("TextRewriteRunner.run")(function* run(
          command: RunCommand
        ) {
          if (command.mode === "translate" && command.language === null) {
            return yield* new BadRequest({ message: LANGUAGE_MESSAGE });
          }

          const project = yield* projects.get(command.projectId);

          const direction =
            project.directions.find(
              (item) => item.id === command.directionId
            ) ?? null;

          if (direction === null) {
            return yield* new NotFound({ message: "Direction not found." });
          }

          const workTree = String(direction.workTree);

          const isTranslation = yield* isTranslationText(
            workTree,
            command.layer
          );

          if (isTranslation) {
            return yield* new BadRequest({ message: TRANSLATION_MESSAGE });
          }

          const layer = yield* getLayerText(search, command);
          const designMd = yield* projects.readDesignMd(command.projectId);
          const voice = yield* getVoiceGuide(workTree);

          const rewrite = yield* runRewriteModel(
            {
              language: command.language,
              mode: command.mode,
              text: layer.text,
            },
            { designMd, voice }
          );

          if (!command.shouldApply) {
            return {
              isApplied: false,
              layerText: layer.text,
              mode: command.mode,
              model: rewrite.model,
              options: rewrite.options,
              versionId: null,
            };
          }

          const versionId = yield* applyOption(
            writer,
            command,
            layer,
            rewrite.options.at(0) ?? layer.text
          );

          return {
            isApplied: true,
            layerText: layer.text,
            mode: command.mode,
            model: rewrite.model,
            options: rewrite.options,
            versionId,
          };
        }),
      });
    })
  );
}

export { TextRewriteRunner };

export type { TextRewriteRunnerApi };
