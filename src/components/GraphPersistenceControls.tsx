import { Button } from '@consta/uikit/Button';
import { Text } from '@consta/uikit/Text';
import React, { useMemo, useRef, useState } from 'react';
import type { ArtifactNode, DomainNode, ModuleNode } from '../data';
import styles from './GraphPersistenceControls.module.css';

type StatusMessage =
  | { type: 'success'; message: string }
  | { type: 'error'; message: string };

const SNAPSHOT_VERSION = 1;

export type GraphSnapshotPayload = {
  version: number;
  exportedAt?: string;
  modules: ModuleNode[];
  domains: DomainNode[];
  artifacts: ArtifactNode[];
};

type GraphPersistenceControlsProps = {
  modules: ModuleNode[];
  domains: DomainNode[];
  artifacts: ArtifactNode[];
  onImport: (snapshot: GraphSnapshotPayload) => void;
};

const GraphPersistenceControls: React.FC<GraphPersistenceControlsProps> = ({
  modules,
  domains,
  artifacts,
  onImport
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<StatusMessage | null>(null);

  const snapshot = useMemo<GraphSnapshotPayload>(
    () => ({
      version: SNAPSHOT_VERSION,
      exportedAt: new Date().toISOString(),
      modules,
      domains,
      artifacts
    }),
    [modules, domains, artifacts]
  );

  const handleExport = () => {
    try {
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
    } catch (error) {
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
        if (!isGraphSnapshotPayload(parsed)) {
          throw new Error('Файл не соответствует структуре графа');
        }

        onImport(parsed);
        const moduleCount = parsed.modules.length;
        const domainCount = parsed.domains.length;
        const artifactCount = parsed.artifacts.length;
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
    </section>
  );
};

function isGraphSnapshotPayload(value: unknown): value is GraphSnapshotPayload {
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

export default GraphPersistenceControls;
