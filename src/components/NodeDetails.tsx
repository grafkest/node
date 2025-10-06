import { Badge } from '@consta/uikit/Badge';
import { Button } from '@consta/uikit/Button';
import { Tag } from '@consta/uikit/Tag';
import { Text } from '@consta/uikit/Text';
import React from 'react';
import type { GraphNode } from './GraphView';
import styles from './NodeDetails.module.css';

type NodeDetailsProps = {
  node: GraphNode | null;
  onClose: () => void;
};

const statusBadgeView: Record<string, 'success' | 'warning' | 'alert' | 'normal'> = {
  production: 'success',
  'in-dev': 'warning',
  deprecated: 'alert'
};

const NodeDetails: React.FC<NodeDetailsProps> = ({ node, onClose }) => {
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
            <Tag key={domain} label={domain} size="xs" />
          ))}
        </div>
      </div>
      <div className={styles.section}>
        <Text size="s" weight="semibold">
          Команда
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

export default NodeDetails;
