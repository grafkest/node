import { Badge } from '@consta/uikit/Badge';
import { Button } from '@consta/uikit/Button';
import { Card } from '@consta/uikit/Card';
import { Select } from '@consta/uikit/Select';
import { Steps } from '@consta/uikit/Steps';
import { Text } from '@consta/uikit/Text';
import clsx from 'clsx';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  ExpertProfile,
  Initiative,
  InitiativeRisk,
  InitiativeStatus
} from '../data';
import InitiativeCreationModal from './InitiativeCreationModal';
import InitiativeGanttChart, { type InitiativeGanttTask } from './InitiativeGanttChart';
import type { InitiativeCreationRequest } from '../types/initiativeCreation';
import styles from './InitiativePlanner.module.css';

type SelectItem<Value extends string> = {
  label: string;
  value: Value;
};

type InitiativePlannerProps = {
  initiatives: Initiative[];
  experts: ExpertProfile[];
  domainNameMap: Record<string, string>;
  onTogglePin: (initiativeId: string, roleId: string, expertId: string) => void;
  onAddRisk: (
    initiativeId: string,
    risk: { description: string; severity: InitiativeRisk['severity'] }
  ) => void;
  onRemoveRisk: (initiativeId: string, riskId: string) => void;
  onStatusChange: (initiativeId: string, status: InitiativeStatus) => void;
  onExport: (initiativeId: string) => void;
  onCreateInitiative: (draft: InitiativeCreationRequest) => Initiative | Promise<Initiative>;
};

type CandidateKey = `${string}:${string}`;

type SeverityOption = SelectItem<InitiativeRisk['severity']>;

type StatusStep = SelectItem<InitiativeStatus> & { description: string };

const statusSteps: StatusStep[] = [
  { label: 'Инициирована', value: 'initiated', description: 'Готовим состав и оценку' },
  { label: 'В работе', value: 'in-progress', description: 'Команда подтверждена, ведётся сбор рисков' },
  { label: 'Конвертирована', value: 'converted', description: 'Состав выгружен в модуль' }
];

const statusBadgeMeta: Record<InitiativeStatus, { label: string; view: 'system' | 'warning' | 'success' }>
 = {
  initiated: { label: 'Инициирована', view: 'warning' },
  'in-progress': { label: 'В работе', view: 'system' },
  converted: { label: 'Конвертирована', view: 'success' }
};

const severityOptions: SeverityOption[] = [
  { label: 'Низкий', value: 'low' },
  { label: 'Средний', value: 'medium' },
  { label: 'Высокий', value: 'high' }
];

const severityBadgeMeta: Record<InitiativeRisk['severity'], { label: string; status: 'success' | 'warning' | 'error' }>
 = {
  low: { label: 'Низкий', status: 'success' },
  medium: { label: 'Средний', status: 'warning' },
  high: { label: 'Высокий', status: 'error' }
};

const InitiativePlanner: React.FC<InitiativePlannerProps> = ({
  initiatives,
  experts,
  domainNameMap,
  onTogglePin,
  onAddRisk,
  onRemoveRisk,
  onStatusChange,
  onExport,
  onCreateInitiative
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(() => initiatives[0]?.id ?? null);
  const [riskDescription, setRiskDescription] = useState('');
  const [riskSeverity, setRiskSeverity] = useState<InitiativeRisk['severity']>('medium');
  const [openCandidates, setOpenCandidates] = useState<Set<CandidateKey>>(new Set());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateSubmitting, setIsCreateSubmitting] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId && initiatives.length > 0) {
      setSelectedId(initiatives[0].id);
    }
  }, [initiatives, selectedId]);

  useEffect(() => {
    setRiskDescription('');
    setRiskSeverity('medium');
    setOpenCandidates(new Set());
  }, [selectedId]);

  const initiativeOptions = useMemo<SelectItem<string>[]>(
    () => initiatives.map((initiative) => ({ label: initiative.name, value: initiative.id })),
    [initiatives]
  );

  const selectValue = useMemo(
    () => initiativeOptions.find((option) => option.value === selectedId) ?? null,
    [initiativeOptions, selectedId]
  );

  const selectedInitiative = useMemo(
    () => initiatives.find((initiative) => initiative.id === selectedId) ?? null,
    [initiatives, selectedId]
  );

  const expertMap = useMemo(() => {
    const map = new Map<string, ExpertProfile>();
    experts.forEach((expert) => {
      map.set(expert.id, expert);
    });
    return map;
  }, [experts]);

  const timelineTasks = useMemo<InitiativeGanttTask[]>(() => {
    if (!selectedInitiative) {
      return [];
    }

    return selectedInitiative.roles.flatMap((role) =>
      (role.workItems ?? []).map((item) => ({
        id: `${role.id}-${item.id}`,
        role: role.role,
        title: item.title,
        startDay: item.startDay,
        durationDays: item.durationDays,
        effortDays: item.effortDays,
        assignedExpert: item.assignedExpertId
          ? expertMap.get(item.assignedExpertId)?.fullName ?? item.assignedExpertId
          : undefined
      }))
    );
  }, [expertMap, selectedInitiative]);

  const handleOpenCreate = () => {
    setCreationError(null);
    setIsCreateModalOpen(true);
  };

  const handleCreateInitiative = useCallback(
    async (draft: InitiativeCreationRequest) => {
      try {
        setIsCreateSubmitting(true);
        setCreationError(null);
        const result = await Promise.resolve(onCreateInitiative(draft));
        setIsCreateModalOpen(false);
        setSelectedId(result.id);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Не удалось создать инициативу. Попробуйте ещё раз.';
        setCreationError(message);
      } finally {
        setIsCreateSubmitting(false);
      }
    },
    [onCreateInitiative]
  );

  const handleToggleCandidateDetails = (candidateId: CandidateKey) => {
    setOpenCandidates((prev) => {
      const next = new Set(prev);
      if (next.has(candidateId)) {
        next.delete(candidateId);
      } else {
        next.add(candidateId);
      }
      return next;
    });
  };

  if (!selectedInitiative) {
    return (
      <section className={styles.container} aria-label="Инициативы">
        <Text size="s" view="secondary">
          Инициативы не найдены. Добавьте их в данных графа, чтобы начать планирование команды.
        </Text>
      </section>
    );
  }

  const domainLabels = selectedInitiative.domains.map(
    (domainId) => domainNameMap[domainId] ?? domainId
  );

  const statusIndex = statusSteps.findIndex((step) => step.value === selectedInitiative.status);
  const activeStatus = statusBadgeMeta[selectedInitiative.status];

  const severitySelectValue = severityOptions.find((option) => option.value === riskSeverity) ?? null;

  const handleAddRisk = () => {
    onAddRisk(selectedInitiative.id, { description: riskDescription, severity: riskSeverity });
    setRiskDescription('');
  };

  const renderRoleCard = (role: Initiative['roles'][number]) => {
    const pinnedSet = new Set(role.pinnedExpertIds);
    const sortedCandidates = [...role.candidates].sort((a, b) => b.score - a.score);

    return (
      <Card key={role.id} className={styles.roleCard} verticalSpace="xl" horizontalSpace="xl">
        <div className={styles.roleHeader}>
          <div>
            <Text size="s" weight="semibold">
              {role.role}
            </Text>
            <Text size="xs" view="secondary">
              Требуется: {role.required} · Закреплено: {role.pinnedExpertIds.length}
            </Text>
          </div>
          {pinnedSet.size > 0 && (
            <Badge size="s" status="success" label="Есть закрепления" />
          )}
        </div>
        <div className={styles.candidateList}>
          {sortedCandidates.map((candidate) => {
            const candidateKey: CandidateKey = `${role.id}:${candidate.expertId}`;
            const expert = expertMap.get(candidate.expertId);
            const isPinned = pinnedSet.has(candidate.expertId);
            const isOpen = openCandidates.has(candidateKey);
            const scoreLabel = `${Math.round(candidate.score)} баллов`;

            return (
              <div
                key={candidateKey}
                className={clsx(styles.candidateCard, isPinned && styles.candidatePinned)}
              >
                <div className={styles.candidateHeader}>
                  <div className={styles.candidateTitle}>
                    <Text size="s" weight="semibold">
                      {expert?.fullName ?? candidate.expertId}
                    </Text>
                    <Text size="xs" view="secondary">
                      {expert?.title ?? 'Эксперт не найден в каталоге'}
                    </Text>
                  </div>
                  <div className={styles.candidateActions}>
                    <Badge size="s" view="filled" status="system" label={scoreLabel} />
                    {isPinned && <Badge size="s" status="success" label="Закреплён" />}
                    <Button
                      size="xs"
                      view="ghost"
                      label={isOpen ? 'Скрыть детали' : 'Показать детали'}
                      onClick={() => handleToggleCandidateDetails(candidateKey)}
                    />
                    <Button
                      size="xs"
                      view={isPinned ? 'secondary' : 'primary'}
                      label={isPinned ? 'Открепить' : 'Закрепить'}
                      onClick={() => onTogglePin(selectedInitiative.id, role.id, candidate.expertId)}
                    />
                  </div>
                </div>
                {isOpen && (
                  <div className={styles.candidateDetails}>
                    <Text size="xs" view="secondary" className={styles.candidateComment}>
                      {candidate.fitComment}
                    </Text>
                    <div className={styles.scoreDetails}>
                      {candidate.scoreDetails.map((detail) => (
                        <div key={`${candidateKey}-${detail.criterion}`} className={styles.scoreRow}>
                          <Text size="xs" weight="semibold">
                            {detail.criterion}
                          </Text>
                          <Text size="xs" view="secondary">
                            {(detail.value * 100).toFixed(0)}% · вклад {(detail.weight * 100).toFixed(0)}%
                          </Text>
                          {detail.comment && (
                            <Text size="xs" view="secondary">
                              {detail.comment}
                            </Text>
                          )}
                        </div>
                      ))}
                    </div>
                    {candidate.riskTags.length > 0 && (
                      <div className={styles.riskTagList}>
                        {candidate.riskTags.map((tag) => (
                          <Badge key={`${candidateKey}-${tag}`} size="xs" view="stroked" label={tag} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    );
  };

  return (
    <section className={styles.container} aria-label="Планирование инициатив">
      <header className={styles.header}>
        <div className={styles.headerInfo}>
          <Text size="xl" weight="bold">
            {selectedInitiative.name}
          </Text>
          <Text size="s" view="secondary" className={styles.headerDescription}>
            {selectedInitiative.description}
          </Text>
          <div className={styles.metaRow}>
            <Badge size="s" view="stroked" label={`Владелец: ${selectedInitiative.owner}`} />
            <Badge
              size="s"
              view="stroked"
              label={`Домены: ${domainLabels.join(', ') || 'не указаны'}`}
            />
            <Badge
              size="s"
              view="stroked"
              label={`Обновлено: ${new Date(selectedInitiative.lastUpdated).toLocaleString('ru-RU')}`}
            />
          </div>
        </div>
        <div className={styles.headerControls}>
          <Button size="s" view="secondary" label="Создать инициативу" onClick={handleOpenCreate} />
          <Select<SelectItem<string>>
            size="s"
            items={initiativeOptions}
            value={selectValue}
            onChange={(option) => option && setSelectedId(option.value)}
            getItemLabel={(item) => item.label}
            getItemKey={(item) => item.value}
          />
          <Button
            size="s"
            view="primary"
            label="Экспортировать в модуль"
            onClick={() => onExport(selectedInitiative.id)}
          />
        </div>
      </header>
      <div className={styles.statusSection}>
        <div className={styles.statusHeadline}>
          <Badge size="s" status={activeStatus.view} label={activeStatus.label} />
          <Text size="xs" view="secondary">
            {statusSteps[statusIndex]?.description ?? ''}
          </Text>
        </div>
        <Steps
          size="s"
          items={statusSteps}
          value={statusSteps[Math.max(0, statusIndex)]}
          getItemLabel={(item) => item.label}
          getItemKey={(item) => item.value}
          onChange={(step) => onStatusChange(selectedInitiative.id, step.value)}
        />
      </div>
      <div className={styles.contentGrid}>
        <section className={styles.rolesSection} aria-label="Роли и кандидаты">
          <Card className={styles.timelineCard} verticalSpace="xl" horizontalSpace="xl">
            <div className={styles.timelineHeader}>
              <Text size="s" weight="semibold">
                План работ
              </Text>
              <Text size="xs" view="secondary">
                {timelineTasks.length > 0
                  ? `Задач в расписании: ${timelineTasks.length}`
                  : 'Диаграмма появится после добавления работ по ролям.'}
              </Text>
            </div>
            <InitiativeGanttChart tasks={timelineTasks} />
          </Card>
          {selectedInitiative.customer && (
            <Card className={styles.customerCard} verticalSpace="xl" horizontalSpace="xl">
              <Text size="s" weight="semibold">
                Параметры заказчика
              </Text>
              <div className={styles.customerGrid}>
                <div>
                  <Text size="xs" view="secondary">
                    Компания
                  </Text>
                  <Text size="s">{selectedInitiative.customer.company || '—'}</Text>
                </div>
                <div>
                  <Text size="xs" view="secondary">
                    Подразделение
                  </Text>
                  <Text size="s">{selectedInitiative.customer.unit || '—'}</Text>
                </div>
                <div>
                  <Text size="xs" view="secondary">
                    Контактное лицо
                  </Text>
                  <Text size="s">{selectedInitiative.customer.representative || '—'}</Text>
                </div>
                <div>
                  <Text size="xs" view="secondary">
                    Контакты
                  </Text>
                  <Text size="s">{selectedInitiative.customer.contact || '—'}</Text>
                </div>
              </div>
              {selectedInitiative.customer.comment && (
                <Text size="xs" view="secondary" className={styles.customerComment}>
                  {selectedInitiative.customer.comment}
                </Text>
              )}
            </Card>
          )}
          {selectedInitiative.roles.map((role) => renderRoleCard(role))}
        </section>
        <aside className={styles.riskSection} aria-label="Риски инициативы">
          <Card verticalSpace="xl" horizontalSpace="xl" className={styles.riskCard}>
            <Text size="s" weight="semibold">
              Риски
            </Text>
            {selectedInitiative.risks.length === 0 ? (
              <Text size="xs" view="secondary">
                Риски не зафиксированы.
              </Text>
            ) : (
              <ul className={styles.riskList}>
                {selectedInitiative.risks.map((risk) => {
                  const meta = severityBadgeMeta[risk.severity];
                  return (
                    <li key={risk.id} className={styles.riskItem}>
                      <div className={styles.riskHeader}>
                        <Badge size="xs" status={meta.status} label={meta.label} />
                        <Text size="xs" view="secondary">
                          {new Date(risk.createdAt).toLocaleString('ru-RU')}
                        </Text>
                      </div>
                      <Text size="xs">{risk.description}</Text>
                      <Button
                        size="xs"
                        view="ghost"
                        label="Удалить"
                        onClick={() => onRemoveRisk(selectedInitiative.id, risk.id)}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
            <div className={styles.riskForm}>
              <Select<SeverityOption>
                size="s"
                items={severityOptions}
                value={severitySelectValue}
                getItemKey={(item) => item.value}
                getItemLabel={(item) => item.label}
                onChange={(option) => option && setRiskSeverity(option.value)}
              />
              <textarea
                className={styles.riskTextarea}
                rows={3}
                placeholder="Опишите риск или блокирующий фактор"
                value={riskDescription}
                onChange={(event) => setRiskDescription(event.target.value)}
              />
              <Button
                size="s"
                view="secondary"
                label="Зафиксировать риск"
                disabled={riskDescription.trim().length === 0}
                onClick={handleAddRisk}
              />
            </div>
          </Card>
        </aside>
      </div>
      <InitiativeCreationModal
        isOpen={isCreateModalOpen}
        experts={experts}
        onClose={() => {
          setIsCreateModalOpen(false);
          setCreationError(null);
        }}
        onSubmit={handleCreateInitiative}
        isSubmitting={isCreateSubmitting}
        errorMessage={creationError}
      />
    </section>
  );
};

export default InitiativePlanner;
