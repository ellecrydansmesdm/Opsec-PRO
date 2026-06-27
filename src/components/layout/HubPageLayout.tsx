import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface HubTab {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface HubPageLayoutProps {
  title: string;
  titleAccent?: string;
  description: string;
  tabs: HubTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  headerAction?: React.ReactNode;
  beforeContent?: React.ReactNode;
  tabVariant?: 'default' | 'danger';
  children: React.ReactNode;
}

export const HubPageLayout = ({
  title,
  titleAccent = 'Hub',
  description,
  tabs,
  activeTab,
  onTabChange,
  headerAction,
  beforeContent,
  tabVariant = 'default',
  children,
}: HubPageLayoutProps) => (
  <div className="animate-fade-in custom-scrollbar hub-page">
    <div className="hub-page-header">
      <div className="hub-page-header-top">
        <h1 className="hub-page-title">
          {title}{' '}
          <span className={`hub-page-title-accent ${tabVariant === 'danger' ? 'hub-page-title-accent--danger' : ''}`}>
            {titleAccent}
          </span>
        </h1>
        <p className="hub-page-desc">{description}</p>
      </div>

      <div className={`hub-tab-bar hub-tab-bar--header ${tabVariant === 'danger' ? 'hub-tab-bar--danger' : ''}`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`settings-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>
    </div>

    {beforeContent}

    <div className="hub-page-content">{children}</div>
  </div>
);

/** Keeps sub-tab panels mounted so running modules retain UI state */
export const HubSubTabKeepAlive = ({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) => (
  <div
    style={{
      display: active ? 'block' : 'none',
      height: active ? 'auto' : 0,
      overflow: active ? 'visible' : 'hidden',
    }}
    aria-hidden={!active}
  >
    {children}
  </div>
);

export const HubSectionCard = ({
  icon: Icon,
  iconColor = 'var(--accent)',
  glowColor,
  title,
  children,
  className = '',
}: {
  icon: LucideIcon;
  iconColor?: string;
  glowColor?: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) => {
  const glow = glowColor || iconColor;
  return (
    <div
      className={`glass-card hub-section-card hub-section-glow ${className}`}
      style={{ '--hub-glow': glow } as React.CSSProperties}
    >
      <h3 className="hub-section-title">
        <span className="hub-section-icon-glow">
          <Icon size={22} color={iconColor} />
        </span>
        <span>{title}</span>
      </h3>
      {children}
    </div>
  );
};

export const HubToggleRow = ({
  title,
  description,
  active,
  onToggle,
  accent,
}: {
  title: string;
  description?: string;
  active: boolean;
  onToggle: () => void;
  accent?: string;
}) => (
  <div className="settings-item-row hub-toggle-row">
    <div className="hub-toggle-row-text">
      <p className="hub-toggle-row-title">{title}</p>
      {description && <p className="hub-toggle-row-desc">{description}</p>}
    </div>
    <div
      onClick={onToggle}
      className={`nighty-toggle ${active ? 'active' : ''}`}
      style={accent ? ({ '--accent': accent } as React.CSSProperties) : undefined}
    >
      <div className="nighty-toggle-handle" />
    </div>
  </div>
);

export const HubFieldRow = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div className="settings-item-row hub-field-row">
    <label className="caption hub-field-label">{label}</label>
    {hint && <p className="hub-field-hint">{hint}</p>}
    {children}
  </div>
);
