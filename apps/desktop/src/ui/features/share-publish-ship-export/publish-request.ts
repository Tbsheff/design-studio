import {
  PUBLISH_MAX_FRAMES,
  PUBLISH_PASSWORD_MIN,
} from "../../../shared/publish.js";
import { copy } from "./copy.js";
import { canvasFrameChoices } from "./export-api.js";
import type { PublishRequest } from "./publish-api.js";
import type { PublishFormState, PublishTarget } from "./publish-types.js";

const toPlanInput = (
  target: PublishTarget,
  form: PublishFormState
): PublishRequest => {
  const frames = canvasFrameChoices(
    target.projectId,
    target.directionId
  ).filter((choice) => form.picked.has(choice.id));

  const input: PublishRequest = {
    expiresInDays: form.expiry,
    noindex: !form.isIndexable,
    viewerComments: form.hasViewerComments,
  };

  if (target.versionId) {
    Object.assign(input, { versionId: target.versionId });
  }

  if (target.directionId) {
    Object.assign(input, { directionId: target.directionId });
  }

  if (form.isPasswordOn) {
    Object.assign(input, { password: form.password });
  }

  if (target.kind === "viewer") {
    Object.assign(input, {
      comments: form.hasComments,
      frames: frames.map((frame) => frame.id),
    });
  }

  return input;
};

const toRepublishInput = (
  target: PublishTarget,
  publicationId: string
): PublishRequest => {
  const input: PublishRequest = { publicationId };

  if (target.versionId) {
    Object.assign(input, { versionId: target.versionId });
  }

  return input;
};

const toFormError = (
  target: PublishTarget,
  form: PublishFormState
): string | null => {
  if (!target.versionId) {
    return copy.saveVersionBeforePublish;
  }

  if (form.isPasswordOn && form.password.length < PUBLISH_PASSWORD_MIN) {
    return `Type a password of ${PUBLISH_PASSWORD_MIN} or more characters, or turn Password off.`;
  }

  if (
    target.kind === "viewer" &&
    (form.picked.size === 0 || form.picked.size > PUBLISH_MAX_FRAMES)
  ) {
    return `Pick 1 to ${PUBLISH_MAX_FRAMES} frames.`;
  }

  return null;
};

export { toFormError, toPlanInput, toRepublishInput };
