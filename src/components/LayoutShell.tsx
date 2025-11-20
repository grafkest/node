import React, { useState } from 'react';
import { Text } from '@consta/uikit/Text';
import { Button } from '@consta/uikit/Button';
import { IconRing } from '@consta/icons/IconRing';
import { IconAreaChart } from '@consta/icons/IconAreaChart';
import { IconUser } from '@consta/icons/IconUser';
import { IconDocFilled } from '@consta/icons/IconDocFilled';
import { IconCheck } from '@consta/icons/IconCheck';
import { IconSettings } from '@consta/icons/IconSettings';
import { IconMoon } from '@consta/icons/IconMoon';
import { IconSun } from '@consta/icons/IconSun';
import { IconHamburger } from '@consta/icons/IconHamburger';
import { IconClose } from '@consta/icons/IconClose';
import { Switch } from '@consta/uikit/Switch';
import styles from './LayoutShell.module.css';

type ViewMode = 'graph' | 'stats' | 'experts' | 'initiatives' | 'employee-tasks' | 'admin';

interface LayoutShellProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  headerTitle: string;
  headerDescription?: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  isDarkTheme: boolean;
  onToggleTheme: (isDark: boolean) => void;
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

export const LayoutShell: React.FC<LayoutShellProps> = ({
  currentView,
  onViewChange,
  headerTitle,
  headerDescription,
  headerActions,
  children,
  isDarkTheme,
  onToggleTheme,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleViewChange = (view: ViewMode) => {
    onViewChange(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className={styles.root}>
      <aside className={`${styles.sidebar} ${isMobileMenuOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <Text size="l" weight="bold" view="brand">
            Domain Graph
          </Text>
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
            const Icon = item.icon;
            
            return (
              <div
                key={item.id}
                className={`${styles.menuItem} ${isActive ? styles.menuItemActive : ''}`}
                onClick={() => handleViewChange(item.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleViewChange(item.id);
                  }
                }}
              >
                <Icon size="s" view={isActive ? 'brand' : 'primary'} />
                <Text size="s" view={isActive ? 'brand' : 'primary'} weight={isActive ? 'bold' : 'regular'}>
                  {item.label}
                </Text>
              </div>
            );
          })}
        </nav>
        
        <div className={styles.sidebarFooter}>
           <div className={styles.themeRow}>
             <Text size="xs" view="secondary">Тема</Text>
             <Switch
                size="s"
                checked={isDarkTheme}
                onChange={(e) => onToggleTheme(e.target.checked)}
                label={isDarkTheme ? 'Темная' : 'Светлая'}
             />
           </div>
          <Text size="xs" view="secondary">
            v0.1.0
          </Text>
        </div>
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
