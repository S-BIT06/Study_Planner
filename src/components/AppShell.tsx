import type { ReactNode } from 'react';
import type { AppTab } from '../types';
import { BottomNav } from './BottomNav';
import { BrandMark } from './BrandMark';

export function AppShell({
  activeTab,
  onTabChange,
  title,
  eyebrow,
  children
}: {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <div className="app-frame">
      <header className="app-header">
        <BrandMark compact />
        <div className="app-header__title">
          {eyebrow && <span>{eyebrow}</span>}
          <h1>{title}</h1>
        </div>
        <button className="icon-button" type="button" aria-label="Notifications">✦</button>
      </header>
      <main className="app-main">{children}</main>
      <BottomNav active={activeTab} onChange={onTabChange} />
    </div>
  );
}
