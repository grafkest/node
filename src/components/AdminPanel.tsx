import { Button } from '@consta/uikit/Button';
import { Combobox } from '@consta/uikit/Combobox';
import { Collapse } from '@consta/uikit/Collapse';
import { Select } from '@consta/uikit/Select';
import { Switch } from '@consta/uikit/Switch';
import { Tabs } from '@consta/uikit/Tabs';
import { Text } from '@consta/uikit/Text';
import React, { useEffect, useMemo, useState } from 'react';
import {
  type ArtifactNode,
  type DomainNode,
  type LibraryDependency,
  type ModuleInput,
  type ModuleMetrics,
  type ModuleNode,
  type ModuleOutput,
  type ModuleStatus,
  type NonFunctionalRequirements,
  type RidOwner,
  type TeamMember,
  type TeamRole,
  type UserStats
} from '../data';
import styles from './AdminPanel.module.css';

export type ModuleDraftPayload = {
  name: string;
  description: string;
  productName: string;
  team: string;
  status: ModuleStatus;
  domainIds: string[];
  dependencyIds: string[];
  producedArtifactIds: string[];
  dataIn: ModuleInput[];
  dataOut: ModuleOutput[];
  ridOwner: RidOwner;
  localization: string;
  userStats: UserStats;
  technologyStack: string[];
  projectTeam: Array<Pick<TeamMember, 'id' | 'fullName' | 'role'>>;
  repository?: string;
  api?: string;
  specificationUrl: string;
  apiContractsUrl: string;
  techDesignUrl: string;
  architectureDiagramUrl: string;
  licenseServerIntegrated: boolean;
  libraries: LibraryDependency[];
  clientType: ModuleNode['clientType'];
  deploymentTool: ModuleNode['deploymentTool'];
  reuseScore: number;
  metrics: ModuleMetrics;
  formula: string;
  nonFunctional: NonFunctionalRequirements;
};

export type DomainDraftPayload = {
  name: string;
  description: string;
  parentId?: string;
  moduleIds: string[];
  isCatalogRoot: boolean;
};

export type ArtifactDraftPayload = {
  name: string;
  description: string;
  domainId?: string;
  producedBy?: string;
  consumerIds: string[];
  dataType: string;
  sampleUrl: string;
};

type AdminPanelProps = {
  modules: ModuleNode[];
  domains: DomainNode[];
  artifacts: ArtifactNode[];
  onCreateModule: (draft: ModuleDraftPayload) => void;
  onUpdateModule: (id: string, draft: ModuleDraftPayload) => void;
  onDeleteModule: (id: string) => void;
  onCreateDomain: (draft: DomainDraftPayload) => void;
  onUpdateDomain: (id: string, draft: DomainDraftPayload) => void;
  onDeleteDomain: (id: string) => void;
  onCreateArtifact: (draft: ArtifactDraftPayload) => void;
  onUpdateArtifact: (id: string, draft: ArtifactDraftPayload) => void;
  onDeleteArtifact: (id: string) => void;
};

type AdminTab = 'module' | 'domain' | 'artifact';

type SelectItem<Value extends string> = {
  label: string;
  value: Value;
};

type ModuleSectionId = 'general' | 'calculation' | 'technical' | 'nonFunctional';

type ModuleSection = {
  id: ModuleSectionId;
  title: string;
};

const moduleSections: ModuleSection[] = [
  { id: 'general', title: 'Общая информация' },
  { id: 'calculation', title: 'Расчётный узел' },
  { id: 'technical', title: 'Технические сведения' },
  { id: 'nonFunctional', title: 'Нефункциональные требования' }
];

type DomainSectionId = 'basic' | 'relations';

type ArtifactSectionId = 'basic' | 'relations';

const adminTabs = [
  { label: 'Модули', value: 'module' },
  { label: 'Домены', value: 'domain' },
  { label: 'Артефакты', value: 'artifact' }
] as const satisfies readonly { label: string; value: AdminTab }[];

const ROOT_DOMAIN_OPTION = '__root__';

const statusLabels: Record<ModuleStatus, string> = {
  'in-dev': 'В разработке',
  production: 'В эксплуатации',
  deprecated: 'Устаревший'
};

const clientTypeLabels: Record<ModuleNode['clientType'], string> = {
  desktop: 'Desktop-приложение',
  web: 'Web-интерфейс'
};

const deploymentToolLabels: Record<ModuleNode['deploymentTool'], string> = {
  docker: 'Docker',
  kubernetes: 'Kubernetes'
};

const teamRoleOptions: SelectItem<TeamRole>[] = (
  [
    'Владелец продукта',
    'Эксперт R&D',
    'Аналитик',
    'Backend',
    'Frontend',
    'Архитектор',
    'Тестировщик'
  ] as TeamRole[]
).map((role) => ({ label: role, value: role }));

const AdminPanel: React.FC<AdminPanelProps> = ({
  modules,
  domains,
  artifacts,
  onCreateModule,
  onUpdateModule,
  onDeleteModule,
  onCreateDomain,
  onUpdateDomain,
  onDeleteDomain,
  onCreateArtifact,
  onUpdateArtifact,
  onDeleteArtifact
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('module');

  const domainLabelMap = useMemo(() => buildDomainLabelMap(domains), [domains]);
  const moduleLabelMap = useMemo(() => buildModuleLabelMap(modules), [modules]);
  const artifactLabelMap = useMemo(() => buildArtifactLabelMap(artifacts), [artifacts]);

  const moduleOptions = useMemo<SelectItem<string>[]>(() => {
    const base = modules
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
      .map<SelectItem<string>>((module) => ({ label: module.name, value: module.id }));
    return [{ label: 'Создать новый модуль', value: '__new__' }, ...base];
  }, [modules]);

  const domainOptions = useMemo<SelectItem<string>[]>(() => {
    const flattened = flattenDomainTree(domains);
    const base = flattened
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
      .map<SelectItem<string>>((domain) => ({ label: domain.name, value: domain.id }));
    return [{ label: 'Создать новый домен', value: '__new__' }, ...base];
  }, [domains]);

  const artifactOptions = useMemo<SelectItem<string>[]>(() => {
    const base = artifacts
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
      .map<SelectItem<string>>((artifact) => ({ label: artifact.name, value: artifact.id }));
    return [{ label: 'Создать новый артефакт', value: '__new__' }, ...base];
  }, [artifacts]);

  const leafDomainIds = useMemo(() => collectLeafDomainIds(domains), [domains]);
  const domainParentItems = useMemo(
    () => [ROOT_DOMAIN_OPTION, ...domainOptions.slice(1).map((item) => item.value)],
    [domainOptions]
  );
  const domainParentLabelMap = useMemo(
    () => ({ [ROOT_DOMAIN_OPTION]: 'Корневой домен', ...domainLabelMap }),
    [domainLabelMap]
  );

  const [selectedModuleId, setSelectedModuleId] = useState<string>('__new__');
  const [selectedDomainId, setSelectedDomainId] = useState<string>('__new__');
  const [selectedArtifactId, setSelectedArtifactId] = useState<string>('__new__');

  const [moduleDraft, setModuleDraft] = useState<ModuleDraftPayload>(() => createDefaultModuleDraft());
  const [moduleStep, setModuleStep] = useState<number>(0);

  const [domainDraft, setDomainDraft] = useState<DomainDraftPayload>(() => createDefaultDomainDraft());
  const [domainStep, setDomainStep] = useState<number>(0);

  const [artifactDraft, setArtifactDraft] = useState<ArtifactDraftPayload>(() => createDefaultArtifactDraft());
  const [artifactStep, setArtifactStep] = useState<number>(0);

  useEffect(() => {
    const nextOption = moduleOptions.find((item) => item.value === selectedModuleId);
    if (!nextOption) {
      setSelectedModuleId('__new__');
      setModuleDraft(createDefaultModuleDraft());
      setModuleStep(0);
      return;
    }

    if (nextOption.value === '__new__') {
      setModuleDraft(createDefaultModuleDraft());
      setModuleStep(0);
      return;
    }

    const target = modules.find((module) => module.id === nextOption.value);
    if (target) {
      setModuleDraft(moduleToDraft(target));
      setModuleStep(0);
    }
  }, [moduleOptions, modules, selectedModuleId]);

  useEffect(() => {
    const nextOption = domainOptions.find((item) => item.value === selectedDomainId);
    if (!nextOption) {
      setSelectedDomainId('__new__');
      setDomainDraft(createDefaultDomainDraft());
      setDomainStep(0);
      return;
    }

    if (nextOption.value === '__new__') {
      setDomainDraft(createDefaultDomainDraft());
      setDomainStep(0);
      return;
    }

    const target = findDomainById(domains, nextOption.value);
    if (target) {
      setDomainDraft(domainToDraft(target, domains, modules));
      setDomainStep(0);
    }
  }, [domainOptions, domains, modules, selectedDomainId]);

  useEffect(() => {
    const nextOption = artifactOptions.find((item) => item.value === selectedArtifactId);
    if (!nextOption) {
      setSelectedArtifactId('__new__');
      setArtifactDraft(createDefaultArtifactDraft());
      setArtifactStep(0);
      return;
    }

    if (nextOption.value === '__new__') {
      setArtifactDraft(createDefaultArtifactDraft());
      setArtifactStep(0);
      return;
    }

    const target = artifacts.find((artifact) => artifact.id === nextOption.value);
    if (target) {
      setArtifactDraft(artifactToDraft(target));
      setArtifactStep(0);
    }
  }, [artifactOptions, artifacts, selectedArtifactId]);

  const handleModuleSubmit = () => {
    if (selectedModuleId === '__new__' && moduleDraft.domainIds.length === 0) {
      setModuleStep(0);
      return;
    }

    if (selectedModuleId === '__new__') {
      onCreateModule(moduleDraft);
      setModuleDraft(createDefaultModuleDraft());
      setModuleStep(0);
    } else {
      onUpdateModule(selectedModuleId, moduleDraft);
    }
  };

  const handleModuleDelete = () => {
    if (selectedModuleId === '__new__') {
      return;
    }
    onDeleteModule(selectedModuleId);
    setSelectedModuleId('__new__');
  };

  const handleDomainSubmit = () => {
    if (selectedDomainId === '__new__') {
      onCreateDomain(domainDraft);
      setDomainDraft(createDefaultDomainDraft());
      setDomainStep(0);
    } else {
      onUpdateDomain(selectedDomainId, domainDraft);
    }
  };

  const handleDomainDelete = () => {
    if (selectedDomainId === '__new__') {
      return;
    }
    onDeleteDomain(selectedDomainId);
    setSelectedDomainId('__new__');
  };

  const handleArtifactSubmit = () => {
    if (selectedArtifactId === '__new__') {
      onCreateArtifact(artifactDraft);
      setArtifactDraft(createDefaultArtifactDraft());
      setArtifactStep(0);
    } else {
      onUpdateArtifact(selectedArtifactId, artifactDraft);
    }
  };

  const handleArtifactDelete = () => {
    if (selectedArtifactId === '__new__') {
      return;
    }
    onDeleteArtifact(selectedArtifactId);
    setSelectedArtifactId('__new__');
  };

  const moduleSelectValue = moduleOptions.find((item) => item.value === selectedModuleId) ?? moduleOptions[0];
  const domainSelectValue = domainOptions.find((item) => item.value === selectedDomainId) ?? domainOptions[0];
  const artifactSelectValue =
    artifactOptions.find((item) => item.value === selectedArtifactId) ?? artifactOptions[0];

  return (
    <div className={styles.container}>
      <div className={styles.selector}>
        <Text size="s" weight="semibold" className={styles.selectorTitle}>
          Панель администратора
        </Text>
        <Text size="xs" view="secondary" className={styles.selectorHint}>
          Выберите тип сущности и карточку для редактирования либо создайте новую.
        </Text>
        <Tabs
          size="s"
          items={adminTabs}
          value={adminTabs.find((tab) => tab.value === activeTab)}
          getItemLabel={(item) => item.label}
          getItemKey={(item) => item.value}
          onChange={(tab) => {
            setActiveTab(tab.value);
          }}
        />
        <div className={styles.selectorActions}>
          {activeTab === 'module' && (
            <Select<SelectItem<string>>
              size="s"
              items={moduleOptions}
              value={moduleSelectValue}
              getItemLabel={(item) => item.label}
              getItemKey={(item) => item.value}
              onChange={(value) => {
                if (value) {
                  setSelectedModuleId(value.value);
                }
              }}
            />
          )}
          {activeTab === 'domain' && (
            <Select<SelectItem<string>>
              size="s"
              items={domainOptions}
              value={domainSelectValue}
              getItemLabel={(item) => item.label}
              getItemKey={(item) => item.value}
              onChange={(value) => {
                if (value) {
                  setSelectedDomainId(value.value);
                }
              }}
            />
          )}
          {activeTab === 'artifact' && (
            <Select<SelectItem<string>>
              size="s"
              items={artifactOptions}
              value={artifactSelectValue}
              getItemLabel={(item) => item.label}
              getItemKey={(item) => item.value}
              onChange={(value) => {
                if (value) {
                  setSelectedArtifactId(value.value);
                }
              }}
            />
          )}
        </div>
      </div>

      <div className={styles.formWrapper}>
        {activeTab === 'module' && (
          <ModuleForm
            mode={selectedModuleId === '__new__' ? 'create' : 'edit'}
            draft={moduleDraft}
            step={moduleStep}
            domainItems={leafDomainIds}
            domainLabelMap={domainLabelMap}
            moduleItems={modules.map((module) => module.id)}
            moduleLabelMap={moduleLabelMap}
            artifactItems={artifacts.map((artifact) => artifact.id)}
            artifactLabelMap={artifactLabelMap}
            onChange={setModuleDraft}
            onStepChange={setModuleStep}
            onSubmit={handleModuleSubmit}
            onDelete={selectedModuleId === '__new__' ? undefined : handleModuleDelete}
          />
        )}

        {activeTab === 'domain' && (
          <DomainForm
            mode={selectedDomainId === '__new__' ? 'create' : 'edit'}
            draft={domainDraft}
            step={domainStep}
            parentItems={domainParentItems}
            parentLabelMap={domainParentLabelMap}
            moduleItems={modules.map((module) => module.id)}
            moduleLabelMap={moduleLabelMap}
            onChange={setDomainDraft}
            onStepChange={setDomainStep}
            onSubmit={handleDomainSubmit}
            onDelete={selectedDomainId === '__new__' ? undefined : handleDomainDelete}
          />
        )}

        {activeTab === 'artifact' && (
          <ArtifactForm
            mode={selectedArtifactId === '__new__' ? 'create' : 'edit'}
            draft={artifactDraft}
            step={artifactStep}
            domainItems={leafDomainIds}
            domainLabelMap={domainLabelMap}
            moduleItems={modules.map((module) => module.id)}
            moduleLabelMap={moduleLabelMap}
            artifactItems={artifacts.map((artifact) => artifact.id)}
            artifactLabelMap={artifactLabelMap}
            onChange={setArtifactDraft}
            onStepChange={setArtifactStep}
            onSubmit={handleArtifactSubmit}
            onDelete={selectedArtifactId === '__new__' ? undefined : handleArtifactDelete}
          />
        )}
      </div>
    </div>
  );
};

type ModuleFormProps = {
  mode: 'create' | 'edit';
  draft: ModuleDraftPayload;
  step: number;
  domainItems: string[];
  domainLabelMap: Record<string, string>;
  moduleItems: string[];
  moduleLabelMap: Record<string, string>;
  artifactItems: string[];
  artifactLabelMap: Record<string, string>;
  onChange: (draft: ModuleDraftPayload) => void;
  onStepChange: (step: number) => void;
  onSubmit: () => void;
  onDelete?: () => void;
};

const ModuleForm: React.FC<ModuleFormProps> = ({
  mode,
  draft,
  step,
  domainItems,
  domainLabelMap,
  moduleItems,
  moduleLabelMap,
  artifactItems,
  artifactLabelMap,
  onChange,
  onStepChange,
  onSubmit,
  onDelete
}) => {
  const [technologyInput, setTechnologyInput] = useState('');
  const [libraryNameInput, setLibraryNameInput] = useState('');
  const [libraryVersionInput, setLibraryVersionInput] = useState('');

  const isDomainMissing = mode === 'create' && draft.domainIds.length === 0;

  useEffect(() => {
    setTechnologyInput('');
    setLibraryNameInput('');
    setLibraryVersionInput('');
  }, [draft]);

  const goToStep = (nextStep: number) => {
    const normalized = Math.min(Math.max(nextStep, 0), moduleSections.length - 1);
    onStepChange(normalized);
  };

  const handleFieldChange = <Key extends keyof ModuleDraftPayload>(
    key: Key,
    value: ModuleDraftPayload[Key]
  ) => {
    onChange({ ...draft, [key]: value });
  };

  const updateRidOwner = (patch: Partial<RidOwner>) => {
    handleFieldChange('ridOwner', { ...draft.ridOwner, ...patch });
  };

  const updateUserStats = (patch: Partial<UserStats>) => {
    handleFieldChange('userStats', { ...draft.userStats, ...patch });
  };

  const updateMetrics = (patch: Partial<ModuleMetrics>) => {
    handleFieldChange('metrics', { ...draft.metrics, ...patch });
  };

  const updateNonFunctional = (patch: Partial<NonFunctionalRequirements>) => {
    handleFieldChange('nonFunctional', { ...draft.nonFunctional, ...patch });
  };

  const addTechnology = () => {
    const value = technologyInput.trim();
    if (!value || draft.technologyStack.includes(value)) {
      return;
    }
    handleFieldChange('technologyStack', [...draft.technologyStack, value]);
    setTechnologyInput('');
  };

  const removeTechnology = (value: string) => {
    handleFieldChange(
      'technologyStack',
      draft.technologyStack.filter((item) => item !== value)
    );
  };

  const addLibrary = () => {
    const name = libraryNameInput.trim();
    const version = libraryVersionInput.trim();
    if (!name || !version) {
      return;
    }
    handleFieldChange('libraries', [...draft.libraries, { name, version }]);
    setLibraryNameInput('');
    setLibraryVersionInput('');
  };

  const updateLibrary = (index: number, patch: Partial<LibraryDependency>) => {
    const next = draft.libraries.map((library, idx) =>
      idx === index ? { ...library, ...patch } : library
    );
    handleFieldChange('libraries', next);
  };

  const removeLibrary = (index: number) => {
    handleFieldChange(
      'libraries',
      draft.libraries.filter((_, idx) => idx !== index)
    );
  };

  const updateProjectMember = (index: number, patch: Partial<TeamMember>) => {
    const next = draft.projectTeam.map((member, idx) =>
      idx === index ? { ...member, ...patch } : member
    );
    handleFieldChange('projectTeam', next);
  };

  const addProjectMember = () => {
    handleFieldChange('projectTeam', [
      ...draft.projectTeam,
      { id: `member-${draft.projectTeam.length + 1}`, fullName: '', role: 'Аналитик' }
    ]);
  };

  const removeProjectMember = (index: number) => {
    handleFieldChange(
      'projectTeam',
      draft.projectTeam.filter((_, idx) => idx !== index)
    );
  };

  const addDataIn = () => {
    handleFieldChange('dataIn', [
      ...draft.dataIn,
      { id: `input-${draft.dataIn.length + 1}`, label: '', sourceId: undefined }
    ]);
  };

  const updateDataIn = (index: number, patch: Partial<ModuleInput>) => {
    const next = draft.dataIn.map((item, idx) =>
      idx === index ? { ...item, ...patch } : item
    );
    handleFieldChange('dataIn', next);
  };

  const removeDataIn = (index: number) => {
    if (draft.dataIn.length === 1) {
      return;
    }
    handleFieldChange(
      'dataIn',
      draft.dataIn.filter((_, idx) => idx !== index)
    );
  };

  const addDataOut = () => {
    handleFieldChange('dataOut', [
      ...draft.dataOut,
      { id: `output-${draft.dataOut.length + 1}`, label: '', consumerIds: [] }
    ]);
  };

  const updateDataOut = (index: number, patch: Partial<ModuleOutput>) => {
    const next = draft.dataOut.map((item, idx) =>
      idx === index ? { ...item, ...patch } : item
    );
    handleFieldChange('dataOut', next);
  };

  const removeDataOut = (index: number) => {
    if (draft.dataOut.length === 1) {
      return;
    }
    handleFieldChange(
      'dataOut',
      draft.dataOut.filter((_, idx) => idx !== index)
    );
  };

  const currentStep = Math.min(Math.max(step, 0), moduleSections.length - 1);

  return (
    <div className={styles.formBody}>
      <div className={styles.formHeader}>
        <div>
          <Text size="l" weight="semibold" className={styles.formTitle}>
            {mode === 'create' ? 'Создание нового модуля' : 'Редактирование модуля'}
          </Text>
          <Text size="xs" view="secondary" className={styles.formSubtitle}>
            Заполните карточку по разделам, как в просмотре. После завершения сохраните изменения.
          </Text>
        </div>
        {onDelete && (
          <Button view="clear" label="Удалить модуль" size="s" onClick={onDelete} />
        )}
      </div>

      {moduleSections.map((section, index) => (
        <Collapse
          key={section.id}
          isOpen={currentStep === index}
          onClick={() => goToStep(index)}
          label={
            <div className={styles.collapseLabel}>
              <Text size="s" weight="semibold">
                {section.title}
              </Text>
              <Text size="xs" view="secondary">
                Раздел {index + 1} из {moduleSections.length}
              </Text>
            </div>
          }
        >
          <div className={styles.sectionContent}>
            {section.id === 'general' && (
              <>
                <div className={styles.fieldGroup}>
                  <label className={styles.field}>
                    <Text size="xs" weight="semibold" className={styles.label}>
                      Название
                    </Text>
                    <input
                      className={styles.input}
                      value={draft.name}
                      onChange={(event) => handleFieldChange('name', event.target.value)}
                      placeholder="Например, Realtime Analytics Engine"
                    />
                  </label>
                  <label className={styles.field}>
                    <Text size="xs" weight="semibold" className={styles.label}>
                      Статус
                    </Text>
                    <Combobox<ModuleStatus>
                      size="s"
                      items={Object.keys(statusLabels) as ModuleStatus[]}
                      value={draft.status}
                      getItemKey={(item) => item}
                      getItemLabel={(item) => statusLabels[item]}
                      onChange={(value) => handleFieldChange('status', value ?? 'in-dev')}
                      className={styles.input}
                    />
                  </label>
                  <label className={styles.field}>
                    <Text size="xs" weight="semibold" className={styles.label}>
                      Команда
                    </Text>
                    <input
                      className={styles.input}
                      value={draft.team}
                      onChange={(event) => handleFieldChange('team', event.target.value)}
                      placeholder="Команда сопровождения"
                    />
                  </label>
                  <label className={styles.field}>
                    <Text size="xs" weight="semibold" className={styles.label}>
                      Название продукта
                    </Text>
                    <input
                      className={styles.input}
                      value={draft.productName}
                      onChange={(event) => handleFieldChange('productName', event.target.value)}
                      placeholder="Например, Digital Twin Suite"
                    />
                  </label>
                  <label className={styles.field}>
                    <Text size="xs" weight="semibold" className={styles.label}>
                      Локализация функции
                    </Text>
                    <input
                      className={styles.input}
                      value={draft.localization}
                      onChange={(event) => handleFieldChange('localization', event.target.value)}
                      placeholder="ru"
                    />
                  </label>
                  <label className={styles.field}>
                    <Text size="xs" weight="semibold" className={styles.label}>
                      Количество компаний
                    </Text>
                    <input
                      className={styles.numberInput}
                      type="number"
                      value={draft.userStats.companies}
                      min={0}
                      onChange={(event) =>
                        updateUserStats({ companies: Number(event.target.value) || 0 })
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    <Text size="xs" weight="semibold" className={styles.label}>
                      Количество лицензий
                    </Text>
                    <input
                      className={styles.numberInput}
                      type="number"
                      value={draft.userStats.licenses}
                      min={0}
                      onChange={(event) =>
                        updateUserStats({ licenses: Number(event.target.value) || 0 })
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    <Text size="xs" weight="semibold" className={styles.label}>
                      Оценка переиспользования
                    </Text>
                    <input
                      className={styles.numberInput}
                      type="number"
                      value={draft.reuseScore}
                      min={0}
                      max={100}
                      onChange={(event) =>
                        handleFieldChange('reuseScore', Number(event.target.value) || 0)
                      }
                    />
                  </label>
                </div>

                <label className={styles.field}>
                  <Text size="xs" weight="semibold" className={styles.label}>
                    Описание
                  </Text>
                  <textarea
                    className={styles.textarea}
                    value={draft.description}
                    onChange={(event) => handleFieldChange('description', event.target.value)}
                    placeholder="Опишите назначение и ключевые сценарии использования"
                  />
                </label>

                <label className={styles.field}>
                  <Text size="xs" weight="semibold" className={styles.label}>
                    Доменные области
                  </Text>
                  <Combobox<string>
                    size="s"
                    items={domainItems}
                    value={draft.domainIds}
                    multiple
                    selectAll
                    getItemKey={(item) => item}
                    getItemLabel={(item) => domainLabelMap[item] ?? item}
                    onChange={(value) => handleFieldChange('domainIds', value ?? [])}
                  />
                </label>
                <Text size="2xs" view="secondary" className={styles.hint}>
                  Можно привязывать только конечные домены без дочерних областей.
                </Text>
                {isDomainMissing && (
                  <Text size="2xs" view="alert" className={styles.error}>
                    Выберите хотя бы одну доменную область, чтобы сохранить модуль.
                  </Text>
                )}

                <div className={styles.fieldGroup}>
                  <label className={styles.field}>
                    <Text size="xs" weight="semibold" className={styles.label}>
                      Компания-владелец РИД
                    </Text>
                    <input
                      className={styles.input}
                      value={draft.ridOwner.company}
                      onChange={(event) => updateRidOwner({ company: event.target.value })}
                      placeholder="АО Компания"
                    />
                  </label>
                  <label className={styles.field}>
                    <Text size="xs" weight="semibold" className={styles.label}>
                      Подразделение
                    </Text>
                    <input
                      className={styles.input}
                      value={draft.ridOwner.division}
                      onChange={(event) => updateRidOwner({ division: event.target.value })}
                      placeholder="Центр компетенций"
                    />
                  </label>
                </div>

                <div>
                  <Text size="xs" weight="semibold" className={styles.label}>
                    Технологический стек
                  </Text>
                  <div className={styles.actionsRow}>
                    <input
                      className={styles.input}
                      value={technologyInput}
                      onChange={(event) => setTechnologyInput(event.target.value)}
                      placeholder="Например, TypeScript"
                    />
                    <Button size="xs" view="secondary" label="Добавить" onClick={addTechnology} />
                  </div>
                  {draft.technologyStack.length > 0 && (
                    <div className={styles.chipList}>
                      {draft.technologyStack.map((item) => (
                        <span key={item} className={styles.chip}>
                          <Text size="xs">{item}</Text>
                          <button
                            type="button"
                            className={styles.chipButton}
                            onClick={() => removeTechnology(item)}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <Text size="xs" weight="semibold" className={styles.label}>
                    Команда проекта
                  </Text>
                  <ul className={styles.list}>
                    {draft.projectTeam.map((member, index) => (
                      <li key={member.id ?? `member-${index}`} className={styles.listItem}>
                        <input
                          className={styles.input}
                          value={member.fullName}
                          onChange={(event) =>
                            updateProjectMember(index, { fullName: event.target.value })
                          }
                          placeholder="Фамилия Имя"
                        />
                        <Select<SelectItem<TeamRole>>
                          size="s"
                          items={teamRoleOptions}
                          value={teamRoleOptions.find((item) => item.value === member.role) ?? null}
                          getItemKey={(item) => item.value}
                          getItemLabel={(item) => item.label}
                          onChange={({ value }) => {
                            if (value) {
                              updateProjectMember(index, { role: value.value });
                            }
                          }}
                        />
                        <Button
                          size="xs"
                          view="ghost"
                          label="Удалить"
                          onClick={() => removeProjectMember(index)}
                          disabled={draft.projectTeam.length === 1}
                        />
                      </li>
                    ))}
                  </ul>
                  <Button size="xs" view="secondary" label="Добавить участника" onClick={addProjectMember} />
                </div>
              </>
            )}

            {section.id === 'calculation' && (
              <>
                <label className={styles.field}>
                  <Text size="xs" weight="semibold" className={styles.label}>
                    Зависит от модулей
                  </Text>
                  <Combobox<string>
                    size="s"
                    items={moduleItems}
                    value={draft.dependencyIds}
                    multiple
                    getItemKey={(item) => item}
                    getItemLabel={(item) => moduleLabelMap[item] ?? item}
                    onChange={(value) => handleFieldChange('dependencyIds', value ?? [])}
                  />
                </label>

                <label className={styles.field}>
                  <Text size="xs" weight="semibold" className={styles.label}>
                    Производит артефакты
                  </Text>
                  <Combobox<string>
                    size="s"
                    items={artifactItems}
                    value={draft.producedArtifactIds}
                    multiple
                    getItemKey={(item) => item}
                    getItemLabel={(item) => artifactLabelMap[item] ?? item}
                    onChange={(value) => handleFieldChange('producedArtifactIds', value ?? [])}
                  />
                </label>

                <div>
                  <Text size="xs" weight="semibold" className={styles.label}>
                    Входные данные
                  </Text>
                  <ul className={styles.list}>
                    {draft.dataIn.map((input, index) => (
                      <li key={input.id ?? `input-${index}`} className={styles.listItem}>
                        <input
                          className={styles.input}
                          value={input.label}
                          onChange={(event) =>
                            updateDataIn(index, { label: event.target.value })
                          }
                          placeholder="Название входного набора"
                        />
                        <Combobox<string>
                          size="s"
                          items={artifactItems}
                          value={input.sourceId}
                          getItemKey={(item) => item}
                          getItemLabel={(item) => artifactLabelMap[item] ?? item}
                          onChange={(value) => updateDataIn(index, { sourceId: value ?? undefined })}
                        />
                        <Button
                          size="xs"
                          view="ghost"
                          label="Удалить"
                          onClick={() => removeDataIn(index)}
                          disabled={draft.dataIn.length === 1}
                        />
                      </li>
                    ))}
                  </ul>
                  <Button size="xs" view="secondary" label="Добавить вход" onClick={addDataIn} />
                </div>

                <div>
                  <Text size="xs" weight="семibold" className={styles.label}>
                    Выходные данные
                  </Text>
                  <ul className={styles.list}>
                    {draft.dataOut.map((output, index) => (
                      <li key={output.id ?? `output-${index}`} className={styles.listItem}>
                        <input
                          className={styles.input}
                          value={output.label}
                          onChange={(event) =>
                            updateDataOut(index, { label: event.target.value })
                          }
                          placeholder="Название выхода"
                        />
                        <Combobox<string>
                          size="s"
                          items={moduleItems}
                          value={output.consumerIds ?? []}
                          multiple
                          getItemKey={(item) => item}
                          getItemLabel={(item) => moduleLabelMap[item] ?? item}
                          onChange={(value) =>
                            updateDataOut(index, { consumerIds: value ?? [] })
                          }
                        />
                        <Button
                          size="xs"
                          view="ghost"
                          label="Удалить"
                          onClick={() => removeDataOut(index)}
                          disabled={draft.dataOut.length === 1}
                        />
                      </li>
                    ))}
                  </ul>
                  <Button size="xs" view="secondary" label="Добавить выход" onClick={addDataOut} />
                </div>

                <label className={styles.field}>
                  <Text size="xs" weight="semibold" className={styles.label}>
                    Формула расчёта
                  </Text>
                  <textarea
                    className={styles.textarea}
                    value={draft.formula}
                    onChange={(event) => handleFieldChange('formula', event.target.value)}
                    placeholder="insight = normalize(stream) ⊕ simulate(layout)"
                  />
                </label>
              </>
            )}

            {section.id === 'technical' && (
              <>
                <div className={styles.fieldGroup}>
                  <label className={styles.field}>
                    <Text size="xs" weight="semibold" className={styles.label}>
                      Репозиторий
                    </Text>
                    <input
                      className={styles.input}
                      value={draft.repository ?? ''}
                      onChange={(event) => handleFieldChange('repository', event.target.value)}
                      placeholder="https://git.company/project"
                    />
                  </label>
                  <label className={styles.field}>
                    <Text size="xs" weight="semibold" className={styles.label}>
                      API
                    </Text>
                    <input
                      className={styles.input}
                      value={draft.api ?? ''}
                      onChange={(event) => handleFieldChange('api', event.target.value)}
                      placeholder="/api/v1/analytics"
                    />
                  </label>
                  <label className={styles.field}>
                    <Text size="xs" weight="semibold" className={styles.label}>
                      URL постановки на разработку
                    </Text>
                    <input
                      className={styles.input}
                      value={draft.specificationUrl}
                      onChange={(event) => handleFieldChange('specificationUrl', event.target.value)}
                      placeholder="https://docs.company/spec"
                    />
                  </label>
                  <label className={styles.field}>
                    <Text size="xs" weight="semibold" className={styles.label}>
                      Документация контрактов API
                    </Text>
                    <input
                      className={styles.input}
                      value={draft.apiContractsUrl}
                      onChange={(event) => handleFieldChange('apiContractsUrl', event.target.value)}
                      placeholder="https://docs.company/contracts"
                    />
                  </label>
                  <label className={styles.field}>
                    <Text size="xs" weight="semibold" className={styles.label}>
                      Технический дизайн
                    </Text>
                    <input
                      className={styles.input}
                      value={draft.techDesignUrl}
                      onChange={(event) => handleFieldChange('techDesignUrl', event.target.value)}
                      placeholder="https://docs.company/tech-design"
                    />
                  </label>
                  <label className={styles.field}>
                    <Text size="xs" weight="semibold" className={styles.label}>
                      Архитектурная схема
                    </Text>
                    <input
                      className={styles.input}
                      value={draft.architectureDiagramUrl}
                      onChange={(event) =>
                        handleFieldChange('architectureDiagramUrl', event.target.value)
                      }
                      placeholder="https://docs.company/diagram"
                    />
                  </label>
                </div>

                <div className={styles.fieldGroup}>
                  <div className={styles.field}>
                    <Text size="xs" weight="semibold" className={styles.label}>
                      Интеграция с сервером лицензирования
                    </Text>
                    <Switch
                      size="s"
                      checked={draft.licenseServerIntegrated}
                      onChange={({ checked }) =>
                        handleFieldChange('licenseServerIntegrated', checked)
                      }
                    />
                  </div>
                  <label className={styles.field}>
                    <Text size="xs" weight="semibold" className={styles.label}>
                      Клиент
                    </Text>
                    <Select<SelectItem<ModuleNode['clientType']>>
                      size="s"
                      items={Object.entries(clientTypeLabels).map(([value, label]) => ({
                        value: value as ModuleNode['clientType'],
                        label
                      }))}
                      value={{
                        value: draft.clientType,
                        label: clientTypeLabels[draft.clientType]
                      }}
                      getItemKey={(item) => item.value}
                      getItemLabel={(item) => item.label}
                      onChange={({ value }) => {
                        if (value) {
                          handleFieldChange('clientType', value.value);
                        }
                      }}
                    />
                  </label>
                  <label className={styles.field}>
                    <Text size="xs" weight="semibold" className={styles.label}>
                      Средство развертывания
                    </Text>
                    <Select<SelectItem<ModuleNode['deploymentTool']>>
                      size="s"
                      items={Object.entries(deploymentToolLabels).map(([value, label]) => ({
                        value: value as ModuleNode['deploymentTool'],
                        label
                      }))}
                      value={{
                        value: draft.deploymentTool,
                        label: deploymentToolLabels[draft.deploymentTool]
                      }}
                      getItemKey={(item) => item.value}
                      getItemLabel={(item) => item.label}
                      onChange={({ value }) => {
                        if (value) {
                          handleFieldChange('deploymentTool', value.value);
                        }
                      }}
                    />
                  </label>
                </div>

                <div>
                  <Text size="xs" weight="semibold" className={styles.label}>
                    Перечень библиотек
                  </Text>
                  <div className={styles.actionsRow}>
                    <input
                      className={styles.input}
                      value={libraryNameInput}
                      onChange={(event) => setLibraryNameInput(event.target.value)}
                      placeholder="Например, react"
                    />
                    <input
                      className={styles.input}
                      value={libraryVersionInput}
                      onChange={(event) => setLibraryVersionInput(event.target.value)}
                      placeholder="Например, 18.2.0"
                    />
                    <Button size="xs" view="secondary" label="Добавить" onClick={addLibrary} />
                  </div>
                  <ul className={styles.list}>
                    {draft.libraries.map((library, index) => (
                      <li key={`${library.name}-${index}`} className={styles.listItem}>
                        <input
                          className={styles.input}
                          value={library.name}
                          onChange={(event) => updateLibrary(index, { name: event.target.value })}
                        />
                        <input
                          className={styles.input}
                          value={library.version}
                          onChange={(event) => updateLibrary(index, { version: event.target.value })}
                        />
                        <Button
                          size="xs"
                          view="ghost"
                          label="Удалить"
                          onClick={() => removeLibrary(index)}
                        />
                      </li>
                    ))}
                  </ul>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.field}>
                    <Text size="xs" weight="semibold" className={styles.label}>
                      Покрытие тестами, %
                    </Text>
                    <input
                      className={styles.numberInput}
                      type="number"
                      min={0}
                      max={100}
                      value={draft.metrics.coverage}
                      onChange={(event) =>
                        updateMetrics({ coverage: Number(event.target.value) || 0 })
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    <Text size="xs" weight="semibold" className={styles.label}>
                      Всего тестов
                    </Text>
                    <input
                      className={styles.numberInput}
                      type="number"
                      min={0}
                      value={draft.metrics.tests}
                      onChange={(event) =>
                        updateMetrics({ tests: Number(event.target.value) || 0 })
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    <Text size="xs" weight="semibold" className={styles.label}>
                      Автоматизация, %
                    </Text>
                    <input
                      className={styles.numberInput}
                      type="number"
                      min={0}
                      max={100}
                      value={draft.metrics.automationRate}
                      onChange={(event) =>
                        updateMetrics({ automationRate: Number(event.target.value) || 0 })
                      }
                    />
                  </label>
                </div>
              </>
            )}

            {section.id === 'nonFunctional' && (
              <>
                <div className={styles.fieldGroup}>
                  <label className={styles.field}>
                    <Text size="xs" weight="semibold" className={styles.label}>
                      Время отклика, мс
                    </Text>
                    <input
                      className={styles.numberInput}
                      type="number"
                      min={0}
                      value={draft.nonFunctional.responseTimeMs}
                      onChange={(event) =>
                        updateNonFunctional({ responseTimeMs: Number(event.target.value) || 0 })
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    <Text size="xs" weight="semibold" className={styles.label}>
                      Пропускная способность, rps
                    </Text>
                    <input
                      className={styles.numberInput}
                      type="number"
                      min={0}
                      value={draft.nonFunctional.throughputRps}
                      onChange={(event) =>
                        updateNonFunctional({ throughputRps: Number(event.target.value) || 0 })
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    <Text size="xs" weight="semibold" className={styles.label}>
                      Потребление ресурсов
                    </Text>
                    <input
                      className={styles.input}
                      value={draft.nonFunctional.resourceConsumption}
                      onChange={(event) =>
                        updateNonFunctional({ resourceConsumption: event.target.value })
                      }
                      placeholder="5 vCPU / 12 GB RAM"
                    />
                  </label>
                  <label className={styles.field}>
                    <Text size="xs" weight="semibold" className={styles.label}>
                      Базовое количество пользователей
                    </Text>
                    <input
                      className={styles.numberInput}
                      type="number"
                      min={0}
                      value={draft.nonFunctional.baselineUsers}
                      onChange={(event) =>
                        updateNonFunctional({ baselineUsers: Number(event.target.value) || 0 })
                      }
                    />
                  </label>
                </div>
              </>
            )}

            <div className={styles.stepActions}>
              {index > 0 && (
                <Button
                  size="s"
                  view="ghost"
                  label="Вернуться к предыдущему разделу"
                  onClick={() => goToStep(index - 1)}
                />
              )}
              {index < moduleSections.length - 1 ? (
                <Button
                  size="s"
                  label="Заполнить следующий раздел"
                  onClick={() => goToStep(index + 1)}
                />
              ) : (
                <Button
                  size="s"
                  view="primary"
                  label="Сохранить модуль"
                  onClick={onSubmit}
                  disabled={isDomainMissing}
                />
              )}
            </div>
          </div>
        </Collapse>
      ))}
    </div>
  );
};

type DomainFormProps = {
  mode: 'create' | 'edit';
  draft: DomainDraftPayload;
  step: number;
  parentItems: string[];
  parentLabelMap: Record<string, string>;
  moduleItems: string[];
  moduleLabelMap: Record<string, string>;
  onChange: (draft: DomainDraftPayload) => void;
  onStepChange: (step: number) => void;
  onSubmit: () => void;
  onDelete?: () => void;
};

const domainSections: DomainSectionId[] = ['basic', 'relations'];

const DomainForm: React.FC<DomainFormProps> = ({
  mode,
  draft,
  step,
  parentItems,
  parentLabelMap,
  moduleItems,
  moduleLabelMap,
  onChange,
  onStepChange,
  onSubmit,
  onDelete
}) => {
  const goToStep = (next: number) => {
    onStepChange(Math.min(Math.max(next, 0), domainSections.length - 1));
  };

  const current = Math.min(Math.max(step, 0), domainSections.length - 1);
  const parentValue = draft.isCatalogRoot ? ROOT_DOMAIN_OPTION : draft.parentId ?? null;
  const isRootDomain = draft.isCatalogRoot;

  const handleParentChange = (value: string | null) => {
    if (value === ROOT_DOMAIN_OPTION) {
      onChange({ ...draft, parentId: undefined, moduleIds: [], isCatalogRoot: true });
      return;
    }

    if (!value) {
      onChange({ ...draft, parentId: undefined, isCatalogRoot: false });
      return;
    }

    onChange({ ...draft, parentId: value, isCatalogRoot: false });
  };

  return (
    <div className={styles.formBody}>
      <div className={styles.formHeader}>
        <div>
          <Text size="l" weight="semibold" className={styles.formTitle}>
            {mode === 'create' ? 'Создание доменной области' : 'Редактирование домена'}
          </Text>
          <Text size="xs" view="secondary" className={styles.formSubtitle}>
            Укажите базовую информацию и связи доменной области.
          </Text>
        </div>
        {onDelete && <Button view="clear" label="Удалить домен" size="s" onClick={onDelete} />}
      </div>

      {domainSections.map((section, index) => (
        <Collapse
          key={section}
          isOpen={current === index}
          onClick={() => goToStep(index)}
          label={
            <div className={styles.collapseLabel}>
              <Text size="s" weight="semibold">
                {index === 0 ? 'Основные сведения' : 'Связи'}
              </Text>
              <Text size="xs" view="secondary">
                Раздел {index + 1} из {domainSections.length}
              </Text>
            </div>
          }
        >
          <div className={styles.sectionContent}>
            {section === 'basic' && (
              <>
                <label className={styles.field}>
                  <Text size="xs" weight="semibold" className={styles.label}>
                    Название
                  </Text>
                  <input
                    className={styles.input}
                    value={draft.name}
                    onChange={(event) => onChange({ ...draft, name: event.target.value })}
                  />
                </label>
                <label className={styles.field}>
                  <Text size="xs" weight="semibold" className={styles.label}>
                    Описание
                  </Text>
                  <textarea
                    className={styles.textarea}
                    value={draft.description}
                    onChange={(event) => onChange({ ...draft, description: event.target.value })}
                  />
                </label>
              </>
            )}

            {section === 'relations' && (
              <>
                <label className={styles.field}>
                  <Text size="xs" weight="semibold" className={styles.label}>
                    Родительская область
                  </Text>
                  <Combobox<string>
                    size="s"
                    items={parentItems}
                    value={parentValue}
                    getItemKey={(item) => item}
                    getItemLabel={(item) => parentLabelMap[item] ?? item}
                    onChange={handleParentChange}
                  />
                </label>
                <label className={styles.field}>
                  <Text size="xs" weight="semibold" className={styles.label}>
                    Связанные модули
                  </Text>
                  <Combobox<string>
                    size="s"
                    items={moduleItems}
                    value={draft.moduleIds}
                    multiple
                    disabled={isRootDomain}
                    getItemKey={(item) => item}
                    getItemLabel={(item) => moduleLabelMap[item] ?? item}
                    onChange={(value) => onChange({ ...draft, moduleIds: value ?? [] })}
                  />
                </label>
                {isRootDomain && (
                  <Text size="2xs" view="secondary" className={styles.hint}>
                    Корневые домены используются для группировки и не привязываются к модулям.
                  </Text>
                )}
              </>
            )}

            <div className={styles.stepActions}>
              {index > 0 && (
                <Button
                  size="s"
                  view="ghost"
                  label="Вернуться к предыдущему разделу"
                  onClick={() => goToStep(index - 1)}
                />
              )}
              {index < domainSections.length - 1 ? (
                <Button
                  size="s"
                  label="Заполнить следующий раздел"
                  onClick={() => goToStep(index + 1)}
                />
              ) : (
                <Button size="s" view="primary" label="Сохранить домен" onClick={onSubmit} />
              )}
            </div>
          </div>
        </Collapse>
      ))}
    </div>
  );
};

type ArtifactFormProps = {
  mode: 'create' | 'edit';
  draft: ArtifactDraftPayload;
  step: number;
  domainItems: string[];
  domainLabelMap: Record<string, string>;
  moduleItems: string[];
  moduleLabelMap: Record<string, string>;
  artifactItems: string[];
  artifactLabelMap: Record<string, string>;
  onChange: (draft: ArtifactDraftPayload) => void;
  onStepChange: (step: number) => void;
  onSubmit: () => void;
  onDelete?: () => void;
};

const artifactSections: ArtifactSectionId[] = ['basic', 'relations'];

const ArtifactForm: React.FC<ArtifactFormProps> = ({
  mode,
  draft,
  step,
  domainItems,
  domainLabelMap,
  moduleItems,
  moduleLabelMap,
  onChange,
  onStepChange,
  onSubmit,
  onDelete
}) => {
  const goToStep = (next: number) => {
    onStepChange(Math.min(Math.max(next, 0), artifactSections.length - 1));
  };

  const current = Math.min(Math.max(step, 0), artifactSections.length - 1);

  return (
    <div className={styles.formBody}>
      <div className={styles.formHeader}>
        <div>
          <Text size="l" weight="semibold" className={styles.formTitle}>
            {mode === 'create' ? 'Создание артефакта' : 'Редактирование артефакта'}
          </Text>
          <Text size="xs" view="secondary" className={styles.formSubtitle}>
            Опишите артефакт и свяжите его с модулем-источником и потребителями.
          </Text>
        </div>
        {onDelete && <Button view="clear" label="Удалить артефакт" size="s" onClick={onDelete} />}
      </div>

      {artifactSections.map((section, index) => (
        <Collapse
          key={section}
          isOpen={current === index}
          onClick={() => goToStep(index)}
          label={
            <div className={styles.collapseLabel}>
              <Text size="s" weight="semibold">
                {index === 0 ? 'Основные сведения' : 'Связи'}
              </Text>
              <Text size="xs" view="secondary">
                Раздел {index + 1} из {artifactSections.length}
              </Text>
            </div>
          }
        >
          <div className={styles.sectionContent}>
            {section === 'basic' && (
              <>
                <label className={styles.field}>
                  <Text size="xs" weight="semibold" className={styles.label}>
                    Название
                  </Text>
                  <input
                    className={styles.input}
                    value={draft.name}
                    onChange={(event) => onChange({ ...draft, name: event.target.value })}
                  />
                </label>
                <label className={styles.field}>
                  <Text size="xs" weight="semibold" className={styles.label}>
                    Описание
                  </Text>
                  <textarea
                    className={styles.textarea}
                    value={draft.description}
                    onChange={(event) => onChange({ ...draft, description: event.target.value })}
                  />
                </label>
                <label className={styles.field}>
                  <Text size="xs" weight="semibold" className={styles.label}>
                    Тип данных
                  </Text>
                  <input
                    className={styles.input}
                    value={draft.dataType}
                    onChange={(event) => onChange({ ...draft, dataType: event.target.value })}
                  />
                </label>
                <label className={styles.field}>
                  <Text size="xs" weight="semibold" className={styles.label}>
                    Пример данных (URL)
                  </Text>
                  <input
                    className={styles.input}
                    value={draft.sampleUrl}
                    onChange={(event) => onChange({ ...draft, sampleUrl: event.target.value })}
                  />
                </label>
              </>
            )}

            {section === 'relations' && (
              <>
                <label className={styles.field}>
                  <Text size="xs" weight="semibold" className={styles.label}>
                    Доменная область
                  </Text>
                  <Combobox<string>
                    size="s"
                    items={domainItems}
                    value={draft.domainId}
                    getItemKey={(item) => item}
                    getItemLabel={(item) => domainLabelMap[item] ?? item}
                    onChange={(value) => onChange({ ...draft, domainId: value ?? undefined })}
                  />
                </label>
                <label className={styles.field}>
                  <Text size="xs" weight="semibold" className={styles.label}>
                    Модуль-источник
                  </Text>
                  <Combobox<string>
                    size="s"
                    items={moduleItems}
                    value={draft.producedBy}
                    getItemKey={(item) => item}
                    getItemLabel={(item) => moduleLabelMap[item] ?? item}
                    onChange={(value) => onChange({ ...draft, producedBy: value ?? undefined })}
                  />
                </label>
                <label className={styles.field}>
                  <Text size="xs" weight="semibold" className={styles.label}>
                    Модули-потребители
                  </Text>
                  <Combobox<string>
                    size="s"
                    items={moduleItems}
                    value={draft.consumerIds}
                    multiple
                    getItemKey={(item) => item}
                    getItemLabel={(item) => moduleLabelMap[item] ?? item}
                    onChange={(value) => onChange({ ...draft, consumerIds: value ?? [] })}
                  />
                </label>
              </>
            )}

            <div className={styles.stepActions}>
              {index > 0 && (
                <Button
                  size="s"
                  view="ghost"
                  label="Вернуться к предыдущему разделу"
                  onClick={() => goToStep(index - 1)}
                />
              )}
              {index < artifactSections.length - 1 ? (
                <Button
                  size="s"
                  label="Заполнить следующий раздел"
                  onClick={() => goToStep(index + 1)}
                />
              ) : (
                <Button size="s" view="primary" label="Сохранить артефакт" onClick={onSubmit} />
              )}
            </div>
          </div>
        </Collapse>
      ))}
    </div>
  );
};

function createDefaultModuleDraft(): ModuleDraftPayload {
  return {
    name: '',
    description: '',
    productName: '',
    team: '',
    status: 'in-dev',
    domainIds: [],
    dependencyIds: [],
    producedArtifactIds: [],
    dataIn: [{ id: 'input-1', label: '', sourceId: undefined }],
    dataOut: [{ id: 'output-1', label: '', consumerIds: [] }],
    ridOwner: { company: '', division: '' },
    localization: 'ru',
    userStats: { companies: 0, licenses: 0 },
    technologyStack: [],
    projectTeam: [{ id: 'member-1', fullName: '', role: 'Аналитик' }],
    repository: '',
    api: '',
    specificationUrl: '',
    apiContractsUrl: '',
    techDesignUrl: '',
    architectureDiagramUrl: '',
    licenseServerIntegrated: false,
    libraries: [],
    clientType: 'web',
    deploymentTool: 'docker',
    reuseScore: 0,
    metrics: { coverage: 0, tests: 0, automationRate: 0 },
    formula: '',
    nonFunctional: {
      responseTimeMs: 0,
      throughputRps: 0,
      resourceConsumption: '',
      baselineUsers: 0
    }
  };
}

function createDefaultDomainDraft(): DomainDraftPayload {
  return {
    name: '',
    description: '',
    parentId: undefined,
    moduleIds: [],
    isCatalogRoot: false
  };
}

function createDefaultArtifactDraft(): ArtifactDraftPayload {
  return {
    name: '',
    description: '',
    domainId: undefined,
    producedBy: undefined,
    consumerIds: [],
    dataType: '',
    sampleUrl: ''
  };
}

function moduleToDraft(module: ModuleNode): ModuleDraftPayload {
  return {
    name: module.name,
    description: module.description,
    productName: module.productName,
    team: module.team,
    status: module.status,
    domainIds: [...module.domains],
    dependencyIds: [...module.dependencies],
    producedArtifactIds: [...module.produces],
    dataIn: module.dataIn.map((input) => ({ ...input })),
    dataOut: module.dataOut.map((output) => ({
      ...output,
      consumerIds: output.consumerIds ? [...output.consumerIds] : []
    })),
    ridOwner: { ...module.ridOwner },
    localization: module.localization,
    userStats: { ...module.userStats },
    technologyStack: [...module.technologyStack],
    projectTeam: module.projectTeam.map((member) => ({ ...member })),
    repository: module.repository ?? '',
    api: module.api ?? '',
    specificationUrl: module.specificationUrl,
    apiContractsUrl: module.apiContractsUrl,
    techDesignUrl: module.techDesignUrl,
    architectureDiagramUrl: module.architectureDiagramUrl,
    licenseServerIntegrated: module.licenseServerIntegrated,
    libraries: module.libraries.map((library) => ({ ...library })),
    clientType: module.clientType,
    deploymentTool: module.deploymentTool,
    reuseScore: module.reuseScore,
    metrics: { ...module.metrics },
    formula: module.formula,
    nonFunctional: { ...module.nonFunctional }
  };
}

function domainToDraft(
  domain: DomainNode,
  tree: DomainNode[],
  modules: ModuleNode[]
): DomainDraftPayload {
  const parentId = findDomainParentId(tree, domain.id);
  const relatedModules = modules
    .filter((module) => module.domains.includes(domain.id))
    .map((module) => module.id);
  const isLeaf = (!domain.children || domain.children.length === 0) && !domain.isCatalogRoot;

  return {
    name: domain.name,
    description: domain.description ?? '',
    parentId: parentId ?? undefined,
    moduleIds: isLeaf ? relatedModules : [],
    isCatalogRoot: Boolean(domain.isCatalogRoot)
  };
}

function artifactToDraft(artifact: ArtifactNode): ArtifactDraftPayload {
  return {
    name: artifact.name,
    description: artifact.description,
    domainId: artifact.domainId,
    producedBy: artifact.producedBy,
    consumerIds: [...artifact.consumerIds],
    dataType: artifact.dataType,
    sampleUrl: artifact.sampleUrl
  };
}

function buildDomainLabelMap(domains: DomainNode[]): Record<string, string> {
  const map: Record<string, string> = {};

  const visit = (nodes: DomainNode[], depth: number) => {
    nodes.forEach((node) => {
      const prefix = depth > 0 ? `${'— '.repeat(depth)}` : '';
      map[node.id] = `${prefix}${node.name}`.trim();
      if (node.children) {
        visit(node.children, depth + 1);
      }
    });
  };

  visit(domains, 0);
  return map;
}

function collectLeafDomainIds(domains: DomainNode[]): string[] {
  return flattenDomainTree(domains)
    .filter((domain) => (!domain.children || domain.children.length === 0) && !domain.isCatalogRoot)
    .map((domain) => domain.id);
}

function buildModuleLabelMap(modules: ModuleNode[]): Record<string, string> {
  return modules.reduce<Record<string, string>>((acc, module) => {
    acc[module.id] = module.name;
    return acc;
  }, {});
}

function buildArtifactLabelMap(artifacts: ArtifactNode[]): Record<string, string> {
  return artifacts.reduce<Record<string, string>>((acc, artifact) => {
    acc[artifact.id] = artifact.name;
    return acc;
  }, {});
}

function flattenDomainTree(domains: DomainNode[]): DomainNode[] {
  return domains.flatMap((domain) => [domain, ...(domain.children ? flattenDomainTree(domain.children) : [])]);
}

function findDomainById(domains: DomainNode[], id: string): DomainNode | null {
  for (const domain of domains) {
    if (domain.id === id) {
      return domain;
    }
    if (domain.children) {
      const found = findDomainById(domain.children, id);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

function findDomainParentId(domains: DomainNode[], id: string, parentId: string | null = null): string | null {
  for (const domain of domains) {
    if (domain.id === id) {
      return parentId;
    }
    if (domain.children) {
      const found = findDomainParentId(domain.children, id, domain.id);
      if (found !== null) {
        return found;
      }
    }
  }
  return null;
}

export default AdminPanel;
