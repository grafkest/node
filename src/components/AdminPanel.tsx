import { Button } from '@consta/uikit/Button';
import { Combobox } from '@consta/uikit/Combobox';
import { Collapse } from '@consta/uikit/Collapse';
import { Select } from '@consta/uikit/Select';
import { Switch } from '@consta/uikit/Switch';
import { Tabs } from '@consta/uikit/Tabs';
import { Text } from '@consta/uikit/Text';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  creatorCompany: string;
  status: ModuleStatus;
  domainIds: string[];
  dependencyIds: string[];
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

export type ModuleDraftPrefillRequest = {
  id: number;
  mode: 'create' | 'edit';
  draft: Partial<ModuleDraftPayload>;
  moduleId?: string;
};

export type DomainDraftPayload = {
  name: string;
  description: string;
  parentId?: string;
  moduleIds: string[];
  isCatalogRoot: boolean;
  experts: string[];
  meetupLink: string;
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
  moduleDraftPrefill: ModuleDraftPrefillRequest | null;
  onModuleDraftPrefillApplied?: () => void;
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
const CREATE_COMPANY_OPTION = '__create__';
const CREATE_PRODUCT_OPTION = '__create_product__';
const CREATE_CREATOR_COMPANY_OPTION = '__create_creator_company__';
const CREATE_LOCALIZATION_OPTION = '__create_localization__';
const CREATE_RID_COMPANY_OPTION = '__create_rid_company__';
const CREATE_RID_DIVISION_OPTION = '__create_rid_division__';
const CREATE_TECHNOLOGY_OPTION = '__create_technology__';
const CREATE_LIBRARY_OPTION = '__create_library__';
const CREATE_LIBRARY_VERSION_OPTION = '__create_library_version__';
const CREATE_DATA_TYPE_OPTION = '__create_data_type__';

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
    'Тестировщик',
    'Руководитель проекта',
    'UX'
  ] as TeamRole[]
).map((role) => ({ label: role, value: role }));

const AdminPanel: React.FC<AdminPanelProps> = ({
  modules,
  domains,
  artifacts,
  moduleDraftPrefill,
  onModuleDraftPrefillApplied,
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

  const knownCompanyNames = useMemo(() => {
    const names = new Set<string>();
    modules.forEach((module) => {
      module.userStats.companies.forEach((company) => {
        const trimmed = company.name.trim();
        if (trimmed) {
          names.add(trimmed);
        }
      });
      const ridCompany = module.ridOwner.company?.trim();
      if (ridCompany) {
        names.add(ridCompany);
      }
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'ru'));
  }, [modules]);

  const knownProductNames = useMemo(() => buildProductNames(modules), [modules]);
  const knownCreatorCompanies = useMemo(() => buildCreatorCompanies(modules), [modules]);
  const knownLocalizations = useMemo(() => buildLocalizationList(modules), [modules]);
  const knownTechnologyOptions = useMemo(() => buildTechnologyList(modules), [modules]);
  const knownRidCompanyRegistry = useMemo(
    () => buildRidCompanyRegistry(modules),
    [modules]
  );
  const knownLibraryRegistry = useMemo(() => buildLibraryRegistry(modules), [modules]);
  const knownArtifactDataTypes = useMemo(() => buildArtifactDataTypes(artifacts), [artifacts]);

  const [companyNames, setCompanyNames] = useState<string[]>(knownCompanyNames);
  const [productNames, setProductNames] = useState<string[]>(knownProductNames);
  const [creatorCompanies, setCreatorCompanies] = useState<string[]>(knownCreatorCompanies);
  const [localizations, setLocalizations] = useState<string[]>(knownLocalizations);
  const [technologyOptions, setTechnologyOptions] = useState<string[]>(knownTechnologyOptions);
  const [ridCompanyRegistry, setRidCompanyRegistry] = useState<Record<string, string[]>>(
    knownRidCompanyRegistry
  );
  const [libraryRegistry, setLibraryRegistry] = useState<Record<string, string[]>>(
    knownLibraryRegistry
  );
  const [artifactDataTypes, setArtifactDataTypes] = useState<string[]>(knownArtifactDataTypes);

  useEffect(() => {
    setCompanyNames((prev) => mergeStringCollections(prev, knownCompanyNames));
  }, [knownCompanyNames]);

  useEffect(() => {
    setProductNames((prev) => mergeStringCollections(prev, knownProductNames));
  }, [knownProductNames]);

  useEffect(() => {
    setCreatorCompanies((prev) => mergeStringCollections(prev, knownCreatorCompanies));
  }, [knownCreatorCompanies]);

  useEffect(() => {
    setLocalizations((prev) => mergeStringCollections(prev, knownLocalizations));
  }, [knownLocalizations]);

  useEffect(() => {
    setTechnologyOptions((prev) => mergeStringCollections(prev, knownTechnologyOptions));
  }, [knownTechnologyOptions]);

  useEffect(() => {
    setRidCompanyRegistry((prev) => mergeRegistry(prev, knownRidCompanyRegistry));
  }, [knownRidCompanyRegistry]);

  useEffect(() => {
    setLibraryRegistry((prev) => mergeRegistry(prev, knownLibraryRegistry));
  }, [knownLibraryRegistry]);

  useEffect(() => {
    setArtifactDataTypes((prev) => mergeStringCollections(prev, knownArtifactDataTypes));
  }, [knownArtifactDataTypes]);

  const leafDomainIds = useMemo(() => collectLeafDomainIds(domains), [domains]);
  const catalogDomainIds = useMemo(() => collectCatalogDomainIds(domains), [domains]);
  const parentDomainIds = useMemo(
    () => flattenDomainTree(domains).map((domain) => domain.id),
    [domains]
  );
  const domainDescendantMap = useMemo(() => buildDomainDescendantMap(domains), [domains]);
  const domainParentLabelMap = useMemo(
    () => ({ [ROOT_DOMAIN_OPTION]: 'Корневой каталог', ...domainLabelMap }),
    [domainLabelMap]
  );

  const [selectedModuleId, setSelectedModuleId] = useState<string>('__new__');
  const [selectedDomainId, setSelectedDomainId] = useState<string>('__new__');
  const [selectedArtifactId, setSelectedArtifactId] = useState<string>('__new__');

  const forbiddenParentIds = useMemo(() => {
    if (selectedDomainId === '__new__') {
      return [] as string[];
    }
    const descendants = domainDescendantMap[selectedDomainId] ?? [];
    return [selectedDomainId, ...descendants];
  }, [domainDescendantMap, selectedDomainId]);

  const [moduleDraft, setModuleDraft] = useState<ModuleDraftPayload>(() => createDefaultModuleDraft());
  const [moduleStep, setModuleStep] = useState<number>(0);

  const [domainDraft, setDomainDraft] = useState<DomainDraftPayload>(() => createDefaultDomainDraft());
  const [domainStep, setDomainStep] = useState<number>(0);

  const [artifactDraft, setArtifactDraft] = useState<ArtifactDraftPayload>(() => createDefaultArtifactDraft());
  const [artifactStep, setArtifactStep] = useState<number>(0);

  const moduleDraftPrefillKey = moduleDraftPrefill?.id;

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
      let draft = moduleToDraft(target);
      if (
        moduleDraftPrefill &&
        moduleDraftPrefill.mode === 'edit' &&
        moduleDraftPrefill.moduleId === target.id
      ) {
        draft = applyModuleDraftPrefill(draft, moduleDraftPrefill.draft);
        if (onModuleDraftPrefillApplied) {
          onModuleDraftPrefillApplied();
        }
      }
      setModuleDraft(draft);
      setModuleStep(0);
    }
  }, [
    moduleOptions,
    modules,
    selectedModuleId,
    moduleDraftPrefill,
    moduleDraftPrefillKey,
    onModuleDraftPrefillApplied
  ]);

  useEffect(() => {
    if (!moduleDraftPrefill) {
      return;
    }
    setActiveTab('module');
    if (
      moduleDraftPrefill.mode === 'edit' &&
      moduleDraftPrefill.moduleId &&
      moduleOptions.some((item) => item.value === moduleDraftPrefill.moduleId)
    ) {
      setSelectedModuleId(moduleDraftPrefill.moduleId);
      setModuleStep(0);
      return;
    }

    setSelectedModuleId('__new__');
    setModuleStep(0);
    setModuleDraft((prev) => applyModuleDraftPrefill(prev, moduleDraftPrefill.draft));
    if (onModuleDraftPrefillApplied) {
      onModuleDraftPrefillApplied();
    }
  }, [
    moduleDraftPrefillKey,
    moduleDraftPrefill,
    moduleOptions,
    onModuleDraftPrefillApplied
  ]);

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

  const registerCompanyName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    setCompanyNames((prev) => mergeStringCollections(prev, [trimmed]));
  };

  const registerProductName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    setProductNames((prev) => mergeStringCollections(prev, [trimmed]));
  };

  const registerCreatorCompany = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    setCreatorCompanies((prev) => mergeStringCollections(prev, [trimmed]));
  };

  const registerLocalization = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    setLocalizations((prev) => mergeStringCollections(prev, [trimmed]));
  };

  const registerTechnology = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    setTechnologyOptions((prev) => mergeStringCollections(prev, [trimmed]));
  };

  const registerRidCompany = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    setRidCompanyRegistry((prev) => mergeRegistry(prev, { [trimmed]: [] }));
  };

  const registerRidDivision = (company: string, division: string) => {
    const normalizedCompany = company.trim();
    const normalizedDivision = division.trim();
    if (!normalizedCompany || !normalizedDivision) {
      return;
    }
    setRidCompanyRegistry((prev) =>
      mergeRegistry(prev, { [normalizedCompany]: [normalizedDivision] })
    );
  };

  const registerLibrary = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    setLibraryRegistry((prev) => mergeRegistry(prev, { [trimmed]: [] }));
  };

  const registerLibraryVersion = (library: string, version: string) => {
    const trimmedLibrary = library.trim();
    const trimmedVersion = version.trim();
    if (!trimmedLibrary || !trimmedVersion) {
      return;
    }
    setLibraryRegistry((prev) =>
      mergeRegistry(prev, { [trimmedLibrary]: [trimmedVersion] })
    );
  };

  const registerArtifactDataType = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    setArtifactDataTypes((prev) => mergeStringCollections(prev, [trimmed]));
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
            moduleKey={selectedModuleId}
            mode={selectedModuleId === '__new__' ? 'create' : 'edit'}
            draft={moduleDraft}
            step={moduleStep}
            domainItems={leafDomainIds}
            domainLabelMap={domainLabelMap}
            moduleItems={modules.map((module) => module.id)}
            moduleLabelMap={moduleLabelMap}
            artifactItems={artifacts.map((artifact) => artifact.id)}
            artifactLabelMap={artifactLabelMap}
            productNames={productNames}
            onRegisterProduct={registerProductName}
            creatorCompanies={creatorCompanies}
            onRegisterCreatorCompany={registerCreatorCompany}
            localizations={localizations}
            onRegisterLocalization={registerLocalization}
            ridCompanyRegistry={ridCompanyRegistry}
            onRegisterRidCompany={registerRidCompany}
            onRegisterRidDivision={registerRidDivision}
            technologyOptions={technologyOptions}
            onRegisterTechnology={registerTechnology}
            libraryRegistry={libraryRegistry}
            onRegisterLibrary={registerLibrary}
            onRegisterLibraryVersion={registerLibraryVersion}
            companyNames={companyNames}
            onRegisterCompany={registerCompanyName}
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
            parentCatalogIds={catalogDomainIds}
            parentDomainIds={parentDomainIds}
            forbiddenParentIds={forbiddenParentIds}
            parentLabelMap={domainParentLabelMap}
            moduleItems={modules.map((module) => module.id)}
            moduleLabelMap={moduleLabelMap}
            currentDomainId={selectedDomainId === '__new__' ? undefined : selectedDomainId}
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
            dataTypes={artifactDataTypes}
            onRegisterDataType={registerArtifactDataType}
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
  dataTypes: string[];
  onRegisterDataType: (value: string) => void;
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
  dataTypes,
  onRegisterDataType,
  onChange,
  onStepChange,
  onSubmit,
  onDelete
}) => {
  const goToStep = (next: number) => {
    onStepChange(Math.min(Math.max(next, 0), artifactSections.length - 1));
  };

  const current = Math.min(Math.max(step, 0), artifactSections.length - 1);

  const [dataTypeCreation, setDataTypeCreation] = useState<
    { value: string; previous: string } | null
  >(null);

  useEffect(() => {
    setDataTypeCreation(null);
  }, [draft]);

  const dataTypeItems = useMemo<SelectItem<string>[]>(() => {
    const values = new Set(dataTypes);
    const currentValue = draft.dataType.trim();
    if (currentValue) {
      values.add(currentValue);
    }
    return [
      ...Array.from(values)
        .sort((a, b) => a.localeCompare(b, 'ru'))
        .map<SelectItem<string>>((value) => ({ label: value, value })),
      { label: 'Добавить новый тип', value: CREATE_DATA_TYPE_OPTION }
    ];
  }, [dataTypes, draft.dataType]);

  const selectedDataTypeItem =
    dataTypeCreation
      ? dataTypeItems.find((item) => item.value === CREATE_DATA_TYPE_OPTION) ?? null
      : dataTypeItems.find((item) => item.value === draft.dataType.trim()) ?? null;

  const handleDataTypeSelection = (item: SelectItem<string> | null) => {
    if (!item) {
      return;
    }
    if (item.value === CREATE_DATA_TYPE_OPTION) {
      setDataTypeCreation({ value: '', previous: draft.dataType });
      return;
    }
    setDataTypeCreation(null);
    onChange({ ...draft, dataType: item.value });
  };

  const updateDataTypeCreationValue = (value: string) => {
    setDataTypeCreation((prev) =>
      prev ? { ...prev, value } : { value, previous: draft.dataType }
    );
  };

  const confirmDataTypeCreation = () => {
    if (!dataTypeCreation) {
      return;
    }
    const trimmed = dataTypeCreation.value.trim();
    if (!trimmed) {
      return;
    }
    onRegisterDataType(trimmed);
    setDataTypeCreation(null);
    onChange({ ...draft, dataType: trimmed });
  };

  const cancelDataTypeCreation = () => {
    if (!dataTypeCreation) {
      return;
    }
    setDataTypeCreation(null);
    onChange({ ...draft, dataType: dataTypeCreation.previous });
  };

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
                <div className={styles.field}>
                  <Text size="xs" weight="semibold" className={styles.label}>
                    Тип данных
                  </Text>
                  <Select<SelectItem<string>>
                    size="s"
                    items={dataTypeItems}
                    value={selectedDataTypeItem}
                    getItemLabel={(item) => item.label}
                    getItemKey={(item) => item.value}
                    placeholder="Выберите тип данных"
                    onChange={handleDataTypeSelection}
                  />
                  {dataTypeCreation && (
                    <div className={styles.inlineForm}>
                      <input
                        className={styles.input}
                        value={dataTypeCreation.value}
                        onChange={(event) => updateDataTypeCreationValue(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            confirmDataTypeCreation();
                          }
                        }}
                        placeholder="Например, CSV"
                      />
                      <div className={styles.inlineButtons}>
                        <Button size="xs" label="Сохранить" view="primary" onClick={confirmDataTypeCreation} />
                        <Button size="xs" label="Отмена" view="ghost" onClick={cancelDataTypeCreation} />
                      </div>
                    </div>
                  )}
                </div>
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

function formatPercent(value: number): string {
  const normalized = Number.isFinite(value) ? value : 0;
  const formatter = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: normalized % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1
  });
  return formatter.format(normalized);
}

function createDefaultModuleDraft(): ModuleDraftPayload {
  return {
    name: '',
    description: '',
    productName: '',
    creatorCompany: '',
    status: 'in-dev',
    domainIds: [],
    dependencyIds: [],
    dataIn: [{ id: 'input-1', label: '', sourceId: undefined }],
    dataOut: [{ id: 'output-1', label: '', consumerIds: [] }],
    ridOwner: { company: '', division: '' },
    localization: 'ru',
    userStats: { companies: [{ name: '', licenses: 0 }] },
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
    isCatalogRoot: false,
    experts: [],
    meetupLink: ''
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
    creatorCompany: module.creatorCompany,
    status: module.status,
    domainIds: [...module.domains],
    dependencyIds: [...module.dependencies],
    dataIn: module.dataIn.map((input) => ({ ...input })),
    dataOut: module.dataOut.map((output) => ({
      ...output,
      consumerIds: output.consumerIds ? [...output.consumerIds] : []
    })),
    ridOwner: { ...module.ridOwner },
    localization: module.localization,
    userStats: {
      companies: module.userStats.companies.map((company) => ({ ...company }))
    },
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

function applyModuleDraftPrefill(
  base: ModuleDraftPayload,
  patch: Partial<ModuleDraftPayload>
): ModuleDraftPayload {
  let next = base;
  let hasChanges = false;

  const ensureCopy = () => {
    if (!hasChanges) {
      next = { ...next };
      hasChanges = true;
    }
  };

  if (patch.name !== undefined) {
    ensureCopy();
    next.name = patch.name;
  }

  if (patch.productName !== undefined) {
    ensureCopy();
    next.productName = patch.productName;
  }

  if (Array.isArray(patch.domainIds)) {
    ensureCopy();
    next.domainIds = [...patch.domainIds];
  }

  if (Array.isArray(patch.projectTeam)) {
    ensureCopy();
    next.projectTeam = patch.projectTeam.map((member, index) => ({
      id: member.id || `member-${index + 1}`,
      fullName: member.fullName,
      role: member.role
    }));
  }

  return next;
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
    isCatalogRoot: Boolean(domain.isCatalogRoot),
    experts: [...(domain.experts ?? [])],
    meetupLink: domain.meetupLink ?? ''
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

function collectCatalogDomainIds(domains: DomainNode[]): string[] {
  return flattenDomainTree(domains)
    .filter((domain) => domain.isCatalogRoot)
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

function buildDomainDescendantMap(domains: DomainNode[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};

  const visit = (node: DomainNode): string[] => {
    const descendants = (node.children ?? []).flatMap((child) => [child.id, ...visit(child)]);
    map[node.id] = descendants;
    return descendants;
  };

  domains.forEach((domain) => {
    visit(domain);
  });

  return map;
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

function mergeStringCollections(current: string[], incoming: string[]): string[] {
  const values = new Set<string>();

  const append = (items: string[]) => {
    items.forEach((item) => {
      const normalized = item.trim();
      if (normalized) {
        values.add(normalized);
      }
    });
  };

  append(current);
  append(incoming);

  return Array.from(values).sort((a, b) => a.localeCompare(b, 'ru'));
}

function mergeRegistry(
  current: Record<string, string[]>,
  incoming: Record<string, string[]>
): Record<string, string[]> {
  const registry = new Map<string, Set<string>>();

  const append = (source: Record<string, string[]>) => {
    Object.entries(source).forEach(([rawKey, values]) => {
      const key = rawKey.trim();
      if (!key) {
        return;
      }

      const target = registry.get(key) ?? new Set<string>();
      values.forEach((value) => {
        const normalized = value.trim();
        if (normalized) {
          target.add(normalized);
        }
      });
      registry.set(key, target);
    });
  };

  append(current);
  append(incoming);

  return Array.from(registry.entries())
    .sort((a, b) => a[0].localeCompare(b[0], 'ru'))
    .reduce<Record<string, string[]>>((acc, [company, divisions]) => {
      acc[company] = Array.from(divisions).sort((a, b) => a.localeCompare(b, 'ru'));
      return acc;
    }, {});
}

function buildProductNames(modules: ModuleNode[]): string[] {
  const names = new Set<string>();

  modules.forEach((module) => {
    const normalized = module.productName.trim();
    if (normalized) {
      names.add(normalized);
    }
  });

  return Array.from(names).sort((a, b) => a.localeCompare(b, 'ru'));
}

function buildCreatorCompanies(modules: ModuleNode[]): string[] {
  const companies = new Set<string>();

  modules.forEach((module) => {
    const normalized = module.creatorCompany.trim();
    if (normalized) {
      companies.add(normalized);
    }
  });

  return Array.from(companies).sort((a, b) => a.localeCompare(b, 'ru'));
}

function buildLocalizationList(modules: ModuleNode[]): string[] {
  const localizations = new Set<string>();

  modules.forEach((module) => {
    const normalized = module.localization.trim();
    if (normalized) {
      localizations.add(normalized);
    }
  });

  return Array.from(localizations).sort((a, b) => a.localeCompare(b, 'ru'));
}

function buildTechnologyList(modules: ModuleNode[]): string[] {
  const technologies = new Set<string>();

  modules.forEach((module) => {
    module.technologyStack.forEach((tech) => {
      const normalized = tech.trim();
      if (normalized) {
        technologies.add(normalized);
      }
    });
  });

  return Array.from(technologies).sort((a, b) => a.localeCompare(b, 'ru'));
}

function buildRidCompanyRegistry(modules: ModuleNode[]): Record<string, string[]> {
  const registry = new Map<string, Set<string>>();

  modules.forEach((module) => {
    const company = module.ridOwner.company.trim();
    if (!company) {
      return;
    }

    const division = module.ridOwner.division.trim();
    const target = registry.get(company) ?? new Set<string>();
    if (division) {
      target.add(division);
    }
    registry.set(company, target);
  });

  return Array.from(registry.entries())
    .sort((a, b) => a[0].localeCompare(b[0], 'ru'))
    .reduce<Record<string, string[]>>((acc, [company, divisions]) => {
      acc[company] = Array.from(divisions).sort((a, b) => a.localeCompare(b, 'ru'));
      return acc;
    }, {});
}

function buildLibraryRegistry(modules: ModuleNode[]): Record<string, string[]> {
  const registry = new Map<string, Set<string>>();

  modules.forEach((module) => {
    module.libraries.forEach((library) => {
      const name = library.name.trim();
      if (!name) {
        return;
      }

      const version = library.version.trim();
      const target = registry.get(name) ?? new Set<string>();
      if (version) {
        target.add(version);
      }
      registry.set(name, target);
    });
  });

  return Array.from(registry.entries())
    .sort((a, b) => a[0].localeCompare(b[0], 'ru'))
    .reduce<Record<string, string[]>>((acc, [library, versions]) => {
      acc[library] = Array.from(versions).sort((a, b) => a.localeCompare(b, 'ru'));
      return acc;
    }, {});
}

function buildArtifactDataTypes(artifacts: ArtifactNode[]): string[] {
  const types = new Set<string>();

  artifacts.forEach((artifact) => {
    const normalized = artifact.dataType.trim();
    if (normalized) {
      types.add(normalized);
    }
  });

  return Array.from(types).sort((a, b) => a.localeCompare(b, 'ru'));
}
