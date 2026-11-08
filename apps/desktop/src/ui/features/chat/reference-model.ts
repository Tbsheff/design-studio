const NAME_ROOM = 30;
const TAIL_CHARS = 12;

const toShortName = (name: string): string => {
  if (name.length <= NAME_ROOM) {
    return name;
  }

  const tail = name.slice(-TAIL_CHARS);

  return `${name.slice(0, NAME_ROOM - tail.length - 1)}…${tail}`;
};

export { toShortName };
