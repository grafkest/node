import { Badge } from '@consta/uikit/Badge';
import { Button } from '@consta/uikit/Button';
import { Select } from '@consta/uikit/Select';
import { Tag } from '@consta/uikit/Tag';
import { Text } from '@consta/uikit/Text';
import React, { useState } from 'react';
import { artifactNameById, domainNameById, moduleNameById, type ModuleInput, type ModuleOutput } from '../data';
import type { GraphNode } from './GraphView';
import styles from './NodeDetails.module.css';

type NodeDetailsProps = {
  node: GraphNode | null;
  onClose: () => void;
  onNavigate: (nodeId: string) => void;
};

const statusBadgeView: Record<string, 'success' | 'warning' | 'alert' | 'normal'> = {
  production: 'success',
  'in-dev': 'warning',
  deprecated: 'alert'
};

type ConsumerOption = {
  id: string;
  label: string;
};

const NodeDetails: React.FC<NodeDetailsProps> = ({ node, onClose, onNavigate }) => {
  if (!node) {
    return (
      <div className={styles.empty}>
        <Text size="s" view="secondary">
          Выберите узел, чтобы увидеть подробности
        </Text>
      </div>
    );
  }

  if (node.type === 'domain') {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <Text size="l" weight="bold">
            {node.name}
          </Text>
          <Button size="xs" label="Закрыть" view="ghost" onClick={onClose} />
        </header>
        <Text size="s" view="secondary">
          {node.description}
        </Text>
      </div>
    );
  }

  if (node.type === 'artifact') {
    const producerLabel = moduleNameById[node.producedBy] ?? node.producedBy;
    const consumerLabels = node.consumerIds.map((consumerId) => ({
      id: consumerId,
      label: moduleNameById[consumerId] ?? consumerId
    }));

    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <Text size="l" weight="bold">
            {node.name}
          </Text>
          <Button size="xs" label="Закрыть" view="ghost" onClick={onClose} />
        </header>

        <div className={styles.section}>
          <Text size="s" weight="semibold">
            Описание
          </Text>
          <Text size="s" view="secondary">
            {node.description}
          </Text>
        </div>

        <div className={styles.section}>
          <Text size="s" weight="semibold">
            Доменная область
          </Text>
          <div className={styles.tagList}>
            <Tag label={domainNameById[node.domainId] ?? node.domainId} size="xs" />
          </div>
        </div>

        <div className={styles.section}>
          <Text size="s" weight="semibold">
            Модуль-источник
          </Text>
          <a
            href="#"
            className={styles.link}
            onClick={(event) => {
              event.preventDefault();
              onNavigate(node.producedBy);
            }}
          >
            {producerLabel}
          </a>
        </div>

        <div className={styles.section}>
          <Text size="s" weight="semibold">
            Модули-потребители
          </Text>
          {consumerLabels.length > 0 ? (
            <div className={styles.tagList}>
              {consumerLabels.map((consumer) => (
                <a
                  key={consumer.id}
                  href="#"
                  className={styles.link}
                  onClick={(event) => {
                    event.preventDefault();
                    onNavigate(consumer.id);
                  }}
                >
                  {consumer.label}
                </a>
              ))}
            </div>
          ) : (
            <Text size="xs" view="secondary">
              Потребители отсутствуют
            </Text>
          )}
        </div>

        <div className={styles.section}>
          <Text size="s" weight="semibold">
            Тип данных
          </Text>
          <Text size="s">{node.dataType}</Text>
        </div>

        <div className={styles.section}>
          <Text size="s" weight="semibold">
            Пример данных
          </Text>
          <a href={node.sampleUrl} className={styles.link} target="_blank" rel="noreferrer">
            {node.sampleUrl}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <Text size="l" weight="bold">
            {node.name}
          </Text>
          <Badge label={statusLabel(node.status)} status={statusBadgeView[node.status]} size="s" />
        </div>
        <Button size="xs" label="Закрыть" view="ghost" onClick={onClose} />
      </header>
      <Text size="s" className={styles.description}>
        {node.description}
      </Text>
      <div className={styles.section}>
        <Text size="s" weight="semibold">
          Доменные области
        </Text>
        <div className={styles.tagList}>
          {node.domains.map((domain) => (
            <Tag key={domain} label={domainNameById[domain] ?? domain} size="xs" />
          ))}
        </div>
      </div>
      <div className={styles.section}>
        <Text size="s" weight="semibold">
          Название продукта
        </Text>
        <Text size="s">{node.team}</Text>
        <Text size="xs" view="secondary">
          {node.owner}
        </Text>
      </div>
      {node.repository && (
        <div className={styles.section}>
          <Text size="s" weight="semibold">
            Репозиторий
          </Text>
          <a href={node.repository} target="_blank" rel="noreferrer" className={styles.link}>
            {node.repository}
          </a>
        </div>
      )}
      {node.api && (
        <div className={styles.section}>
          <Text size="s" weight="semibold">
            API
          </Text>
          <Text size="s" className={styles.code}>
            {node.api}
          </Text>
        </div>
      )}
      <ModuleIoSection
        title="Данные In"
        items={node.dataIn}
        onNavigate={onNavigate}
      />
      <ModuleOutputSection items={node.dataOut} onNavigate={onNavigate} />
      <div className={styles.section}>
        <Text size="s" weight="semibold">
          Формула расчёта
        </Text>
        <Text size="s" className={styles.code}>
          {node.formula}
        </Text>
      </div>
      <div className={styles.metrics}>
        <div>
          <Text size="xs" view="secondary">
            Покрытие тестами
          </Text>
          <Text size="m" weight="semibold">
            {node.metrics.coverage}%
          </Text>
        </div>
        <div>
          <Text size="xs" view="secondary">
            Количество тестов
          </Text>
          <Text size="m" weight="semibold">
            {node.metrics.tests}
          </Text>
        </div>
        <div>
          <Text size="xs" view="secondary">
            Задержка API
          </Text>
          <Text size="m" weight="semibold">
            {node.metrics.latencyMs} мс
          </Text>
        </div>
      </div>
    </div>
  );
};

function statusLabel(status: GraphNode & { type: 'module' }['status']) {
  switch (status) {
    case 'production':
      return 'В эксплуатации';
    case 'in-dev':
      return 'В разработке';
    case 'deprecated':
      return 'Устаревший';
    default:
      return status;
  }
}

function resolveEntityName(id: string): string {
  return moduleNameById[id] ?? artifactNameById[id] ?? domainNameById[id] ?? id;
}

type ModuleIoSectionProps = {
  title: string;
  items: ModuleInput[];
  onNavigate: (nodeId: string) => void;
};

const ModuleIoSection: React.FC<ModuleIoSectionProps> = ({ title, items, onNavigate }) => {
  if (!items.length) {
    return null;
  }

  return (
    <div className={styles.section}>
      <Text size="s" weight="semibold">
        {title}
      </Text>
      <ul className={styles.ioList}>
        {items.map((item) => {
          const hasSource = Boolean(item.sourceId);
          const sourceLabel = item.sourceId ? resolveEntityName(item.sourceId) : null;

          return (
            <li key={item.id} className={styles.ioItem}>
              <Text size="s" weight="semibold">
                {item.label}
              </Text>
              {hasSource ? (
                <a
                  href="#"
                  className={styles.link}
                  onClick={(event) => {
                    event.preventDefault();
                    if (item.sourceId) {
                      onNavigate(item.sourceId);
                    }
                  }}
                >
                  {sourceLabel}
                </a>
              ) : (
                <Text size="xs" view="secondary">
                  Источник вне графа
                </Text>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

type ModuleOutputSectionProps = {
  items: ModuleOutput[];
  onNavigate: (nodeId: string) => void;
};

const ModuleOutputSection: React.FC<ModuleOutputSectionProps> = ({
  items,
  onNavigate
}) => {
  if (!items.length) {
    return null;
  }

  return (
    <div className={styles.section}>
      <Text size="s" weight="semibold">
        Данные Out
      </Text>
      <ul className={styles.ioList}>
        {items.map((item) => {
          const consumerOptions: ConsumerOption[] = (item.consumerIds ?? []).map((consumerId) => ({
            id: consumerId,
            label: resolveEntityName(consumerId)
          }));

          return (
            <li key={item.id} className={styles.ioItem}>
              <Text size="s" weight="semibold">
                {item.label}
              </Text>
              {consumerOptions.length > 0 ? (
                <ConsumerSelect
                  options={consumerOptions}
                  onNavigate={onNavigate}
                  placeholder="Перейти к потребителю"
                />
              ) : (
                <Text size="xs" view="secondary">
                  Потребители отсутствуют
                </Text>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

type ConsumerSelectProps = {
  options: ConsumerOption[];
  placeholder: string;
  onNavigate: (nodeId: string) => void;
};

const ConsumerSelect: React.FC<ConsumerSelectProps> = ({ options, placeholder, onNavigate }) => {
  const [value, setValue] = useState<ConsumerOption | null>(null);

  return (
    <Select<ConsumerOption>
      size="xs"
      placeholder={placeholder}
      items={options}
      value={value}
      getItemLabel={(option) => option.label}
      getItemKey={(option) => option.id}
      onChange={({ value: nextValue }) => {
        setValue(nextValue ?? null);

        if (!nextValue) {
          return;
        }

        const runNavigation = () => {
          onNavigate(nextValue.id);
          setValue(null);
        };

        if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
          window.requestAnimationFrame(runNavigation);
        } else {
          setTimeout(runNavigation, 0);
        }
      }}
    />
  );
};

export default NodeDetails;
