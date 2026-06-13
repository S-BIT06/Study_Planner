export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand-mark ${compact ? 'brand-mark--compact' : ''}`} aria-label="Study Planner">
      <div className="brand-sigil" aria-hidden="true">
        <span className="brand-sigil__diamond" />
        <span className="brand-sigil__core" />
      </div>
      {!compact && (
        <div>
          <strong>Study Planner</strong>
          <small>NCISM learning system</small>
        </div>
      )}
    </div>
  );
}
