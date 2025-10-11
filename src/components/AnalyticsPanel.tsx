import { Bar, BarProps } from '@consta/charts/Bar';
import { Card } from '@consta/uikit/Card';
import { Text } from '@consta/uikit/Text';
import React, { useMemo } from 'react';
import type { ModuleNode } from '../data';
import styles from './AnalyticsPanel.module.css';

type AnalyticsPanelProps = {
  modules: ModuleNode[];
  domainNameMap: Record<string, string>;
};

const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ modules, domainNameMap }) => {
  const data = useMemo(() => {
    const totals = modules.reduce<Record<string, { count: number; label: string }>>((acc, module) => {
      module.domains.forEach((domainId) => {
        const label = domainNameMap[domainId] ?? domainId;
        const current = acc[domainId] ?? { count: 0, label };
        acc[domainId] = {
          label,
          count: current.count + 1
        };
      });
      return acc;
    }, {});

    return Object.entries(totals)
      .map(([domainId, value]) => ({
        domainId,
        domainLabel: value.label,
        count: value.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [domainNameMap, modules]);

  const chartProps: BarProps = {
    data,
    xField: 'count',
    yField: 'domainLabel',
    legend: false,
    height: 220,
    autoFit: true,
    seriesField: 'domainLabel'
  };

  const coverage = average(modules.map((module) => module.metrics.coverage ?? 0));
  const reuse = average(modules.map((module) => Math.round(module.reuseScore * 100)));

  return (
    <div className={styles.container}>
      <Card verticalSpace="l" horizontalSpace="l" shadow={false} className={styles.card}>
        <Text size="s" weight="semibold">
          Среднее покрытие тестами
        </Text>
        <Text size="3xl" weight="bold">
          {Math.round(coverage)}%
        </Text>
      </Card>
      <Card verticalSpace="l" horizontalSpace="l" shadow={false} className={styles.card}>
        <Text size="s" weight="semibold">
          Средний индекс переиспользуемости
        </Text>
        <Text size="3xl" weight="bold">
          {Math.round(reuse)}%
        </Text>
      </Card>
      <Card verticalSpace="l" horizontalSpace="l" shadow={false} className={styles.chartCard}>
        <Text size="s" weight="semibold" className={styles.chartTitle}>
          Модули по доменам (топ-6)
        </Text>
        <Bar {...chartProps} />
      </Card>
    </div>
  );
};

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export default AnalyticsPanel;
