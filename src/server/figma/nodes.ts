import { FIGMA_NODES_MAX_BYTES, type FigmaComponentMeta, type FigmaFrameInfo, type FigmaNode } from '../../shared/figma-nodes.js';

export class FigmaInputError extends Error {}

export interface FigmaDocument {
  fileName: string | null;
  roots: FigmaNode[];
  components: Map<string, FigmaComponentMeta>;
  componentSets: Map<string, string>;
}

export interface FigmaLink {
  fileKey: string;
  nodeId: string | null;
}

type Json = Record<string, unknown>;

const FRAME_TYPES = new Set(['FRAME', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE', 'GROUP', 'SECTION']);
const CONTAINER_TYPES = new Set(['DOCUMENT', 'CANVAS']);
const FETCH_TIMEOUT_MS = 20000;

function isJson(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNode(value: unknown): value is FigmaNode {
  return isJson(value) && typeof value.id === 'string' && typeof value.type === 'string';
}

function addComponents(doc: FigmaDocument, source: unknown): void {
  if (!isJson(source)) return;
  const components = source.components;
  if (isJson(components)) {
    for (const [id, meta] of Object.entries(components)) {
      if (isJson(meta) && typeof meta.name === 'string') doc.components.set(id, { name: meta.name, ...(typeof meta.componentSetId === 'string' ? { componentSetId: meta.componentSetId } : {}) });
    }
  }
  const sets = source.componentSets;
  if (isJson(sets)) {
    for (const [id, meta] of Object.entries(sets)) if (isJson(meta) && typeof meta.name === 'string') doc.componentSets.set(id, meta.name);
  }
}

function rootsOf(json: Json, doc: FigmaDocument): void {
  if (isJson(json.nodes)) {
    for (const entry of Object.values(json.nodes)) {
      if (!isJson(entry)) continue;
      if (isNode(entry.document)) doc.roots.push(entry.document);
      addComponents(doc, entry);
    }
    return;
  }
  if (isNode(json.document)) {
    doc.roots.push(json.document);
    addComponents(doc, json);
    return;
  }
  if (isNode(json)) doc.roots.push(json);
}

export function parseFigmaNodes(text: string): FigmaDocument {
  if (Buffer.byteLength(text, 'utf8') > FIGMA_NODES_MAX_BYTES) throw new FigmaInputError('The Figma JSON is larger than 10 MB. Export one frame with GET /v1/files/:key/nodes?ids=<node id>.');
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new FigmaInputError('The Figma file is not valid JSON.');
  }
  if (!isJson(json)) throw new FigmaInputError('The Figma JSON must be an object.');
  const doc: FigmaDocument = { fileName: typeof json.name === 'string' ? json.name : null, roots: [], components: new Map(), componentSets: new Map() };
  rootsOf(json, doc);
  if (doc.roots.length === 0) throw new FigmaInputError('The JSON has no Figma nodes. Use the body of GET /v1/files/:key/nodes?ids=<node id> (a "nodes" map with a "document" in each entry).');
  return doc;
}

function frameInfo(node: FigmaNode): FigmaFrameInfo {
  const box = node.absoluteBoundingBox;
  return { id: node.id, name: node.name ?? node.id, type: node.type, width: box ? Math.round(box.width) : null, height: box ? Math.round(box.height) : null };
}

export function listFrames(doc: FigmaDocument): FigmaFrameInfo[] {
  const out: FigmaFrameInfo[] = [];
  const visit = (node: FigmaNode, depth: number) => {
    if (FRAME_TYPES.has(node.type)) {
      out.push(frameInfo(node));
      return;
    }
    if (depth < 2 && CONTAINER_TYPES.has(node.type)) for (const child of node.children ?? []) visit(child, depth + 1);
  };
  for (const root of doc.roots) visit(root, 0);
  return out.slice(0, 200);
}

export function findNode(doc: FigmaDocument, id: string): FigmaNode | null {
  const want = id.trim().replace(/-/g, ':');
  const stack = [...doc.roots];
  while (stack.length > 0) {
    const node = stack.pop() as FigmaNode;
    if (node.id === want) return node;
    if (Array.isArray(node.children)) stack.push(...node.children.filter(isNode));
  }
  return null;
}

export function pickFrame(doc: FigmaDocument, nodeId: string | undefined): FigmaNode {
  if (nodeId) {
    const found = findNode(doc, nodeId);
    if (!found) throw new FigmaInputError(`No Figma node has id ${nodeId}. Frames in this file: ${listFrames(doc).slice(0, 8).map((frame) => `${frame.id} ${frame.name}`).join(', ') || 'none'}.`);
    return found;
  }
  const first = listFrames(doc)[0];
  const node = first ? findNode(doc, first.id) : null;
  if (!node) throw new FigmaInputError('The Figma JSON has no frame to import. Pass nodeId.');
  return node;
}

export function frameOf(node: FigmaNode): FigmaFrameInfo {
  return frameInfo(node);
}

export function parseFigmaLink(raw: string): FigmaLink | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (!/(^|\.)figma\.com$/.test(url.hostname)) return null;
  const key = /^\/(?:file|design|proto)\/([A-Za-z0-9]+)/.exec(url.pathname)?.[1];
  if (!key) return null;
  const node = url.searchParams.get('node-id');
  return { fileKey: key, nodeId: node ? node.replace(/-/g, ':') : null };
}

export function figmaFetchEnabled(): boolean {
  return process.env.STUDIO_FIGMA_FETCH === '1' && Boolean(process.env.FIGMA_TOKEN);
}

export async function fetchFigmaNodes(link: FigmaLink): Promise<string> {
  if (!figmaFetchEnabled()) {
    throw new FigmaInputError('Figma links need a call to the Figma API, which is off. Save the body of GET https://api.figma.com/v1/files/<key>/nodes?ids=<node id> as a .json file and paste or pass that, or start the studio with STUDIO_FIGMA_FETCH=1 and FIGMA_TOKEN.');
  }
  if (!link.nodeId) throw new FigmaInputError('The Figma link has no node-id. Copy the link to one frame (right-click the frame > Copy link).');
  const url = `https://api.figma.com/v1/files/${encodeURIComponent(link.fileKey)}/nodes?ids=${encodeURIComponent(link.nodeId)}`;
  const response = await fetch(url, { headers: { 'X-Figma-Token': process.env.FIGMA_TOKEN ?? '' }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) throw new FigmaInputError(`The Figma API answered ${response.status}. Check FIGMA_TOKEN and that the token can read this file.`);
  return response.text();
}
