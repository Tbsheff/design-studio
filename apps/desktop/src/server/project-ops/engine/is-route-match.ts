const toSegments = (route: string): string[] =>
  route.split("/").filter((segment) => segment !== "");

const isCatchAll = (segment: string): boolean =>
  segment.startsWith("[...") || segment.startsWith("[[...");

const isDynamic = (segment: string): boolean =>
  segment.startsWith("[") && segment.endsWith("]");

const isRouteMatch = (pattern: string, routePath: string): boolean => {
  const wanted = toSegments(pattern);
  const given = toSegments(routePath);

  for (const [index, segment] of wanted.entries()) {
    if (isCatchAll(segment)) {
      return given.length > index || segment.startsWith("[[");
    }

    if (index >= given.length) {
      return false;
    }

    if (!isDynamic(segment) && segment !== given[index]) {
      return false;
    }
  }

  return wanted.length === given.length;
};

export { isRouteMatch };
