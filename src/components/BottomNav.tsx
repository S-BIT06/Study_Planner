import type { AppTab } from '../types';

const items: { tab: AppTab; label: string; symbol: string }[] = [
  { tab: 'home', label: 'Home', symbol: '⌂' },
  { tab: 'syllabus', label: 'Syllabus', symbol: '▤' },
  { tab: 'planner', label: 'Planner', symbol: '◇' },
  { tab: 'progress', label: 'Progress', symbol: '◉' },
  { tab: 'profile', label: 'Profile', symbol: '♙' }
];

export function BottomNav({ active, onChange }: { active: AppTab; onChange: (tab: AppTab) => void }) {
  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      {items.map((item) => (
        <button
          key={item.tab}
          type="button"
          className={active === item.tab ? 'is-active' : ''}
          onClick={() => onChange(item.tab)}
          aria-current={active === item.tab ? 'page' : undefined}
        >
          <span className="bottom-nav__icon">{item.symbol}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
