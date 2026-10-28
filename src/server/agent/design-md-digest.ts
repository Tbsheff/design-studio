const SECTION_MAX_CHARS = 4500;
const DIGEST_MIN_CHARS = 12000;

function cutSection(section: string): string {
  if (section.length <= SECTION_MAX_CHARS) return section;
  const head = section.slice(0, section.lastIndexOf('\n', SECTION_MAX_CHARS));
  const title = section.split('\n', 1)[0]?.replace(/^#+\s*/, '') ?? 'this section';
  const subheads = section
    .slice(head.length)
    .split('\n')
    .filter((line) => /^#{3,4} /.test(line))
    .map((line) => line.replace(/^#+\s*/, ''));
  const rest = subheads.length ? ` It also covers: ${subheads.join('; ')}.` : '';
  return `${head}\n\n[The studio cut the rest of "${title}" (${section.length - head.length} characters) to save context. Read DESIGN.md for it when you need it.${rest}]`;
}

export function designMdDigest(designMd: string | null | undefined): string | null | undefined {
  if (!designMd || designMd.length <= DIGEST_MIN_CHARS) return designMd;
  return designMd.split(/\n(?=## )/).map(cutSection).join('\n');
}
