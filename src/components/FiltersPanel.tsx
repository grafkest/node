import { Badge } from '@consta/uikit/Badge';
import { Button } from '@consta/uikit/Button';
import { Select } from '@consta/uikit/Select';
import { Switch } from '@consta/uikit/Switch';
import { Text } from '@consta/uikit/Text';
import React from 'react';
import type { ModuleStatus } from '../data';
import styles from './FiltersPanel.module.css';

type FiltersPanelProps = {
  search: string;
  onSearchChange: (value: string) => void;
  statuses: ModuleStatus[];
  activeStatuses: Set<ModuleStatus>;
  onToggleStatus: (status: ModuleStatus) => void;
  teams: string[];
  teamFilter: string | null;
  onTeamChange: (team: string | null) => void;
  showDependencies: boolean;
  onToggleDependencies: (value: boolean) => void;
};

const statusLabels: Record<ModuleStatus, string> = {
  'in-dev': 'В разработке',
  production: 'В эксплуатации',
  deprecated: 'Устаревший'
};

const FiltersPanel: React.FC<FiltersPanelProps> = ({
  search,
  onSearchChange,
  statuses,
  activeStatuses,
  onToggleStatus,
  teams,
  teamFilter,
  onTeamChange,
  showDependencies,
  onToggleDependencies
}) => {
  return (
    <div className={styles.filters}>
      <label className={styles.field}>
        <Text size="s" weight="semibold">
          Поиск
        </Text>
        <input
          className={styles.input}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Введите название или владельца"
        />
      </label>

      <div className={styles.field}>
        <Text size="s" weight="semibold">
          Статусы
        </Text>
        <div className={styles.badgeList}>
          {statuses.map((status) => {
            const isActive = activeStatuses.has(status);
            return (
              <Badge
                key={status}
                label={statusLabels[status]}
                size="s"
                status={isActive ? 'system' : 'normal'}
                view={isActive ? 'filled' : 'stroked'}
                interactive
                onClick={() => onToggleStatus(status)}
              />
            );
          })}
        </div>
      </div>

      <div className={styles.field}>
        <Text size="s" weight="semibold">
          Название продукта
        </Text>
        <Select
          placeholder="Все продукты"
          size="s"
          items={teams}
          value={teamFilter}
          getItemKey={(item) => item}
          getItemLabel={(item) => item}
          onChange={({ value }) => onTeamChange(value ?? null)}
          form="default"
          className={styles.combobox}
        />
      </div>

      <div className={styles.switchRow}>
        <Switch
          checked={showDependencies}
          onChange={({ checked }) => onToggleDependencies(checked)}
          label="Показывать зависимости между модулями"
          size="s"
        />
        <Button
          size="s"
          view="secondary"
          label="Сбросить фильтры"
          onClick={() => {
            onSearchChange('');
            onTeamChange(null);
            statuses.forEach((status) => {
              if (!activeStatuses.has(status)) {
                onToggleStatus(status);
              }
            });
          }}
        />
      </div>
    </div>
  );
};

export default FiltersPanel;
