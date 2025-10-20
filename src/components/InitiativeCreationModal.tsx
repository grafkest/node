import { Badge } from '@consta/uikit/Badge';
import { Button } from '@consta/uikit/Button';
import { Card } from '@consta/uikit/Card';
import { Combobox } from '@consta/uikit/Combobox';
import { Modal } from '@consta/uikit/Modal';
import { Select } from '@consta/uikit/Select';
import { Text } from '@consta/uikit/Text';
import { TextField } from '@consta/uikit/TextField';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { domainNameById, modules } from '../data';
import type { ExpertProfile, InitiativeStatus, TeamRole } from '../data';
import { getSkillsByRole } from '../data/skills';
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

type OptionItem = {
  id: string;
  label: string;
  value: string;
  isCustom?: boolean;
};

const NEW_DOMAIN_OPTION_ID = '__new-domain__';
const NEW_MODULE_OPTION_ID = '__new-module__';
const NEW_COMPANY_OPTION_ID = '__new-company__';

const DOMAIN_CREATE_OPTION: OptionItem = {
  id: NEW_DOMAIN_OPTION_ID,
  label: 'Новый домен',
  value: NEW_DOMAIN_OPTION_ID
};

const MODULE_CREATE_OPTION: OptionItem = {
  id: NEW_MODULE_OPTION_ID,
  label: 'Новый модуль',
  value: NEW_MODULE_OPTION_ID
};

const COMPANY_CREATE_OPTION: OptionItem = {
  id: NEW_COMPANY_OPTION_ID,
  label: 'Создать нового',
  value: NEW_COMPANY_OPTION_ID
};

type RoleWorkTaskDraft = {
  id: string;
  skill: string;
  isCustom?: boolean;
};

type RoleWorkDraft = {
  id: string;
  title: string;
  description: string;
  startDay: number;
  durationDays: number;
  effortDays: number;
  tasks: RoleWorkTaskDraft[];
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

const createWorkTaskDraft = (): RoleWorkTaskDraft => ({
  id: createId(),
  skill: ''
});

const createWorkDraft = (offset = 0, tasksCount = 1): RoleWorkDraft => ({
  id: createId(),
  title: '',
  description: '',
  startDay: offset,
  durationDays: 5,
  effortDays: 5,
  tasks: Array.from({ length: Math.max(1, tasksCount) }, () => createWorkTaskDraft())
});

const createRoleDraft = (role: TeamRole): RoleDraft => ({
  id: createId(),
  role,
  required: 1,
  skillsInput: '',
  comment: '',
  works: [createWorkDraft(0, 1)]
});

const InitiativeCreationModal: React.FC<InitiativeCreationModalProps> = ({
  isOpen,
  experts,
  onClose,
  onSubmit,
  isSubmitting = false,
  errorMessage = null
}) => {
  const domainBaseItems = useMemo<OptionItem[]>(
    () =>
      Object.entries(domainNameById)
        .map(([id, label]) => ({ id, label, value: id }))
        .sort((a, b) => a.label.localeCompare(b.label, 'ru')),
    []
  );

  const moduleBaseItems = useMemo<OptionItem[]>(
    () =>
      modules
        .map((module) => ({ id: module.id, label: module.name, value: module.id }))
        .sort((a, b) => a.label.localeCompare(b.label, 'ru')),
    []
  );

  const companyBaseItems = useMemo<OptionItem[]>(() => {
    const companyNames = new Set<string>();
    modules.forEach((module) => {
      if (module.ridOwner?.company) {
        companyNames.add(module.ridOwner.company);
      }
      module.userStats.companies.forEach((company) => companyNames.add(company.name));
    });
    return Array.from(companyNames)
      .sort((a, b) => a.localeCompare(b, 'ru'))
      .map((name) => ({ id: name, label: name, value: name }));
  }, []);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [owner, setOwner] = useState('');
  const [expectedImpact, setExpectedImpact] = useState('');
  const [targetModule, setTargetModule] = useState('');
  const [status, setStatus] = useState<InitiativeStatus>('initiated');
  const [domainItems, setDomainItems] = useState<OptionItem[]>(() => [...domainBaseItems]);
  const [selectedDomains, setSelectedDomains] = useState<OptionItem[]>([]);
  const [isCreatingDomain, setIsCreatingDomain] = useState(false);
  const [newDomainLabel, setNewDomainLabel] = useState('');
  const [moduleItems, setModuleItems] = useState<OptionItem[]>(() => [...moduleBaseItems]);
  const [selectedModules, setSelectedModules] = useState<OptionItem[]>([]);
  const [isCreatingModule, setIsCreatingModule] = useState(false);
  const [newModuleLabel, setNewModuleLabel] = useState('');
  const [companyItems, setCompanyItems] = useState<OptionItem[]>(() => [...companyBaseItems]);
  const [selectedCompany, setSelectedCompany] = useState<OptionItem | null>(null);
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [newCompanyLabel, setNewCompanyLabel] = useState('');
  const [customerUnit, setCustomerUnit] = useState('');
  const [customerRepresentative, setCustomerRepresentative] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [customerComment, setCustomerComment] = useState('');
  const [roles, setRoles] = useState<RoleDraft[]>([createRoleDraft('Аналитик')]);
  const baseRoleSkillOptions = useMemo<Record<TeamRole, OptionItem[]>>(
    () =>
      roleOptions.reduce((acc, option) => {
        const skillOptions = getSkillsByRole(option.value)
          .map((skill) => ({
            id: skill.id,
            label: skill.name,
            value: skill.id
          }))
          .sort((a, b) => a.label.localeCompare(b.label, 'ru'));
        acc[option.value] = skillOptions;
        return acc;
      }, {} as Record<TeamRole, OptionItem[]>),
    []
  );
  const createRoleSkillState = useCallback(
    () =>
      roleOptions.reduce((acc, option) => {
        acc[option.value] = [...(baseRoleSkillOptions[option.value] ?? [])];
        return acc;
      }, {} as Record<TeamRole, OptionItem[]>),
    [baseRoleSkillOptions]
  );
  const [roleSkillOptions, setRoleSkillOptions] = useState<Record<TeamRole, OptionItem[]>>(
    () => createRoleSkillState()
  );

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setOwner('');
      setExpectedImpact('');
      setTargetModule('');
      setStatus('initiated');
      setDomainItems([...domainBaseItems]);
      setSelectedDomains([]);
      setIsCreatingDomain(false);
      setNewDomainLabel('');
      setModuleItems([...moduleBaseItems]);
      setSelectedModules([]);
      setIsCreatingModule(false);
      setNewModuleLabel('');
      setCompanyItems([...companyBaseItems]);
      setSelectedCompany(null);
      setIsCreatingCompany(false);
      setNewCompanyLabel('');
      setCustomerUnit('');
      setCustomerRepresentative('');
      setCustomerContact('');
      setCustomerComment('');
      setRoles([createRoleDraft('Аналитик')]);
      setRoleSkillOptions(createRoleSkillState());
    }
  }, [
    companyBaseItems,
    createRoleSkillState,
    domainBaseItems,
    isOpen,
    moduleBaseItems
  ]);

  const handleDomainSelectionChange = (items: OptionItem[] | null) => {
    const nextItems = (items ?? []).filter((item) => item.id !== NEW_DOMAIN_OPTION_ID);
    const uniqueItems = nextItems.filter(
      (item, index, array) => array.findIndex((candidate) => candidate.value === item.value) === index
    );
    if (items?.some((item) => item.id === NEW_DOMAIN_OPTION_ID)) {
      setIsCreatingDomain(true);
    }
    setSelectedDomains(uniqueItems);
  };

  const handleModuleSelectionChange = (items: OptionItem[] | null) => {
    const nextItems = (items ?? []).filter((item) => item.id !== NEW_MODULE_OPTION_ID);
    const uniqueItems = nextItems.filter(
      (item, index, array) => array.findIndex((candidate) => candidate.value === item.value) === index
    );
    if (items?.some((item) => item.id === NEW_MODULE_OPTION_ID)) {
      setIsCreatingModule(true);
    }
    setSelectedModules(uniqueItems);
  };

  const handleCompanySelectionChange = (item: OptionItem | null) => {
    if (item?.id === NEW_COMPANY_OPTION_ID) {
      setIsCreatingCompany(true);
      return;
    }
    setSelectedCompany(item);
  };

  const handleAddCustomDomain = () => {
    const trimmed = newDomainLabel.trim();
    if (!trimmed) {
      return;
    }
    const existing = domainItems.find(
      (item) => item.label.toLowerCase() === trimmed.toLowerCase() || item.value.toLowerCase() === trimmed.toLowerCase()
    );
    const nextItem =
      existing ?? {
        id: `custom-domain-${createId()}`,
        label: trimmed,
        value: trimmed,
        isCustom: true
      };
    setDomainItems((prev) => (existing ? prev : [...prev, nextItem]));
    setSelectedDomains((prev) => {
      const combined = existing ? prev : [...prev, nextItem];
      return combined.filter(
        (item, index, array) => array.findIndex((candidate) => candidate.value === item.value) === index
      );
    });
    setNewDomainLabel('');
    setIsCreatingDomain(false);
  };

  const handleAddCustomModule = () => {
    const trimmed = newModuleLabel.trim();
    if (!trimmed) {
      return;
    }
    const existing = moduleItems.find(
      (item) => item.label.toLowerCase() === trimmed.toLowerCase() || item.value.toLowerCase() === trimmed.toLowerCase()
    );
    const nextItem =
      existing ?? {
        id: `custom-module-${createId()}`,
        label: trimmed,
        value: trimmed,
        isCustom: true
      };
    setModuleItems((prev) => (existing ? prev : [...prev, nextItem]));
    setSelectedModules((prev) => {
      const combined = existing ? prev : [...prev, nextItem];
      return combined.filter(
        (item, index, array) => array.findIndex((candidate) => candidate.value === item.value) === index
      );
    });
    setNewModuleLabel('');
    setIsCreatingModule(false);
  };

  const handleAddCustomCompany = () => {
    const trimmed = newCompanyLabel.trim();
    if (!trimmed) {
      return;
    }
    const existing = companyItems.find(
      (item) => item.label.toLowerCase() === trimmed.toLowerCase() || item.value.toLowerCase() === trimmed.toLowerCase()
    );
    const nextItem =
      existing ?? {
        id: `custom-company-${createId()}`,
        label: trimmed,
        value: trimmed,
        isCustom: true
      };
    setCompanyItems((prev) => (existing ? prev : [...prev, nextItem]));
    setSelectedCompany(nextItem);
    setNewCompanyLabel('');
    setIsCreatingCompany(false);
  };

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
          effortDays: Math.max(1, Math.round(work.effortDays)),
          tasks: work.tasks.map((task) => task.skill.trim()).filter(Boolean)
        }))
      })),
    [roles]
  );

  const draftPayload = useMemo<InitiativeCreationRequest>(
    () => {
      const roleStateMap = new Map(roles.map((role) => [role.id, role]));
      return {
        name: name.trim(),
        description: description.trim(),
        owner: owner.trim(),
        expectedImpact: expectedImpact.trim(),
        targetModuleName: targetModule.trim(),
        status,
        domains: selectedDomains.map((item) => item.value.trim()).filter(Boolean),
        potentialModules: selectedModules.map((item) => item.value.trim()).filter(Boolean),
        customer: {
          company: selectedCompany?.value.trim() ?? '',
          unit: customerUnit.trim(),
          representative: customerRepresentative.trim(),
          contact: customerContact.trim(),
          comment: customerComment.trim() || undefined
        },
        roles: planningRoles.map((role) => {
          const sourceRole = roleStateMap.get(role.id);
          const workItems = role.workItems.map((work) => {
            const sourceWork = sourceRole?.works.find((candidate) => candidate.id === work.id);
            const normalizedTasks =
              sourceWork?.tasks.map((task) => {
                const trimmedSkill = task.skill.trim();
                const base = { id: task.id, skill: trimmedSkill };
                return task.isCustom ? { ...base, isCustom: true as const } : base;
              }) ?? [];
            const filteredTasks = normalizedTasks.filter((task) => task.skill.length > 0);
            return { ...work, tasks: filteredTasks };
          });

          return {
            id: role.id,
            role: role.role,
            required: role.required,
            skills: role.skills,
            comment: sourceRole?.comment.trim() ? sourceRole.comment.trim() : undefined,
            workItems
          };
        })
      };
    },
    [
      customerComment,
      customerContact,
      customerRepresentative,
      customerUnit,
      description,
      expectedImpact,
      name,
      owner,
      planningRoles,
      roles,
      selectedCompany,
      selectedDomains,
      selectedModules,
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

  const syncWorkTasks = useCallback(
    (work: RoleWorkDraft, requiredCount: number, resetSkills = false): RoleWorkDraft => {
      const normalizedCount = Math.max(1, Math.round(requiredCount));
      const preservedTasks = work.tasks
        .slice(0, normalizedCount)
        .map((task) => ({
          ...task,
          skill: resetSkills ? '' : task.skill,
          isCustom: resetSkills ? undefined : task.isCustom
        }));
      if (preservedTasks.length < normalizedCount) {
        preservedTasks.push(
          ...Array.from({ length: normalizedCount - preservedTasks.length }, () => createWorkTaskDraft())
        );
      }
      return { ...work, tasks: preservedTasks };
    },
    []
  );

  const handleRoleChange = (roleId: string, patch: Partial<RoleDraft>) => {
    setRoles((prev) =>
      prev.map((role) => {
        if (role.id !== roleId) {
          return role;
        }

        const nextRole: RoleDraft = { ...role, ...patch };
        let shouldResetTasks = false;

        if (patch.role && patch.role !== role.role) {
          shouldResetTasks = true;
          nextRole.skillsInput = patch.skillsInput ?? '';
        }

        if (patch.required !== undefined) {
          const normalizedRequired = Math.max(1, Math.round(patch.required));
          nextRole.required = normalizedRequired;
        }

        if (shouldResetTasks || patch.required !== undefined) {
          const requiredCount = Math.max(1, Math.round(nextRole.required));
          nextRole.works = nextRole.works.map((work) =>
            syncWorkTasks(work, requiredCount, shouldResetTasks)
          );
        }

        return nextRole;
      })
    );
  };

  const handleWorkChange = (roleId: string, workId: string, patch: Partial<RoleWorkDraft>) => {
    setRoles((prev) =>
      prev.map((role) => {
        if (role.id !== roleId) {
          return role;
        }
        return {
          ...role,
          works: role.works.map((work) => {
            if (work.id !== workId) {
              return work;
            }
            const nextWork = { ...work, ...patch };
            if (patch.effortDays !== undefined) {
              const normalizedEffort = Math.max(1, Math.round(patch.effortDays));
              nextWork.effortDays = normalizedEffort;
              nextWork.durationDays = normalizedEffort;
            }
          return nextWork;
        })
      };
    })
    );
  };

  const handleWorkTaskChange = (
    roleId: string,
    workId: string,
    taskId: string,
    nextSkill: string,
    isCustom = false
  ) => {
    const normalizedSkill = nextSkill.trim();
    setRoles((prev) =>
      prev.map((role) => {
        if (role.id !== roleId) {
          return role;
        }

        return {
          ...role,
          works: role.works.map((work) => {
            if (work.id !== workId) {
              return work;
            }

            return {
              ...work,
              tasks: work.tasks.map((task) =>
                task.id === taskId
                  ? {
                      ...task,
                      skill: normalizedSkill,
                      isCustom: isCustom ? true : undefined
                    }
                  : task
              )
            };
          })
        };
      })
    );
  };

  const handleWorkTaskCreate = (
    teamRole: TeamRole,
    roleId: string,
    workId: string,
    taskId: string,
    label: string
  ) => {
    const trimmed = label.trim();
    if (!trimmed) {
      return;
    }

    setRoleSkillOptions((prev) => {
      const next = { ...prev };
      const currentOptions = [...(prev[teamRole] ?? [])];
      const existing = currentOptions.find(
        (option) => option.label.toLowerCase() === trimmed.toLowerCase()
      );

      if (!existing) {
        const option: OptionItem = {
          id: `custom-skill-${createId()}`,
          label: trimmed,
          value: trimmed,
          isCustom: true
        };
        currentOptions.push(option);
        currentOptions.sort((a, b) => a.label.localeCompare(b.label, 'ru'));
      }

      next[teamRole] = currentOptions;
      return next;
    });

    handleWorkTaskChange(roleId, workId, taskId, trimmed, true);
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
          ? {
              ...role,
              works: [
                ...role.works,
                createWorkDraft(role.works.length * 5, Math.max(1, Math.round(role.required)))
              ]
            }
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
              <Combobox<OptionItem>
                size="s"
                label="Домены"
                placeholder="Выберите домены"
                items={[...domainItems, DOMAIN_CREATE_OPTION]}
                value={selectedDomains}
                multiple
                getItemLabel={(item) => item.label}
                getItemKey={(item) => item.id}
                onChange={handleDomainSelectionChange}
              />
              <Combobox<OptionItem>
                size="s"
                label="Потенциальные модули"
                placeholder="Выберите модули"
                items={[...moduleItems, MODULE_CREATE_OPTION]}
                value={selectedModules}
                multiple
                getItemLabel={(item) => item.label}
                getItemKey={(item) => item.id}
                onChange={handleModuleSelectionChange}
              />
            </div>
            {isCreatingDomain && (
              <div className={styles.inlineCreateRow}>
                <TextField
                  size="s"
                  label="Новый домен"
                  placeholder="Введите название домена"
                  value={newDomainLabel}
                  onChange={(value) => setNewDomainLabel(value ?? '')}
                  className={styles.inlineCreateField}
                />
                <Button
                  size="s"
                  view="primary"
                  label="Добавить"
                  onClick={handleAddCustomDomain}
                  disabled={!newDomainLabel.trim()}
                />
                <Button
                  size="s"
                  view="ghost"
                  label="Отмена"
                  onClick={() => {
                    setIsCreatingDomain(false);
                    setNewDomainLabel('');
                  }}
                />
              </div>
            )}
            {isCreatingModule && (
              <div className={styles.inlineCreateRow}>
                <TextField
                  size="s"
                  label="Новый модуль"
                  placeholder="Введите название модуля"
                  value={newModuleLabel}
                  onChange={(value) => setNewModuleLabel(value ?? '')}
                  className={styles.inlineCreateField}
                />
                <Button
                  size="s"
                  view="primary"
                  label="Добавить"
                  onClick={handleAddCustomModule}
                  disabled={!newModuleLabel.trim()}
                />
                <Button
                  size="s"
                  view="ghost"
                  label="Отмена"
                  onClick={() => {
                    setIsCreatingModule(false);
                    setNewModuleLabel('');
                  }}
                />
              </div>
            )}
          </section>
          <section className={styles.section}>
            <Text size="s" weight="semibold">
              Параметры заказчика
            </Text>
            <div className={styles.gridTwoCols}>
              <Combobox<OptionItem>
                size="s"
                label="Компания"
                placeholder="Выберите компанию заказчика"
                items={[...companyItems, COMPANY_CREATE_OPTION]}
                value={selectedCompany}
                getItemLabel={(item) => item.label}
                getItemKey={(item) => item.id}
                onChange={handleCompanySelectionChange}
              />
              <TextField
                size="s"
                label="Подразделение"
                placeholder="Укажите бизнес-единицу"
                value={customerUnit}
                onChange={(value) => setCustomerUnit(value ?? '')}
              />
            </div>
            {isCreatingCompany && (
              <div className={styles.inlineCreateRow}>
                <TextField
                  size="s"
                  label="Новая компания"
                  placeholder="Введите название компании"
                  value={newCompanyLabel}
                  onChange={(value) => setNewCompanyLabel(value ?? '')}
                  className={styles.inlineCreateField}
                />
                <Button
                  size="s"
                  view="primary"
                  label="Добавить"
                  onClick={handleAddCustomCompany}
                  disabled={!newCompanyLabel.trim()}
                />
                <Button
                  size="s"
                  view="ghost"
                  label="Отмена"
                  onClick={() => {
                    setIsCreatingCompany(false);
                    setNewCompanyLabel('');
                  }}
                />
              </div>
            )}
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
                          <div className={styles.workTasks}>
                            <Text size="xs" view="secondary">
                              Назначьте задачи для {Math.max(1, Math.round(role.required))} специалиста(ов)
                              по роли {role.role}
                            </Text>
                            <div className={styles.workTaskList}>
                              {work.tasks.map((task, index) => {
                                const skillOptionsForRole = roleSkillOptions[role.role] ?? [];
                                const selectedOption =
                                  skillOptionsForRole.find((option) => option.value === task.skill) ?? null;
                                return (
                                  <Combobox<OptionItem>
                                    key={task.id}
                                    size="s"
                                    items={skillOptionsForRole}
                                    value={selectedOption}
                                    getItemLabel={(item) => item.label}
                                    getItemKey={(item) => item.value}
                                    placeholder="Выберите задачу из списка навыков"
                                    label={`Задача для сотрудника ${index + 1}`}
                                    onChange={(option) =>
                                      handleWorkTaskChange(
                                        role.id,
                                        work.id,
                                        task.id,
                                        option?.value ?? ''
                                      )
                                    }
                                    onCreate={(label) =>
                                      handleWorkTaskCreate(role.role, role.id, work.id, task.id, label)
                                    }
                                    labelForCreate="Добавить новый навык"
                                  />
                                );
                              })}
                            </div>
                          </div>
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
                        <div className={styles.recommendationHeaderInfo}>
                          <Text className={styles.recommendationRoleTitle} size="s" weight="semibold">
                            {role.role}
                          </Text>
                          <Text size="xs" view="secondary">
                            Требуется: {role.required} · Работ: {role.workItems.length}
                          </Text>
                        </div>
                        {bestScore !== undefined && (
                          <Badge
                            size="s"
                            view="filled"
                            status="system"
                            label={`${bestScore} баллов`}
                            className={styles.recommendationScoreBadge}
                          />
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
                                  <div className={styles.recommendationCandidateInfo}>
                                    <Text
                                      size="s"
                                      weight="semibold"
                                      className={styles.recommendationCandidateName}
                                    >
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
