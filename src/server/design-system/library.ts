import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { z } from 'zod';
import type { CreateUserPackInput, PackDetail, PackManifest, UpdateUserPackInput } from '../../shared/contracts.js';
import { MAX_SLUG_SUFFIX, slugCandidate, slugify } from '../../shared/folders.js';
import { BadRequestError, NotFoundError, isNodeError } from '../store/errors.js';
import { createKeyedMutex } from '../store/mutex.js';
import { buildErrorMessage } from './sync.js';
import { compileTokens, parseTokenFile } from './compile.js';
import { removeTokenBlock } from './design-md.js';
import { DESIGN_MD_FILE, USER_PACK_PREFIX, formatIssues, manifestSchema } from './packs.js';
import type { LoadedPack, PackRegistry } from './packs.js';
import { zipFiles } from './zip.js';

const MAX_TOKENS_BYTES = 512 * 1024;
const MAX_DESIGN_MD_BYTES = 512 * 1024;
const NAME_MAX = 80;
const DEFAULT_LICENSE = 'Custom';
const COPY_SUFFIX = ' copy';

const fieldsSchema = z
  .object({
    name: z.string().trim().min(1).max(NAME_MAX),
    description: z.string().trim().max(400).optional(),
    mode: z.enum(['light', 'dark']),
    fonts: manifestSchema.shape.fonts,
    tokensJson: z.union([z.string().max(MAX_TOKENS_BYTES), z.record(z.string(), z.unknown())]),
    designMd: z.string().max(MAX_DESIGN_MD_BYTES),
    provenance: z.enum(['original', 'imported', 'extracted']),
    tags: z.array(z.string().min(1).max(40)).max(20).optional(),
    license: z.string().trim().min(1).max(40).optional(),
    draft: z.boolean().optional(),
  })
  .strict();

export interface PackFiles {
  manifest: PackManifest;
  tokensText: string;
  designMd: string;
}

export interface PackExport {
  fileName: string;
  bytes: Buffer;
}

export interface PackLibrary {
  registry: PackRegistry;
  detail(id: string): Promise<PackDetail>;
  createUserPack(input: unknown): Promise<LoadedPack>;
  updateUserPack(id: string, patch: unknown): Promise<LoadedPack>;
  duplicatePack(id: string, name?: string): Promise<LoadedPack>;
  renamePack(id: string, name: string): Promise<LoadedPack>;
  deletePack(id: string): Promise<void>;
  exportPack(id: string): Promise<PackExport>;
}

function parseFields(raw: unknown, label: string): CreateUserPackInput {
  const parsed = fieldsSchema.safeParse(raw);
  if (!parsed.success) throw new BadRequestError(`invalid ${label}: ${formatIssues('', parsed.error).map((line) => line.trim()).join('; ')}`);
  return parsed.data as CreateUserPackInput;
}

function tokensTextOf(value: CreateUserPackInput['tokensJson']): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return text.endsWith('\n') ? text : `${text}\n`;
}

function defaultDescription(name: string): string {
  return `${name} design system.`.slice(0, 400);
}

export function buildPackFiles(id: string, input: CreateUserPackInput): PackFiles {
  const candidate = {
    id,
    name: input.name.trim(),
    description: input.description?.trim() || defaultDescription(input.name.trim()),
    mode: input.mode,
    tags: input.tags ?? [],
    license: input.license?.trim() || DEFAULT_LICENSE,
    provenance: input.provenance,
    fonts: input.fonts,
    ...(input.draft ? { draft: true } : {}),
  };
  const manifest = manifestSchema.safeParse(candidate);
  if (!manifest.success) throw new BadRequestError(`invalid pack.json: ${formatIssues('pack.json', manifest.error).join('; ')}`);
  const tokensText = tokensTextOf(input.tokensJson);
  if (Buffer.byteLength(tokensText) > MAX_TOKENS_BYTES) throw new BadRequestError('tokens.json is larger than 512 KB');
  const parsed = parseTokenFile(tokensText);
  if (!parsed.file) throw new BadRequestError(`invalid tokens.json: ${parsed.error ?? 'not a token file'}`);
  const compiled = compileTokens(parsed.file, { mode: input.mode });
  if (compiled.errors.length > 0) throw new BadRequestError(`invalid tokens.json: ${buildErrorMessage(compiled.errors)}`);
  const prose = removeTokenBlock(input.designMd.replace(/\r\n/g, '\n')).trim();
  if (prose === '') throw new BadRequestError('DESIGN.md is empty');
  return { manifest: manifest.data as PackManifest, tokensText, designMd: `${prose}\n` };
}

function inputOf(pack: LoadedPack): CreateUserPackInput {
  const { manifest } = pack;
  return {
    name: manifest.name,
    description: manifest.description,
    mode: manifest.mode,
    fonts: manifest.fonts,
    tokensJson: pack.tokensText,
    designMd: pack.designMd,
    provenance: manifest.provenance,
    tags: manifest.tags,
    license: manifest.license,
    ...(manifest.draft ? { draft: true } : {}),
  };
}

function tempName(prefix: string): string {
  return `.${prefix}-${randomBytes(6).toString('hex')}`;
}

async function writeStaged(userDir: string, files: PackFiles): Promise<string> {
  const staged = path.join(userDir, tempName('tmp'));
  await mkdir(staged, { recursive: true });
  await writeFile(path.join(staged, 'pack.json'), `${JSON.stringify(files.manifest, null, 2)}\n`);
  await writeFile(path.join(staged, 'tokens.json'), files.tokensText);
  await writeFile(path.join(staged, DESIGN_MD_FILE), files.designMd);
  return staged;
}

function isTaken(error: unknown): boolean {
  return isNodeError(error) && (error.code === 'EEXIST' || error.code === 'ENOTEMPTY');
}

export function createPackLibrary(registry: PackRegistry): PackLibrary {
  const lock = createKeyedMutex();
  const userDir = (): string => {
    if (!registry.userDir) throw new BadRequestError('this server has no user pack library');
    return registry.userDir;
  };

  const requirePack = async (id: string): Promise<LoadedPack> => {
    const pack = await registry.get(id);
    if (!pack) throw new NotFoundError(`unknown pack: ${id}`);
    return pack;
  };

  const requireUserPack = async (id: string): Promise<LoadedPack> => {
    const pack = await requirePack(id);
    if (pack.source !== 'user') throw new BadRequestError(`${pack.manifest.name} is a built-in design system and cannot be changed`);
    return pack;
  };

  const loaded = async (id: string): Promise<LoadedPack> => {
    registry.invalidate();
    const pack = await registry.get(id);
    if (!pack) throw new Error(`user pack ${id} was written but did not load`);
    return pack;
  };

  const create = (input: CreateUserPackInput): Promise<LoadedPack> =>
    lock('library', async () => {
      const root = userDir();
      await mkdir(root, { recursive: true });
      const base = `${USER_PACK_PREFIX}${slugify(input.name)}`;
      const files = buildPackFiles(base, input);
      for (let attempt = 1; attempt <= MAX_SLUG_SUFFIX; attempt += 1) {
        const id = slugCandidate(base, attempt);
        if (existsSync(path.join(root, id)) || (await registry.get(id))) continue;
        const staged = await writeStaged(root, { ...files, manifest: { ...files.manifest, id } });
        try {
          await rename(staged, path.join(root, id));
          return await loaded(id);
        } catch (error) {
          await rm(staged, { recursive: true, force: true });
          if (isTaken(error)) continue;
          throw error;
        }
      }
      throw new BadRequestError(`too many design systems named ${input.name}`);
    });

  const replace = (id: string, input: CreateUserPackInput): Promise<LoadedPack> =>
    lock('library', async () => {
      const root = userDir();
      const files = buildPackFiles(id, input);
      const target = path.join(root, id);
      const staged = await writeStaged(root, files);
      const old = path.join(root, tempName('old'));
      try {
        await rename(target, old);
      } catch (error) {
        await rm(staged, { recursive: true, force: true });
        throw error;
      }
      try {
        await rename(staged, target);
      } catch (error) {
        await rename(old, target).catch(() => undefined);
        await rm(staged, { recursive: true, force: true });
        throw error;
      }
      await rm(old, { recursive: true, force: true });
      return loaded(id);
    });

  return {
    registry,

    async detail(id) {
      const pack = await requirePack(id);
      return { summary: pack.summary, tokensJson: pack.tokensText, designMd: pack.designMd };
    },

    async createUserPack(raw) {
      return create(parseFields(raw, 'design system'));
    },

    async updateUserPack(id, raw) {
      const current = await requireUserPack(id);
      if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new BadRequestError('body must be a JSON object');
      const given = Object.fromEntries(Object.entries(raw as UpdateUserPackInput).filter(([, value]) => value !== undefined));
      const patch = parseFields({ ...inputOf(current), ...given }, 'design system');
      return replace(id, patch);
    },

    async duplicatePack(id, name) {
      const source = await requirePack(id);
      const copyName = name?.trim() || `${source.manifest.name.slice(0, NAME_MAX - COPY_SUFFIX.length)}${COPY_SUFFIX}`;
      return create(parseFields({ ...inputOf(source), name: copyName, draft: false }, 'design system'));
    },

    async renamePack(id, name) {
      return this.updateUserPack(id, { name });
    },

    async deletePack(id) {
      await requireUserPack(id);
      await lock('library', async () => {
        const root = userDir();
        const trash = path.join(root, tempName('trash'));
        await rename(path.join(root, id), trash);
        registry.invalidate();
        await rm(trash, { recursive: true, force: true });
      });
    },

    async exportPack(id) {
      const pack = await requirePack(id);
      const names = ['pack.json', 'tokens.json', DESIGN_MD_FILE];
      const entries = await Promise.all(names.map(async (name) => ({ name: `${id}/${name}`, data: await readFile(path.join(pack.dir, name)) })));
      return { fileName: `${id}.zip`, bytes: zipFiles(entries) };
    },
  };
}
