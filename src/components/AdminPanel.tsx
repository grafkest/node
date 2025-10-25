import { Button } from '@consta/uikit/Button';
import { Combobox } from '@consta/uikit/Combobox';
import { Collapse } from '@consta/uikit/Collapse';
import { Select } from '@consta/uikit/Select';
import { Switch } from '@consta/uikit/Switch';
import { Tabs } from '@consta/uikit/Tabs';
import { Text } from '@consta/uikit/Text';
import { TextField } from '@consta/uikit/TextField';
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
  creatorCompany: string;
  status: ModuleStatus;
  domainIds: string[];
  dependencyIds: string[];
  produces: string[];
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

type InlineStringCreation = {
  value: string;
  previous: string;
};

type IndexedStringCreation = {
  index: number;
  value: string;
  previous: string;
};

type TechnologyCreationState = {
  value: string;
  previous: string[];
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

type ModuleFormProps = {
  moduleKey: string | null;
  mode: 'create' | 'edit';
  draft: ModuleDraftPayload;
  step: number;
  domainItems: string[];
  domainLabelMap: Record<string, string>;
  moduleItems: string[];
  moduleLabelMap: Record<string, string>;
  artifactItems: string[];
  artifactLabelMap: Record<string, string>;
  productNames: string[];
  onRegisterProduct: (value: string) => void;
  creatorCompanies: string[];
  onRegisterCreatorCompany: (value: string) => void;
  localizations: string[];
  onRegisterLocalization: (value: string) => void;
  ridCompanyRegistry: Record<string, string[]>;
  onRegisterRidCompany: (value: string) => void;
  onRegisterRidDivision: (company: string, division: string) => void;
  technologyOptions: string[];
  onRegisterTechnology: (value: string) => void;
  libraryRegistry: Record<string, string[]>;
  onRegisterLibrary: (value: string) => void;
  onRegisterLibraryVersion: (library: string, version: string) => void;
  companyNames: string[];
  onRegisterCompany: (value: string) => void;
  onChange: (draft: ModuleDraftPayload) => void;
  onStepChange: (step: number) => void;
  onSubmit: () => void;
  onDelete?: () => void;
};

const ModuleForm: React.FC<ModuleFormProps> = ({
  moduleKey,
  mode,
  draft,
  step,
  domainItems,
  domainLabelMap,
  moduleItems,
  moduleLabelMap,
  artifactItems,
  artifactLabelMap,
  productNames,
  onRegisterProduct,
  creatorCompanies,
  onRegisterCreatorCompany,
  localizations,
  onRegisterLocalization,
  ridCompanyRegistry,
  onRegisterRidCompany,
  onRegisterRidDivision,
  technologyOptions,
  onRegisterTechnology,
  libraryRegistry,
  onRegisterLibrary,
  onRegisterLibraryVersion,
  companyNames,
  onRegisterCompany,
  onChange,
  onStepChange,
  onSubmit,
  onDelete
}) => {
  const current = Math.min(Math.max(step, 0), moduleSections.length - 1);
  const goToStep = (next: number) => {
    onStepChange(Math.min(Math.max(next, 0), moduleSections.length - 1));
  };

  const statusItems = useMemo<SelectItem<ModuleStatus>[]>(
    () =>
      (['in-dev', 'production', 'deprecated'] as ModuleStatus[]).map((status) => ({
        label: statusLabels[status],
        value: status
      })),
    []
  );

  const clientTypeItems = useMemo<SelectItem<ModuleNode['clientType']>[]>(
    () =>
      (Object.keys(clientTypeLabels) as ModuleNode['clientType'][]).map((type) => ({
        label: clientTypeLabels[type],
        value: type
      })),
    []
  );

  const deploymentItems = useMemo<SelectItem<ModuleNode['deploymentTool']>[]>(
    () =>
      (Object.keys(deploymentToolLabels) as ModuleNode['deploymentTool'][]).map((tool) => ({
        label: deploymentToolLabels[tool],
        value: tool
      })),
    []
  );

  const teamRoleItems = useMemo<SelectItem<TeamRole>[]>(
    () =>
      ([
        'Владелец продукта',
        'Эксперт R&D',
        'Аналитик',
        'Backend',
        'Frontend',
        'Архитектор',
        'Тестировщик',
        'Руководитель проекта',
        'UX'
      ] satisfies TeamRole[]).map((role) => ({ label: role, value: role })),
    []
  );

  const CREATE_PRODUCT_OPTION = '__create_product__';
  const CREATE_CREATOR_COMPANY_OPTION = '__create_creator_company__';
  const CREATE_LOCALIZATION_OPTION = '__create_localization__';
  const CREATE_RID_COMPANY_OPTION = '__create_rid_company__';
  const CREATE_RID_DIVISION_OPTION = '__create_rid_division__';
  const CREATE_TECHNOLOGY_OPTION = '__create_technology__';
  const CREATE_COMPANY_USAGE_OPTION = '__create_company_usage__';
  const CREATE_LIBRARY_OPTION = '__create_library__';
  const CREATE_LIBRARY_VERSION_OPTION = '__create_library_version__';

  const [productCreation, setProductCreation] = useState<InlineStringCreation | null>(null);
  const [creatorCompanyCreation, setCreatorCompanyCreation] = useState<InlineStringCreation | null>(
    null
  );
  const [localizationCreation, setLocalizationCreation] = useState<InlineStringCreation | null>(null);
  const [ridCompanyCreation, setRidCompanyCreation] = useState<InlineStringCreation | null>(null);
  const [ridDivisionCreation, setRidDivisionCreation] = useState<InlineStringCreation | null>(null);
  const [technologyCreation, setTechnologyCreation] = useState<TechnologyCreationState | null>(null);
  const [companyUsageCreation, setCompanyUsageCreation] = useState<IndexedStringCreation | null>(null);
  const [libraryCreation, setLibraryCreation] = useState<IndexedStringCreation | null>(null);
  const [libraryVersionCreation, setLibraryVersionCreation] = useState<IndexedStringCreation | null>(
    null
  );

  useEffect(() => {
    setProductCreation(null);
    setCreatorCompanyCreation(null);
    setLocalizationCreation(null);
    setRidCompanyCreation(null);
    setRidDivisionCreation(null);
    setTechnologyCreation(null);
    setCompanyUsageCreation(null);
    setLibraryCreation(null);
    setLibraryVersionCreation(null);
  }, [moduleKey]);

  const buildItems = (values: Iterable<string>, extra?: string) => {
    const set = new Set<string>();
    for (const value of values) {
      const trimmed = value.trim();
      if (trimmed) {
        set.add(trimmed);
      }
    }
    if (extra) {
      const trimmed = extra.trim();
      if (trimmed) {
        set.add(trimmed);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ru'));
  };

  const productItems = useMemo(
    () => [...buildItems(productNames, draft.productName), CREATE_PRODUCT_OPTION],
    [draft.productName, productNames]
  );

  const creatorCompanyItems = useMemo(
    () => [...buildItems(creatorCompanies, draft.creatorCompany), CREATE_CREATOR_COMPANY_OPTION],
    [creatorCompanies, draft.creatorCompany]
  );

  const localizationItems = useMemo(() => {
    const base = buildItems(localizations, draft.localization);
    if (!base.includes('ru')) {
      base.push('ru');
    }
    base.sort((a, b) => a.localeCompare(b, 'ru'));
    base.push(CREATE_LOCALIZATION_OPTION);
    return base;
  }, [draft.localization, localizations]);

  const ridCompanyItems = useMemo(
    () => [...buildItems(Object.keys(ridCompanyRegistry), draft.ridOwner.company), CREATE_RID_COMPANY_OPTION],
    [draft.ridOwner.company, ridCompanyRegistry]
  );

  const ridDivisionItems = useMemo(() => {
    const company = draft.ridOwner.company.trim();
    const base = company ? buildItems(ridCompanyRegistry[company] ?? [], draft.ridOwner.division) : [];
    if (company) {
      base.push(CREATE_RID_DIVISION_OPTION);
    }
    return base;
  }, [draft.ridOwner.company, draft.ridOwner.division, ridCompanyRegistry]);

  const technologyItems = useMemo(() => {
    const base = buildItems([...technologyOptions, ...draft.technologyStack]);
    base.push(CREATE_TECHNOLOGY_OPTION);
    return base;
  }, [draft.technologyStack, technologyOptions]);

  const companyUsageItems = useMemo(() => {
    const base = buildItems([
      ...companyNames,
      ...draft.userStats.companies.map((company) => company.name)
    ]);
    base.push(CREATE_COMPANY_USAGE_OPTION);
    return base;
  }, [companyNames, draft.userStats.companies]);

  const libraryItems = useMemo(() => {
    const base = buildItems([
      ...Object.keys(libraryRegistry),
      ...draft.libraries.map((library) => library.name)
    ]);
    base.push(CREATE_LIBRARY_OPTION);
    return base;
  }, [draft.libraries, libraryRegistry]);

  const handleBasicFieldChange = <Key extends keyof ModuleDraftPayload>(
    key: Key,
    value: ModuleDraftPayload[Key]
  ) => {
    onChange({ ...draft, [key]: value });
  };

  const handleRegisterIfNeeded = (value: string, existing: string[], register: (val: string) => void) => {
    const normalized = value.trim();
    if (!normalized) {
      return;
    }
    if (!existing.some((item) => item.toLowerCase() === normalized.toLowerCase())) {
      register(normalized);
    }
  };

  const handleProductSelection = (value: string | null) => {
    if (!value) {
      setProductCreation(null);
      handleBasicFieldChange('productName', '');
      return;
    }
    if (value === CREATE_PRODUCT_OPTION) {
      setProductCreation({ value: '', previous: draft.productName });
      return;
    }
    setProductCreation(null);
    handleRegisterIfNeeded(value, productNames, onRegisterProduct);
    handleBasicFieldChange('productName', value);
  };

  const confirmProductCreation = () => {
    if (!productCreation) {
      return;
    }
    const next = productCreation.value.trim();
    if (!next) {
      setProductCreation(null);
      return;
    }
    onRegisterProduct(next);
    handleBasicFieldChange('productName', next);
    setProductCreation(null);
  };

  const cancelProductCreation = () => {
    if (!productCreation) {
      return;
    }
    handleBasicFieldChange('productName', productCreation.previous);
    setProductCreation(null);
  };

  const handleCreatorCompanySelection = (value: string | null) => {
    if (!value) {
      setCreatorCompanyCreation(null);
      handleBasicFieldChange('creatorCompany', '');
      return;
    }
    if (value === CREATE_CREATOR_COMPANY_OPTION) {
      setCreatorCompanyCreation({ value: '', previous: draft.creatorCompany });
      return;
    }
    setCreatorCompanyCreation(null);
    handleRegisterIfNeeded(value, creatorCompanies, onRegisterCreatorCompany);
    handleBasicFieldChange('creatorCompany', value);
  };

  const confirmCreatorCompanyCreation = () => {
    if (!creatorCompanyCreation) {
      return;
    }
    const next = creatorCompanyCreation.value.trim();
    if (!next) {
      setCreatorCompanyCreation(null);
      return;
    }
    onRegisterCreatorCompany(next);
    handleBasicFieldChange('creatorCompany', next);
    setCreatorCompanyCreation(null);
  };

  const cancelCreatorCompanyCreation = () => {
    if (!creatorCompanyCreation) {
      return;
    }
    handleBasicFieldChange('creatorCompany', creatorCompanyCreation.previous);
    setCreatorCompanyCreation(null);
  };

  const handleLocalizationSelection = (value: string | null) => {
    if (!value) {
      setLocalizationCreation(null);
      handleBasicFieldChange('localization', 'ru');
      return;
    }
    if (value === CREATE_LOCALIZATION_OPTION) {
      setLocalizationCreation({ value: '', previous: draft.localization });
      return;
    }
    setLocalizationCreation(null);
    handleRegisterIfNeeded(value, localizations, onRegisterLocalization);
    handleBasicFieldChange('localization', value);
  };

  const confirmLocalizationCreation = () => {
    if (!localizationCreation) {
      return;
    }
    const next = localizationCreation.value.trim() || 'ru';
    onRegisterLocalization(next);
    handleBasicFieldChange('localization', next);
    setLocalizationCreation(null);
  };

  const cancelLocalizationCreation = () => {
    if (!localizationCreation) {
      return;
    }
    handleBasicFieldChange('localization', localizationCreation.previous || 'ru');
    setLocalizationCreation(null);
  };

  const handleRidCompanySelection = (value: string | null) => {
    if (!value) {
      setRidCompanyCreation(null);
      setRidDivisionCreation(null);
      onChange({ ...draft, ridOwner: { company: '', division: '' } });
      return;
    }
    if (value === CREATE_RID_COMPANY_OPTION) {
      setRidCompanyCreation({ value: '', previous: draft.ridOwner.company });
      return;
    }
    setRidCompanyCreation(null);
    setRidDivisionCreation(null);
    handleRegisterIfNeeded(value, Object.keys(ridCompanyRegistry), onRegisterRidCompany);
    onChange({ ...draft, ridOwner: { company: value, division: '' } });
  };

  const confirmRidCompanyCreation = () => {
    if (!ridCompanyCreation) {
      return;
    }
    const next = ridCompanyCreation.value.trim();
    if (!next) {
      setRidCompanyCreation(null);
      return;
    }
    onRegisterRidCompany(next);
    onChange({ ...draft, ridOwner: { company: next, division: '' } });
    setRidCompanyCreation(null);
    setRidDivisionCreation(null);
  };

  const cancelRidCompanyCreation = () => {
    if (!ridCompanyCreation) {
      return;
    }
    onChange({ ...draft, ridOwner: { ...draft.ridOwner, company: ridCompanyCreation.previous } });
    setRidCompanyCreation(null);
  };

  const handleRidDivisionSelection = (value: string | null) => {
    if (!value) {
      setRidDivisionCreation(null);
      onChange({ ...draft, ridOwner: { ...draft.ridOwner, division: '' } });
      return;
    }
    if (value === CREATE_RID_DIVISION_OPTION) {
      setRidDivisionCreation({ value: '', previous: draft.ridOwner.division });
      return;
    }
    setRidDivisionCreation(null);
    const company = draft.ridOwner.company.trim();
    if (company) {
      onRegisterRidDivision(company, value);
    }
    onChange({ ...draft, ridOwner: { ...draft.ridOwner, division: value } });
  };

  const confirmRidDivisionCreation = () => {
    if (!ridDivisionCreation) {
      return;
    }
    const next = ridDivisionCreation.value.trim();
    if (!next) {
      setRidDivisionCreation(null);
      return;
    }
    const company = draft.ridOwner.company.trim();
    if (company) {
      onRegisterRidDivision(company, next);
    }
    onChange({ ...draft, ridOwner: { ...draft.ridOwner, division: next } });
    setRidDivisionCreation(null);
  };

  const cancelRidDivisionCreation = () => {
    if (!ridDivisionCreation) {
      return;
    }
    onChange({ ...draft, ridOwner: { ...draft.ridOwner, division: ridDivisionCreation.previous } });
    setRidDivisionCreation(null);
  };

  const handleTechnologySelection = (values: string[] | null) => {
    const nextValues = values ?? [];
    if (nextValues.includes(CREATE_TECHNOLOGY_OPTION)) {
      setTechnologyCreation({ value: '', previous: draft.technologyStack });
      return;
    }
    const normalized = Array.from(
      new Set(
        nextValues
          .map((item) => item.trim())
          .filter((item) => item && item !== CREATE_TECHNOLOGY_OPTION)
      )
    );
    normalized.forEach((item) => handleRegisterIfNeeded(item, technologyOptions, onRegisterTechnology));
    onChange({ ...draft, technologyStack: normalized });
  };

  const confirmTechnologyCreation = () => {
    if (!technologyCreation) {
      return;
    }
    const next = technologyCreation.value.trim();
    if (!next) {
      setTechnologyCreation(null);
      return;
    }
    onRegisterTechnology(next);
    const updated = Array.from(new Set([...technologyCreation.previous, next]));
    onChange({ ...draft, technologyStack: updated });
    setTechnologyCreation(null);
  };

  const cancelTechnologyCreation = () => {
    if (!technologyCreation) {
      return;
    }
    onChange({ ...draft, technologyStack: technologyCreation.previous });
    setTechnologyCreation(null);
  };

  const handleRemoveTechnology = (value: string) => {
    onChange({
      ...draft,
      technologyStack: draft.technologyStack.filter((item) => item !== value)
    });
  };

  const handleTeamChange = (
    index: number,
    patch: Partial<Pick<TeamMember, 'fullName' | 'role'>>
  ) => {
    onChange({
      ...draft,
      projectTeam: draft.projectTeam.map((member, memberIndex) =>
        memberIndex === index ? { ...member, ...patch } : member
      )
    });
  };

  const handleAddTeamMember = () => {
    onChange({
      ...draft,
      projectTeam: [
        ...draft.projectTeam,
        { id: `member-${draft.projectTeam.length + 1}`, fullName: '', role: 'Аналитик' }
      ]
    });
  };

  const handleRemoveTeamMember = (index: number) => {
    onChange({
      ...draft,
      projectTeam:
        draft.projectTeam.length <= 1
          ? draft.projectTeam
          : draft.projectTeam.filter((_, memberIndex) => memberIndex !== index)
    });
  };

  const handleUserCompanyChange = (
    index: number,
    patch: Partial<{ name: string; licenses: number }>
  ) => {
    const next = draft.userStats.companies.map((company, companyIndex) =>
      companyIndex === index ? { ...company, ...patch } : company
    );
    onChange({
      ...draft,
      userStats: { companies: next }
    });
  };

  const handleCompanyUsageSelection = (index: number, value: string | null) => {
    if (!value) {
      setCompanyUsageCreation((prev) => (prev?.index === index ? null : prev));
      handleUserCompanyChange(index, { name: '' });
      return;
    }
    if (value === CREATE_COMPANY_USAGE_OPTION) {
      setCompanyUsageCreation({
        index,
        value: '',
        previous: draft.userStats.companies[index]?.name ?? ''
      });
      return;
    }
    setCompanyUsageCreation((prev) => (prev?.index === index ? null : prev));
    handleRegisterIfNeeded(value, companyNames, onRegisterCompany);
    handleUserCompanyChange(index, { name: value });
  };

  const confirmCompanyUsageCreation = () => {
    if (!companyUsageCreation) {
      return;
    }
    const next = companyUsageCreation.value.trim();
    if (!next) {
      setCompanyUsageCreation(null);
      return;
    }
    onRegisterCompany(next);
    handleUserCompanyChange(companyUsageCreation.index, { name: next });
    setCompanyUsageCreation(null);
  };

  const cancelCompanyUsageCreation = () => {
    if (!companyUsageCreation) {
      return;
    }
    handleUserCompanyChange(companyUsageCreation.index, { name: companyUsageCreation.previous });
    setCompanyUsageCreation(null);
  };

  const handleAddUserCompany = () => {
    onChange({
      ...draft,
      userStats: {
        companies: [...draft.userStats.companies, { name: '', licenses: 0 }]
      }
    });
  };

  const handleRemoveUserCompany = (index: number) => {
    onChange({
      ...draft,
      userStats: {
        companies:
          draft.userStats.companies.length <= 1
            ? draft.userStats.companies
            : draft.userStats.companies.filter((_, companyIndex) => companyIndex !== index)
      }
    });
  };

  const handleLibrariesChange = (index: number, patch: Partial<LibraryDependency>) => {
    const next = draft.libraries.map((library, libraryIndex) =>
      libraryIndex === index ? { ...library, ...patch } : library
    );
    onChange({ ...draft, libraries: next });
  };

  const handleLibrarySelection = (index: number, value: string | null) => {
    if (!value) {
      setLibraryCreation((prev) => (prev?.index === index ? null : prev));
      setLibraryVersionCreation((prev) => (prev?.index === index ? null : prev));
      handleLibrariesChange(index, { name: '', version: '' });
      return;
    }
    if (value === CREATE_LIBRARY_OPTION) {
      setLibraryCreation({ index, value: '', previous: draft.libraries[index]?.name ?? '' });
      return;
    }
    setLibraryCreation((prev) => (prev?.index === index ? null : prev));
    setLibraryVersionCreation((prev) => (prev?.index === index ? null : prev));
    onRegisterLibrary(value);
    handleLibrariesChange(index, { name: value, version: '' });
  };

  const confirmLibraryCreation = () => {
    if (!libraryCreation) {
      return;
    }
    const next = libraryCreation.value.trim();
    if (!next) {
      setLibraryCreation(null);
      return;
    }
    onRegisterLibrary(next);
    handleLibrariesChange(libraryCreation.index, { name: next, version: '' });
    setLibraryCreation(null);
  };

  const cancelLibraryCreation = () => {
    if (!libraryCreation) {
      return;
    }
    handleLibrariesChange(libraryCreation.index, { name: libraryCreation.previous });
    setLibraryCreation(null);
  };

  const handleLibraryVersionSelection = (index: number, value: string | null) => {
    if (!value) {
      setLibraryVersionCreation((prev) => (prev?.index === index ? null : prev));
      handleLibrariesChange(index, { version: '' });
      return;
    }
    if (value === CREATE_LIBRARY_VERSION_OPTION) {
      setLibraryVersionCreation({
        index,
        value: '',
        previous: draft.libraries[index]?.version ?? ''
      });
      return;
    }
    setLibraryVersionCreation((prev) => (prev?.index === index ? null : prev));
    const libraryName = draft.libraries[index]?.name.trim();
    if (libraryName) {
      onRegisterLibraryVersion(libraryName, value);
    }
    handleLibrariesChange(index, { version: value });
  };

  const confirmLibraryVersionCreation = () => {
    if (!libraryVersionCreation) {
      return;
    }
    const next = libraryVersionCreation.value.trim();
    if (!next) {
      setLibraryVersionCreation(null);
      return;
    }
    const libraryName = draft.libraries[libraryVersionCreation.index]?.name.trim();
    if (libraryName) {
      onRegisterLibraryVersion(libraryName, next);
    }
    handleLibrariesChange(libraryVersionCreation.index, { version: next });
    setLibraryVersionCreation(null);
  };

  const cancelLibraryVersionCreation = () => {
    if (!libraryVersionCreation) {
      return;
    }
    handleLibrariesChange(libraryVersionCreation.index, { version: libraryVersionCreation.previous });
    setLibraryVersionCreation(null);
  };

  const handleAddLibrary = () => {
    onChange({
      ...draft,
      libraries: [...draft.libraries, { name: '', version: '' }]
    });
  };

  const handleRemoveLibrary = (index: number) => {
    setLibraryCreation((prev) => (prev?.index === index ? null : prev));
    setLibraryVersionCreation((prev) => (prev?.index === index ? null : prev));
    onChange({
      ...draft,
      libraries:
        draft.libraries.length <= 1
          ? draft.libraries
          : draft.libraries.filter((_, libraryIndex) => libraryIndex !== index)
    });
  };

  const handleDataInChange = (index: number, patch: Partial<ModuleInput>) => {
    onChange({
      ...draft,
      dataIn: draft.dataIn.map((input, inputIndex) =>
        inputIndex === index ? { ...input, ...patch } : input
      )
    });
  };

  const handleAddDataIn = () => {
    onChange({
      ...draft,
      dataIn: [...draft.dataIn, { id: `input-${draft.dataIn.length + 1}`, label: '', sourceId: undefined }]
    });
  };

  const handleRemoveDataIn = (index: number) => {
    onChange({
      ...draft,
      dataIn:
        draft.dataIn.length <= 1
          ? draft.dataIn
          : draft.dataIn.filter((_, inputIndex) => inputIndex !== index)
    });
  };

  const handleDataOutChange = (index: number, patch: Partial<ModuleOutput>) => {
    onChange({
      ...draft,
      dataOut: draft.dataOut.map((output, outputIndex) =>
        outputIndex === index ? { ...output, ...patch } : output
      )
    });
  };

  const handleAddDataOut = () => {
    onChange({
      ...draft,
      dataOut: [...draft.dataOut, { id: `output-${draft.dataOut.length + 1}`, label: '', consumerIds: [] }]
    });
  };

  const handleRemoveDataOut = (index: number) => {
    onChange({
      ...draft,
      dataOut:
        draft.dataOut.length <= 1
          ? draft.dataOut
          : draft.dataOut.filter((_, outputIndex) => outputIndex !== index)
    });
  };

  const renderGeneralSection = () => (
    <>
      <label className={styles.field}>
        <Text size="xs" weight="semibold" className={styles.label}>
          Название модуля
        </Text>
        <TextField
          size="s"
          value={draft.name}
          onChange={(value) => handleBasicFieldChange('name', value ?? '')}
        />
      </label>
      <div className={styles.fieldGroup}>
        <label className={styles.field}>
          <Text size="xs" weight="semibold" className={styles.label}>
            Статус
          </Text>
          <Select<SelectItem<ModuleStatus>>
            size="s"
            items={statusItems}
            value={statusItems.find((item) => item.value === draft.status) ?? null}
            getItemLabel={(item) => item.label}
            getItemKey={(item) => item.value}
            onChange={(item) => item && handleBasicFieldChange('status', item.value)}
          />
        </label>
        <label className={styles.field}>
          <Text size="xs" weight="semibold" className={styles.label}>
            Компания-разработчик
          </Text>
          <Combobox<string>
            size="s"
            items={creatorCompanyItems}
            value={
              creatorCompanyCreation
                ? CREATE_CREATOR_COMPANY_OPTION
                : draft.creatorCompany.trim() || null
            }
            getItemKey={(item) => item}
            getItemLabel={(item) =>
              item === CREATE_CREATOR_COMPANY_OPTION ? 'Добавить компанию…' : item || '—'
            }
            placeholder="Выберите компанию"
            onChange={handleCreatorCompanySelection}
          />
          {creatorCompanyCreation && (
            <div className={styles.inlineForm}>
              <input
                className={styles.input}
                value={creatorCompanyCreation.value}
                onChange={(event) =>
                  setCreatorCompanyCreation({ ...creatorCompanyCreation, value: event.target.value })
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    confirmCreatorCompanyCreation();
                  }
                }}
                placeholder="Введите название компании"
              />
              <div className={styles.inlineButtons}>
                <Button size="xs" label="Сохранить" view="primary" onClick={confirmCreatorCompanyCreation} />
                <Button size="xs" label="Отмена" view="ghost" onClick={cancelCreatorCompanyCreation} />
              </div>
            </div>
          )}
        </label>
      </div>
      <div className={styles.fieldGroup}>
        <label className={styles.field}>
          <Text size="xs" weight="semibold" className={styles.label}>
            Продукт
          </Text>
          <Combobox<string>
            size="s"
            items={productItems}
            value={productCreation ? CREATE_PRODUCT_OPTION : draft.productName.trim() || null}
            getItemKey={(item) => item}
            getItemLabel={(item) => (item === CREATE_PRODUCT_OPTION ? 'Добавить продукт…' : item || '—')}
            placeholder="Выберите продукт"
            onChange={handleProductSelection}
          />
          {productCreation && (
            <div className={styles.inlineForm}>
              <input
                className={styles.input}
                value={productCreation.value}
                onChange={(event) =>
                  setProductCreation({ ...productCreation, value: event.target.value })
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    confirmProductCreation();
                  }
                }}
                placeholder="Введите название продукта"
              />
              <div className={styles.inlineButtons}>
                <Button size="xs" label="Сохранить" view="primary" onClick={confirmProductCreation} />
                <Button size="xs" label="Отмена" view="ghost" onClick={cancelProductCreation} />
              </div>
            </div>
          )}
        </label>
        <label className={styles.field}>
          <Text size="xs" weight="semibold" className={styles.label}>
            Локализация
          </Text>
          <Combobox<string>
            size="s"
            items={localizationItems}
            value={
              localizationCreation
                ? CREATE_LOCALIZATION_OPTION
                : draft.localization.trim() || 'ru'
            }
            getItemKey={(item) => item}
            getItemLabel={(item) => (item === CREATE_LOCALIZATION_OPTION ? 'Добавить локализацию…' : item)}
            placeholder="Выберите локализацию"
            onChange={handleLocalizationSelection}
          />
          {localizationCreation && (
            <div className={styles.inlineForm}>
              <input
                className={styles.input}
                value={localizationCreation.value}
                onChange={(event) =>
                  setLocalizationCreation({ ...localizationCreation, value: event.target.value })
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    confirmLocalizationCreation();
                  }
                }}
                placeholder="Например, ru"
              />
              <div className={styles.inlineButtons}>
                <Button size="xs" label="Сохранить" view="primary" onClick={confirmLocalizationCreation} />
                <Button size="xs" label="Отмена" view="ghost" onClick={cancelLocalizationCreation} />
              </div>
            </div>
          )}
        </label>
      </div>
      <div className={styles.metricDisplay}>
        <Text size="xs" weight="semibold" className={styles.label}>
          Оценка переиспользования
        </Text>
        <Text size="m" weight="semibold">{draft.reuseScore}%</Text>
        <Text size="xs" view="secondary" className={styles.metricHint}>
          Значение вычисляется автоматически и используется как справочная метрика.
        </Text>
      </div>
      <label className={styles.field}>
        <Text size="xs" weight="semibold" className={styles.label}>
          Описание
        </Text>
        <textarea
          className={styles.textarea}
          value={draft.description}
          onChange={(event) => handleBasicFieldChange('description', event.target.value)}
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
          getItemKey={(item) => item}
          getItemLabel={(item) => domainLabelMap[item] ?? item}
          placeholder="Выберите конечные домены"
          onChange={(value) => handleBasicFieldChange('domainIds', value ?? [])}
        />
        {mode === 'create' && draft.domainIds.length === 0 && (
          <Text size="xs" className={styles.error}>
            Укажите хотя бы один конечный домен.
          </Text>
        )}
      </label>
      <div className={styles.fieldGroup}>
        <label className={styles.field}>
          <Text size="xs" weight="semibold" className={styles.label}>
            Владелец РИД — компания
          </Text>
          <Combobox<string>
            size="s"
            items={ridCompanyItems}
            value={
              ridCompanyCreation
                ? CREATE_RID_COMPANY_OPTION
                : draft.ridOwner.company.trim() || null
            }
            getItemKey={(item) => item}
            getItemLabel={(item) => (item === CREATE_RID_COMPANY_OPTION ? 'Добавить компанию…' : item)}
            placeholder="Выберите компанию"
            onChange={handleRidCompanySelection}
          />
          {ridCompanyCreation && (
            <div className={styles.inlineForm}>
              <input
                className={styles.input}
                value={ridCompanyCreation.value}
                onChange={(event) =>
                  setRidCompanyCreation({ ...ridCompanyCreation, value: event.target.value })
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    confirmRidCompanyCreation();
                  }
                }}
                placeholder="Введите компанию"
              />
              <div className={styles.inlineButtons}>
                <Button size="xs" label="Сохранить" view="primary" onClick={confirmRidCompanyCreation} />
                <Button size="xs" label="Отмена" view="ghost" onClick={cancelRidCompanyCreation} />
              </div>
            </div>
          )}
        </label>
        <label className={styles.field}>
          <Text size="xs" weight="semibold" className={styles.label}>
            Владелец РИД — подразделение
          </Text>
          <Combobox<string>
            size="s"
            items={ridDivisionItems}
            value={
              ridDivisionCreation
                ? CREATE_RID_DIVISION_OPTION
                : draft.ridOwner.division.trim() || null
            }
            getItemKey={(item) => item}
            getItemLabel={(item) => (item === CREATE_RID_DIVISION_OPTION ? 'Добавить подразделение…' : item)}
            placeholder="Выберите подразделение"
            disabled={!draft.ridOwner.company.trim()}
            onChange={handleRidDivisionSelection}
          />
          {ridDivisionCreation && (
            <div className={styles.inlineForm}>
              <input
                className={styles.input}
                value={ridDivisionCreation.value}
                onChange={(event) =>
                  setRidDivisionCreation({ ...ridDivisionCreation, value: event.target.value })
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    confirmRidDivisionCreation();
                  }
                }}
                placeholder="Введите подразделение"
              />
              <div className={styles.inlineButtons}>
                <Button size="xs" label="Сохранить" view="primary" onClick={confirmRidDivisionCreation} />
                <Button size="xs" label="Отмена" view="ghost" onClick={cancelRidDivisionCreation} />
              </div>
            </div>
          )}
        </label>
      </div>
      <div className={styles.subSection}>
        <Text size="xs" weight="semibold" className={styles.sectionTitle}>
          Технологический стек
        </Text>
        <div className={styles.chipList}>
          {draft.technologyStack.length > 0 ? (
            draft.technologyStack.map((technology) => (
              <span key={technology} className={styles.chip}>
                <Text size="xs">{technology}</Text>
                <button
                  type="button"
                  className={styles.chipButton}
                  onClick={() => handleRemoveTechnology(technology)}
                >
                  ×
                </button>
              </span>
            ))
          ) : (
            <Text size="xs" view="secondary">
              Технологии не выбраны
            </Text>
          )}
        </div>
        <Combobox<string>
          size="s"
          items={technologyItems}
          value={draft.technologyStack}
          multiple
          getItemKey={(item) => item}
          getItemLabel={(item) => (item === CREATE_TECHNOLOGY_OPTION ? 'Добавить технологию…' : item)}
          placeholder="Добавьте технологию из справочника"
          onChange={handleTechnologySelection}
        />
        {technologyCreation && (
          <div className={styles.inlineForm}>
            <input
              className={styles.input}
              value={technologyCreation.value}
              onChange={(event) =>
                setTechnologyCreation({ ...technologyCreation, value: event.target.value })
              }
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  confirmTechnologyCreation();
                }
              }}
              placeholder="Например, React"
            />
            <div className={styles.inlineButtons}>
              <Button size="xs" label="Сохранить" view="primary" onClick={confirmTechnologyCreation} />
              <Button size="xs" label="Отмена" view="ghost" onClick={cancelTechnologyCreation} />
            </div>
          </div>
        )}
      </div>
      <div className={styles.subSection}>
        <Text size="xs" weight="semibold" className={styles.sectionTitle}>
          Команда проекта
        </Text>
        <div className={styles.listStack}>
          {draft.projectTeam.map((member, index) => (
            <div key={member.id} className={styles.inlineGroup}>
              <TextField
                size="s"
                value={member.fullName}
                placeholder="ФИО"
                onChange={(value) => handleTeamChange(index, { fullName: value ?? '' })}
              />
              <Select<SelectItem<TeamRole>>
                size="s"
                items={teamRoleItems}
                value={teamRoleItems.find((item) => item.value === member.role) ?? null}
                getItemLabel={(item) => item.label}
                getItemKey={(item) => item.value}
                onChange={(item) => item && handleTeamChange(index, { role: item.value })}
              />
              <Button
                size="xs"
                view="ghost"
                label="Удалить"
                onClick={() => handleRemoveTeamMember(index)}
              />
            </div>
          ))}
        </div>
        <Button size="xs" view="secondary" label="Добавить участника" onClick={handleAddTeamMember} />
      </div>
      <div className={styles.subSection}>
        <Text size="xs" weight="semibold" className={styles.sectionTitle}>
          Компании и лицензии
        </Text>
        <div className={styles.listStack}>
          {draft.userStats.companies.map((company, index) => (
            <div key={`${company.name || 'company'}-${index}`} className={styles.inlineGroup}>
              <Combobox<string>
                size="s"
                items={companyUsageItems}
                value={
                  companyUsageCreation?.index === index
                    ? CREATE_COMPANY_USAGE_OPTION
                    : company.name.trim() || null
                }
                getItemKey={(item) => item}
                getItemLabel={(item) => (item === CREATE_COMPANY_USAGE_OPTION ? 'Добавить компанию…' : item || '—')}
                placeholder="Выберите компанию"
                onChange={(value) => handleCompanyUsageSelection(index, value)}
              />
              {companyUsageCreation?.index === index && (
                <div className={styles.inlineForm}>
                  <input
                    className={styles.input}
                    value={companyUsageCreation.value}
                    onChange={(event) =>
                      setCompanyUsageCreation({ ...companyUsageCreation, value: event.target.value })
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        confirmCompanyUsageCreation();
                      }
                    }}
                    placeholder="Введите компанию"
                  />
                  <div className={styles.inlineButtons}>
                    <Button size="xs" label="Сохранить" view="primary" onClick={confirmCompanyUsageCreation} />
                    <Button size="xs" label="Отмена" view="ghost" onClick={cancelCompanyUsageCreation} />
                  </div>
                </div>
              )}
              <TextField
                size="s"
                type="number"
                value={String(company.licenses)}
                placeholder="Лицензии"
                onChange={(value) =>
                  handleUserCompanyChange(index, {
                    licenses: Number(value ?? company.licenses)
                  })
                }
              />
              <Button
                size="xs"
                view="ghost"
                label="Удалить"
                onClick={() => handleRemoveUserCompany(index)}
              />
            </div>
          ))}
        </div>
        <Button size="xs" view="secondary" label="Добавить компанию" onClick={handleAddUserCompany} />
      </div>
    </>
  );

  const renderCalculationSection = () => (
    <>
      <label className={styles.field}>
        <Text size="xs" weight="semibold" className={styles.label}>
          Зависимые модули
        </Text>
        <Combobox<string>
          size="s"
          items={moduleItems.filter((item) => item !== moduleKey)}
          value={draft.dependencyIds}
          multiple
          getItemKey={(item) => item}
          getItemLabel={(item) => moduleLabelMap[item] ?? item}
          placeholder="Выберите зависимости"
          onChange={(value) => handleBasicFieldChange('dependencyIds', value ?? [])}
        />
      </label>
      <div className={styles.subSection}>
        <Text size="xs" weight="semibold" className={styles.sectionTitle}>
          Входные данные
        </Text>
        <div className={styles.listStack}>
          {draft.dataIn.map((input, index) => (
            <div key={input.id || `input-${index}`} className={styles.dataRow}>
              <TextField
                size="s"
                value={input.id}
                placeholder="ID"
                onChange={(value) => handleDataInChange(index, { id: value ?? '' })}
              />
              <TextField
                size="s"
                value={input.label}
                placeholder="Описание"
                onChange={(value) => handleDataInChange(index, { label: value ?? '' })}
              />
              <Combobox<string>
                size="s"
                items={artifactItems}
                value={input.sourceId ?? null}
                getItemKey={(item) => item}
                getItemLabel={(item) => artifactLabelMap[item] ?? item}
                placeholder="Артефакт"
                onChange={(value) => handleDataInChange(index, { sourceId: value ?? undefined })}
              />
              <Button
                size="xs"
                view="ghost"
                label="Удалить"
                onClick={() => handleRemoveDataIn(index)}
              />
            </div>
          ))}
        </div>
        <Button size="xs" view="secondary" label="Добавить вход" onClick={handleAddDataIn} />
      </div>
      <div className={styles.subSection}>
        <Text size="xs" weight="semibold" className={styles.sectionTitle}>
          Выходные данные
        </Text>
        <div className={styles.listStack}>
          {draft.dataOut.map((output, index) => (
            <div key={output.id || `output-${index}`} className={styles.dataRow}>
              <TextField
                size="s"
                value={output.id}
                placeholder="ID"
                onChange={(value) => handleDataOutChange(index, { id: value ?? '' })}
              />
              <TextField
                size="s"
                value={output.label}
                placeholder="Описание"
                onChange={(value) => handleDataOutChange(index, { label: value ?? '' })}
              />
              <Combobox<string>
                size="s"
                items={moduleItems}
                value={output.consumerIds ?? []}
                multiple
                getItemKey={(item) => item}
                getItemLabel={(item) => moduleLabelMap[item] ?? item}
                placeholder="Потребители"
                onChange={(value) => handleDataOutChange(index, { consumerIds: value ?? [] })}
              />
              <Button
                size="xs"
                view="ghost"
                label="Удалить"
                onClick={() => handleRemoveDataOut(index)}
              />
            </div>
          ))}
        </div>
        <Button size="xs" view="secondary" label="Добавить выход" onClick={handleAddDataOut} />
      </div>
      <label className={styles.field}>
        <Text size="xs" weight="semibold" className={styles.label}>
          Производимые артефакты
        </Text>
        <Combobox<string>
          size="s"
          items={artifactItems}
          value={draft.produces}
          multiple
          getItemKey={(item) => item}
          getItemLabel={(item) => artifactLabelMap[item] ?? item}
          placeholder="Выберите артефакты"
          onChange={(value) => handleBasicFieldChange('produces', value ?? [])}
        />
      </label>
      <label className={styles.field}>
        <Text size="xs" weight="semibold" className={styles.label}>
          Формула расчёта эффекта
        </Text>
        <textarea
          className={styles.textarea}
          value={draft.formula}
          onChange={(event) => handleBasicFieldChange('formula', event.target.value)}
        />
      </label>
    </>
  );

  const renderTechnicalSection = () => (
    <>
      <div className={styles.fieldGroup}>
        <label className={styles.field}>
          <Text size="xs" weight="semibold" className={styles.label}>
            Репозиторий
          </Text>
          <TextField
            size="s"
            value={draft.repository ?? ''}
            onChange={(value) => handleBasicFieldChange('repository', value ?? '')}
          />
        </label>
        <label className={styles.field}>
          <Text size="xs" weight="semibold" className={styles.label}>
            API
          </Text>
          <TextField
            size="s"
            value={draft.api ?? ''}
            onChange={(value) => handleBasicFieldChange('api', value ?? '')}
          />
        </label>
      </div>
      <div className={styles.fieldGroup}>
        <label className={styles.field}>
          <Text size="xs" weight="semibold" className={styles.label}>
            Спецификация
          </Text>
          <TextField
            size="s"
            value={draft.specificationUrl}
            onChange={(value) => handleBasicFieldChange('specificationUrl', value ?? '')}
          />
        </label>
        <label className={styles.field}>
          <Text size="xs" weight="semibold" className={styles.label}>
            Контракты API
          </Text>
          <TextField
            size="s"
            value={draft.apiContractsUrl}
            onChange={(value) => handleBasicFieldChange('apiContractsUrl', value ?? '')}
          />
        </label>
      </div>
      <div className={styles.fieldGroup}>
        <label className={styles.field}>
          <Text size="xs" weight="semibold" className={styles.label}>
            Технический проект
          </Text>
          <TextField
            size="s"
            value={draft.techDesignUrl}
            onChange={(value) => handleBasicFieldChange('techDesignUrl', value ?? '')}
          />
        </label>
        <label className={styles.field}>
          <Text size="xs" weight="semibold" className={styles.label}>
            Диаграмма архитектуры
          </Text>
          <TextField
            size="s"
            value={draft.architectureDiagramUrl}
            onChange={(value) => handleBasicFieldChange('architectureDiagramUrl', value ?? '')}
          />
        </label>
      </div>
      <div className={styles.fieldGroup}>
        <label className={styles.field}>
          <Text size="xs" weight="semibold" className={styles.label}>
            Клиентское приложение
          </Text>
          <Select<SelectItem<ModuleNode['clientType']>>
            size="s"
            items={clientTypeItems}
            value={clientTypeItems.find((item) => item.value === draft.clientType) ?? null}
            getItemLabel={(item) => item.label}
            getItemKey={(item) => item.value}
            onChange={(item) => item && handleBasicFieldChange('clientType', item.value)}
          />
        </label>
        <label className={styles.field}>
          <Text size="xs" weight="semibold" className={styles.label}>
            Инструмент деплоя
          </Text>
          <Select<SelectItem<ModuleNode['deploymentTool']>>
            size="s"
            items={deploymentItems}
            value={deploymentItems.find((item) => item.value === draft.deploymentTool) ?? null}
            getItemLabel={(item) => item.label}
            getItemKey={(item) => item.value}
            onChange={(item) => item && handleBasicFieldChange('deploymentTool', item.value)}
          />
        </label>
      </div>
      <div className={styles.field}>
        <Text size="xs" weight="semibold" className={styles.label}>
          Интеграция с сервером лицензирования
        </Text>
        <Switch
          size="s"
          checked={draft.licenseServerIntegrated}
          onChange={({ checked }) => handleBasicFieldChange('licenseServerIntegrated', !!checked)}
        />
      </div>
      <div className={styles.subSection}>
        <Text size="xs" weight="semibold" className={styles.sectionTitle}>
          Библиотеки
        </Text>
        <div className={styles.listStack}>
          {draft.libraries.map((library, index) => {
            const libraryName = library.name.trim();
            const versionItems = (() => {
              const base = buildItems(libraryName ? libraryRegistry[libraryName] ?? [] : [], library.version);
              if (libraryName) {
                base.push(CREATE_LIBRARY_VERSION_OPTION);
              }
              return base;
            })();
            return (
              <div key={`${library.name || 'library'}-${index}`} className={styles.inlineGroup}>
                <Combobox<string>
                  size="s"
                  items={libraryItems}
                  value={
                    libraryCreation?.index === index
                      ? CREATE_LIBRARY_OPTION
                      : library.name.trim() || null
                  }
                  getItemKey={(item) => item}
                  getItemLabel={(item) => (item === CREATE_LIBRARY_OPTION ? 'Добавить библиотеку…' : item || '—')}
                  placeholder="Выберите библиотеку"
                  onChange={(value) => handleLibrarySelection(index, value)}
                />
                {libraryCreation?.index === index && (
                  <div className={styles.inlineForm}>
                    <input
                      className={styles.input}
                      value={libraryCreation.value}
                      onChange={(event) =>
                        setLibraryCreation({ ...libraryCreation, value: event.target.value })
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          confirmLibraryCreation();
                        }
                      }}
                      placeholder="Введите библиотеку"
                    />
                    <div className={styles.inlineButtons}>
                      <Button size="xs" label="Сохранить" view="primary" onClick={confirmLibraryCreation} />
                      <Button size="xs" label="Отмена" view="ghost" onClick={cancelLibraryCreation} />
                    </div>
                  </div>
                )}
                <Combobox<string>
                  size="s"
                  items={versionItems}
                  value={
                    libraryVersionCreation?.index === index
                      ? CREATE_LIBRARY_VERSION_OPTION
                      : library.version.trim() || null
                  }
                  disabled={!libraryName}
                  getItemKey={(item) => item}
                  getItemLabel={(item) => (item === CREATE_LIBRARY_VERSION_OPTION ? 'Добавить версию…' : item || '—')}
                  placeholder="Выберите версию"
                  onChange={(value) => handleLibraryVersionSelection(index, value)}
                />
                {libraryVersionCreation?.index === index && (
                  <div className={styles.inlineForm}>
                    <input
                      className={styles.input}
                      value={libraryVersionCreation.value}
                      onChange={(event) =>
                        setLibraryVersionCreation({ ...libraryVersionCreation, value: event.target.value })
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          confirmLibraryVersionCreation();
                        }
                      }}
                      placeholder="Введите версию"
                    />
                    <div className={styles.inlineButtons}>
                      <Button size="xs" label="Сохранить" view="primary" onClick={confirmLibraryVersionCreation} />
                      <Button size="xs" label="Отмена" view="ghost" onClick={cancelLibraryVersionCreation} />
                    </div>
                  </div>
                )}
                <Button
                  size="xs"
                  view="ghost"
                  label="Удалить"
                  onClick={() => handleRemoveLibrary(index)}
                />
              </div>
            );
          })}
        </div>
        <Button size="xs" view="secondary" label="Добавить библиотеку" onClick={handleAddLibrary} />
      </div>
      <div className={styles.fieldGroup}>
        <label className={styles.field}>
          <Text size="xs" weight="semibold" className={styles.label}>
            Покрытие тестами, %
          </Text>
          <TextField
            size="s"
            type="number"
            value={String(draft.metrics.coverage)}
            onChange={(value) =>
              handleBasicFieldChange('metrics', {
                ...draft.metrics,
                coverage: Number(value ?? draft.metrics.coverage)
              })
            }
          />
        </label>
        <label className={styles.field}>
          <Text size="xs" weight="semibold" className={styles.label}>
            Автоматизация регрессии, %
          </Text>
          <TextField
            size="s"
            type="number"
            value={String(draft.metrics.automationRate)}
            onChange={(value) =>
              handleBasicFieldChange('metrics', {
                ...draft.metrics,
                automationRate: Number(value ?? draft.metrics.automationRate)
              })
            }
          />
        </label>
        <label className={styles.field}>
          <Text size="xs" weight="semibold" className={styles.label}>
            Количество тестов
          </Text>
          <TextField
            size="s"
            type="number"
            value={String(draft.metrics.tests)}
            onChange={(value) =>
              handleBasicFieldChange('metrics', {
                ...draft.metrics,
                tests: Number(value ?? draft.metrics.tests)
              })
            }
          />
        </label>
      </div>
    </>
  );

  const renderNonFunctionalSection = () => (
    <>
      <div className={styles.fieldGroup}>
        <label className={styles.field}>
          <Text size="xs" weight="semibold" className={styles.label}>
            Время отклика, мс
          </Text>
          <TextField
            size="s"
            type="number"
            value={String(draft.nonFunctional.responseTimeMs)}
            onChange={(value) =>
              handleBasicFieldChange('nonFunctional', {
                ...draft.nonFunctional,
                responseTimeMs: Number(value ?? draft.nonFunctional.responseTimeMs)
              })
            }
          />
        </label>
        <label className={styles.field}>
          <Text size="xs" weight="semibold" className={styles.label}>
            Пропускная способность, rps
          </Text>
          <TextField
            size="s"
            type="number"
            value={String(draft.nonFunctional.throughputRps)}
            onChange={(value) =>
              handleBasicFieldChange('nonFunctional', {
                ...draft.nonFunctional,
                throughputRps: Number(value ?? draft.nonFunctional.throughputRps)
              })
            }
          />
        </label>
      </div>
      <label className={styles.field}>
        <Text size="xs" weight="semibold" className={styles.label}>
          Потребление ресурсов
        </Text>
        <TextField
          size="s"
          value={draft.nonFunctional.resourceConsumption}
          onChange={(value) =>
            handleBasicFieldChange('nonFunctional', {
              ...draft.nonFunctional,
              resourceConsumption: value ?? ''
            })
          }
        />
      </label>
      <label className={styles.field}>
        <Text size="xs" weight="semibold" className={styles.label}>
          Базовое количество пользователей
        </Text>
        <TextField
          size="s"
          type="number"
          value={String(draft.nonFunctional.baselineUsers)}
          onChange={(value) =>
            handleBasicFieldChange('nonFunctional', {
              ...draft.nonFunctional,
              baselineUsers: Number(value ?? draft.nonFunctional.baselineUsers)
            })
          }
        />
      </label>
    </>
  );

  return (
    <div className={styles.formBody}>
      <div className={styles.formHeader}>
        <div>
          <Text size="l" weight="semibold" className={styles.formTitle}>
            {mode === 'create' ? 'Создание модуля' : 'Редактирование модуля'}
          </Text>
          <Text size="xs" view="secondary" className={styles.formSubtitle}>
            Заполните ключевые сведения и связи модуля перед публикацией в графе.
          </Text>
        </div>
        {onDelete && <Button size="s" view="clear" label="Удалить модуль" onClick={onDelete} />}
      </div>
      {moduleSections.map((section, index) => (
        <Collapse
          key={section.id}
          isOpen={current === index}
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
            {section.id === 'general' && renderGeneralSection()}
            {section.id === 'calculation' && renderCalculationSection()}
            {section.id === 'technical' && renderTechnicalSection()}
            {section.id === 'nonFunctional' && renderNonFunctionalSection()}
          </div>
          <div className={styles.stepActions}>
            {index > 0 && (
              <Button size="s" view="ghost" label="Вернуться" onClick={() => goToStep(index - 1)} />
            )}
            {index < moduleSections.length - 1 ? (
              <Button size="s" label="Заполнить следующий раздел" onClick={() => goToStep(index + 1)} />
            ) : (
              <Button size="s" view="primary" label="Сохранить модуль" onClick={onSubmit} />
            )}
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
  parentCatalogIds: string[];
  parentDomainIds: string[];
  forbiddenParentIds: string[];
  parentLabelMap: Record<string, string>;
  moduleItems: string[];
  moduleLabelMap: Record<string, string>;
  currentDomainId?: string;
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
  parentCatalogIds,
  parentDomainIds,
  forbiddenParentIds,
  parentLabelMap,
  moduleItems,
  moduleLabelMap,
  currentDomainId,
  onChange,
  onStepChange,
  onSubmit,
  onDelete
}) => {
  const goToStep = (next: number) => {
    onStepChange(Math.min(Math.max(next, 0), domainSections.length - 1));
  };

  const current = Math.min(Math.max(step, 0), domainSections.length - 1);

  const parentOptions = useMemo<string[]>(() => {
    const values = new Set<string>();
    parentCatalogIds.forEach((id) => values.add(id));
    parentDomainIds.forEach((id) => values.add(id));
    if (draft.parentId) {
      values.add(draft.parentId);
    }
    const filtered = Array.from(values).filter((id) =>
      id && id !== currentDomainId && !forbiddenParentIds.includes(id)
    );
    return ['__root__', ...filtered];
  }, [currentDomainId, draft.parentId, forbiddenParentIds, parentCatalogIds, parentDomainIds]);

  const handleParentChange = (value: string | null) => {
    if (!value || value === '__root__') {
      onChange({ ...draft, parentId: undefined, isCatalogRoot: false });
      return;
    }
    onChange({ ...draft, parentId: value, isCatalogRoot: false });
  };

  const renderBasicSection = () => (
    <>
      <label className={styles.field}>
        <Text size="xs" weight="semibold" className={styles.label}>
          Название домена
        </Text>
        <TextField
          size="s"
          value={draft.name}
          onChange={(value) => onChange({ ...draft, name: value ?? '' })}
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
      <div className={styles.fieldGroup}>
        <label className={styles.field}>
          <Text size="xs" weight="semibold" className={styles.label}>
            Родительский раздел
          </Text>
          <Combobox<string>
            size="s"
            items={parentOptions}
            value={draft.parentId ?? '__root__'}
            getItemKey={(item) => item}
            getItemLabel={(item) =>
              item === '__root__' ? 'Корень каталога' : parentLabelMap[item] ?? item
            }
            onChange={handleParentChange}
          />
        </label>
        <label className={styles.field}>
          <Text size="xs" weight="semibold" className={styles.label}>
            Каталожный раздел
          </Text>
          <Switch
            size="s"
            checked={draft.isCatalogRoot}
            onChange={({ checked }) => onChange({ ...draft, isCatalogRoot: !!checked })}
          />
        </label>
      </div>
    </>
  );

  const renderRelationsSection = () => (
    <>
      <label className={styles.field}>
        <Text size="xs" weight="semibold" className={styles.label}>
          Связанные модули
        </Text>
        <Combobox<string>
          size="s"
          items={moduleItems}
          value={draft.moduleIds}
          multiple
          getItemKey={(item) => item}
          getItemLabel={(item) => moduleLabelMap[item] ?? item}
          onChange={(value) => onChange({ ...draft, moduleIds: value ?? [] })}
        />
      </label>
      <label className={styles.field}>
        <Text size="xs" weight="semibold" className={styles.label}>
          Экспертное сообщество
        </Text>
        <TextField
          size="s"
          value={draft.experts.join(', ')}
          placeholder="Через запятую"
          onChange={(value) =>
            onChange({
              ...draft,
              experts: (value ?? '')
                .split(',')
                .map((item) => item.trim())
                .filter((item) => item.length > 0)
            })
          }
        />
      </label>
      <label className={styles.field}>
        <Text size="xs" weight="semibold" className={styles.label}>
          Ссылка на мероприятия
        </Text>
        <TextField
          size="s"
          value={draft.meetupLink}
          onChange={(value) => onChange({ ...draft, meetupLink: value ?? '' })}
        />
      </label>
    </>
  );

  return (
    <div className={styles.formBody}>
      <div className={styles.formHeader}>
        <div>
          <Text size="l" weight="semibold" className={styles.formTitle}>
            {mode === 'create' ? 'Создание домена' : 'Редактирование домена'}
          </Text>
          <Text size="xs" view="secondary" className={styles.formSubtitle}>
            Уточните положение в каталоге и связанные модули доменной области.
          </Text>
        </div>
        {onDelete && <Button size="s" view="clear" label="Удалить домен" onClick={onDelete} />}
      </div>
      {domainSections.map((section, index) => (
        <Collapse
          key={section}
          isOpen={current === index}
          onClick={() => goToStep(index)}
          label={
            <div className={styles.collapseLabel}>
              <Text size="s" weight="semibold">
                {section === 'basic' ? 'Основные сведения' : 'Связи и эксперты'}
              </Text>
              <Text size="xs" view="secondary">
                Раздел {index + 1} из {domainSections.length}
              </Text>
            </div>
          }
        >
          <div className={styles.sectionContent}>
            {section === 'basic' ? renderBasicSection() : renderRelationsSection()}
          </div>
          <div className={styles.stepActions}>
            {index > 0 && (
              <Button size="s" view="ghost" label="Назад" onClick={() => goToStep(index - 1)} />
            )}
            {index < domainSections.length - 1 ? (
              <Button size="s" label="Далее" onClick={() => goToStep(index + 1)} />
            ) : (
              <Button size="s" view="primary" label="Сохранить домен" onClick={onSubmit} />
            )}
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

function createDefaultModuleDraft(): ModuleDraftPayload {
  return {
    name: '',
    description: '',
    productName: '',
    creatorCompany: '',
    status: 'in-dev',
    domainIds: [],
    dependencyIds: [],
    produces: [],
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
    produces: [...module.produces],
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

  if (Array.isArray(patch.produces)) {
    ensureCopy();
    next.produces = [...patch.produces];
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
