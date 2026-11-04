import type { AnimationModel } from "./types.js";

const UNSAFE = /[{};<>@\\]|\/\*|url\(|expression\(/iu;

const SHOWN_CHARS = 40;

const getTextProblem = (label: string, text: string): string | null => {
  if (UNSAFE.test(text)) {
    return `${label} holds a character or word that cannot go in CSS: ${text.slice(0, SHOWN_CHARS)}`;
  }

  return null;
};

const getTrackProblem = (
  model: AnimationModel,
  index: number
): string | null => {
  const track = model.tracks[index];

  if (!track) {
    return null;
  }

  const selector = getTextProblem(
    `Track ${index + 1} selector`,
    track.selector
  );

  if (selector !== null) {
    return selector;
  }

  for (const entry of track.properties) {
    for (const key of entry.keyframes) {
      if (key.timeMs > model.durationMs) {
        return `Track ${index + 1} ${entry.property} has a keyframe at ${key.timeMs} ms, after the duration of ${model.durationMs} ms.`;
      }

      const value = getTextProblem(
        `Track ${index + 1} ${entry.property}`,
        key.value
      );

      if (value !== null) {
        return value;
      }
    }
  }

  return null;
};

const getAnimationProblem = (model: AnimationModel): string | null => {
  for (let index = 0; index < model.tracks.length; index += 1) {
    const problem = getTrackProblem(model, index);

    if (problem !== null) {
      return problem;
    }
  }

  return null;
};

export { getAnimationProblem };
