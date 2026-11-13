interface EditLine {
  readonly sign: "+" | "-" | " ";
  readonly text: string;
}

interface EditHunk {
  readonly lines: readonly EditLine[];
  readonly newStart: number;
}

interface StyleEdit {
  readonly hunk: EditHunk;
  readonly layerId: string;
  readonly line: number;
  readonly tag: string;
  readonly versionId: string;
}

interface LinePair {
  readonly after: string;
  readonly before: string;
  readonly newLine: number;
}

interface StyleChange {
  readonly isClass: boolean;
  readonly property: string;
  readonly value: string;
}

interface ProposalGroup {
  readonly change: StyleChange;
  readonly layerIds: Set<string>;
  readonly seen: Set<string>;
  readonly tags: Map<string, number>;
}

interface RuleProposalDraft {
  readonly count: number;
  readonly id: string;
  readonly layerIds: readonly string[];
  readonly property: string;
  readonly text: string;
  readonly value: string;
}

interface ProposalQuery {
  readonly closedIds: ReadonlySet<string>;
  readonly edits: readonly StyleEdit[];
  readonly layerMax: number;
}

const MIN_COUNT = 3;

const MIN_LAYERS = 2;

const HASH_MOD_A = 1_000_000_007;

const HASH_MOD_B = 998_244_353;

const HASH_BASE_A = 131;

const HASH_BASE_B = 137;

const HEX = 16;

const HEX_WIDTH = 8;

const ID_LENGTH = 10;

const STYLE_ATTRIBUTE =
  /\bstyle\s*=\s*(?:"(?<double>[^"]*)"|'(?<single>[^']*)')/u;

const JSX_STYLE = /\bstyle\s*=\s*\{\{(?<body>[^}]*)\}\}/u;

const CLASS_ATTRIBUTE =
  /\bclass(?:Name)?\s*=\s*(?:"(?<double>[^"]*)"|'(?<single>[^']*)')/u;

const CAMEL_BREAK = /(?<lower>[a-z0-9])(?<upper>[A-Z])/gu;

const QUOTES = /^["'`]|["'`]$/gu;

const SPACE = /\s+/gu;

const TAG_NOUNS = new Map<string, string>([
  ["a", "links"],
  ["article", "cards"],
  ["button", "buttons"],
  ["h1", "headings"],
  ["h2", "headings"],
  ["h3", "headings"],
  ["h4", "headings"],
  ["img", "images"],
  ["input", "inputs"],
  ["li", "list items"],
  ["p", "paragraphs"],
  ["section", "sections"],
  ["table", "tables"],
]);

const CLASS_TARGETS = new Map<string, string>([
  ["a", "link"],
  ["button", "button"],
  ["h1", "heading"],
  ["h2", "heading"],
  ["h3", "heading"],
  ["img", "image"],
  ["input", "input"],
  ["select", "select"],
  ["table", "table"],
  ["textarea", "textarea"],
]);

const toHashPart = (text: string, base: number, mod: number): string => {
  let hash = 0;

  for (const char of text) {
    hash = (hash * base + (char.codePointAt(0) ?? 0)) % mod;
  }

  return hash.toString(HEX).padStart(HEX_WIDTH, "0");
};

const toProposalId = (change: StyleChange): string => {
  const key = `${change.property}:${change.value}`;
  const head = toHashPart(key, HASH_BASE_A, HASH_MOD_A);
  const tail = toHashPart(key, HASH_BASE_B, HASH_MOD_B);

  return `p-${(head + tail).slice(0, ID_LENGTH)}`;
};

const toCleanValue = (value: string): string =>
  value.replaceAll(QUOTES, "").replaceAll(SPACE, " ").trim().toLowerCase();

const toKebab = (name: string): string =>
  name.replaceAll(CAMEL_BREAK, "$<lower>-$<upper>").toLowerCase();

const toDeclarations = (
  body: string,
  separator: string,
  isJsx: boolean
): ReadonlyMap<string, string> => {
  const found = new Map<string, string>();

  for (const part of body.split(separator)) {
    const at = part.indexOf(":");

    if (at > 0) {
      const raw = toCleanValue(part.slice(0, at));
      const value = toCleanValue(part.slice(at + 1));

      if (isJsx) {
        found.set(toKebab(raw.replaceAll(QUOTES, "")), value);
      } else {
        found.set(raw, value);
      }
    }
  }

  return found;
};

const toStyleMap = (line: string): ReadonlyMap<string, string> => {
  const jsx = JSX_STYLE.exec(line);

  if (jsx) {
    return toDeclarations(jsx.groups?.body ?? "", ",", true);
  }

  const groups = STYLE_ATTRIBUTE.exec(line)?.groups;

  return toDeclarations(groups?.double ?? groups?.single ?? "", ";", false);
};

const toClassSet = (line: string): ReadonlySet<string> => {
  const groups = CLASS_ATTRIBUTE.exec(line)?.groups;
  const text = groups?.double ?? groups?.single ?? "";

  return new Set(text.split(SPACE).filter(Boolean));
};

const toClassGroup = (token: string): string => {
  const bare = (token.split(":").at(-1) ?? token).replace(/^[!-]+/u, "");
  const bracket = bare.indexOf("-[");

  if (bracket > 0) {
    return bare.slice(0, bracket);
  }

  return bare.split("-")[0] ?? bare;
};

const toCssChanges = (pair: LinePair): readonly StyleChange[] => {
  const before = toStyleMap(pair.before);

  return [...toStyleMap(pair.after)].flatMap(([property, value]) => {
    if (value === "" || before.get(property) === value) {
      return [];
    }

    return [{ isClass: false, property, value }];
  });
};

const toClassChanges = (pair: LinePair): readonly StyleChange[] => {
  const before = toClassSet(pair.before);

  return [...toClassSet(pair.after)].flatMap((token) => {
    if (before.has(token)) {
      return [];
    }

    return [{ isClass: true, property: toClassGroup(token), value: token }];
  });
};

const toLinePairs = (hunk: EditHunk): readonly LinePair[] => {
  const pairs: LinePair[] = [];
  let removed: string[] = [];
  let newLine = hunk.newStart;

  for (const line of hunk.lines) {
    if (line.sign === "-") {
      removed.push(line.text);
    } else if (line.sign === "+") {
      pairs.push({ after: line.text, before: removed.shift() ?? "", newLine });
      newLine += 1;
    } else {
      removed = [];
      newLine += 1;
    }
  }

  return pairs;
};

const toEditChanges = (edit: StyleEdit): readonly StyleChange[] => {
  const pairs = toLinePairs(edit.hunk);
  let chosen = pairs.filter((pair) => pair.newLine === edit.line);

  if (chosen.length === 0) {
    chosen = [...pairs];
  }

  const changes: StyleChange[] = [];

  for (const pair of chosen) {
    changes.push(...toCssChanges(pair), ...toClassChanges(pair));
  }

  return changes;
};

const toTopTag = (tags: ReadonlyMap<string, number>): string => {
  let top = "";
  let topCount = 0;

  for (const [tag, count] of tags) {
    if (count > topCount) {
      top = tag;
      topCount = count;
    }
  }

  return top;
};

const toNoun = (tag: string): string =>
  TAG_NOUNS.get(tag) ?? `<${tag || "div"}> layers`;

const toRuleText = (group: ProposalGroup): string => {
  const tag = toTopTag(group.tags);
  const { change } = group;
  const target = CLASS_TARGETS.get(tag);

  if (change.isClass && target) {
    return `${target}: ${change.value}`;
  }

  if (change.isClass) {
    return `Use the ${change.value} class on ${toNoun(tag)}`;
  }

  return `Use ${change.property}: ${change.value} on ${toNoun(tag)}`;
};

const insertEdit = (
  groups: Map<string, ProposalGroup>,
  edit: StyleEdit,
  change: StyleChange
): void => {
  const key = `${change.property}\u0000${change.value}`;

  const group = groups.get(key) ?? {
    change,
    layerIds: new Set<string>(),
    seen: new Set<string>(),
    tags: new Map<string, number>(),
  };

  group.seen.add(`${edit.versionId}\u0000${edit.layerId}`);
  group.layerIds.add(edit.layerId);
  group.tags.set(edit.tag, (group.tags.get(edit.tag) ?? 0) + 1);
  groups.set(key, group);
};

const isRepeated = (group: ProposalGroup): boolean =>
  group.seen.size >= MIN_COUNT || group.layerIds.size >= MIN_LAYERS;

const toDraft = (
  group: ProposalGroup,
  layerMax: number
): RuleProposalDraft => ({
  count: group.seen.size,
  id: toProposalId(group.change),
  layerIds: [...group.layerIds].slice(0, layerMax),
  property: group.change.property,
  text: toRuleText(group),
  value: group.change.value,
});

const toStrengthOrder = (
  left: RuleProposalDraft,
  right: RuleProposalDraft
): number =>
  right.count - left.count ||
  right.layerIds.length - left.layerIds.length ||
  left.id.localeCompare(right.id);

const toRuleProposals = (
  query: ProposalQuery
): readonly RuleProposalDraft[] => {
  const groups = new Map<string, ProposalGroup>();

  for (const edit of query.edits) {
    for (const change of toEditChanges(edit)) {
      insertEdit(groups, edit, change);
    }
  }

  const drafts: RuleProposalDraft[] = [];

  for (const group of groups.values()) {
    const draft = toDraft(group, query.layerMax);

    if (isRepeated(group) && !query.closedIds.has(draft.id)) {
      drafts.push(draft);
    }
  }

  return drafts.toSorted(toStrengthOrder);
};

export { toRuleProposals };

export type { EditHunk, EditLine, ProposalQuery, RuleProposalDraft, StyleEdit };
