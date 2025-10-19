import { Badge } from '@consta/uikit/Badge';
import { Button } from '@consta/uikit/Button';
import { Card } from '@consta/uikit/Card';
import { Modal } from '@consta/uikit/Modal';
import { Select } from '@consta/uikit/Select';
import { Text } from '@consta/uikit/Text';
import { TextField } from '@consta/uikit/TextField';
import React, { useEffect, useMemo, useState } from 'react';
import type { ExpertProfile, InitiativeStatus, TeamRole } from '../data';
import InitiativeGanttChart from './InitiativeGanttChart';
import type { InitiativeGanttTask } from './InitiativeGanttChart';
import type { InitiativeCreationRequest } from '../types/initiativeCreation';
import {
  buildCandidatesFromReport,
  buildRoleMatchReports,
  type RolePlanningDraft
} from '../utils/initiativeMatching';
import styles from './InitiativeCreationModal.module.css';

type SelectOption<Value extends string> = {
  label: string;
  value: Value;
};

type RoleWorkDraft = {
  id: string;
  title: string;
  description: string;
  startDay: number;
  durationDays: number;
  effortDays: number;
};

type RoleDraft = {
  id: string;
  role: TeamRole;
  required: number;
  skillsInput: string;
  comment: string;
  works: RoleWorkDraft[];
};

type InitiativeCreationModalProps = {
  isOpen: boolean;
  experts: ExpertProfile[];
  onClose: () => void;
  onSubmit: (draft: InitiativeCreationRequest) => void | Promise<void>;
  isSubmitting?: boolean;
  errorMessage?: string | null;
};

const statusOptions: SelectOption<InitiativeStatus>[] = [
  { label: 'Инициирована', value: 'initiated' },
  { label: 'В работе', value: 'in-progress' },
  { label: 'Конвертирована', value: 'converted' }
];

const roleOptions: SelectOption<TeamRole>[] = [
  { label: 'Владелец продукта', value: 'Владелец продукта' },
  { label: 'Эксперт R&D', value: 'Эксперт R&D' },
  { label: 'Аналитик', value: 'Аналитик' },
  { label: 'Backend', value: 'Backend' },
  { label: 'Frontend', value: 'Frontend' },
  { label: 'Архитектор', value: 'Архитектор' },
  { label: 'Тестировщик', value: 'Тестировщик' },
  { label: 'Руководитель проекта', value: 'Руководитель проекта' },
  { label: 'UX', value: 'UX' }
];

const createId = () => `tmp-${Math.random().toString(36).slice(2, 11)}`;

const createWorkDraft = (offset = 0): RoleWorkDraft => ({
  id: createId(),
  title: '',
  description: '',
  startDay: offset,
  durationDays: 5,
  effortDays: 5
});

const createRoleDraft = (role: TeamRole): RoleDraft => ({
  id: createId(),
  role,
  required: 1,
  skillsInput: '',
  comment: '',
  works: [createWorkDraft()]
});

const InitiativeCreationModal: React.FC<InitiativeCreationModalProps> = ({
  isOpen,
  experts,
  onClose,
  onSubmit,
  isSubmitting = false,
  errorMessage = null
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [owner, setOwner] = useState('');
  const [expectedImpact, setExpectedImpact] = useState('');
  const [targetModule, setTargetModule] = useState('');
  const [status, setStatus] = useState<InitiativeStatus>('initiated');
  const [domainsInput, setDomainsInput] = useState('');
  const [modulesInput, setModulesInput] = useState('');
  const [customerCompany, setCustomerCompany] = useState('');
  const [customerUnit, setCustomerUnit] = useState('');
  const [customerRepresentative, setCustomerRepresentative] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [customerComment, setCustomerComment] = useState('');
  const [roles, setRoles] = useState<RoleDraft[]>([createRoleDraft('Аналитик')]);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setOwner('');
      setExpectedImpact('');
      setTargetModule('');
      setStatus('initiated');
      setDomainsInput('');
      setModulesInput('');
      setCustomerCompany('');
      setCustomerUnit('');
      setCustomerRepresentative('');
      setCustomerContact('');
      setCustomerComment('');
      setRoles([createRoleDraft('Аналитик')]);
    }
  }, [isOpen]);

  const ganttTasks = useMemo<InitiativeGanttTask[]>(
    () =>
      roles.flatMap((role) =>
        role.works.map((work) => ({
          id: work.id,
          role: role.role,
          title: work.title || 'Задача',
          startDay: Math.max(0, Math.round(work.startDay)),
          durationDays: Math.max(1, Math.round(work.durationDays)),
          effortDays: Math.max(1, Math.round(work.effortDays))
        }))
      ),
    [roles]
  );

  const totalEffortDays = ganttTasks.reduce((acc, task) => acc + task.effortDays, 0);

  const isSubmitDisabled =
    !name.trim() || roles.length === 0 || roles.every((role) => role.works.length === 0);

  const parseList = (input: string) =>
    input
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

  const planningRoles = useMemo<RolePlanningDraft[]>(
    () =>
      roles.map((role) => ({
        id: role.id,
        role: role.role,
        required: Math.max(1, Math.round(role.required)),
        skills: parseList(role.skillsInput),
        workItems: role.works.map((work) => ({
          id: work.id,
          title: work.title.trim() || 'Задача',
          description: work.description.trim() || 'Описание не заполнено',
          startDay: Math.max(0, Math.round(work.startDay)),
          durationDays: Math.max(1, Math.round(work.durationDays)),
          effortDays: Math.max(1, Math.round(work.effortDays))
        }))
      })),
    [roles]
  );

  const draftPayload = useMemo<InitiativeCreationRequest>(
    () => ({
      name: name.trim(),
      description: description.trim(),
      owner: owner.trim(),
      expectedImpact: expectedImpact.trim(),
      targetModuleName: targetModule.trim(),
      status,
      domains: parseList(domainsInput),
      potentialModules: parseList(modulesInput),
      customer: {
        company: customerCompany.trim(),
        unit: customerUnit.trim(),
        representative: customerRepresentative.trim(),
        contact: customerContact.trim(),
        comment: customerComment.trim() || undefined
      },
      roles: planningRoles.map((role, index) => ({
        id: role.id,
        role: role.role,
        required: role.required,
        skills: role.skills,
        comment: roles[index]?.comment.trim() ? roles[index].comment.trim() : undefined,
        workItems: role.workItems
      }))
    }),
    [
      customerComment,
      customerCompany,
      customerContact,
      customerRepresentative,
      customerUnit,
      description,
      domainsInput,
      expectedImpact,
      modulesInput,
      name,
      owner,
      planningRoles,
      roles,
      status,
      targetModule
    ]
  );

  const matchReports = useMemo(
    () => buildRoleMatchReports(planningRoles, experts),
    [experts, planningRoles]
  );

  const candidatePreviewMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof buildCandidatesFromReport>>();
    matchReports.forEach((report) => {
      map.set(report.requirement.roleId, buildCandidatesFromReport(report));
    });
    return map;
  }, [matchReports]);

  const expertLookup = useMemo(() => {
    const lookup = new Map(
      experts.map((expert) => [expert.id, { name: expert.fullName, title: expert.title }])
    );
    return lookup;
  }, [experts]);

  const handleRoleChange = (roleId: string, patch: Partial<RoleDraft>) => {
    setRoles((prev) => prev.map((role) => (role.id === roleId ? { ...role, ...patch } : role)));
  };

  const handleWorkChange = (roleId: string, workId: string, patch: Partial<RoleWorkDraft>) => {
    setRoles((prev) =>
      prev.map((role) => {
        if (role.id !== roleId) {
          return role;
        }
        return {
          ...role,
          works: role.works.map((work) => (work.id === workId ? { ...work, ...patch } : work))
        };
      })
    );
  };

  const handleAddRole = () => {
    setRoles((prev) => [...prev, createRoleDraft('Эксперт R&D')]);
  };

  const handleRemoveRole = (roleId: string) => {
    setRoles((prev) => (prev.length <= 1 ? prev : prev.filter((role) => role.id !== roleId)));
  };

  const handleAddWork = (roleId: string) => {
    setRoles((prev) =>
      prev.map((role) =>
        role.id === roleId
          ? { ...role, works: [...role.works, createWorkDraft(role.works.length * 5)] }
          : role
      )
    );
  };

  const handleRemoveWork = (roleId: string, workId: string) => {
    setRoles((prev) =>
      prev.map((role) =>
        role.id === roleId
          ? { ...role, works: role.works.filter((work) => work.id !== workId) }
          : role
      )
    );
  };

  const handleSubmit = () => {
    onSubmit(draftPayload);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        hasOverlay
        onEsc={onClose}
        className={styles.modal}
        position="top"
      >
        <div className={styles.container}>
          <header className={styles.header}>
            <div>
              <Text size="l" weight="bold">
                Новая инициатива
              </Text>
              <Text size="s" view="secondary">
                Заполните данные о заказчике, команде и план работ. Диаграмма обновляется автоматически.
              </Text>
            </div>
            <Select<SelectOption<InitiativeStatus>>
              size="s"
              items={statusOptions}
              value={statusOptions.find((option) => option.value === status) ?? statusOptions[0]}
              getItemLabel={(item) => item.label}
              getItemKey={(item) => item.value}
              onChange={(option) => option && setStatus(option.value)}
            />
          </header>
          {errorMessage && (
            <Text size="s" view="alert">
              {errorMessage}
            </Text>
          )}
          <section className={styles.section}>
            <Text size="s" weight="semibold">
              Основная информация
            </Text>
            <div className={styles.gridTwoCols}>
              <TextField
                size="s"
                label="Название инициативы"
                placeholder="Например, Пилот дистанционного мониторинга"
                value={name}
                onChange={(value) => setName(value ?? '')}
              />
              <TextField
                size="s"
                label="Ответственный"
                placeholder="ФИО или роль владельца"
                value={owner}
                onChange={(value) => setOwner(value ?? '')}
              />
            </div>
            <TextField
              size="s"
              label="Краткое описание"
              placeholder="Опишите цель инициативы"
              value={description}
              onChange={(value) => setDescription(value ?? '')}
              type="textarea"
              minRows={3}
            />
            <div className={styles.gridTwoCols}>
              <TextField
                size="s"
                label="Ожидаемый эффект"
                placeholder="Например, рост точности прогноза на 15%"
                value={expectedImpact}
                onChange={(value) => setExpectedImpact(value ?? '')}
              />
              <TextField
                size="s"
                label="Целевой модуль"
                placeholder="Укажите рабочее название модуля"
                value={targetModule}
                onChange={(value) => setTargetModule(value ?? '')}
              />
            </div>
            <div className={styles.gridTwoCols}>
              <TextField
                size="s"
                label="Домены (через запятую)"
                placeholder="Например, real-time-monitoring, remote-control"
                value={domainsInput}
                onChange={(value) => setDomainsInput(value ?? '')}
              />
              <TextField
                size="s"
                label="Потенциальные модули (через запятую)"
                placeholder="Перечислите существующие решения"
                value={modulesInput}
                onChange={(value) => setModulesInput(value ?? '')}
              />
            </div>
          </section>
          <section className={styles.section}>
            <Text size="s" weight="semibold">
              Параметры заказчика
            </Text>
            <div className={styles.gridTwoCols}>
              <TextField
                size="s"
                label="Компания"
                placeholder="Например, Восток Инжиниринг"
                value={customerCompany}
                onChange={(value) => setCustomerCompany(value ?? '')}
              />
              <TextField
                size="s"
                label="Подразделение"
                placeholder="Укажите бизнес-единицу"
                value={customerUnit}
                onChange={(value) => setCustomerUnit(value ?? '')}
              />
            </div>
            <div className={styles.gridTwoCols}>
              <TextField
                size="s"
                label="Контакт заказчика"
                placeholder="ФИО ответственного"
                value={customerRepresentative}
                onChange={(value) => setCustomerRepresentative(value ?? '')}
              />
              <TextField
                size="s"
                label="Контакты"
                placeholder="Email или телефон"
                value={customerContact}
                onChange={(value) => setCustomerContact(value ?? '')}
              />
            </div>
            <TextField
              size="s"
              label="Комментарий"
              placeholder="Дополнительная информация"
              value={customerComment}
              onChange={(value) => setCustomerComment(value ?? '')}
              type="textarea"
              minRows={2}
            />
          </section>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <Text size="s" weight="semibold">
                Команда и план работ по ролям
              </Text>
              <Button size="s" view="ghost" label="Добавить роль" onClick={handleAddRole} />
            </div>
            <div className={styles.roleList}>
              {roles.map((role) => {
                const roleOption = roleOptions.find((option) => option.value === role.role) ?? roleOptions[0];
                return (
                  <Card key={role.id} className={styles.roleCard} verticalSpace="l" horizontalSpace="l">
                    <div className={styles.roleHeader}>
                      <Select<SelectOption<TeamRole>>
                        size="s"
                        items={roleOptions}
                        value={roleOption}
                        getItemLabel={(item) => item.label}
                        getItemKey={(item) => item.value}
                        onChange={(option) => option && handleRoleChange(role.id, { role: option.value })}
                      />
                      <div className={styles.roleHeaderActions}>
                        <TextField
                          size="s"
                          label="Требуется"
                          type="number"
                          value={String(role.required)}
                          onChange={(value) =>
                            handleRoleChange(role.id, {
                              required: Number(value ?? role.required) || 1
                            })
                          }
                        />
                        <Button
                          size="s"
                          view="ghost"
                          label="Удалить роль"
                          onClick={() => handleRemoveRole(role.id)}
                        />
                      </div>
                    </div>
                    <div className={styles.roleMetaGrid}>
                      <TextField
                        size="s"
                        label="Навыки (через запятую)"
                        value={role.skillsInput}
                        onChange={(value) => handleRoleChange(role.id, { skillsInput: value ?? '' })}
                      />
                      <TextField
                        size="s"
                        label="Комментарий"
                        value={role.comment}
                        onChange={(value) => handleRoleChange(role.id, { comment: value ?? '' })}
                      />
                    </div>
                    <div className={styles.workList}>
                      {role.works.map((work) => (
                        <div key={work.id} className={styles.workCard}>
                          <div className={styles.workHeader}>
                            <TextField
                              size="s"
                              label="Название работы"
                              placeholder="Например, Подготовка данных"
                              value={work.title}
                              onChange={(value) => handleWorkChange(role.id, work.id, { title: value ?? '' })}
                            />
                            <Button
                              size="s"
                              view="ghost"
                              label="Удалить"
                              onClick={() => handleRemoveWork(role.id, work.id)}
                            />
                          </div>
                          <TextField
                            size="s"
                            label="Описание"
                            value={work.description}
                            onChange={(value) => handleWorkChange(role.id, work.id, { description: value ?? '' })}
                            type="textarea"
                            minRows={2}
                          />
                          <div className={styles.workGrid}>
                            <TextField
                              size="s"
                              label="Старт (день)"
                              type="number"
                              value={String(work.startDay)}
                              onChange={(value) =>
                                handleWorkChange(role.id, work.id, {
                                  startDay: Number(value ?? work.startDay) || 0
                                })
                              }
                            />
                            <TextField
                              size="s"
                              label="Длительность (дней)"
                              type="number"
                              value={String(work.durationDays)}
                              onChange={(value) =>
                                handleWorkChange(role.id, work.id, {
                                  durationDays: Number(value ?? work.durationDays) || 1
                                })
                              }
                            />
                            <TextField
                              size="s"
                              label="Трудозатраты (дней)"
                              type="number"
                              value={String(work.effortDays)}
                              onChange={(value) =>
                                handleWorkChange(role.id, work.id, {
                                  effortDays: Number(value ?? work.effortDays) || 1
                                })
                              }
                            />
                          </div>
                        </div>
                      ))}
                      <Button size="s" view="ghost" label="Добавить работу" onClick={() => handleAddWork(role.id)} />
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <Text size="s" weight="semibold">
                  Рекомендованные эксперты
                </Text>
                <Text size="xs" view="secondary">
                  Система сравнила навыки роли и доступность специалистов.
                </Text>
              </div>
            </div>
            <div className={styles.recommendationList}>
              {planningRoles.length === 0 ? (
                <Text size="s" view="secondary">
                  Добавьте роли и работы, чтобы увидеть подходящих экспертов.
                </Text>
              ) : (
                planningRoles.map((role) => {
                  const candidates = candidatePreviewMap.get(role.id) ?? [];
                  const topCandidates = candidates.slice(0, 3);
                  const bestScore = topCandidates[0]?.score;
                  return (
                    <Card
                      key={role.id}
                      className={styles.recommendationCard}
                      verticalSpace="l"
                      horizontalSpace="l"
                    >
                      <div className={styles.recommendationHeader}>
                        <div>
                          <Text size="s" weight="semibold">
                            {role.role}
                          </Text>
                          <Text size="xs" view="secondary">
                            Требуется: {role.required} · Работ: {role.workItems.length}
                          </Text>
                        </div>
                        {bestScore !== undefined && (
                          <Badge size="s" view="filled" status="system" label={`${bestScore} баллов`} />
                        )}
                      </div>
                      {topCandidates.length === 0 ? (
                        <Text size="xs" view="secondary">
                          Уточните навыки роли, чтобы получить рекомендации.
                        </Text>
                      ) : (
                        <div className={styles.recommendationCandidates}>
                          {topCandidates.map((candidate) => {
                            const expert = expertLookup.get(candidate.expertId);
                            return (
                              <div
                                key={`${role.id}-${candidate.expertId}`}
                                className={styles.recommendationCandidate}
                              >
                                <div className={styles.recommendationCandidateHeader}>
                                  <div>
                                    <Text size="s" weight="semibold">
                                      {expert?.name ?? candidate.expertId}
                                    </Text>
                                    <Text size="xs" view="secondary">
                                      {expert?.title ?? 'Эксперт каталога'}
                                    </Text>
                                  </div>
                                  <Badge
                                    size="s"
                                    view="stroked"
                                    status="system"
                                    label={`${candidate.score} баллов`}
                                  />
                                </div>
                                <Text size="xs">{candidate.fitComment}</Text>
                                {candidate.riskTags.length > 0 && (
                                  <div className={styles.recommendationRisks}>
                                    {candidate.riskTags.slice(0, 3).map((risk) => (
                                      <Badge
                                        key={`${candidate.expertId}-${risk}`}
                                        size="2xs"
                                        view="ghost"
                                        label={risk}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </Card>
                  );
                })
              )}
            </div>
          </section>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <Text size="s" weight="semibold">
                  Диаграмма Ганта
                </Text>
                <Text size="xs" view="secondary">
                  Всего {totalEffortDays} человеко-дней по текущему плану.
                </Text>
              </div>
            </div>
            <InitiativeGanttChart tasks={ganttTasks} />
          </section>
          <footer className={styles.footer}>
            <Button size="s" view="ghost" label="Отмена" onClick={onClose} disabled={isSubmitting} />
            <Button
              size="s"
              view="primary"
              label="Создать инициативу"
              onClick={handleSubmit}
              disabled={isSubmitDisabled || isSubmitting}
            />
          </footer>
        </div>
      </Modal>
    </>
  );
};

export default InitiativeCreationModal;
