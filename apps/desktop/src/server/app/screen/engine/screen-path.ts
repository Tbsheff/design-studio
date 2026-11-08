const SEGMENT_PATTERN = /^[\w[\]\-.~]+$/u;

const SEGMENTS_MAX = 12;

const SEGMENT_LENGTH_MAX = 80;

const SAMPLE_PARAM = "1";

const OPTIONAL_CATCH_ALL = /^\[\[\.\.\.(?<name>[^\]]+)\]\]$/u;

const NAMED_SEGMENT = /^\[(?:\.\.\.)?(?<name>[^\]]+)\]$/u;

interface PathDone {
  readonly isOk: true;
  readonly segments: readonly string[];
}

interface PathRefused {
  readonly isOk: false;
  readonly message: string;
}

type PathResult = PathDone | PathRefused;

const toRefusal = (message: string): PathRefused => ({
  isOk: false,
  message,
});

const toSegmentMessage = (segment: string): string | null => {
  if (segment.startsWith(".")) {
    return `The segment ${segment} cannot start with a dot.`;
  }

  if (segment.startsWith("_") || segment.startsWith("@")) {
    return `The segment ${segment} is private in the Next.js app router. Pick another name.`;
  }

  if (segment.length > SEGMENT_LENGTH_MAX || !SEGMENT_PATTERN.test(segment)) {
    return `The segment ${segment} has a character that a route cannot use. Use letters, digits, dash and [param].`;
  }

  return null;
};

const toScreenSegments = (raw: string): PathResult => {
  const cleaned = raw.trim().split(/[?#]/u)[0] ?? "";
  const segments = cleaned.split("/").filter((part) => part !== "");

  if (segments.length > SEGMENTS_MAX) {
    return toRefusal(`A route path has ${SEGMENTS_MAX} segments at most.`);
  }

  for (const segment of segments) {
    const message = toSegmentMessage(segment);

    if (message !== null) {
      return toRefusal(message);
    }
  }

  return { isOk: true, segments };
};

const isDynamicSegment = (segment: string): boolean =>
  segment.startsWith("[") && segment.endsWith("]");

const toRoutePath = (segments: readonly string[]): string =>
  `/${segments.join("/")}`;

const isSameSegment = (left: string, right: string): boolean =>
  left === right || (isDynamicSegment(left) && isDynamicSegment(right));

const isSameRoute = (
  left: readonly string[],
  right: readonly string[]
): boolean =>
  left.length === right.length &&
  left.every((segment, index) => isSameSegment(segment, right[index] ?? ""));

const toRouteSegments = (route: string): readonly string[] =>
  route.split("/").filter((part) => part !== "");

const toSharedPrefix = (
  left: readonly string[],
  right: readonly string[]
): number => {
  let shared = 0;

  while (
    shared < left.length &&
    shared < right.length &&
    left[shared] === right[shared]
  ) {
    shared += 1;
  }

  return shared;
};

const toTitleCase = (segment: string): string => {
  const words = segment.split(/[-_\s.[\]]+/u).filter((word) => word !== "");

  return words
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
};

const toSafeName = (title: string): string => {
  const words = title.replaceAll(/[^A-Za-z0-9]/gu, "");

  if (words === "") {
    return "Screen";
  }

  if (/^\d/u.test(words)) {
    return `Screen${words}`;
  }

  return words;
};

const toComponentName = (segments: readonly string[]): string => {
  const last = segments.findLast((segment) => !isDynamicSegment(segment));

  return `${toSafeName(toTitleCase(last ?? "Home"))}Page`;
};

const toFrameSegment = (
  segment: string,
  params: Readonly<Record<string, string>>
): string | null => {
  const optional = OPTIONAL_CATCH_ALL.exec(segment)?.groups?.name ?? null;

  if (optional !== null) {
    return params[optional] ?? null;
  }

  const named = NAMED_SEGMENT.exec(segment)?.groups?.name ?? null;

  if (named !== null) {
    return params[named] ?? SAMPLE_PARAM;
  }

  return segment;
};

const toFramePath = (
  segments: readonly string[],
  params: Readonly<Record<string, string>>
): string =>
  segments
    .flatMap((segment) => {
      const value = toFrameSegment(segment, params);

      if (value === null) {
        return [];
      }

      return [value];
    })
    .join("/");

export {
  isDynamicSegment,
  isSameRoute,
  toComponentName,
  toFramePath,
  toRoutePath,
  toRouteSegments,
  toScreenSegments,
  toSharedPrefix,
  toTitleCase,
};

export type { PathResult };
