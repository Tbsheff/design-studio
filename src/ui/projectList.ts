import type { Project } from '../shared/contracts';
import type { HomeSort } from './storage';

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

export function sortProjects(list: readonly Project[], sort: HomeSort): Project[] {
  const copy = [...list];
  if (sort === 'name') return copy.sort((a, b) => collator.compare(a.name, b.name) || b.updatedAt - a.updatedAt);
  if (sort === 'created') return copy.sort((a, b) => b.createdAt - a.createdAt);
  return copy.sort((a, b) => b.updatedAt - a.updatedAt);
}

function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

export function filterProjects(list: readonly Project[], query: string): Project[] {
  const terms = fold(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [...list];
  return list.filter((project) => {
    const haystack = fold(`${project.name} ${project.imported?.sourcePath ?? ''}`);
    return terms.every((term) => haystack.includes(term));
  });
}

export function thumbnailPending(project: Project): boolean {
  const main = project.directions.find((direction) => direction.id === 'main') ?? project.directions[0];
  const head = main?.headVersionId ?? null;
  return head !== null && project.thumbnail?.versionId !== head;
}

export function gridColumns(grid: HTMLElement | null): number {
  if (!grid) return 1;
  const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').filter((part) => part.trim() !== '').length;
  return Math.max(1, columns);
}

export function nextGridIndex(key: string, index: number, count: number, columns: number): number | null {
  if (count === 0) return null;
  const clamp = (value: number) => Math.min(count - 1, Math.max(0, value));
  if (key === 'ArrowRight') return clamp(index + 1);
  if (key === 'ArrowLeft') return clamp(index - 1);
  if (key === 'ArrowDown') return index + columns < count ? index + columns : index;
  if (key === 'ArrowUp') return index - columns >= 0 ? index - columns : index;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return null;
}
