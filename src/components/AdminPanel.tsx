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
  moduleKey: string;
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
  onRegisterProduct: (name: string) => void;
  creatorCompanies: string[];
  onRegisterCreatorCompany: (name: string) => void;
  localizations: string[];
  onRegisterLocalization: (value: string) => void;
  ridCompanyRegistry: Record<string, string[]>;
  onRegisterRidCompany: (company: string) => void;
  onRegisterRidDivision: (company: string, division: string) => void;
  technologyOptions: string[];
  onRegisterTechnology: (technology: string) => void;
  libraryRegistry: Record<string, string[]>;
  onRegisterLibrary: (library: string) => void;
  onRegisterLibraryVersion: (library: string, version: string) => void;
  companyNames: string[];
  onRegisterCompany: (name: string) => void;
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
  const [productCreation, setProductCreation] = useState<
    { value: string; previous: string } | null
  >(null);
  const [creatorCompanyCreation, setCreatorCompanyCreation] = useState<
    { value: string; previous: string } | null
  >(null);
  const [localizationCreation, setLocalizationCreation] = useState<
    { value: string; previous: string } | null
  >(null);
  const [ridCompanyCreation, setRidCompanyCreation] = useState<
    { value: string; previous: { company: string; division: string } } | null
  >(null);
  const [ridDivisionCreation, setRidDivisionCreation] = useState<
    { value: string; previous: string } | null
  >(null);
  const [technologyCreation, setTechnologyCreation] = useState<{ value: string } | null>(null);
  const [libraryNameCreation, setLibraryNameCreation] = useState<
    Record<number, { value: string; previous: string }>
  >({});
  const [libraryVersionCreation, setLibraryVersionCreation] = useState<
    Record<number, { value: string; previous: string }>
  >({});
  const [companyCreationInputs, setCompanyCreationInputs] = useState<
    Record<number, { value: string; previous: string }>
  >({});

  const isDomainMissing = mode === 'create' && draft.domainIds.length === 0;

  useEffect(() => {
    setProductCreation(null);
    setCreatorCompanyCreation(null);
    setLocalizationCreation(null);
    setRidCompanyCreation(null);
    setRidDivisionCreation(null);
    setTechnologyCreation(null);
    setLibraryNameCreation({});
    setLibraryVersionCreation({});
    setCompanyCreationInputs({});
  }, [moduleKey]);

  type CompanySelectItem = SelectItem<string>;

  const companySelectItems = useMemo<CompanySelectItem[]>(() => {
    const names = new Set(companyNames);
    draft.userStats.companies.forEach((company) => {
      const trimmed = company.name.trim();
      if (trimmed) {
        names.add(trimmed);
      }
    });
    return [
      ...Array.from(names)
        .sort((a, b) => a.localeCompare(b, 'ru'))
        .map<CompanySelectItem>((name) => ({ label: name, value: name })),
      { label: 'Добавить новую компанию', value: CREATE_COMPANY_OPTION }
    ];
  }, [companyNames, draft.userStats.companies]);

  const productSelectItems = useMemo<SelectItem<string>[]>(() => {
    const names = new Set(productNames);
    const current = draft.productName.trim();
    if (current) {
      names.add(current);
    }
    return [
      ...Array.from(names)
        .sort((a, b) => a.localeCompare(b, 'ru'))
        .map<SelectItem<string>>((name) => ({ label: name, value: name })),
      { label: 'Добавить новый продукт', value: CREATE_PRODUCT_OPTION }
    ];
  }, [draft.productName, productNames]);

  const creatorCompanyItems = useMemo<SelectItem<string>[]>(() => {
    const names = new Set(creatorCompanies);
    const current = draft.creatorCompany.trim();
    if (current) {
      names.add(current);
    }
    return [
      ...Array.from(names)
        .sort((a, b) => a.localeCompare(b, 'ru'))
        .map<SelectItem<string>>((name) => ({ label: name, value: name })),
      { label: 'Добавить новую компанию', value: CREATE_CREATOR_COMPANY_OPTION }
    ];
  }, [creatorCompanies, draft.creatorCompany]);

  const localizationItems = useMemo<SelectItem<string>[]>(() => {
    const values = new Set(localizations);
    const current = draft.localization.trim();
    if (current) {
      values.add(current);
    }
    return [
      ...Array.from(values)
        .sort((a, b) => a.localeCompare(b, 'ru'))
        .map<SelectItem<string>>((value) => ({ label: value, value })),
      { label: 'Добавить новую локализацию', value: CREATE_LOCALIZATION_OPTION }
    ];
  }, [draft.localization, localizations]);

  const ridCompanyItems = useMemo<SelectItem<string>[]>(() => {
    const names = new Set(Object.keys(ridCompanyRegistry));
    const current = draft.ridOwner.company.trim();
    if (current) {
      names.add(current);
    }
    return [
      ...Array.from(names)
        .sort((a, b) => a.localeCompare(b, 'ru'))
        .map<SelectItem<string>>((name) => ({ label: name, value: name })),
      { label: 'Добавить новую компанию', value: CREATE_RID_COMPANY_OPTION }
    ];
  }, [draft.ridOwner.company, ridCompanyRegistry]);

  const ridDivisionItems = useMemo<SelectItem<string>[]>(() => {
    const company = draft.ridOwner.company.trim();
    const divisions = new Set<string>();
    if (company && ridCompanyRegistry[company]) {
      ridCompanyRegistry[company].forEach((division) => {
        const trimmed = division.trim();
        if (trimmed) {
          divisions.add(trimmed);
        }
      });
    }
    const current = draft.ridOwner.division.trim();
    if (current) {
      divisions.add(current);
    }
    const base = Array.from(divisions)
      .sort((a, b) => a.localeCompare(b, 'ru'))
      .map<SelectItem<string>>((division) => ({ label: division, value: division }));
    return [
      ...base,
      { label: 'Добавить новое подразделение', value: CREATE_RID_DIVISION_OPTION }
    ];
  }, [draft.ridOwner.company, draft.ridOwner.division, ridCompanyRegistry]);

  const technologySelectItems = useMemo<SelectItem<string>[]>(() => {
    const names = new Set(technologyOptions);
    draft.technologyStack.forEach((technology) => {
      const trimmed = technology.trim();
      if (trimmed) {
        names.add(trimmed);
      }
    });
    return [
      ...Array.from(names)
        .sort((a, b) => a.localeCompare(b, 'ru'))
        .map<SelectItem<string>>((name) => ({ label: name, value: name })),
      { label: 'Добавить новую технологию', value: CREATE_TECHNOLOGY_OPTION }
    ];
  }, [draft.technologyStack, technologyOptions]);

  const libraryNameItems = useMemo<SelectItem<string>[]>(() => {
    const names = new Set(Object.keys(libraryRegistry));
    draft.libraries.forEach((library) => {
      const trimmed = library.name.trim();
      if (trimmed) {
        names.add(trimmed);
      }
    });
    return [
      ...Array.from(names)
        .sort((a, b) => a.localeCompare(b, 'ru'))
        .map<SelectItem<string>>((name) => ({ label: name, value: name })),
      { label: 'Добавить новую библиотеку', value: CREATE_LIBRARY_OPTION }
    ];
  }, [draft.libraries, libraryRegistry]);

  const getLibraryVersionItems = useCallback(
    (libraryName: string): SelectItem<string>[] => {
      const normalized = libraryName.trim();
      const versions = new Set<string>();
      if (normalized && libraryRegistry[normalized]) {
        libraryRegistry[normalized].forEach((version) => {
          const trimmed = version.trim();
          if (trimmed) {
            versions.add(trimmed);
          }
        });
      }
      draft.libraries.forEach((library) => {
        if (library.name.trim() === normalized) {
          const trimmed = library.version.trim();
          if (trimmed) {
            versions.add(trimmed);
          }
        }
      });
      return [
        ...Array.from(versions)
          .sort((a, b) => a.localeCompare(b, 'ru'))
          .map<SelectItem<string>>((version) => ({ label: version, value: version })),
        { label: 'Добавить новую версию', value: CREATE_LIBRARY_VERSION_OPTION }
      ];
    },
    [draft.libraries, libraryRegistry]
  );

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

  const startCompanyCreation = (index: number) => {
    setCompanyCreationInputs((prev) => ({
      ...prev,
      [index]: { value: '', previous: draft.userStats.companies[index]?.name ?? '' }
    }));
    const next = draft.userStats.companies.map((company, idx) =>
      idx === index ? { ...company, name: '' } : company
    );
    handleFieldChange('userStats', { ...draft.userStats, companies: next });
  };

  const updateCompanyCreationValue = (index: number, value: string) => {
    setCompanyCreationInputs((prev) => {
      const previous = prev[index]?.previous ?? draft.userStats.companies[index]?.name ?? '';
      return { ...prev, [index]: { value, previous } };
    });
  };

  const clearCompanyCreation = (index: number) => {
    setCompanyCreationInputs((prev) => {
      if (!(index in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const confirmCompanyCreation = (index: number) => {
    const current = companyCreationInputs[index];
    if (!current) {
      return;
    }
    const trimmed = current.value.trim();
    if (!trimmed) {
      return;
    }
    onRegisterCompany(trimmed);
    clearCompanyCreation(index);
    const next = draft.userStats.companies.map((company, idx) =>
      idx === index ? { ...company, name: trimmed } : company
    );
    handleFieldChange('userStats', { ...draft.userStats, companies: next });
  };

  const cancelCompanyCreation = (index: number) => {
    const current = companyCreationInputs[index];
    if (!current) {
      return;
    }
    clearCompanyCreation(index);
    const next = draft.userStats.companies.map((company, idx) =>
      idx === index ? { ...company, name: current.previous } : company
    );
    handleFieldChange('userStats', { ...draft.userStats, companies: next });
  };

  const updateCompanyStat = (
    index: number,
    patch: Partial<UserStats['companies'][number]>
  ) => {
    if ('name' in patch) {
      clearCompanyCreation(index);
    }
    const next = draft.userStats.companies.map((company, idx) =>
      idx === index ? { ...company, ...patch } : company
    );
    handleFieldChange('userStats', { ...draft.userStats, companies: next });
  };

  const addCompanyStat = () => {
    handleFieldChange('userStats', {
      ...draft.userStats,
      companies: [...draft.userStats.companies, { name: '', licenses: 0 }]
    });
  };

  const removeCompanyStat = (index: number) => {
    clearCompanyCreation(index);
    setCompanyCreationInputs((prev) => {
      if (!Object.keys(prev).length) {
        return prev;
      }
      const next: Record<number, { value: string; previous: string }> = {};
      Object.entries(prev).forEach(([key, value]) => {
        const idx = Number(key);
        if (idx === index) {
          return;
        }
        next[idx > index ? idx - 1 : idx] = value;
      });
      return next;
    });
    handleFieldChange('userStats', {
      ...draft.userStats,
      companies: draft.userStats.companies.filter((_, idx) => idx !== index)
    });
  };

  const updateMetrics = (patch: Partial<ModuleMetrics>) => {
    handleFieldChange('metrics', { ...draft.metrics, ...patch });
  };

  const updateNonFunctional = (patch: Partial<NonFunctionalRequirements>) => {
    handleFieldChange('nonFunctional', { ...draft.nonFunctional, ...patch });
  };

  const removeTechnology = (value: string) => {
    handleFieldChange(
      'technologyStack',
      draft.technologyStack.filter((item) => item !== value)
    );
  };
  const handleTechnologySelection = (item: SelectItem<string> | null) => {
    if (!item) {
      return;
    }
    if (item.value === CREATE_TECHNOLOGY_OPTION) {
      setTechnologyCreation({ value: '' });
      return;
    }
    if (draft.technologyStack.includes(item.value)) {
      return;
    }
    handleFieldChange('technologyStack', [...draft.technologyStack, item.value]);
  };

  const updateTechnologyCreationValue = (value: string) => {
    setTechnologyCreation({ value });
  };

  const confirmTechnologyCreation = () => {
    if (!technologyCreation) {
      return;
    }
    const trimmed = technologyCreation.value.trim();
    if (!trimmed) {
      return;
    }
    onRegisterTechnology(trimmed);
    if (!draft.technologyStack.includes(trimmed)) {
      handleFieldChange('technologyStack', [...draft.technologyStack, trimmed]);
    }
    setTechnologyCreation(null);
  };

  const cancelTechnologyCreation = () => {
    setTechnologyCreation(null);
  };

  const addLibraryEntry = () => {
    handleFieldChange('libraries', [...draft.libraries, { name: '', version: '' }]);
  };

  const updateLibrary = (index: number, patch: Partial<LibraryDependency>) => {
    if ('name' in patch) {
      setLibraryNameCreation((prev) => {
        if (!(index in prev)) {
          return prev;
        }
        const next = { ...prev };
        delete next[index];
        return next;
      });
    }
    if ('version' in patch) {
      setLibraryVersionCreation((prev) => {
        if (!(index in prev)) {
          return prev;
        }
        const next = { ...prev };
        delete next[index];
        return next;
      });
    }
    const next = draft.libraries.map((library, idx) =>
      idx === index ? { ...library, ...patch } : library
    );
    handleFieldChange('libraries', next);
  };

  const removeLibrary = (index: number) => {
    setLibraryNameCreation((prev) => {
      if (!Object.keys(prev).length) {
        return prev;
      }
      const next: Record<number, { value: string; previous: string }> = {};
      Object.entries(prev).forEach(([key, value]) => {
        const idx = Number(key);
        if (idx === index) {
          return;
        }
        next[idx > index ? idx - 1 : idx] = value;
      });
      return next;
    });
    setLibraryVersionCreation((prev) => {
      if (!Object.keys(prev).length) {
        return prev;
      }
      const next: Record<number, { value: string; previous: string }> = {};
      Object.entries(prev).forEach(([key, value]) => {
        const idx = Number(key);
        if (idx === index) {
          return;
        }
        next[idx > index ? idx - 1 : idx] = value;
      });
      return next;
    });
    handleFieldChange(
      'libraries',
      draft.libraries.filter((_, idx) => idx !== index)
    );
  };

  const handleProductSelection = (item: SelectItem<string> | null) => {
    if (!item) {
      return;
    }
    if (item.value === CREATE_PRODUCT_OPTION) {
      setProductCreation({ value: '', previous: draft.productName });
      handleFieldChange('productName', '');
      return;
    }
    setProductCreation(null);
    handleFieldChange('productName', item.value);
  };

  const updateProductCreationValue = (value: string) => {
    setProductCreation((prev) => (prev ? { ...prev, value } : { value, previous: draft.productName }));
  };

  const confirmProductCreation = () => {
    if (!productCreation) {
      return;
    }
    const trimmed = productCreation.value.trim();
    if (!trimmed) {
      return;
    }
    onRegisterProduct(trimmed);
    handleFieldChange('productName', trimmed);
    setProductCreation(null);
  };

  const cancelProductCreation = () => {
    if (!productCreation) {
      return;
    }
    handleFieldChange('productName', productCreation.previous);
    setProductCreation(null);
  };

  const handleCreatorCompanySelection = (item: SelectItem<string> | null) => {
    if (!item) {
      return;
    }
    if (item.value === CREATE_CREATOR_COMPANY_OPTION) {
      setCreatorCompanyCreation({ value: '', previous: draft.creatorCompany });
      handleFieldChange('creatorCompany', '');
      return;
    }
    setCreatorCompanyCreation(null);
    handleFieldChange('creatorCompany', item.value);
  };

  const updateCreatorCompanyCreationValue = (value: string) => {
    setCreatorCompanyCreation((prev) =>
      prev ? { ...prev, value } : { value, previous: draft.creatorCompany }
    );
  };

  const confirmCreatorCompanyCreation = () => {
    if (!creatorCompanyCreation) {
      return;
    }
    const trimmed = creatorCompanyCreation.value.trim();
    if (!trimmed) {
      return;
    }
    onRegisterCreatorCompany(trimmed);
    handleFieldChange('creatorCompany', trimmed);
    setCreatorCompanyCreation(null);
  };

  const cancelCreatorCompanyCreation = () => {
    if (!creatorCompanyCreation) {
      return;
    }
    handleFieldChange('creatorCompany', creatorCompanyCreation.previous);
    setCreatorCompanyCreation(null);
  };

  const handleLocalizationSelection = (item: SelectItem<string> | null) => {
    if (!item) {
      return;
    }
    if (item.value === CREATE_LOCALIZATION_OPTION) {
      setLocalizationCreation({ value: '', previous: draft.localization });
      handleFieldChange('localization', '');
      return;
    }
    setLocalizationCreation(null);
    handleFieldChange('localization', item.value);
  };

  const updateLocalizationCreationValue = (value: string) => {
    setLocalizationCreation((prev) =>
      prev ? { ...prev, value } : { value, previous: draft.localization }
    );
  };

  const confirmLocalizationCreation = () => {
    if (!localizationCreation) {
      return;
    }
    const trimmed = localizationCreation.value.trim();
    if (!trimmed) {
      return;
    }
    onRegisterLocalization(trimmed);
    handleFieldChange('localization', trimmed);
    setLocalizationCreation(null);
  };

  const cancelLocalizationCreation = () => {
    if (!localizationCreation) {
      return;
    }
    handleFieldChange('localization', localizationCreation.previous);
    setLocalizationCreation(null);
  };

  const handleRidCompanySelection = (item: SelectItem<string> | null) => {
    if (!item) {
      return;
    }
    if (item.value === CREATE_RID_COMPANY_OPTION) {
      setRidCompanyCreation({
        value: '',
        previous: { company: draft.ridOwner.company, division: draft.ridOwner.division }
      });
      setRidDivisionCreation(null);
      handleFieldChange('ridOwner', { company: '', division: '' });
      return;
    }
    setRidCompanyCreation(null);
    handleFieldChange('ridOwner', { company: item.value, division: '' });
  };

  const updateRidCompanyCreationValue = (value: string) => {
    setRidCompanyCreation((prev) =>
      prev
        ? { ...prev, value }
        : { value, previous: { company: draft.ridOwner.company, division: draft.ridOwner.division } }
    );
  };

  const confirmRidCompanyCreation = () => {
    if (!ridCompanyCreation) {
      return;
    }
    const trimmed = ridCompanyCreation.value.trim();
    if (!trimmed) {
      return;
    }
    onRegisterRidCompany(trimmed);
    handleFieldChange('ridOwner', { company: trimmed, division: '' });
    setRidCompanyCreation(null);
  };

  const cancelRidCompanyCreation = () => {
    if (!ridCompanyCreation) {
      return;
    }
    handleFieldChange('ridOwner', {
      company: ridCompanyCreation.previous.company,
      division: ridCompanyCreation.previous.division
    });
    setRidCompanyCreation(null);
  };

  const handleRidDivisionSelection = (item: SelectItem<string> | null) => {
    if (!item) {
      return;
    }
    if (item.value === CREATE_RID_DIVISION_OPTION) {
      setRidDivisionCreation({ value: '', previous: draft.ridOwner.division });
      handleFieldChange('ridOwner', { ...draft.ridOwner, division: '' });
      return;
    }
    setRidDivisionCreation(null);
    handleFieldChange('ridOwner', { ...draft.ridOwner, division: item.value });
  };

  const updateRidDivisionCreationValue = (value: string) => {
    setRidDivisionCreation((prev) =>
      prev ? { ...prev, value } : { value, previous: draft.ridOwner.division }
    );
  };

  const confirmRidDivisionCreation = () => {
    if (!ridDivisionCreation) {
      return;
    }
    const trimmed = ridDivisionCreation.value.trim();
    if (!trimmed) {
      return;
    }
    const company = draft.ridOwner.company.trim();
    if (company) {
      onRegisterRidDivision(company, trimmed);
    }
    handleFieldChange('ridOwner', { ...draft.ridOwner, division: trimmed });
    setRidDivisionCreation(null);
  };

  const cancelRidDivisionCreation = () => {
    if (!ridDivisionCreation) {
      return;
    }
    handleFieldChange('ridOwner', { ...draft.ridOwner, division: ridDivisionCreation.previous });
    setRidDivisionCreation(null);
  };

  const startLibraryNameCreation = (index: number) => {
    setLibraryNameCreation((prev) => ({
      ...prev,
      [index]: { value: '', previous: draft.libraries[index]?.name ?? '' }
    }));
    updateLibrary(index, { name: '' });
  };

  const updateLibraryNameCreationValue = (index: number, value: string) => {
    setLibraryNameCreation((prev) => {
      const previous = prev[index]?.previous ?? draft.libraries[index]?.name ?? '';
      return { ...prev, [index]: { value, previous } };
    });
  };

  const confirmLibraryNameCreation = (index: number) => {
    const current = libraryNameCreation[index];
    if (!current) {
      return;
    }
    const trimmed = current.value.trim();
    if (!trimmed) {
      return;
    }
    onRegisterLibrary(trimmed);
    setLibraryNameCreation((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
    updateLibrary(index, { name: trimmed });
  };

  const cancelLibraryNameCreation = (index: number) => {
    const current = libraryNameCreation[index];
    if (!current) {
      return;
    }
    setLibraryNameCreation((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
    updateLibrary(index, { name: current.previous });
  };

  const startLibraryVersionCreation = (index: number) => {
    setLibraryVersionCreation((prev) => ({
      ...prev,
      [index]: { value: '', previous: draft.libraries[index]?.version ?? '' }
    }));
    updateLibrary(index, { version: '' });
  };

  const updateLibraryVersionCreationValue = (index: number, value: string) => {
    setLibraryVersionCreation((prev) => {
      const previous = prev[index]?.previous ?? draft.libraries[index]?.version ?? '';
      return { ...prev, [index]: { value, previous } };
    });
  };

  const confirmLibraryVersionCreation = (index: number) => {
    const current = libraryVersionCreation[index];
    if (!current) {
      return;
    }
    const trimmed = current.value.trim();
    if (!trimmed) {
      return;
    }
    const libraryName = draft.libraries[index]?.name.trim() ?? '';
    if (libraryName) {
      onRegisterLibraryVersion(libraryName, trimmed);
    }
    setLibraryVersionCreation((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
    updateLibrary(index, { version: trimmed });
  };

  const cancelLibraryVersionCreation = (index: number) => {
    const current = libraryVersionCreation[index];
    if (!current) {
      return;
    }
    setLibraryVersionCreation((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
    updateLibrary(index, { version: current.previous });
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

  const selectedProductItem =
    productCreation
      ? productSelectItems.find((item) => item.value === CREATE_PRODUCT_OPTION) ?? null
      : productSelectItems.find((item) => item.value === draft.productName.trim()) ?? null;

  const selectedCreatorCompanyItem =
    creatorCompanyCreation
      ? creatorCompanyItems.find((item) => item.value === CREATE_CREATOR_COMPANY_OPTION) ?? null
      : creatorCompanyItems.find((item) => item.value === draft.creatorCompany.trim()) ?? null;

  const selectedLocalizationItem =
    localizationCreation
      ? localizationItems.find((item) => item.value === CREATE_LOCALIZATION_OPTION) ?? null
      : localizationItems.find((item) => item.value === draft.localization.trim()) ?? null;

  const selectedRidCompanyItem =
    ridCompanyCreation
      ? ridCompanyItems.find((item) => item.value === CREATE_RID_COMPANY_OPTION) ?? null
      : ridCompanyItems.find((item) => item.value === draft.ridOwner.company.trim()) ?? null;

  const canSelectRidDivision =
    !ridCompanyCreation && Boolean(draft.ridOwner.company.trim());

  const selectedRidDivisionItem =
    ridDivisionCreation
      ? ridDivisionItems.find((item) => item.value === CREATE_RID_DIVISION_OPTION) ?? null
      : ridDivisionItems.find((item) => item.value === draft.ridOwner.division.trim()) ?? null;

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
                  <div className={styles.field}>
                    <Text size="xs" weight="semibold" className={styles.label}>
                      Компания создатель решения
                    </Text>
                    <Select<SelectItem<string>>
                      size="s"
                      items={creatorCompanyItems}
                      value={selectedCreatorCompanyItem}
                      getItemLabel={(item) => item.label}
                      getItemKey={(item) => item.value}
                      placeholder="Выберите компанию"
                      onChange={handleCreatorCompanySelection}
                    />
                    {creatorCompanyCreation && (
                      <div className={styles.inlineForm}>
                        <input
                          className={styles.input}
                          value={creatorCompanyCreation.value}
                          onChange={(event) => updateCreatorCompanyCreationValue(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              confirmCreatorCompanyCreation();
                            }
                          }}
                          placeholder="Например, Nedra Digital"
                        />
                        <div className={styles.inlineButtons}>
                          <Button size="xs" label="Сохранить" view="primary" onClick={confirmCreatorCompanyCreation} />
                          <Button size="xs" label="Отмена" view="ghost" onClick={cancelCreatorCompanyCreation} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className={styles.field}>
                    <Text size="xs" weight="semibold" className={styles.label}>
                      Название продукта
                    </Text>
                    <Select<SelectItem<string>>
                      size="s"
                      items={productSelectItems}
                      value={selectedProductItem}
                      getItemLabel={(item) => item.label}
                      getItemKey={(item) => item.value}
                      placeholder="Выберите продукт"
                      onChange={handleProductSelection}
                    />
                    {productCreation && (
                      <div className={styles.inlineForm}>
                        <input
                          className={styles.input}
                          value={productCreation.value}
                          onChange={(event) => updateProductCreationValue(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              confirmProductCreation();
                            }
                          }}
                          placeholder="Например, Digital Twin Suite"
                        />
                        <div className={styles.inlineButtons}>
                          <Button size="xs" label="Сохранить" view="primary" onClick={confirmProductCreation} />
                          <Button size="xs" label="Отмена" view="ghost" onClick={cancelProductCreation} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className={styles.field}>
                    <Text size="xs" weight="semibold" className={styles.label}>
                      Локализация функции
                    </Text>
                    <Select<SelectItem<string>>
                      size="s"
                      items={localizationItems}
                      value={selectedLocalizationItem}
                      getItemLabel={(item) => item.label}
                      getItemKey={(item) => item.value}
                      placeholder="Выберите локализацию"
                      onChange={handleLocalizationSelection}
                    />
                    {localizationCreation && (
                      <div className={styles.inlineForm}>
                        <input
                          className={styles.input}
                          value={localizationCreation.value}
                          onChange={(event) => updateLocalizationCreationValue(event.target.value)}
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
                  </div>
                <div className={styles.field}>
                  <Text size="xs" weight="semibold" className={styles.label}>
                    Оценка переиспользования
                  </Text>
                  <div className={styles.metricDisplay}>
                    <Text size="2xl" weight="bold">
                      {formatPercent(Math.max(0, Math.min(100, (draft.reuseScore ?? 0) * 100)))}%
                    </Text>
                    <Text size="2xs" view="secondary" className={styles.metricHint}>
                      Рассчитывается автоматически по интеграциям с другими модулями.
                    </Text>
                  </div>
                </div>
                </div>

                <div>
                  <Text size="xs" weight="semibold" className={styles.label}>
                    Компании и лицензии
                  </Text>
                  {draft.userStats.companies.length === 0 ? (
                    <Text size="xs" view="secondary">
                      Добавьте хотя бы одну компанию
                    </Text>
                  ) : (
                    <ul className={styles.list}>
                  {draft.userStats.companies.map((company, index) => (
                    <li key={`company-${index}`} className={styles.listItem}>
                      {companyCreationInputs[index] ? (
                        <div className={styles.companyInlineForm}>
                          <input
                            className={styles.input}
                            value={companyCreationInputs[index]?.value ?? ''}
                            onChange={(event) =>
                              updateCompanyCreationValue(index, event.target.value)
                            }
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                confirmCompanyCreation(index);
                              }
                            }}
                            placeholder="Название компании"
                          />
                          <div className={styles.companyInlineButtons}>
                            <Button
                              size="xs"
                              view="primary"
                              label="Сохранить"
                              onClick={() => confirmCompanyCreation(index)}
                            />
                            <Button
                              size="xs"
                              view="ghost"
                              label="Отмена"
                              onClick={() => cancelCompanyCreation(index)}
                            />
                          </div>
                        </div>
                      ) : (
                        <Select<CompanySelectItem>
                          size="s"
                          className={styles.select}
                          items={companySelectItems}
                          value={
                            company.name
                              ? companySelectItems.find((item) => item.value === company.name) ?? {
                                  label: company.name,
                                  value: company.name
                                }
                              : null
                          }
                          placeholder="Выберите компанию"
                          getItemLabel={(item) => item.label}
                          getItemKey={(item) => item.value}
                          onChange={(value) => {
                            if (!value) {
                              updateCompanyStat(index, { name: '' });
                              return;
                            }
                            if (value.value === CREATE_COMPANY_OPTION) {
                              startCompanyCreation(index);
                              return;
                            }
                            updateCompanyStat(index, { name: value.value });
                          }}
                        />
                      )}
                      <input
                        className={styles.numberInput}
                        type="number"
                        min={0}
                        value={Number.isFinite(company.licenses) ? company.licenses : 0}
                            onChange={(event) => {
                              const parsed = Number.parseInt(event.target.value, 10);
                              updateCompanyStat(index, {
                                licenses: Number.isNaN(parsed) ? 0 : Math.max(0, parsed)
                              });
                            }}
                            placeholder="Лицензий"
                          />
                          <Button
                            size="xs"
                            view="ghost"
                            label="Удалить"
                            onClick={() => removeCompanyStat(index)}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button
                    size="xs"
                    view="secondary"
                    label="Добавить компанию"
                    onClick={addCompanyStat}
                  />
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
                  <div className={styles.field}>
                    <Text size="xs" weight="semibold" className={styles.label}>
                      Компания-владелец РИД
                    </Text>
                    <Select<SelectItem<string>>
                      size="s"
                      items={ridCompanyItems}
                      value={selectedRidCompanyItem}
                      getItemLabel={(item) => item.label}
                      getItemKey={(item) => item.value}
                      placeholder="Выберите компанию"
                      onChange={handleRidCompanySelection}
                    />
                    {ridCompanyCreation && (
                      <div className={styles.inlineForm}>
                        <input
                          className={styles.input}
                          value={ridCompanyCreation.value}
                          onChange={(event) => updateRidCompanyCreationValue(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              confirmRidCompanyCreation();
                            }
                          }}
                          placeholder="АО Компания"
                        />
                        <div className={styles.inlineButtons}>
                          <Button size="xs" label="Сохранить" view="primary" onClick={confirmRidCompanyCreation} />
                          <Button size="xs" label="Отмена" view="ghost" onClick={cancelRidCompanyCreation} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className={styles.field}>
                    <Text size="xs" weight="semibold" className={styles.label}>
                      Подразделение
                    </Text>
                    {canSelectRidDivision ? (
                      <Select<SelectItem<string>>
                        size="s"
                        items={ridDivisionItems}
                        value={selectedRidDivisionItem}
                        getItemLabel={(item) => item.label}
                        getItemKey={(item) => item.value}
                        placeholder="Выберите подразделение"
                        onChange={handleRidDivisionSelection}
                      />
                    ) : (
                      <input
                        className={styles.input}
                        value={draft.ridOwner.division}
                        onChange={(event) => updateRidOwner({ division: event.target.value })}
                        placeholder="Центр компетенций"
                      />
                    )}
                    {canSelectRidDivision && ridDivisionCreation && (
                      <div className={styles.inlineForm}>
                        <input
                          className={styles.input}
                          value={ridDivisionCreation.value}
                          onChange={(event) => updateRidDivisionCreationValue(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              confirmRidDivisionCreation();
                            }
                          }}
                          placeholder="Центр компетенций"
                        />
                        <div className={styles.inlineButtons}>
                          <Button size="xs" label="Сохранить" view="primary" onClick={confirmRidDivisionCreation} />
                          <Button size="xs" label="Отмена" view="ghost" onClick={cancelRidDivisionCreation} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Text size="xs" weight="semibold" className={styles.label}>
                    Технологический стек
                  </Text>
                  <div className={styles.actionsRow}>
                    <Select<SelectItem<string>>
                      size="s"
                      items={technologySelectItems}
                      value={null}
                      placeholder="Выберите технологию"
                      getItemLabel={(item) => item.label}
                      getItemKey={(item) => item.value}
                      onChange={handleTechnologySelection}
                    />
                  </div>
                  {technologyCreation && (
                    <div className={styles.inlineForm}>
                      <input
                        className={styles.input}
                        value={technologyCreation.value}
                        onChange={(event) => updateTechnologyCreationValue(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            confirmTechnologyCreation();
                          }
                        }}
                        placeholder="Например, TypeScript"
                      />
                      <div className={styles.inlineButtons}>
                        <Button size="xs" label="Сохранить" view="primary" onClick={confirmTechnologyCreation} />
                        <Button size="xs" label="Отмена" view="ghost" onClick={cancelTechnologyCreation} />
                      </div>
                    </div>
                  )}
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
                      onChange={(event) =>
                        handleFieldChange('licenseServerIntegrated', event.target.checked)
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
                    <Button
                      size="xs"
                      view="secondary"
                      label="Добавить библиотеку"
                      onClick={addLibraryEntry}
                    />
                  </div>
                  {draft.libraries.length === 0 ? (
                    <Text size="xs" view="secondary">
                      Добавьте библиотеки и версии
                    </Text>
                  ) : (
                    <ul className={styles.list}>
                      {draft.libraries.map((library, index) => {
                        const trimmedName = library.name.trim();
                        const nameSelectValue = libraryNameCreation[index]
                          ? libraryNameItems.find((item) => item.value === CREATE_LIBRARY_OPTION) ?? null
                          : libraryNameItems.find((item) => item.value === trimmedName) ?? null;
                        const versionItems = getLibraryVersionItems(trimmedName);
                        const versionSelectValue = libraryVersionCreation[index]
                          ? versionItems.find((item) => item.value === CREATE_LIBRARY_VERSION_OPTION) ?? null
                          : versionItems.find((item) => item.value === library.version.trim()) ?? null;

                        return (
                          <li key={`library-${index}`} className={styles.listItem}>
                            <div className={styles.field}>
                              <Select<SelectItem<string>>
                                className={styles.select}
                                size="s"
                                items={libraryNameItems}
                                value={nameSelectValue}
                                getItemLabel={(item) => item.label}
                                getItemKey={(item) => item.value}
                                placeholder="Выберите библиотеку"
                                onChange={(item) => {
                                  if (!item) {
                                    return;
                                  }
                                  if (item.value === CREATE_LIBRARY_OPTION) {
                                    startLibraryNameCreation(index);
                                    return;
                                  }
                                  updateLibrary(index, { name: item.value });
                                }}
                              />
                              {libraryNameCreation[index] && (
                                <div className={styles.inlineForm}>
                                  <input
                                    className={styles.input}
                                    value={libraryNameCreation[index]?.value ?? ''}
                                    onChange={(event) =>
                                      updateLibraryNameCreationValue(index, event.target.value)
                                    }
                                    onKeyDown={(event) => {
                                      if (event.key === 'Enter') {
                                        event.preventDefault();
                                        confirmLibraryNameCreation(index);
                                      }
                                    }}
                                    placeholder="Например, react"
                                  />
                                  <div className={styles.inlineButtons}>
                                    <Button
                                      size="xs"
                                      label="Сохранить"
                                      view="primary"
                                      onClick={() => confirmLibraryNameCreation(index)}
                                    />
                                    <Button
                                      size="xs"
                                      label="Отмена"
                                      view="ghost"
                                      onClick={() => cancelLibraryNameCreation(index)}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className={styles.field}>
                              {trimmedName ? (
                                <Select<SelectItem<string>>
                                  className={styles.select}
                                  size="s"
                                  items={versionItems}
                                  value={versionSelectValue}
                                  getItemLabel={(item) => item.label}
                                  getItemKey={(item) => item.value}
                                  placeholder="Выберите версию"
                                  onChange={(item) => {
                                    if (!item) {
                                      return;
                                    }
                                    if (item.value === CREATE_LIBRARY_VERSION_OPTION) {
                                      startLibraryVersionCreation(index);
                                      return;
                                    }
                                    updateLibrary(index, { version: item.value });
                                  }}
                                />
                              ) : (
                                <input
                                  className={styles.input}
                                  value={library.version}
                                  onChange={(event) => updateLibrary(index, { version: event.target.value })}
                                  placeholder="Сначала выберите библиотеку"
                                  disabled
                                />
                              )}
                              {libraryVersionCreation[index] && (
                                <div className={styles.inlineForm}>
                                  <input
                                    className={styles.input}
                                    value={libraryVersionCreation[index]?.value ?? ''}
                                    onChange={(event) =>
                                      updateLibraryVersionCreationValue(index, event.target.value)
                                    }
                                    onKeyDown={(event) => {
                                      if (event.key === 'Enter') {
                                        event.preventDefault();
                                        confirmLibraryVersionCreation(index);
                                      }
                                    }}
                                    placeholder="Например, 18.2.0"
                                  />
                                  <div className={styles.inlineButtons}>
                                    <Button
                                      size="xs"
                                      label="Сохранить"
                                      view="primary"
                                      onClick={() => confirmLibraryVersionCreation(index)}
                                    />
                                    <Button
                                      size="xs"
                                      label="Отмена"
                                      view="ghost"
                                      onClick={() => cancelLibraryVersionCreation(index)}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                            <Button
                              size="xs"
                              view="ghost"
                              label="Удалить"
                              onClick={() => removeLibrary(index)}
                            />
                          </li>
                        );
                      })}
                    </ul>
                  )}
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

  const handleExpertChange = (index: number, value: string) => {
    const next = draft.experts.map((expert, idx) => (idx === index ? value : expert));
    onChange({ ...draft, experts: next });
  };

  const addExpert = () => {
    onChange({ ...draft, experts: [...draft.experts, ''] });
  };

  const removeExpert = (index: number) => {
    onChange({ ...draft, experts: draft.experts.filter((_, idx) => idx !== index) });
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
                <div className={styles.field}>
                  <Text size="xs" weight="semibold" className={styles.label}>
                    Перечень экспертов
                  </Text>
                  {draft.experts.length === 0 ? (
                    <Text size="xs" view="secondary">
                      Добавьте экспертов доменной области
                    </Text>
                  ) : (
                    <ul className={styles.list}>
                      {draft.experts.map((expert, index) => (
                        <li key={`expert-${index}`} className={styles.listItem}>
                          <input
                            className={styles.input}
                            value={expert}
                            onChange={(event) => handleExpertChange(index, event.target.value)}
                            placeholder="ФИО эксперта"
                          />
                          <Button
                            size="xs"
                            view="ghost"
                            label="Удалить"
                            onClick={() => removeExpert(index)}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button size="xs" view="secondary" label="Добавить эксперта" onClick={addExpert} />
                </div>
                <label className={styles.field}>
                  <Text size="xs" weight="semibold" className={styles.label}>
                    Ссылка на митап
                  </Text>
                  <input
                    className={styles.input}
                    value={draft.meetupLink}
                    onChange={(event) => onChange({ ...draft, meetupLink: event.target.value })}
                    placeholder="https://meetup.example.com"
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
