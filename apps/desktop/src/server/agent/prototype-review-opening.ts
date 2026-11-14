interface LineCounts {
  readonly flow: number;
  readonly kit: number;
  readonly phone: number;
}

const FLOW_RULE =
  "Each page must keep the same header, nav, footer, :root values and style sheets.";

const PHONE_RULE =
  "At 390 px, as share Play shows it on a phone, each page must fit with no sideways scroll and keep tap targets at 44 px or more.";

const listCheckedWords = (counts: LineCounts): string[] => {
  const words: string[] = [];

  if (counts.kit > 0) {
    words.push("its parts against the app kit recipes");
  }

  if (counts.flow > 0) {
    words.push("the linked pages");
  }

  if (counts.phone > 0) {
    words.push("each page at 390 x 844");
  }

  return words;
};

const toWordList = (words: readonly string[]): string => {
  const last = words.at(-1) ?? "";

  if (words.length < 2) {
    return last;
  }

  return `${words.slice(0, -1).join(", ")} and ${last}`;
};

const toOpeningHead = (counts: LineCounts): string => {
  if (counts.kit > 0) {
    return "You finished a prototype of an app";
  }

  if (counts.flow > 0) {
    return "You finished a prototype with linked pages";
  }

  return "You finished a prototype";
};

const toFirstOpening = (counts: LineCounts): string | null => {
  const words = listCheckedWords(counts);

  if (words.length === 0) {
    return null;
  }

  const parts = [
    `${toOpeningHead(counts)}, so the studio checked ${toWordList(words)}.`,
  ];

  if (counts.flow > 0) {
    parts.push(FLOW_RULE);
  }

  if (counts.phone > 0) {
    parts.push(PHONE_RULE);
  }

  return parts.join(" ");
};

const toCheckOpening = (counts: LineCounts, pass: number): string | null => {
  if (pass === 1) {
    return toFirstOpening(counts);
  }

  if (counts.flow === 0 && counts.phone === 0) {
    return null;
  }

  return `You edited again after the studio checks, so the studio checked ${toWordList(listCheckedWords(counts))} once more. These gaps are left.`;
};

export { toCheckOpening };

export type { LineCounts };
