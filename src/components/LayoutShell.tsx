import React, { useState } from 'react';
import { Text } from '@consta/uikit/Text';
import { Button } from '@consta/uikit/Button';
import { ChoiceGroup } from '@consta/uikit/ChoiceGroup';
import { IconRing } from '@consta/icons/IconRing';
import { IconAreaChart } from '@consta/icons/IconAreaChart';
import { IconUser } from '@consta/icons/IconUser';
import { IconDocFilled } from '@consta/icons/IconDocFilled';
import { IconCheck } from '@consta/icons/IconCheck';
import { IconSettings } from '@consta/icons/IconSettings';
import { IconMoon } from '@consta/icons/IconMoon';
import { IconSun } from '@consta/icons/IconSun';
import { IconLightningBolt } from '@consta/icons/IconLightningBolt';
import { IconHamburger } from '@consta/icons/IconHamburger';
import { IconClose } from '@consta/icons/IconClose';
import { IconArrowLeft } from '@consta/icons/IconArrowLeft';
import { IconArrowRight } from '@consta/icons/IconArrowRight';
import styles from './LayoutShell.module.css';

type ViewMode = 'graph' | 'stats' | 'experts' | 'initiatives' | 'employee-tasks' | 'admin';
type ThemeMode = 'light' | 'dark' | 'cyberpunk';

interface LayoutShellProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  headerTitle: string;
  headerDescription?: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  themeMode: ThemeMode;
  onSetThemeMode: (mode: ThemeMode) => void;
}

const MENU_ITEMS: Array<{
  id: ViewMode;
  label: string;
  icon: React.ElementType;
}> = [
  { id: 'graph', label: 'Граф', icon: IconRing },
  { id: 'stats', label: 'Статистика', icon: IconAreaChart },
  { id: 'experts', label: 'Экспертиза', icon: IconUser },
  { id: 'initiatives', label: 'Инициативы', icon: IconDocFilled },
  { id: 'employee-tasks', label: 'Задачи', icon: IconCheck },
  { id: 'admin', label: 'Администрирование', icon: IconSettings },
];

const THEME_OPTIONS = [
  { label: 'Светлая', id: 'light', icon: IconSun },
  { label: 'Темная', id: 'dark', icon: IconMoon },
  { label: 'Киберпанк', id: 'cyberpunk', icon: IconLightningBolt },
];

export const LayoutShell: React.FC<LayoutShellProps> = ({
  currentView,
  onViewChange,
  headerTitle,
  headerDescription,
  headerActions,
  children,
  themeMode,
  onSetThemeMode,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleViewChange = (view: ViewMode) => {
    onViewChange(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className={styles.root}>
      <aside className={`${styles.sidebar} ${isMobileMenuOpen ? styles.sidebarOpen : ''} ${isCollapsed ? styles.sidebarCollapsed : ''}`}>
        <div className={styles.sidebarHeader}>
          {!isCollapsed && (
            <Text size="l" weight="bold" view="brand" className={styles.logoText}>
              Nedra.Expert Node
            </Text>
          )}
          <Button 
             className={styles.collapseButton}
             view="clear"
             size="s"
             onlyIcon
             iconLeft={isCollapsed ? IconArrowRight : IconArrowLeft}
             onClick={() => setIsCollapsed(!isCollapsed)}
          />
          <button 
            className={styles.mobileCloseButton}
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Закрыть меню"
          >
             <IconClose size="s" />
          </button>
        </div>
        
        <nav className={styles.sidebarContent}>
          {MENU_ITEMS.map((item) => {
            const isActive = currentView === item.id;
            return (
              <Button
                key={item.id}
                view={isActive ? 'primary' : 'ghost'}
                size="m"
                width="full"
                iconLeft={item.icon}
                label={!isCollapsed ? item.label : undefined}
                onlyIcon={isCollapsed}
                className={styles.menuButton}
                onClick={() => handleViewChange(item.id)}
              />
            );
          })}
        </nav>
        
        {!isCollapsed && (
          <div className={styles.sidebarFooter}>
             <div className={styles.themeRow}>
               <Text size="xs" view="secondary">Тема</Text>
               <ChoiceGroup
                  size="xs"
                  items={THEME_OPTIONS}
                  value={THEME_OPTIONS.find(t => t.id === themeMode)}
                  getItemLabel={(item) => item.label}
                  onChange={(item) => {
                    if (item) onSetThemeMode(item.id as ThemeMode);
                  }}
                  multiple={false}
                  name="ThemeSelector"
                  view="ghost"
               />
             </div>
            <Text size="xs" view="secondary">
              v0.1.0
            </Text>
          </div>
        )}
      </aside>

      {isMobileMenuOpen && (
        <div className={styles.overlay} onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <div className={styles.mainContent}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button 
              className={styles.mobileMenuButton}
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Открыть меню"
            >
              <IconHamburger size="s" />
            </button>
            <div className={styles.headerTitle}>
              <Text size="xl" weight="bold">
                {headerTitle}
              </Text>
              {headerDescription && (
                <Text size="xs" view="secondary" className={styles.headerDescription}>
                  {headerDescription}
                </Text>
              )}
            </div>
          </div>
          <div className={styles.headerActions}>
            {headerActions}
          </div>
        </header>
        
        <main className={styles.pageContent}>
          {children}
        </main>
      </div>
    </div>
  );
};
