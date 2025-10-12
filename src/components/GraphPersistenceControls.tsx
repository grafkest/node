import { Button } from '@consta/uikit/Button';
import { Text } from '@consta/uikit/Text';
import React, { useCallback, useRef, useState } from 'react';
import type { ArtifactNode, DomainNode, ModuleNode } from '../data';
import { normalizeLayoutSnapshot } from '../services/graphStorage';
import {
  GRAPH_SNAPSHOT_VERSION,
  type GraphLayoutSnapshot,
  type GraphSnapshotPayload,
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
  syncStatus?: GraphSyncStatus | null;
  layout?: GraphLayoutSnapshot;
};

const GraphPersistenceControls: React.FC<GraphPersistenceControlsProps> = ({
  modules,
  domains,
  artifacts,
  onImport,
  syncStatus,
  layout
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<StatusMessage | null>(null);

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
