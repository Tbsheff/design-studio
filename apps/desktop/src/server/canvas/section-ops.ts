import type { ApprovalCard } from "@design-studio/actions/_core/approval-card";
import {
  CANVAS_MAX_SECTIONS,
  nextSectionId,
} from "@design-studio/contracts/canvas-file";
import type {
  CanvasFile,
  CanvasSection,
} from "@design-studio/contracts/canvas-file";

import { BadRequestError, NotFoundError } from "../platform/errors/index.js";
import { getCanvasContext, getWritableContext } from "./frame-ops.js";
import type { FrameTarget } from "./frame-ops.js";
import type { LinkRuntime } from "./links/link-runtime.js";
import { findFrame } from "./tools.js";

interface SectionSetQuery extends FrameTarget {
  readonly frameIds: readonly string[] | null;
  readonly height: number;
  readonly label: string;
  readonly section: string | null;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

interface SectionDeleteQuery extends FrameTarget {
  readonly section: string;
}

interface SectionSet {
  readonly movedFrames: readonly string[];
  readonly note: string;
  readonly section: CanvasSection;
}

interface SectionRemoved {
  readonly note: string;
  readonly removed: string;
}

const toNoSection = (id: string): NotFoundError =>
  new NotFoundError(`No section ${id}. Call canvas_list for the ids.`);

const toFrameIds = (
  file: CanvasFile,
  refs: readonly string[]
): readonly string[] =>
  refs.map((ref) => {
    const frame = findFrame(file.frames, ref);

    if (!frame) {
      throw new NotFoundError(
        `No frame ${ref}. Call canvas_list for the ids and labels.`
      );
    }

    return frame.id;
  });

interface SectionPlan {
  readonly file: CanvasFile;
  readonly moved: readonly string[];
  readonly section: CanvasSection;
}

const toSections = (
  sections: readonly CanvasSection[],
  section: CanvasSection
): CanvasSection[] => {
  if (!sections.some((item) => item.id === section.id)) {
    return [...sections, section];
  }

  return sections.map((item) => {
    if (item.id === section.id) {
      return section;
    }

    return item;
  });
};

const toSectionPlan = (
  file: CanvasFile,
  query: SectionSetQuery
): SectionPlan => {
  const previous = file.sections.find((item) => item.id === query.section);

  if (query.section !== null && !previous) {
    throw toNoSection(query.section);
  }

  if (!previous && file.sections.length >= CANVAS_MAX_SECTIONS) {
    throw new BadRequestError(
      `The canvas holds at most ${CANVAS_MAX_SECTIONS} sections.`
    );
  }

  const section: CanvasSection = {
    height: query.height,
    id: previous?.id ?? nextSectionId(file.sections),
    label: query.label,
    width: query.width,
    x: query.x,
    y: query.y,
  };

  const ids = new Set(toFrameIds(file, query.frameIds ?? []));
  const dx = query.x - (previous?.x ?? query.x);
  const dy = query.y - (previous?.y ?? query.y);

  return {
    file: {
      ...file,
      frames: file.frames.map((frame) => {
        if (!ids.has(frame.id)) {
          return frame;
        }

        return { ...frame, x: frame.x + dx, y: frame.y + dy };
      }),
      sections: toSections(file.sections, section),
    },
    moved: [...ids],
    section,
  };
};

const setCanvasSection = async (
  runtime: LinkRuntime,
  query: SectionSetQuery
): Promise<SectionSet> => {
  const context = await getWritableContext(runtime, query);
  const made = { plan: null as SectionPlan | null };

  await context.canvas.update(
    context.project,
    (file) => {
      made.plan = toSectionPlan(file, query);

      return made.plan.file;
    },
    { source: "agent" }
  );

  if (made.plan === null) {
    throw new BadRequestError("The section was not written.");
  }

  return {
    movedFrames: made.plan.moved,
    note: "Undo restores the earlier layout.",
    section: made.plan.section,
  };
};

const deleteCanvasSection = async (
  runtime: LinkRuntime,
  query: SectionDeleteQuery
): Promise<SectionRemoved> => {
  const context = await getWritableContext(runtime, query);
  const state = { isFound: false };

  await context.canvas.update(
    context.project,
    (file) => {
      if (!file.sections.some((item) => item.id === query.section)) {
        return null;
      }

      state.isFound = true;

      return {
        ...file,
        sections: file.sections.filter((item) => item.id !== query.section),
      };
    },
    { source: "agent" }
  );

  if (!state.isFound) {
    throw toNoSection(query.section);
  }

  return {
    note: "The frames inside the section stay on the canvas.",
    removed: query.section,
  };
};

const getSectionDeleteCard = async (
  runtime: LinkRuntime,
  query: SectionDeleteQuery
): Promise<ApprovalCard> => {
  const context = await getCanvasContext(runtime, query);
  const { canvas } = await context.canvas.read(context.project);
  const found = canvas?.sections.find((item) => item.id === query.section);

  if (!found) {
    throw toNoSection(query.section);
  }

  return {
    action: "Remove a canvas section",
    detail: "The frames inside the section stay. Undo brings the section back.",
    title: `Remove section ${found.id} (${found.label})`,
  };
};

export { deleteCanvasSection, getSectionDeleteCard, setCanvasSection };

export type { SectionDeleteQuery, SectionRemoved, SectionSet, SectionSetQuery };
