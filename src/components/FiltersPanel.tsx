import { Button } from '@consta/uikit/Button';
import { Checkbox } from '@consta/uikit/Checkbox';
import { CheckboxGroup } from '@consta/uikit/CheckboxGroup';
import { Combobox } from '@consta/uikit/Combobox';
import { Switch } from '@consta/uikit/Switch';
import { Text } from '@consta/uikit/Text';
import clsx from 'clsx';
import React from 'react';
import type { ComboboxPropRenderItem } from '@consta/uikit/Combobox';
import type { ModuleStatus } from '../data';
import styles from './FiltersPanel.module.css';

type FiltersPanelProps = {
  search: string;
  onSearchChange: (value: string) => void;
  statuses: ModuleStatus[];
  activeStatuses: Set<ModuleStatus>;
  onToggleStatus: (status: ModuleStatus) => void;
  products: string[];
  productFilter: string[];
  onProductChange: (products: string[]) => void;
  companies: string[];
  companyFilter: string | null;
  onCompanyChange: (company: string | null) => void;
  showAllConnections: boolean;
  onToggleConnections: (value: boolean) => void;
};

const statusLabels: Record<ModuleStatus, string> = {
  'in-dev': 'В разработке',
  production: 'В эксплуатации',
  deprecated: 'Устаревший'
};

type StatusOption = {
  id: ModuleStatus;
  label: string;
};

const FiltersPanel: React.FC<FiltersPanelProps> = ({
  search,
  onSearchChange,
  statuses,
  activeStatuses,
  onToggleStatus,
  products,
  productFilter,
  onProductChange,
  companies,
  companyFilter,
  onCompanyChange,
  showAllConnections,
  onToggleConnections
}) => {
  const statusOptions = React.useMemo(
    () =>
      statuses.map<StatusOption>((status) => ({
        id: status,
        label: statusLabels[status]
      })),
    [statuses]
  );

  const selectedStatusOptions = React.useMemo(
    () => statusOptions.filter((option) => activeStatuses.has(option.id)),
    [statusOptions, activeStatuses]
  );

  const renderProductOption = React.useCallback<ComboboxPropRenderItem<string>>(
    ({ item, active, hovered, onClick, onMouseEnter, ref }) => (
      <div
        ref={ref}
        className={clsx(styles.comboboxOption, {
          [styles.comboboxOptionHovered]: hovered,
          [styles.comboboxOptionActive]: active
        })}
        onMouseEnter={onMouseEnter}
        onClick={(event) => {
          onClick(event);
        }}
      >
        <Checkbox
          size="s"
          readOnly
          checked={productFilter.includes(item)}
          label={item}
          className={styles.comboboxCheckbox}
        />
      </div>
    ),
    [productFilter]
  );

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
        <CheckboxGroup
          size="s"
          direction="column"
          items={statusOptions}
          value={selectedStatusOptions}
          getItemKey={(item) => item.id}
          getItemLabel={(item) => item.label}
          onChange={(nextItems) => {
            const nextSelected = new Set(
              (nextItems ?? []).map((item) => item.id)
            );
            statuses.forEach((status) => {
              const shouldBeActive = nextSelected.has(status);
              const isActive = activeStatuses.has(status);
              if (shouldBeActive !== isActive) {
                onToggleStatus(status);
              }
            });
          }}
          className={styles.statusGroup}
        />
      </div>

      <div className={styles.field}>
        <Text size="s" weight="semibold">
          Название продукта
        </Text>
        <Combobox
          placeholder="Все продукты"
          size="s"
          items={products}
          value={productFilter}
          getItemKey={(item) => item}
          getItemLabel={(item) => item}
          onChange={(value) => onProductChange(value ?? [])}
          form="default"
          multiple
          selectAll
          renderItem={renderProductOption}
          className={styles.combobox}
        />
      </div>

      <div className={styles.field}>
        <Text size="s" weight="semibold">
          Компания
        </Text>
        <Combobox
          placeholder="Все компании"
          size="s"
          items={companies}
          value={companyFilter}
          getItemKey={(item) => item}
          getItemLabel={(item) => item}
          onChange={(value) => onCompanyChange(value ?? null)}
          form="default"
          className={styles.combobox}
        />
      </div>

      <div className={styles.switchRow}>
        <Switch
          checked={showAllConnections}
          onChange={({ target }) => onToggleConnections(target.checked)}
          label="Показывать связи между продуктами"
          size="s"
        />
        <Button
          size="s"
          view="secondary"
          label="Сбросить фильтры"
          onClick={() => {
            onSearchChange('');
            onProductChange(products);
            onCompanyChange(null);
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
