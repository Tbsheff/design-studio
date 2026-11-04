import { createRequire } from "node:module";
import path from "node:path";

import type { Plugin } from "esbuild";

import type { PropValue } from "../../shared/actions/_core/props.js";

export interface SampleNode {
  exportName: string;
  props: Record<string, PropValue>;
  children: (SampleNode | string)[];
}

export interface BundleRequest {
  file: string;
  tree: SampleNode;
  root: string;
  appDir: string;
}

export interface GalleryBundleRequest {
  file: string;
  cells: { id: string; tree: SampleNode }[];
  root: string;
  appDir: string;
}

export class BundleError extends Error {}

const REACT_SPEC = /^(react|react-dom)(\/.*)?$/;
const EMPTY_SPEC = /^(server-only|client-only)$/;
const NEXT_STUB = /^next\/(link|image|navigation|router|dynamic)$/;

const ASSET_LOADERS = {
  ".avif": "dataurl",
  ".css": "empty",
  ".gif": "dataurl",
  ".jpeg": "dataurl",
  ".jpg": "dataurl",
  ".less": "empty",
  ".png": "dataurl",
  ".sass": "empty",
  ".scss": "empty",
  ".svg": "dataurl",
  ".ttf": "dataurl",
  ".webp": "dataurl",
  ".woff": "dataurl",
  ".woff2": "dataurl",
} as const;

const NEXT_STUBS: Record<string, string> = {
  dynamic: `export default function dynamic() { return function Dynamic() { return null; }; }`,
  image: `import * as React from 'react';
const Image = React.forwardRef(function Image({ src, fill, priority, quality, placeholder, blurDataURL, loader, unoptimized, ...rest }, ref) {
  return React.createElement('img', { ref, src: typeof src === 'string' ? src : src && src.src, ...rest });
});
export default Image;`,
  link: `import * as React from 'react';
const Link = React.forwardRef(function Link({ href, prefetch, replace, scroll, shallow, passHref, legacyBehavior, locale, ...rest }, ref) {
  return React.createElement('a', { ref, href: typeof href === 'string' ? href : (href && href.pathname) || '#', ...rest });
});
export default Link;`,
  navigation: `const router = { push() {}, replace() {}, back() {}, forward() {}, refresh() {}, prefetch() {} };
export const useRouter = () => router;
export const usePathname = () => '/';
export const useSearchParams = () => new URLSearchParams();
export const useParams = () => ({});
export const useSelectedLayoutSegment = () => null;
export const useSelectedLayoutSegments = () => [];
export function redirect() { throw new Error('redirect() needs the Next.js router'); }
export const permanentRedirect = redirect;
export function notFound() { throw new Error('notFound() needs the Next.js router'); }
export const RedirectType = { push: 'push', replace: 'replace' };`,
  router: `const router = { push() {}, replace() {}, back() {}, prefetch: async () => {}, pathname: '/', query: {}, asPath: '/', isReady: true, events: { on() {}, off() {} } };
export const useRouter = () => router;
export default router;`,
};

function previewPlugin(appDir: string): Plugin {
  const appRequire = createRequire(path.join(appDir, "package.json"));

  return {
    name: "studio-preview",
    setup(build) {
      build.onResolve({ filter: REACT_SPEC }, (args) => {
        try {
          return { path: appRequire.resolve(args.path) };
        } catch {
          return null;
        }
      });
      build.onResolve({ filter: EMPTY_SPEC }, () => ({
        namespace: "studio-empty",
        path: "empty",
      }));
      build.onResolve({ filter: NEXT_STUB }, (args) => ({
        namespace: "studio-next",
        path: args.path.slice("next/".length),
      }));
      build.onLoad({ filter: /.*/, namespace: "studio-empty" }, () => ({
        contents: "export {};",
        loader: "js",
      }));
      build.onLoad({ filter: /.*/, namespace: "studio-next" }, (args) => ({
        contents: NEXT_STUBS[args.path] ?? "export {};",
        loader: "jsx",
        resolveDir: appDir,
      }));
    },
  };
}

function nodeSource(node: SampleNode | string): string {
  if (typeof node === "string") {
    return JSON.stringify(node);
  }

  const children = node.children.map(nodeSource).join(", ");

  return `React.createElement(part(${JSON.stringify(node.exportName)}), ${JSON.stringify(node.props)}${children ? `, ${children}` : ""})`;
}

function entrySource(request: BundleRequest): string {
  return `import * as React from 'react';
import { createRoot } from 'react-dom/client';
import * as Module from ${JSON.stringify(request.file)};
function part(name) {
  const value = Module[name];
  if (typeof value === 'function' || (typeof value === 'object' && value !== null)) return value;
  throw new Error('The file does not export ' + name + ' as a component');
}
class Boundary extends React.Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { window.__studioPreviewError = String((error && error.message) || error); }
  render() { return this.state.failed ? null : this.props.children; }
}
const root = createRoot(document.getElementById('studio-preview'));
window.__studioPreviewUnmount = () => root.unmount();
try {
  root.render(React.createElement(Boundary, null, ${nodeSource(request.tree)}));
} catch (error) {
  window.__studioPreviewError = String((error && error.message) || error);
}
`;
}

function galleryEntrySource(request: GalleryBundleRequest): string {
  const cells = request.cells
    .map(
      (cell) => `[${JSON.stringify(cell.id)}, () => ${nodeSource(cell.tree)}]`
    )
    .join(",\n");

  return `import * as React from 'react';
import { createRoot } from 'react-dom/client';
import * as Module from ${JSON.stringify(request.file)};
function part(name) {
  const value = Module[name];
  if (typeof value === 'function' || (typeof value === 'object' && value !== null)) return value;
  throw new Error('The file does not export ' + name + ' as a component');
}
window.__studioGalleryErrors = window.__studioGalleryErrors || {};
class Boundary extends React.Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { window.__studioGalleryErrors[this.props.cell] = String((error && error.message) || error); }
  render() { return this.state.failed ? null : this.props.children; }
}
for (const [id, make] of [${cells}]) {
  const host = document.getElementById('gc-' + id);
  if (!host) continue;
  try {
    createRoot(host).render(React.createElement(Boundary, { cell: id }, make()));
  } catch (error) {
    window.__studioGalleryErrors[id] = String((error && error.message) || error);
  }
}
`;
}

function firstError(
  errors: { text: string; location: { file: string; line: number } | null }[]
): string {
  const error = errors[0];

  if (!error) {
    return "esbuild failed";
  }

  return error.location
    ? `${error.text} (${error.location.file}:${error.location.line})`
    : error.text;
}

async function buildBundle(
  contents: string,
  request: { root: string; appDir: string }
): Promise<string> {
  const { build } = await import("esbuild");

  try {
    const result = await build({
      absWorkingDir: request.root,
      banner: {
        js: 'var process = globalThis.process || { env: { NODE_ENV: "production" } };',
      },
      bundle: true,
      define: { "process.env.NODE_ENV": '"production"' },
      format: "iife",
      jsx: "automatic",
      loader: ASSET_LOADERS,
      logLevel: "silent",
      minify: true,
      platform: "browser",
      plugins: [previewPlugin(request.appDir)],
      stdin: {
        contents,
        loader: "jsx",
        resolveDir: request.appDir,
        sourcefile: "studio-component-preview.jsx",
      },
      target: ["es2020"],
      write: false,
    });

    const output = result.outputFiles[0];

    if (!output) {
      throw new BundleError("esbuild produced no output");
    }

    return output.text;
  } catch (error) {
    if (error instanceof BundleError) {
      throw error;
    }

    const { errors } = error as {
      errors?: {
        text: string;
        location: { file: string; line: number } | null;
      }[];
    };

    throw new BundleError(
      errors
        ? firstError(errors)
        : error instanceof Error
          ? error.message
          : String(error)
    );
  }
}

export function bundlePreview(request: BundleRequest): Promise<string> {
  return buildBundle(entrySource(request), request);
}

export function bundleGallery(request: GalleryBundleRequest): Promise<string> {
  return buildBundle(galleryEntrySource(request), request);
}
