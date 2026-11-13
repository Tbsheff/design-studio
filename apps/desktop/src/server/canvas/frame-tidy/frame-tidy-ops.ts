import type {
  CanvasFile,
  CanvasFileFrame,
  CanvasSection,
} from "@design-studio/contracts/canvas-file";

import { BadRequestError, NotFoundError } from "../../platform/errors/index.js";
import { getWritableContext } from "../frame-ops.js";
import type { FrameTarget } from "../frame-ops.js";
import type { LinkRuntime } from "../links/link-runtime.js";
import { findFrame } from "../tools.js";
import {
  isAlignLayout,
  toAlignedFrames,
  toAlignMinFrames,
} from "./engine/to-aligned-frames.js";
import type { AlignLayout } from "./engine/to-aligned-frames.js";
import {
  isInsideArea,
  toFittedArea,
  toGroupOrigin,
  toSectionOrigin,
  toTidyFrames,
} from "./engine/to-tidy-frames.js";
import type {
  TidyLayout,
  TidyPlace,
  TidyPoint,
} from "./engine/to-tidy-frames.js";

interface FrameTidyQuery extends FrameTarget {
  readonly frames: readonly string[] | null;
  readonly gap: number;
  readonly layout: TidyLayout | AlignLayout;
  readonly section: string | null;
}

interface FramesTidied {
  readonly layout: TidyLayout | AlignLayout;
  readonly movedFrames: readonly TidyPlace[];
  readonly note: string;
  readonly section: CanvasSection | null;
}

interface TidyPlan {
  readonly file: CanvasFile;
  readonly places: readonly TidyPlace[];
  readonly section: CanvasSection | null;
}

const toSection = (
  file: CanvasFile,
  query: FrameTidyQuery
): CanvasSection | null => {
  if (query.section === null) {
    return null;
  }

  if (query.frames !== null) {
    throw new BadRequestError(
      "Give frames or section, not both. Leave frames null to tidy a section."
    );
  }

  const found = file.sections.find((item) => item.id === query.section);

  if (!found) {
    throw new NotFoundError(
      `No section ${query.section}. Call canvas_list for the ids.`
    );
  }

  return found;
};

const toNamedFrames = (
  visible: readonly CanvasFileFrame[],
  refs: readonly string[]
): CanvasFileFrame[] => {
  const picked = new Map<string, CanvasFileFrame>();

  for (const ref of refs) {
    const frame = findFrame(visible, ref);

    if (!frame) {
      throw new NotFoundError(
        `No frame ${ref}. Call canvas_list for the ids and labels.`
      );
    }

    picked.set(frame.id, frame);
  }

  return [...picked.values()];
};

const toPickedFrames = (
  file: CanvasFile,
  query: FrameTidyQuery,
  section: CanvasSection | null
): CanvasFileFrame[] => {
  const visible = file.frames.filter((frame) => frame.hidden !== true);

  if (section !== null) {
    return visible.filter((frame) => isInsideArea(section, frame));
  }

  if (query.frames !== null) {
    return toNamedFrames(visible, query.frames);
  }

  return visible;
};

const toOrigin = (
  picked: readonly CanvasFileFrame[],
  section: CanvasSection | null
): TidyPoint => {
  if (section === null) {
    return toGroupOrigin(picked);
  }

  return toSectionOrigin(section);
};

const toFittedSection = (
  section: CanvasSection | null,
  frames: readonly CanvasFileFrame[],
  moved: ReadonlySet<string>
): CanvasSection | null => {
  if (section === null) {
    return null;
  }

  const area = toFittedArea(frames.filter((frame) => moved.has(frame.id)));

  if (area === null) {
    return section;
  }

  return { ...section, ...area };
};

const toPlaces = (
  picked: readonly CanvasFileFrame[],
  query: FrameTidyQuery,
  section: CanvasSection | null
): TidyPlace[] => {
  const { layout } = query;

  if (!isAlignLayout(layout)) {
    return toTidyFrames(picked, layout, query.gap, toOrigin(picked, section));
  }

  const least = toAlignMinFrames(layout);

  if (picked.length < least) {
    throw new BadRequestError(
      `Layout ${layout} needs ${least} frames or more. Give more frames.`
    );
  }

  return toAlignedFrames(picked, layout);
};

const toTidyPlan = (file: CanvasFile, query: FrameTidyQuery): TidyPlan => {
  const section = toSection(file, query);
  const picked = toPickedFrames(file, query, section);

  if (picked.length === 0) {
    throw new BadRequestError("There are no visible frames to tidy here.");
  }

  const placed = toPlaces(picked, query, section);

  const byId = new Map(placed.map((place) => [place.id, place]));

  const frames = file.frames.map((frame) => {
    const place = byId.get(frame.id);

    if (!place) {
      return frame;
    }

    return { ...frame, x: place.x, y: place.y };
  });

  const fitted = toFittedSection(section, frames, new Set(byId.keys()));

  const sections = file.sections.map((item) => {
    if (fitted !== null && item.id === fitted.id) {
      return fitted;
    }

    return item;
  });

  return {
    file: { ...file, frames, sections },
    places: placed,
    section: fitted,
  };
};

const moveCanvasFrames = async (
  runtime: LinkRuntime,
  query: FrameTidyQuery
): Promise<FramesTidied> => {
  const context = await getWritableContext(runtime, query);
  const made = { plan: null as TidyPlan | null };

  await context.canvas.update(
    context.project,
    (file) => {
      made.plan = toTidyPlan(file, query);

      return made.plan.file;
    },
    { source: "agent" }
  );

  if (made.plan === null) {
    throw new BadRequestError("The canvas has no frames to tidy.");
  }

  return {
    layout: query.layout,
    movedFrames: made.plan.places,
    note: "Links keep their frames. Undo restores the earlier layout.",
    section: made.plan.section,
  };
};

export { moveCanvasFrames };

export type { FramesTidied, FrameTidyQuery };
