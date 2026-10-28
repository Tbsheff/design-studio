import { createRequire } from 'node:module';
import path from 'node:path';
import type { Plugin } from 'esbuild';
import type { PropValue } from '../../shared/props.js';

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

export class BundleError extends Error {}

const REACT_SPEC = /^(react|react-dom)(\/.*)?$/;
const EMPTY_SPEC = /^(server-only|client-only)$/;
const NEXT_STUB = /^next\/(link|image|navigation|router|dynamic)$/;
const ASSET_LOADERS = { '.css': 'empty', '.scss': 'empty', '.sass': 'empty', '.less': 'empty', '.png': 'dataurl', '.jpg': 'dataurl', '.jpeg': 'dataurl', '.gif': 'dataurl', '.webp': 'dataurl', '.avif': 'dataurl', '.svg': 'dataurl', '.woff': 'dataurl', '.woff2': 'dataurl', '.ttf': 'dataurl' } as const;

const NEXT_STUBS: Record<string, string> = {
  link: `import * as React from 'react';
const Link = React.forwardRef(function Link({ href, prefetch, replace, scroll, shallow, passHref, legacyBehavior, locale, ...rest }, ref) {
  return React.createElement('a', { ref, href: typeof href === 'string' ? href : (href && href.pathname) || '#', ...rest });
});
export default Link;`,
  image: `import * as React from 'react';
const Image = React.forwardRef(function Image({ src, fill, priority, quality, placeholder, blurDataURL, loader, unoptimized, ...rest }, ref) {
  return React.createElement('img', { ref, src: typeof src === 'string' ? src : src && src.src, ...rest });
});
export default Image;`,
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
  dynamic: `export default function dynamic() { return function Dynamic() { return null; }; }`,
};

function previewPlugin(appDir: string): Plugin {
  const appRequire = createRequire(path.join(appDir, 'package.json'));
  return {
    name: 'studio-preview',
    setup(build) {
      build.onResolve({ filter: REACT_SPEC }, (args) => {
        try {
          return { path: appRequire.resolve(args.path) };
        } catch {
          return undefined;
        }
      });
      build.onResolve({ filter: EMPTY_SPEC }, () => ({ path: 'empty', namespace: 'studio-empty' }));
      build.onResolve({ filter: NEXT_STUB }, (args) => ({ path: args.path.slice('next/'.length), namespace: 'studio-next' }));
      build.onLoad({ filter: /.*/, namespace: 'studio-empty' }, () => ({ contents: 'export {};', loader: 'js' }));
      build.onLoad({ filter: /.*/, namespace: 'studio-next' }, (args) => ({ contents: NEXT_STUBS[args.path] ?? 'export {};', loader: 'jsx', resolveDir: appDir }));
    },
  };
}

function nodeSource(node: SampleNode | string): string {
  if (typeof node === 'string') return JSON.stringify(node);
  const children = node.children.map(nodeSource).join(', ');
  return `React.createElement(part(${JSON.stringify(node.exportName)}), ${JSON.stringify(node.props)}${children ? `, ${children}` : ''})`;
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

function firstError(errors: { text: string; location: { file: string; line: number } | null }[]): string {
  const error = errors[0];
  if (!error) return 'esbuild failed';
  return error.location ? `${error.text} (${error.location.file}:${error.location.line})` : error.text;
}

export async function bundlePreview(request: BundleRequest): Promise<string> {
  const { build } = await import('esbuild');
  try {
    const result = await build({
      stdin: { contents: entrySource(request), resolveDir: request.appDir, loader: 'jsx', sourcefile: 'studio-component-preview.jsx' },
      absWorkingDir: request.root,
      bundle: true,
      write: false,
      format: 'iife',
      platform: 'browser',
      target: ['es2020'],
      minify: true,
      jsx: 'automatic',
      loader: ASSET_LOADERS,
      define: { 'process.env.NODE_ENV': '"production"' },
      banner: { js: 'var process = globalThis.process || { env: { NODE_ENV: "production" } };' },
      plugins: [previewPlugin(request.appDir)],
      logLevel: 'silent',
    });
    const output = result.outputFiles[0];
    if (!output) throw new BundleError('esbuild produced no output');
    return output.text;
  } catch (error) {
    if (error instanceof BundleError) throw error;
    const errors = (error as { errors?: { text: string; location: { file: string; line: number } | null }[] }).errors;
    throw new BundleError(errors ? firstError(errors) : error instanceof Error ? error.message : String(error));
  }
}
