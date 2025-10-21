import { Badge } from '@consta/uikit/Badge';
import { Button } from '@consta/uikit/Button';
import { Card } from '@consta/uikit/Card';
import { Combobox } from '@consta/uikit/Combobox';
import { Modal } from '@consta/uikit/Modal';
import { Select } from '@consta/uikit/Select';
import { Text } from '@consta/uikit/Text';
import { TextField } from '@consta/uikit/TextField';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { domainNameById, domainTree, modules } from '../data';
import type { DomainNode, ExpertProfile, InitiativeStatus, TeamRole } from '../data';
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

const collectGraphDomainIds = (domains: DomainNode[]): string[] => {
  const result: string[] = [];

  const visit = (nodes: DomainNode[]) => {
    nodes.forEach((node) => {
      const children = node.children ?? [];
      if (!node.isCatalogRoot && children.length === 0) {
        result.push(node.id);
      }
      if (children.length > 0) {
        visit(children);
      }
    });
  };

  visit(domains);
  return result;
};

const graphDomainIds = collectGraphDomainIds(domainTree);

type WorkAssignmentDraft = {
  id: string;
  role: TeamRole;
  task: string;
  description: string;
  effortDays: number;
  isCustom?: boolean;
};

type WorkDraft = {
  id: string;
  title: string;
  description: string;
  assumptions: string;
  startDay: number;
  durationDays: number;
  assignments: WorkAssignmentDraft[];
};

type CreationStep = 'details' | 'work' | 'team';

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

const creationStepOrder: CreationStep[] = ['details', 'work', 'team'];
const creationStepTitles: Record<CreationStep, string> = {
  details: 'Вводная информация',
  work: 'Оценка работ',
  team: 'Команда'
};
const creationStepDescriptions: Record<CreationStep, string> = {
  details: 'Заполните данные о заказчике и основные параметры инициативы.',
  work: 'Опишите работы по ролям, сформируйте план и уточните задачи.',
  team: 'Сформируйте команду на основе ранжирования рекомендованных экспертов.'
};

const createId = () => `tmp-${Math.random().toString(36).slice(2, 11)}`;

const createWorkAssignmentDraft = (role: TeamRole = roleOptions[0].value): WorkAssignmentDraft => ({
  id: createId(),
  role,
  task: '',
  description: '',
  effortDays: 5
});

const createWorkDraft = (offset = 0): WorkDraft => ({
  id: createId(),
  title: '',
  description: '',
  assumptions: '',
  startDay: offset,
  durationDays: 5,
  assignments: [createWorkAssignmentDraft()]
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
      graphDomainIds
        .map((id) => ({ id, label: domainNameById[id], value: id }))
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
  const [works, setWorks] = useState<WorkDraft[]>([createWorkDraft()]);
  const [activeStep, setActiveStep] = useState<CreationStep>('details');
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
      setWorks([createWorkDraft()]);
      setRoleSkillOptions(createRoleSkillState());
      setActiveStep('details');
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
      works.flatMap((work) => {
        const normalizedTitle = work.title.trim() || 'Задача';
        const normalizedStart = Math.max(0, Math.round(work.startDay));
        const normalizedDuration = Math.max(1, Math.round(work.durationDays));
        return work.assignments.map((assignment) => {
          const normalizedEffort = Math.max(1, Math.round(assignment.effortDays));
          return {
            id: `${work.id}-${assignment.id}`,
            role: assignment.role,
            title: normalizedTitle,
            startDay: normalizedStart,
            durationDays: normalizedDuration,
            effortDays: normalizedEffort
          };
        });
      }),
    [works]
  );

  const totalEffortDays = works.reduce((acc, work) => {
    const workEffort = work.assignments.reduce(
      (assignmentAcc, assignment) => assignmentAcc + Math.max(1, Math.round(assignment.effortDays)),
      0
    );
    return acc + workEffort;
  }, 0);

  const isWorkPlanningReady = useMemo(
    () =>
      works.length > 0 &&
      works.every(
        (work) =>
          work.title.trim().length > 0 &&
          work.assignments.length > 0 &&
          work.assignments.every((assignment) => assignment.task.trim().length > 0)
      ),
    [works]
  );

  const isSubmitDisabled = !name.trim() || !isWorkPlanningReady;

  useEffect(() => {
    if (activeStep === 'team' && !isWorkPlanningReady) {
      setActiveStep('work');
    }
  }, [activeStep, isWorkPlanningReady]);

  const totalSteps = creationStepOrder.length;
  const currentStepIndex = creationStepOrder.indexOf(activeStep) + 1;
  const currentStepTitle = creationStepTitles[activeStep];
  const currentStepDescription = creationStepDescriptions[activeStep];

  const { planningRoles, roleAssignmentRefs } = useMemo(() => {
    const accumulator = new Map<
      TeamRole,
      {
        assignments: {
          workId: string;
          assignmentId: string;
          workDraft: RolePlanningDraft['workItems'][number];
        }[];
        skills: Set<string>;
      }
    >();

    works.forEach((work) => {
      const normalizedTitle = work.title.trim() || 'Задача';
      const normalizedDescription = work.description.trim();
      const normalizedStart = Math.max(0, Math.round(work.startDay));
      const normalizedDuration = Math.max(1, Math.round(work.durationDays));
      work.assignments.forEach((assignment) => {
        const entry =
          accumulator.get(assignment.role) ??
          {
            assignments: [],
            skills: new Set<string>()
          };
        const trimmedTask = assignment.task.trim();
        if (trimmedTask) {
          entry.skills.add(trimmedTask);
        }

        const assignmentDescription = assignment.description.trim();
        const assignmentEffort = Math.max(1, Math.round(assignment.effortDays));

        entry.assignments.push({
          workId: work.id,
          assignmentId: assignment.id,
          workDraft: {
            id: `${work.id}-${assignment.id}`,
            title: normalizedTitle,
            description:
              assignmentDescription ||
              normalizedDescription ||
              'Описание не заполнено',
            startDay: normalizedStart,
            durationDays: normalizedDuration,
            effortDays: assignmentEffort,
            tasks: trimmedTask ? [trimmedTask] : []
          }
        });

        accumulator.set(assignment.role, entry);
      });
    });

    const assignmentRefs = new Map<
      string,
      { workId: string; assignmentId: string; workDraftId: string }[]
    >();
    const planning: RolePlanningDraft[] = Array.from(accumulator.entries()).map(
      ([role, data]) => {
        const id = role;
        assignmentRefs.set(
          id,
          data.assignments.map((item) => ({
            workId: item.workId,
            assignmentId: item.assignmentId,
            workDraftId: item.workDraft.id
          }))
        );
        return {
          id,
          role,
          required: data.assignments.length,
          skills: Array.from(data.skills),
          workItems: data.assignments.map((item) => item.workDraft)
        };
      }
    );

    return { planningRoles: planning, roleAssignmentRefs: assignmentRefs };
  }, [works]);

  const draftPayload = useMemo<InitiativeCreationRequest>(
    () => {
      const workLookup = new Map(works.map((work) => [work.id, work]));
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
          const assignmentRefs = roleAssignmentRefs.get(role.id) ?? [];
          const workItems = role.workItems.map((work) => {
            const ref = assignmentRefs.find((item) => item.workDraftId === work.id);
            const sourceWork = ref ? workLookup.get(ref.workId) : undefined;
            const assignment = ref
              ? sourceWork?.assignments.find((candidate) => candidate.id === ref.assignmentId)
              : undefined;
            const trimmedTask = assignment?.task.trim() ?? '';
            const tasks = trimmedTask
              ? [
                  assignment?.isCustom
                    ? { id: assignment.id, skill: trimmedTask, isCustom: true as const }
                    : { id: assignment?.id ?? work.id, skill: trimmedTask }
                ]
              : [];

            return {
              ...work,
              assumptions: sourceWork?.assumptions.trim() ? sourceWork.assumptions.trim() : undefined,
              tasks
            };
          });

          return {
            id: role.id,
            role: role.role,
            required: role.required,
            skills: role.skills,
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
      roleAssignmentRefs,
      selectedCompany,
      selectedDomains,
      selectedModules,
      status,
      targetModule,
      works
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

  const handleWorkChange = (workId: string, patch: Partial<WorkDraft>) => {
    setWorks((prev) =>
      prev.map((work) => {
        if (work.id !== workId) {
          return work;
        }

        const nextWork: WorkDraft = { ...work, ...patch };

        if (patch.startDay !== undefined) {
          nextWork.startDay = Math.max(0, Math.round(patch.startDay));
        }

        if (patch.durationDays !== undefined) {
          nextWork.durationDays = Math.max(1, Math.round(patch.durationDays));
        }

        return nextWork;
      })
    );
  };

  const handleAssignmentChange = (
    workId: string,
    assignmentId: string,
    patch: Partial<WorkAssignmentDraft>
  ) => {
    setWorks((prev) =>
      prev.map((work) => {
        if (work.id !== workId) {
          return work;
        }

        return {
          ...work,
          assignments: work.assignments.map((assignment) => {
            if (assignment.id !== assignmentId) {
              return assignment;
            }

            const nextAssignment: WorkAssignmentDraft = { ...assignment, ...patch };

            if (patch.effortDays !== undefined) {
              nextAssignment.effortDays = Math.max(1, Math.round(patch.effortDays));
            }

            return nextAssignment;
          })
        };
      })
    );
  };

  const handleAssignmentRoleChange = (workId: string, assignmentId: string, role: TeamRole) => {
    handleAssignmentChange(workId, assignmentId, { role, task: '', isCustom: undefined });
  };

  const handleAssignmentTaskChange = (
    workId: string,
    assignmentId: string,
    nextSkill: string,
    isCustom = false
  ) => {
    const normalizedSkill = nextSkill.trim();
    setWorks((prev) =>
      prev.map((work) => {
        if (work.id !== workId) {
          return work;
        }

        return {
          ...work,
          assignments: work.assignments.map((assignment) =>
            assignment.id === assignmentId
              ? {
                  ...assignment,
                  task: normalizedSkill,
                  isCustom: isCustom ? true : undefined
                }
              : assignment
          )
        };
      })
    );
  };

  const handleAssignmentTaskCreate = (
    teamRole: TeamRole,
    workId: string,
    assignmentId: string,
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

    handleAssignmentTaskChange(workId, assignmentId, trimmed, true);
  };

  const handleAddWork = () => {
    setWorks((prev) => [...prev, createWorkDraft(prev.length * 5)]);
  };

  const handleRemoveWork = (workId: string) => {
    setWorks((prev) => (prev.length <= 1 ? prev : prev.filter((work) => work.id !== workId)));
  };

  const handleAddAssignment = (workId: string) => {
    setWorks((prev) =>
      prev.map((work) =>
        work.id === workId
          ? {
              ...work,
              assignments: [...work.assignments, createWorkAssignmentDraft()]
            }
          : work
      )
    );
  };

  const handleRemoveAssignment = (workId: string, assignmentId: string) => {
    setWorks((prev) =>
      prev.map((work) => {
        if (work.id !== workId) {
          return work;
        }

        if (work.assignments.length <= 1) {
          return work;
        }

        return {
          ...work,
          assignments: work.assignments.filter((assignment) => assignment.id !== assignmentId)
        };
      })
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
            <div className={styles.stepInfo}>
              <Text size="l" weight="bold">
                Новая инициатива
              </Text>
              <Text size="xs" view="secondary">
                Шаг {currentStepIndex} из {totalSteps} · {currentStepTitle}
              </Text>
              <Text size="s" view="secondary">
                {currentStepDescription}
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
          {activeStep === 'details' && (
            <>
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
            </>
          )}
          {activeStep === 'work' && (
            <>
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <Text size="s" weight="semibold">
                    План работ и задачи сотрудников
                  </Text>
                  <Button size="s" view="ghost" label="Добавить работу" onClick={handleAddWork} />
                </div>
                <div className={styles.workList}>
                  {works.map((work) => (
                    <Card key={work.id} className={styles.workCard} verticalSpace="l" horizontalSpace="l">
                      <div className={styles.workHeader}>
                        <TextField
                          size="s"
                          label="Название работы"
                          placeholder="Например, Подготовка данных"
                          value={work.title}
                          onChange={(value) => handleWorkChange(work.id, { title: value ?? '' })}
                        />
                        <Button
                          size="s"
                          view="ghost"
                          label="Удалить"
                          onClick={() => handleRemoveWork(work.id)}
                          disabled={works.length <= 1}
                        />
                      </div>
                      <TextField
                        size="s"
                        label="Описание"
                        value={work.description}
                        onChange={(value) => handleWorkChange(work.id, { description: value ?? '' })}
                        type="textarea"
                        minRows={2}
                      />
                      <TextField
                        size="s"
                        label="Допущения / ограничения"
                        value={work.assumptions}
                        onChange={(value) => handleWorkChange(work.id, { assumptions: value ?? '' })}
                        type="textarea"
                        minRows={2}
                      />
                      <div className={styles.assignmentList}>
                        <div className={styles.assignmentHeader}>
                          <Text size="xs" view="secondary">
                            Назначьте роли и выберите задачи для сотрудников.
                          </Text>
                          <Button
                            size="xs"
                            view="ghost"
                            label="Добавить сотрудника"
                            onClick={() => handleAddAssignment(work.id)}
                          />
                        </div>
                        <div className={styles.assignmentGrid}>
                          {work.assignments.map((assignment, index) => {
                            const roleOption =
                              roleOptions.find((option) => option.value === assignment.role) ?? roleOptions[0];
                            const skillOptionsForRole = roleSkillOptions[assignment.role] ?? [];
                            const selectedTask =
                              skillOptionsForRole.find((option) => option.value === assignment.task) ?? null;
                            return (
                              <div key={assignment.id} className={styles.assignmentCard}>
                                <div className={styles.assignmentRow}>
                                  <Select<SelectOption<TeamRole>>
                                    size="s"
                                    label={`Роль сотрудника ${index + 1}`}
                                    items={roleOptions}
                                    value={roleOption}
                                    getItemLabel={(item) => item.label}
                                    getItemKey={(item) => item.value}
                                    onChange={(option) =>
                                      option && handleAssignmentRoleChange(work.id, assignment.id, option.value)
                                    }
                                  />
                                  <Button
                                    size="xs"
                                    view="ghost"
                                    label="Удалить"
                                    onClick={() => handleRemoveAssignment(work.id, assignment.id)}
                                    disabled={work.assignments.length <= 1}
                                  />
                                </div>
                                <Combobox<OptionItem>
                                  size="s"
                                  items={skillOptionsForRole}
                                  value={selectedTask}
                                  getItemLabel={(item) => item.label}
                                  getItemKey={(item) => item.value}
                                  placeholder="Выберите задачу из списка навыков"
                                  label={`Задача для сотрудника ${index + 1}`}
                                  onChange={(option) =>
                                    handleAssignmentTaskChange(
                                      work.id,
                                      assignment.id,
                                      option?.value ?? ''
                                    )
                                  }
                                  onCreate={(label) =>
                                    handleAssignmentTaskCreate(
                                      assignment.role,
                                      work.id,
                                      assignment.id,
                                      label
                                    )
                                  }
                                  labelForCreate="Добавить новую задачу"
                                />
                                <TextField
                                  size="s"
                                  label="Описание задачи"
                                  value={assignment.description}
                                  onChange={(value) =>
                                    handleAssignmentChange(work.id, assignment.id, {
                                      description: value ?? ''
                                    })
                                  }
                                  type="textarea"
                                  minRows={2}
                                />
                                <TextField
                                  size="s"
                                  label="Трудозатраты (дней)"
                                  type="number"
                                  value={String(assignment.effortDays)}
                                  onChange={(value) =>
                                    handleAssignmentChange(work.id, assignment.id, {
                                      effortDays: Number(value ?? assignment.effortDays) || 1
                                    })
                                  }
                                />
                              </div>
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
                            handleWorkChange(work.id, {
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
                            handleWorkChange(work.id, {
                              durationDays: Number(value ?? work.durationDays) || 1
                            })
                          }
                        />
                      </div>
                    </Card>
                  ))}
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
            </>
          )}
          {activeStep === 'team' && (
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
          )}
          <footer className={styles.footer}>
            <Button size="s" view="ghost" label="Отмена" onClick={onClose} disabled={isSubmitting} />
            {activeStep === 'details' && (
              <Button
                size="s"
                view="primary"
                label="Оценка работ"
                onClick={() => setActiveStep('work')}
                disabled={isSubmitting}
              />
            )}
            {activeStep === 'work' && (
              <>
                <Button
                  size="s"
                  view="ghost"
                  label="Назад"
                  onClick={() => setActiveStep('details')}
                  disabled={isSubmitting}
                />
                <Button
                  size="s"
                  view="primary"
                  label="Сформировать команду"
                  onClick={() => setActiveStep('team')}
                  disabled={!isWorkPlanningReady || isSubmitting}
                />
              </>
            )}
            {activeStep === 'team' && (
              <>
                <Button
                  size="s"
                  view="ghost"
                  label="Назад"
                  onClick={() => setActiveStep('work')}
                  disabled={isSubmitting}
                />
                <Button
                  size="s"
                  view="primary"
                  label="Создать инициативу"
                  onClick={handleSubmit}
                  disabled={isSubmitDisabled || isSubmitting}
                />
              </>
            )}
          </footer>
        </div>
      </Modal>
    </>
  );
};

export default InitiativeCreationModal;
