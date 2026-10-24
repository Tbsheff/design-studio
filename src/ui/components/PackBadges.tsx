import type { PackSummary } from '../../shared/contracts';

const PROVENANCE: Record<PackSummary['provenance'], string> = {
  original: 'Made here',
  imported: 'Imported',
  extracted: 'From sources',
};

export function PackBadges({ pack, tags = 0 }: { pack: PackSummary; tags?: number }) {
  return (
    <span className="lib-badges">
      <span className="badge">{pack.mode === 'dark' ? 'Dark' : 'Light'}</span>
      {pack.source === 'user' ? <span className="badge accent">{PROVENANCE[pack.provenance]}</span> : <span className="badge">Built-in</span>}
      {pack.draft && <span className="badge warn">Draft</span>}
      {pack.tags.slice(0, tags).map((tag) => (
        <span key={tag} className="lib-tag">
          {tag}
        </span>
      ))}
    </span>
  );
}
