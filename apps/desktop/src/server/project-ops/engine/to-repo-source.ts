const ALLOWED_HOSTS: ReadonlySet<string> = new Set([
  "github.com",
  "gitlab.com",
  "bitbucket.org",
]);

const GIT_SUFFIX = /\.git$/u;

interface RepoSource {
  readonly name: string;
  readonly url: string;
}

const toRepoName = (pathname: string): string | null => {
  const last = pathname.split("/").findLast((part) => part !== "") ?? "";
  const name = last.replace(GIT_SUFFIX, "").replaceAll(/[^\w.-]/gu, "-");

  if (name === "" || name.startsWith(".")) {
    return null;
  }

  return name;
};

const hasAllowedHost = (url: URL): boolean =>
  ALLOWED_HOSTS.has(url.hostname.toLowerCase()) ||
  GIT_SUFFIX.test(url.pathname);

const isCloneableUrl = (url: URL): boolean =>
  url.protocol === "https:" &&
  url.username === "" &&
  url.password === "" &&
  hasAllowedHost(url);

const toRepoSource = (raw: string): RepoSource | null => {
  const text = raw.trim();

  if (!URL.canParse(text)) {
    return null;
  }

  const url = new URL(text);

  if (!isCloneableUrl(url)) {
    return null;
  }

  const name = toRepoName(url.pathname);

  if (name === null) {
    return null;
  }

  return { name, url: `${url.origin}${url.pathname}` };
};

export { toRepoSource };

export type { RepoSource };
