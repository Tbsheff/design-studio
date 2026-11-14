type InteractionSeverity = "high" | "low" | "medium";

type InteractionKind = "broken-image" | "interaction";

interface InteractionControl {
  readonly classes: readonly string[];
  readonly hasHover: boolean;
  readonly isInProse: boolean;
  readonly isLink: boolean;
  readonly selector: string;
  readonly tag: string;
}

interface InteractionFocus {
  readonly isOutlineOff: boolean;
  readonly isSame: boolean;
  readonly selector: string;
}

interface InteractionImage {
  readonly selector: string;
  readonly url: string;
  readonly via: "background" | "img";
}

interface InteractionEmoji {
  readonly selector: string;
  readonly text: string;
}

interface InteractionProbeResult {
  readonly controls: readonly InteractionControl[];
  readonly emoji: readonly InteractionEmoji[];
  readonly focus: readonly InteractionFocus[];
  readonly images: readonly InteractionImage[];
}

interface InteractionHit {
  readonly fixClass: string | null;
  readonly hint: string;
  readonly key: string;
  readonly kind: InteractionKind;
  readonly message: string;
  readonly selector: string;
  readonly severity: InteractionSeverity;
}

const COLOR_STEPS: readonly string[] = [
  "50",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
  "950",
];

const FILL_CLASS = /^bg-(?<color>[a-z]+)-(?<step>\d{2,3})$/u;

const HIT_CAP = 40;

const IMAGE_HINT =
  "Replace the image with a file that exists: use set_image with a project file or an https url, or find one with search_images.";

const toNextStep = (color: string, step: string): string | null => {
  const index = COLOR_STEPS.indexOf(step);

  if (index === -1 || index >= COLOR_STEPS.length - 1) {
    return null;
  }

  return `hover:bg-${color}-${COLOR_STEPS[index + 1] ?? step}`;
};

const toDarkerFill = (classes: readonly string[]): string | null => {
  for (const cls of classes) {
    const groups = FILL_CLASS.exec(cls)?.groups;

    if (groups?.color && groups.step) {
      return toNextStep(groups.color, groups.step);
    }
  }

  return null;
};

const toHoverHit = (control: InteractionControl): InteractionHit => {
  let level: InteractionSeverity = "medium";
  let what = "This control";

  if (control.isLink && control.isInProse) {
    level = "low";
    what = "This text link";
  }

  return {
    fixClass: toDarkerFill(control.classes),
    hint: "Add a :hover rule (or a hover: class) that changes the fill, color or underline, so the pointer shows the control reacts.",
    key: `hover|${control.selector}`,
    kind: "interaction",
    message: `${what} has no hover style. No stylesheet rule styles it under :hover and it has no hover: class.`,
    selector: control.selector,
    severity: level,
  };
};

const toFocusHit = (focus: InteractionFocus): InteractionHit => ({
  fixClass: null,
  hint: "Add a focus-visible ring: a :focus-visible rule with an outline or box-shadow, or focus-visible:ring classes in Tailwind. Do not remove the outline with no replacement.",
  key: `focus|${focus.selector}`,
  kind: "interaction",
  message:
    "Focus removed: the rules set outline: none and the element looks the same when it has keyboard focus. Add a focus-visible ring.",
  selector: focus.selector,
  severity: "high",
});

const toImageHit = (image: InteractionImage): InteractionHit => {
  let what = `Image ${image.url} did not load`;

  if (image.via === "background") {
    what = `Background image ${image.url} did not load`;
  }

  return {
    fixClass: null,
    hint: IMAGE_HINT,
    key: `image|${image.selector}|${image.url}`,
    kind: "broken-image",
    message: `${what}, so the page shows an empty or broken box. Use set_image, or search_images to find a real image.`,
    selector: image.selector,
    severity: "high",
  };
};

const toEmojiHit = (emoji: InteractionEmoji): InteractionHit => ({
  fixClass: null,
  hint: "Replace the emoji with an SVG icon from the project icon set (list_icons), sized and colored with the text.",
  key: `emoji|${emoji.selector}`,
  kind: "interaction",
  message: `The emoji ${emoji.text} is used as an icon. Emoji render differently on each system and do not take the text color.`,
  selector: emoji.selector,
  severity: "low",
});

const SEVERITY_RANK: Readonly<Record<InteractionSeverity, number>> = {
  high: 0,
  low: 2,
  medium: 1,
};

const toInteractionHits = (facts: InteractionProbeResult): InteractionHit[] =>
  [
    ...facts.focus.flatMap((focus) => {
      if (focus.isSame && focus.isOutlineOff) {
        return [toFocusHit(focus)];
      }

      return [];
    }),
    ...facts.controls.flatMap((control) => {
      if (control.hasHover) {
        return [];
      }

      return [toHoverHit(control)];
    }),
    ...facts.images.map((image) => toImageHit(image)),
    ...facts.emoji.map((emoji) => toEmojiHit(emoji)),
  ]
    .toSorted(
      (left, right) =>
        SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity]
    )
    .slice(0, HIT_CAP);

export { toInteractionHits };

export type { InteractionHit, InteractionProbeResult };
