const TAG_OPEN = "<";

const toTag = (
  name: string,
  attributes: string,
  body: string | null
): string => {
  if (body === null) {
    return `${TAG_OPEN}${name} ${attributes}/>`;
  }

  return `${TAG_OPEN}${name} ${attributes}>${body}${TAG_OPEN}/${name}>`;
};

const toVoidTag = (name: string, attributes: string): string =>
  `${TAG_OPEN}${name} ${attributes}>`;

export { toTag, toVoidTag };
