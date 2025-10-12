import { Badge } from '@consta/uikit/Badge';
import { Button } from '@consta/uikit/Button';
import { CheckboxGroup } from '@consta/uikit/CheckboxGroup';
import { Select } from '@consta/uikit/Select';
import { Text } from '@consta/uikit/Text';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ArtifactNode, DomainNode, ModuleNode } from '../data';
import { normalizeLayoutSnapshot } from '../services/graphStorage';
import {
  GRAPH_SNAPSHOT_VERSION,
  type GraphLayoutSnapshot,
  type GraphSnapshotPayload,
  type GraphSummary,
  type GraphSyncStatus
} from '../types/graph';
import styles from './GraphPersistenceControls.module.css';

type StatusMessage =
  | { type: 'success'; message: string }
  | { type: 'error'; message: string };

type GraphPersistenceControlsProps = {
  modules: ModuleNode[];
  domains: DomainNode[];
  artifacts: ArtifactNode[];
  onImport: (snapshot: GraphSnapshotPayload) => void;
  onImportFromGraph?: (request: {
    graphId: string;
    includeDomains: boolean;
    includeModules: boolean;
    includeArtifacts: boolean;
  }) => Promise<{ domains: number; modules: number; artifacts: number }>;
  graphs?: GraphSummary[];
  activeGraphId?: string | null;
  isGraphListLoading?: boolean;
  syncStatus?: GraphSyncStatus | null;
  layout?: GraphLayoutSnapshot;
};

const GraphPersistenceControls: React.FC<GraphPersistenceControlsProps> = ({
  modules,
  domains,
  artifacts,
  onImport,
  onImportFromGraph,
  graphs,
  activeGraphId,
  isGraphListLoading = false,
  syncStatus,
  layout
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [sourceGraphId, setSourceGraphId] = useState<string | null>(null);
  const [copyOptions, setCopyOptions] = useState<Set<'domains' | 'modules' | 'artifacts'>>(
    () => new Set(['domains', 'modules', 'artifacts'])
  );
  const [isGraphImporting, setIsGraphImporting] = useState(false);

  const buildSnapshot = useCallback((): GraphSnapshotPayload => {
    const sanitizedLayout = normalizeLayoutSnapshot(layout) ?? undefined;
    return {
      version: GRAPH_SNAPSHOT_VERSION,
      exportedAt: new Date().toISOString(),
      modules,
      domains,
      artifacts,
      layout: sanitizedLayout
    };
  }, [artifacts, domains, layout, modules]);

  const handleExport = () => {
    try {
      const snapshot = buildSnapshot();
      const data = JSON.stringify(snapshot, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = snapshot.exportedAt?.replace(/[:.]/g, '-') ?? 'snapshot';
      link.href = url;
      link.download = `graph-snapshot-${timestamp}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setStatus({ type: 'success', message: 'Экспорт выполнен. Файл сохранён.' });
    } catch {
      setStatus({ type: 'error', message: 'Не удалось сформировать файл экспорта.' });
    }
  };

  const handleTriggerImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result;
        if (typeof text !== 'string') {
          throw new Error('Неверный формат файла');
        }

        const parsed = JSON.parse(text);
        if (!isGraphSnapshotLike(parsed)) {
          throw new Error('Файл не соответствует структуре графа');
        }

        const normalized = normalizeImportedSnapshot(parsed);

        onImport(normalized);
        const moduleCount = normalized.modules.length;
        const domainCount = normalized.domains.length;
        const artifactCount = normalized.artifacts.length;
        setStatus({
          type: 'success',
          message: `Импорт завершён. Модулей: ${moduleCount}, доменов: ${domainCount}, артефактов: ${artifactCount}.`
        });
      } catch (error) {
        setStatus({
          type: 'error',
          message:
            error instanceof Error ? error.message : 'Не удалось прочитать данные из файла.'
        });
      }
    };
    reader.onerror = () => {
      setStatus({ type: 'error', message: 'Ошибка чтения файла.' });
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const availableGraphs = useMemo(() => {
    if (!graphs || graphs.length === 0) {
      return [] as GraphSummary[];
    }
    return graphs.filter((graph) => graph.id !== activeGraphId);
  }, [graphs, activeGraphId]);

  const sourceGraph = useMemo(
    () => graphs?.find((graph) => graph.id === sourceGraphId) ?? null,
    [graphs, sourceGraphId]
  );

  const graphOptions = useMemo(
    () =>
      availableGraphs.map((graph) => ({
        label: graph.isDefault ? `${graph.name} • основной` : graph.name,
        value: graph.id
      })),
    [availableGraphs]
  );

  const selectedGraphOption = useMemo(
    () => graphOptions.find((option) => option.value === sourceGraphId) ?? null,
    [graphOptions, sourceGraphId]
  );

  const copyOptionItems = useMemo(
    () =>
      [
        { id: 'domains' as const, label: 'Домены' },
        { id: 'modules' as const, label: 'Модули' },
        { id: 'artifacts' as const, label: 'Артефакты' }
      ],
    []
  );

  const selectedCopyOptionItems = useMemo(
    () => copyOptionItems.filter((item) => copyOptions.has(item.id)),
    [copyOptionItems, copyOptions]
  );

  const isCopySectionAvailable = Boolean(onImportFromGraph) && graphOptions.length > 0;
  const canImportFromGraph =
    Boolean(onImportFromGraph) && Boolean(sourceGraphId) && copyOptions.size > 0;

  useEffect(() => {
    if (!sourceGraphId) {
      return;
    }

    if (!graphOptions.some((option) => option.value === sourceGraphId)) {
      setSourceGraphId(null);
    }
  }, [graphOptions, sourceGraphId]);

  const handleImportFromGraphClick = useCallback(async () => {
    if (!onImportFromGraph || !sourceGraphId || copyOptions.size === 0) {
      return;
    }

    setIsGraphImporting(true);
    try {
      const result = await onImportFromGraph({
        graphId: sourceGraphId,
        includeDomains: copyOptions.has('domains'),
        includeModules: copyOptions.has('modules'),
        includeArtifacts: copyOptions.has('artifacts')
      });
      const graphName = graphs?.find((graph) => graph.id === sourceGraphId)?.name ?? 'выбранного графа';
      setStatus({
        type: 'success',
        message: `Импорт завершён из графа «${graphName}». Модулей: ${result.modules}, доменов: ${result.domains}, артефактов: ${result.artifacts}.`
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Не удалось импортировать данные из выбранного графа.'
      });
    } finally {
      setIsGraphImporting(false);
    }
  }, [onImportFromGraph, sourceGraphId, copyOptions, graphs]);

  return (
    <section className={styles.wrapper} aria-label="Сохранение графа">
      <div className={styles.header}>
        <Text size="s" weight="semibold">
          Экспорт и импорт графа
        </Text>
        <Text size="xs" view="secondary">
          Сохраните текущее состояние экосистемы в JSON и загрузите его позже, чтобы восстановить
          добавленные сущности.
        </Text>
      </div>
      <div className={styles.actions}>
        <Button size="s" label="Экспортировать граф" onClick={handleExport} />
        <Button size="s" view="secondary" label="Импортировать граф" onClick={handleTriggerImport} />
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          hidden
          onChange={handleFileChange}
        />
      </div>
      {isCopySectionAvailable && (
        <div className={styles.copySection}>
          <div className={styles.copyHeader}>
            <Text size="s" weight="semibold">
              Импорт из другого графа
            </Text>
            <Text size="xs" view="secondary">
              Скопируйте полные наборы сущностей из доступных графов. Поштучный выбор не требуется.
            </Text>
          </div>
          <div className={styles.copyControls}>
            <Select<{ label: string; value: string }>
              size="s"
              items={graphOptions}
              value={selectedGraphOption}
              placeholder={
                isGraphListLoading ? 'Загрузка графов...' : 'Выберите граф-источник'
              }
              getItemLabel={(item) => item.label}
              getItemKey={(item) => item.value}
              disabled={isGraphListLoading || graphOptions.length === 0 || isGraphImporting}
              onChange={(option) => {
                setSourceGraphId(option?.value ?? null);
              }}
              style={{ minWidth: 220 }}
            />
            {sourceGraph && (
              <Badge
                className={styles.copyBadge}
                size="xs"
                view="filled"
                status={sourceGraph.isDefault ? 'success' : 'system'}
                label={
                  sourceGraph.isDefault
                    ? `Источник: ${sourceGraph.name} • основной`
                    : `Источник: ${sourceGraph.name}`
                }
              />
            )}
            <div className={styles.copyOptions}>
              <CheckboxGroup
                size="s"
                direction="row"
                items={copyOptionItems}
                value={selectedCopyOptionItems}
                getItemKey={(item) => item.id}
                getItemLabel={(item) => item.label}
                disabled={!sourceGraphId || isGraphImporting}
                onChange={(items) => {
                  setCopyOptions(new Set((items ?? []).map((item) => item.id)));
                }}
              />
              <Text size="xs" view="secondary">
                {sourceGraphId
                  ? 'Будут скопированы только выбранные типы данных.'
                  : 'Выберите граф-источник, чтобы включить параметры копирования.'}
              </Text>
            </div>
            <Button
              size="s"
              view="primary"
              label="Скопировать данные"
              onClick={() => {
                void handleImportFromGraphClick();
              }}
              disabled={!canImportFromGraph || isGraphImporting}
              loading={isGraphImporting}
            />
          </div>
          {!graphOptions.length && !isGraphListLoading && (
            <Text size="xs" view="secondary">
              Нет других графов для импорта. Создайте новый граф, чтобы копировать данные.
            </Text>
          )}
        </div>
      )}
      {status && (
        <Text
          size="xs"
          className={`${styles.status} ${
            status.type === 'success' ? styles.statusSuccess : styles.statusError
          }`}
        >
          {status.message}
        </Text>
      )}
      {syncStatus && (
        <Text
          size="xs"
          className={`${styles.status} ${
            syncStatus.state === 'error'
              ? styles.statusError
              : syncStatus.state === 'saving'
                ? styles.statusInProgress
                : styles.statusSecondary
          }`}
        >
          {syncStatus.message ??
            (syncStatus.state === 'saving'
              ? 'Сохраняем изменения в хранилище...'
              : syncStatus.state === 'error'
                ? 'Не удалось синхронизировать данные.'
                : 'Все изменения синхронизированы.')}
        </Text>
      )}
    </section>
  );
};

type GraphSnapshotLike = {
  version?: number;
  exportedAt?: string;
  modules: ModuleNode[];
  domains: DomainNode[];
  artifacts: ArtifactNode[];
  layout?: GraphSnapshotPayload['layout'];
};

function isGraphSnapshotLike(value: unknown): value is GraphSnapshotLike {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<GraphSnapshotPayload>;
  if (!Array.isArray(candidate.modules) || !Array.isArray(candidate.domains) || !Array.isArray(candidate.artifacts)) {
    return false;
  }

  if (candidate.version !== undefined && typeof candidate.version !== 'number') {
    return false;
  }

  return true;
}

function normalizeImportedSnapshot(snapshot: GraphSnapshotLike): GraphSnapshotPayload {
  return {
    version:
      typeof snapshot.version === 'number' && Number.isFinite(snapshot.version)
        ? snapshot.version
        : GRAPH_SNAPSHOT_VERSION,
    exportedAt: typeof snapshot.exportedAt === 'string' ? snapshot.exportedAt : undefined,
    modules: snapshot.modules,
    domains: snapshot.domains,
    artifacts: snapshot.artifacts,
    layout: normalizeLayoutSnapshot(snapshot.layout) ?? undefined
  };
}

export default GraphPersistenceControls;
