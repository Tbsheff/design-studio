import { writeFile } from "node:fs/promises";
import path from "node:path";

import { fail } from "../stamp/args.js";
import { runEach } from "./steps.ts";

interface SeededProject {
  readonly projectId: string;
  readonly token: string;
}

type SeedBody = Readonly<Record<string, boolean | string>>;

interface CreatedProject {
  readonly project: {
    readonly directions: readonly { readonly workTree: string }[];
    readonly id: string;
  };
}

const TOKEN_PATTERN = /name="studio-token" content="(?<token>[^"]+)"/u;

const toPage = (title: string, lede: string): string => `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<link rel="stylesheet" href="design-system/tokens.css">
<style>
body { margin: 0; background: var(--bg); color: var(--fg); font-family: var(--font-body); }
header { display: flex; justify-content: space-between; align-items: center; padding: 24px 64px; border-bottom: 1px solid var(--border); }
.hero { padding: 96px 64px 64px; max-width: 760px; }
h1 { font-family: var(--font-display); font-size: 64px; line-height: 1.05; margin: 0 0 24px; }
.lede { color: var(--fg-muted); font-size: 20px; line-height: 1.5; }
.cta { display: inline-block; margin-top: 24px; padding: 14px 22px; border-radius: 10px; background: var(--primary); color: var(--bg); text-decoration: none; }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px; padding: 0 64px 96px; }
.card { padding: 24px; border-radius: 16px; background: var(--surface); border: 1px solid var(--border); }
@media (prefers-color-scheme: dark) { body { background: var(--bg); } }
</style></head>
<body>
<header><strong>Harbor Coffee</strong><nav><a href="index.html">Home</a> · <a href="about.html">About</a></nav></header>
<section class="hero"><h1>${title}</h1><p class="lede">${lede}</p><a class="cta" href="about.html">Start a subscription</a></section>
<section class="cards">
<article class="card"><h3>Pier Blend</h3><p>Chocolate, orange peel, a long finish.</p></article>
<article class="card"><h3>Fog Line</h3><p>Light roast with stone fruit and honey.</p></article>
<article class="card"><h3>Night Shift</h3><p>Dark, smoky and built for milk.</p></article>
</section>
</body>
</html>
`;

const FRAMES: readonly SeedBody[] = [
  { label: "Tablet", viewport: "tablet" },
  { label: "Mobile", viewport: "mobile" },
  { label: "About", path: "about.html", viewport: "desktop" },
];

const toToken = async (origin: string): Promise<string> => {
  const response = await fetch(`${origin}/`);

  if (!response.ok) {
    return fail(
      `the studio page answered ${response.status}`,
      "pnpm --config.verify-deps-before-run=false run build:ui"
    );
  }

  const html = await response.text();
  const token = TOKEN_PATTERN.exec(html)?.groups?.token ?? null;

  if (token === null) {
    return fail(
      "the studio page has no studio-token meta tag",
      "pnpm --config.verify-deps-before-run=false run build:ui"
    );
  }

  return token;
};

const runPost = async <Reply>(
  origin: string,
  token: string,
  route: string,
  body: SeedBody
): Promise<Reply> => {
  const response = await fetch(`${origin}${route}`, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", "x-studio-token": token },
    method: "POST",
  });

  if (!response.ok) {
    return fail(
      `seed POST ${route} failed with ${response.status}: ${await response.text()}`,
      "start the studio with STUDIO_AGENT=mock STUDIO_DATA_DIR=$(mktemp -d) pnpm run server and call the route by hand"
    );
  }

  return (await response.json()) as Reply;
};

const createFrames = async (
  origin: string,
  token: string,
  projectId: string
): Promise<void> => {
  await runEach(FRAMES, async (frame) => {
    await runPost(
      origin,
      token,
      `/api/projects/${projectId}/canvas/frames`,
      frame
    );
  });
};

const createSeed = async (origin: string): Promise<SeededProject> => {
  const token = await toToken(origin);

  const created = await runPost<CreatedProject>(
    origin,
    token,
    "/api/projects",
    {
      kind: "html",
      name: "Harbor Coffee clip check with a long project name",
      packId: "editorial",
      prompt: "Harbor Coffee",
      startRun: false,
    }
  );

  const projectId = created.project.id;
  const workTree = created.project.directions[0]?.workTree ?? null;

  if (workTree === null) {
    return fail(
      "the seed project has no direction work tree",
      "check POST /api/projects in apps/desktop/src/server"
    );
  }

  await writeFile(
    path.join(workTree, "index.html"),
    toPage(
      "Small-batch coffee, roasted on the pier.",
      "Fresh bags every Tuesday. Pause or skip any week."
    )
  );
  await writeFile(
    path.join(workTree, "about.html"),
    toPage(
      "About the roastery",
      "We roast four days a week in a shed by the water."
    )
  );
  await runPost(origin, token, `/api/projects/${projectId}/d/main/keep`, {});
  await createFrames(origin, token, projectId);

  return { projectId, token };
};

export { createSeed };

export type { SeededProject };
