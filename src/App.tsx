import { Layout } from '@consta/uikit/Layout';
import { Tabs } from '@consta/uikit/Tabs';
import { Text } from '@consta/uikit/Text';
import { Loader } from '@consta/uikit/Loader';
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import AnalyticsPanel from './components/AnalyticsPanel';
import DomainTree from './components/DomainTree';
import EntityCreation, {
  type ArtifactDraftPayload,
  type DomainDraftPayload,
  type ModuleDraftPayload
} from './components/EntityCreation';
import FiltersPanel from './components/FiltersPanel';
import GraphPersistenceControls, {
  type GraphSnapshotPayload
} from './components/GraphPersistenceControls';
import GraphView, { type GraphNode } from './components/GraphView';
import NodeDetails from './components/NodeDetails';
import {
  artifacts as initialArtifacts,
  domainTree as initialDomainTree,
  modules as initialModules,
  reuseIndexHistory,
  type ArtifactNode,
  type DomainNode,
  type GraphLink,
  type ModuleInput,
  type ModuleNode,
  type ModuleOutput,
  type ModuleStatus
} from './data';
import styles from './App.module.css';

const allStatuses: ModuleStatus[] = ['production', 'in-dev', 'deprecated'];
const initialProducts = buildProductList(initialModules);

const StatsDashboard = lazy(async () => ({
  default: (await import('./components/StatsDashboard')).default
}));

const viewTabs = [
  { label: 'Связи', value: 'graph' },
  { label: 'Статистика', value: 'stats' },
  { label: 'Добавление', value: 'create' }
] as const;

type ViewMode = (typeof viewTabs)[number]['value'];

function App() {
  const [domainData, setDomainData] = useState<DomainNode[]>(initialDomainTree);
  const [moduleData, setModuleData] = useState<ModuleNode[]>(initialModules);
  const [artifactData, setArtifactData] = useState<ArtifactNode[]>(initialArtifacts);
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(
    () => new Set(flattenDomainTree(initialDomainTree).map((domain) => domain.id))
  );
  const [search, setSearch] = useState('');
  const [statusFilters, setStatusFilters] = useState<Set<ModuleStatus>>(new Set(allStatuses));
  const [productFilter, setProductFilter] = useState<string[]>(initialProducts);
  const [showAllConnections, setShowAllConnections] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('graph');
  const highlightedDomainId = selectedNode?.type === 'domain' ? selectedNode.id : null;
  const [statsActivated, setStatsActivated] = useState(() => viewMode === 'stats');

  const products = useMemo(() => buildProductList(moduleData), [moduleData]);

  useEffect(() => {
    setProductFilter((prev) => {
      const preserved = products.filter((product) => prev.includes(product));
      const missing = products.filter((product) => !prev.includes(product));
      const next = [...preserved, ...missing];
      if (next.length === prev.length && next.every((value, index) => value === prev[index])) {
        return prev;
      }
      return next;
    });
  }, [products]);

  const domainDescendants = useMemo(() => buildDomainDescendants(domainData), [domainData]);
  const domainAncestors = useMemo(() => buildDomainAncestors(domainData), [domainData]);

  const moduleDependents = useMemo(() => {
    const dependents = new Map<string, Set<string>>();

    moduleData.forEach((module) => {
      module.dependencies.forEach((dependencyId) => {
        if (!dependents.has(dependencyId)) {
          dependents.set(dependencyId, new Set());
        }
        dependents.get(dependencyId)!.add(module.id);
      });
    });

    artifactData.forEach((artifact) => {
      if (!dependents.has(artifact.producedBy)) {
        dependents.set(artifact.producedBy, new Set());
      }
      const entry = dependents.get(artifact.producedBy)!;
      artifact.consumerIds.forEach((consumerId) => {
        entry.add(consumerId);
      });
    });

    return dependents;
  }, [moduleData, artifactData]);

  const matchesModuleFilters = useCallback(
    (module: ModuleNode) => {
      const matchesDomain =
        selectedDomains.size > 0 && module.domains.some((domain) => selectedDomains.has(domain));
      const normalizedSearch = search.trim().toLowerCase();
      const matchesSearch =
        normalizedSearch.length === 0 ||
        module.name.toLowerCase().includes(normalizedSearch) ||
        module.productName.toLowerCase().includes(normalizedSearch) ||
        module.team.toLowerCase().includes(normalizedSearch) ||
        module.ridOwner.company.toLowerCase().includes(normalizedSearch) ||
        module.ridOwner.division.toLowerCase().includes(normalizedSearch) ||
        module.projectTeam.some(
          (member) =>
            member.fullName.toLowerCase().includes(normalizedSearch) ||
            member.role.toLowerCase().includes(normalizedSearch)
        );
      const matchesStatus = statusFilters.has(module.status);
      const matchesProduct =
        productFilter.length === 0
          ? false
          : productFilter.includes(module.productName);
      return matchesDomain && matchesSearch && matchesStatus && matchesProduct;
    },
    [search, selectedDomains, statusFilters, productFilter]
  );

  const filteredModules = useMemo(
    () => moduleData.filter((module) => matchesModuleFilters(module)),
    [moduleData, matchesModuleFilters]
  );

  const artifactMap = useMemo(
    () => new Map(artifactData.map((artifact) => [artifact.id, artifact])),
    [artifactData]
  );
  const domainMap = useMemo(
    () => new Map(flattenDomainTree(domainData).map((domain) => [domain.id, domain])),
    [domainData]
  );

  const moduleById = useMemo(() => {
    const map: Record<string, ModuleNode> = {};
    moduleData.forEach((module) => {
      map[module.id] = module;
    });
    return map;
  }, [moduleData]);

  const moduleNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    moduleData.forEach((module) => {
      map[module.id] = module.name;
    });
    return map;
  }, [moduleData]);

  const artifactNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    artifactData.forEach((artifact) => {
      map[artifact.id] = artifact.name;
    });
    return map;
  }, [artifactData]);

  const domainNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    flattenDomainTree(domainData).forEach((domain) => {
      map[domain.id] = domain.name;
    });
    return map;
  }, [domainData]);

  const firstDomainId = useMemo(() => {
    const flattened = flattenDomainTree(domainData);
    return flattened.length > 0 ? flattened[0].id : null;
  }, [domainData]);

  const contextModuleIds = useMemo(() => {
    const ids = new Set<string>();

    if (!selectedNode) {
      return ids;
    }

    if (selectedNode.type === 'module') {
      ids.add(selectedNode.id);
      selectedNode.dependencies.forEach((dependencyId) => ids.add(dependencyId));

      const dependents = moduleDependents.get(selectedNode.id);
      dependents?.forEach((dependentId) => ids.add(dependentId));

      selectedNode.dataIn.forEach((input) => {
        if (!input.sourceId) {
          return;
        }
        const sourceArtifact = artifactMap.get(input.sourceId);
        if (sourceArtifact) {
          ids.add(sourceArtifact.producedBy);
        }
      });

      selectedNode.produces.forEach((artifactId) => {
        const artifact = artifactMap.get(artifactId);
        artifact?.consumerIds.forEach((consumerId) => ids.add(consumerId));
      });

      return ids;
    }

    if (selectedNode.type === 'artifact') {
      ids.add(selectedNode.producedBy);
      selectedNode.consumerIds.forEach((consumerId) => ids.add(consumerId));
      return ids;
    }

    if (selectedNode.type === 'domain') {
      moduleData.forEach((module) => {
        if (module.domains.includes(selectedNode.id)) {
          ids.add(module.id);
        }
      });
    }

    return ids;
  }, [selectedNode, moduleDependents, artifactMap, moduleData]);

  const graphModules = useMemo(() => {
    if (contextModuleIds.size === 0) {
      return filteredModules;
    }

    const existing = new Set(filteredModules.map((module) => module.id));
    const extended = [...filteredModules];

    contextModuleIds.forEach((moduleId) => {
      if (existing.has(moduleId)) {
        return;
      }
      const module = moduleById[moduleId];
      if (module && matchesModuleFilters(module)) {
        extended.push(module);
      }
    });

    return extended;
  }, [filteredModules, contextModuleIds, matchesModuleFilters]);

  const relevantDomainIds = useMemo(() => {
    const ids = new Set<string>();

    const addWithAncestors = (domainId: string) => {
      ids.add(domainId);
      const ancestors = domainAncestors.get(domainId);
      ancestors?.forEach((ancestorId) => ids.add(ancestorId));
    };

    graphModules.forEach((module) => {
      module.domains.forEach((domainId) => addWithAncestors(domainId));
    });

    if (highlightedDomainId) {
      addWithAncestors(highlightedDomainId);
    }

    return ids;
  }, [graphModules, highlightedDomainId, domainAncestors]);

  const graphDomains = useMemo(
    () => filterDomainTreeByIds(domainData, relevantDomainIds),
    [domainData, relevantDomainIds]
  );

  const graphArtifacts = useMemo(() => {
    const moduleIds = new Set(graphModules.map((module) => module.id));
    const relevantArtifactIds = new Set<string>();

    graphModules.forEach((module) => {
      module.produces.forEach((artifactId) => relevantArtifactIds.add(artifactId));
      module.dataIn.forEach((input) => {
        if (input.sourceId) {
          relevantArtifactIds.add(input.sourceId);
        }
      });
    });

    let scopedArtifacts = artifactData.filter(
      (artifact) =>
        relevantArtifactIds.has(artifact.id) ||
        moduleIds.has(artifact.producedBy) ||
        artifact.consumerIds.some((consumerId) => moduleIds.has(consumerId))
    );

    if (selectedNode?.type === 'artifact' && !scopedArtifacts.some((artifact) => artifact.id === selectedNode.id)) {
      const fallback = artifactData.find((artifact) => artifact.id === selectedNode.id);
      if (fallback) {
        scopedArtifacts = [...scopedArtifacts, fallback];
      }
    }

    return scopedArtifacts;
  }, [artifactData, graphModules, selectedNode]);

  const graphLinksAll = useMemo(
    () => buildModuleLinks(moduleData, artifactData),
    [moduleData, artifactData]
  );

  const filteredLinks = useMemo(() => {
    const moduleIds = new Set(graphModules.map((module) => module.id));
    const artifactIds = new Set(graphArtifacts.map((artifact) => artifact.id));
    const domainIds = relevantDomainIds.size > 0 ? relevantDomainIds : null;

    return graphLinksAll.filter((link) => {
      const sourceId = getLinkEndpointId(link.source);
      const targetId = getLinkEndpointId(link.target);

      if (link.type === 'dependency') {
        return moduleIds.has(sourceId) && moduleIds.has(targetId);
      }

      if (link.type === 'domain') {
        return moduleIds.has(sourceId) && (!domainIds || domainIds.has(targetId));
      }

      if (link.type === 'produces') {
        return moduleIds.has(sourceId) && artifactIds.has(targetId);
      }

      if (link.type === 'consumes') {
        if (!artifactIds.has(sourceId) || !moduleIds.has(targetId)) {
          return false;
        }

        if (showAllConnections) {
          return true;
        }

        const artifact = artifactMap.get(sourceId);
        if (!artifact) {
          return false;
        }

        const producerProduct = moduleById[artifact.producedBy]?.productName ?? null;
        const consumerProduct = moduleById[targetId]?.productName ?? null;

        return Boolean(producerProduct && consumerProduct && producerProduct === consumerProduct);
      }

      return false;
    });
  }, [
    artifactMap,
    graphModules,
    graphArtifacts,
    relevantDomainIds,
    showAllConnections
  ]);

  useEffect(() => {
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      const moduleIds = new Set(graphModules.map((module) => module.id));
      const artifactIds = new Set(graphArtifacts.map((artifact) => artifact.id));
      const domainIds = relevantDomainIds.size > 0 ? relevantDomainIds : null;

      const recomputedLinks = graphLinksAll.filter((link) => {
        const sourceId = getLinkEndpointId(link.source);
        const targetId = getLinkEndpointId(link.target);

        if (link.type === 'dependency') {
          return moduleIds.has(sourceId) && moduleIds.has(targetId);
        }

        if (link.type === 'domain') {
          return moduleIds.has(sourceId) && (!domainIds || domainIds.has(targetId));
        }

        if (link.type === 'produces') {
          return moduleIds.has(sourceId) && artifactIds.has(targetId);
        }

        if (link.type === 'consumes') {
          if (!artifactIds.has(sourceId) || !moduleIds.has(targetId)) {
            return false;
          }

          if (showAllConnections) {
            return true;
          }

          const artifact = artifactMap.get(sourceId);
          if (!artifact) {
            return false;
          }

          const producerProduct = moduleById[artifact.producedBy]?.productName ?? null;
          const consumerProduct = moduleById[targetId]?.productName ?? null;

          return Boolean(
            producerProduct &&
              consumerProduct &&
              producerProduct === consumerProduct
          );
        }

        return false;
      });

      const excludedLinks = graphLinksAll
        .filter((link) => !recomputedLinks.includes(link))
        .map((link) => {
          const sourceId = getLinkEndpointId(link.source);
          const targetId = getLinkEndpointId(link.target);
          let reason = 'filtered';
          if (link.type === 'dependency') {
            reason = `missing module: ${moduleIds.has(sourceId) ? '' : sourceId} ${
              moduleIds.has(targetId) ? '' : targetId
            }`;
          } else if (link.type === 'domain') {
            const hasModule = moduleIds.has(sourceId);
            const hasDomain = !domainIds || domainIds.has(targetId);
            reason = `domain link kept? module=${hasModule} domain=${hasDomain}`;
          } else if (link.type === 'produces') {
            reason = `produces source=${moduleIds.has(sourceId)} target=${artifactIds.has(targetId)}`;
          } else if (link.type === 'consumes') {
            const artifact = artifactMap.get(sourceId);
            const producerProduct = artifact
              ? moduleById[artifact.producedBy]?.productName ?? null
              : null;
            const consumerProduct = moduleById[targetId]?.productName ?? null;
            const sameProduct =
              producerProduct && consumerProduct && producerProduct === consumerProduct;
            reason = `consumes source=${artifactIds.has(sourceId)} target=${moduleIds.has(
              targetId
            )} sameProduct=${sameProduct} toggle=${showAllConnections}`;
          }

          return { ...link, reason };
        });

      (window as typeof window & { __graphDebug?: unknown }).__graphDebug = {
        filteredModuleIds: graphModules.map((module) => module.id),
        filteredModuleCount: graphModules.length,
        graphArtifactIds: graphArtifacts.map((artifact) => artifact.id),
        graphArtifactCount: graphArtifacts.length,
        filteredLinks: filteredLinks.map((link) => ({ ...link })),
        filteredLinkCount: filteredLinks.length,
        visibleDomainIds: Array.from(relevantDomainIds),
        selectedDomainIds: Array.from(selectedDomains),
        recomputedLinkCount: recomputedLinks.length,
        excludedLinks
      };
    }
  }, [
    filteredLinks,
    graphArtifacts,
    graphModules,
    graphLinksAll,
    artifactMap,
    relevantDomainIds,
    selectedDomains,
    showAllConnections
  ]);

  const handleSelectNode = (node: GraphNode | null) => {
    setSelectedNode(node);
  };

  const handleDomainToggle = (domainId: string) => {
    const cascade = domainDescendants.get(domainId) ?? [domainId];
    let shouldSelect = false;

    setSelectedDomains((prev) => {
      const next = new Set(prev);
      shouldSelect = cascade.some((id) => !next.has(id));

      if (shouldSelect) {
        cascade.forEach((id) => next.add(id));
        return next;
      }

      cascade.forEach((id) => next.delete(id));
      return next;
    });

    if (shouldSelect) {
      const domain = domainMap.get(domainId);
      if (domain) {
        setSelectedNode({ ...domain, type: 'domain' });
      }
      return;
    }

    setSelectedNode((current) => {
      if (!current) {
        return current;
      }

      if (cascade.includes(current.id)) {
        return null;
      }

      if (current.type === 'module') {
        const intersects = current.domains.some((domain) => cascade.includes(domain));
        return intersects ? null : current;
      }

      if (current.type === 'artifact' && cascade.includes(current.domainId)) {
        return null;
      }

      return current;
    });
  };

  const handleNavigate = useCallback(
    (nodeId: string) => {
      if (moduleById[nodeId]) {
        const module = moduleById[nodeId];
        const relatedDomains = new Set(module.domains);
        module.dependencies.forEach((dependencyId) => {
          const dependency = moduleById[dependencyId];
          dependency?.domains.forEach((domainId) => relatedDomains.add(domainId));
        });
        const dependents = moduleDependents.get(module.id);
        dependents?.forEach((dependentId) => {
          const dependent = moduleById[dependentId];
          dependent?.domains.forEach((domainId) => relatedDomains.add(domainId));
        });
        setSelectedNode({ ...module, type: 'module' });
        return;
      }

      const artifact = artifactMap.get(nodeId);
      if (artifact) {
        setSelectedNode({ ...artifact, type: 'artifact', reuseScore: 0 });
        return;
      }

      const domain = domainMap.get(nodeId);
      if (domain) {
        setSelectedNode({ ...domain, type: 'domain' });
      }
    },
    [artifactMap, domainMap, moduleById, moduleDependents]
  );

  useEffect(() => {
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      (window as typeof window & { __selectGraphNode?: (id: string) => void }).__selectGraphNode = (nodeId: string) => {
        handleNavigate(nodeId);
      };
    }
  }, [handleNavigate]);

  const handleCreateModule = useCallback(
    (draft: ModuleDraftPayload) => {
      const existingIds = new Set(moduleData.map((module) => module.id));
      const moduleId = createEntityId('module', draft.name, existingIds);
      const normalizedName = draft.name.trim() || `Новый модуль ${existingIds.size + 1}`;
      const normalizedDescription = draft.description.trim() || 'Описание не заполнено';
      const normalizedProduct = draft.productName.trim() || 'Новый продукт';
      const normalizedTeam = draft.team.trim() || 'Команда не указана';
      const uniqueDomains = deduplicateNonEmpty(draft.domainIds);
      const fallbackDomain =
        selectedNode?.type === 'domain'
          ? [selectedNode.id]
          : firstDomainId
            ? [firstDomainId]
            : [];
      const domainIds = (uniqueDomains.length > 0 ? uniqueDomains : fallbackDomain).filter(Boolean);
      const uniqueDependencies = deduplicateNonEmpty(draft.dependencyIds).filter((id) => id !== moduleId);
      const uniqueProduces = deduplicateNonEmpty(draft.producedArtifactIds);

      const sanitizedInputs = draft.dataIn.map<ModuleInput>((input, index) => ({
        id: input.id || `input-${index}`,
        label: input.label.trim() || `Вход ${index + 1}`,
        sourceId: input.sourceId ?? undefined
      }));

      const sanitizedOutputs = draft.dataOut.map<ModuleOutput>((output, index) => ({
        id: output.id || `output-${index}`,
        label: output.label.trim() || `Выход ${index + 1}`,
        consumerIds: deduplicateNonEmpty(output.consumerIds)
      }));

      const newModule: ModuleNode = {
        id: moduleId,
        name: normalizedName,
        description: normalizedDescription,
        domains: domainIds,
        team: normalizedTeam,
        productName: normalizedProduct,
        projectTeam: [],
        technologyStack: [],
        localization: 'ru',
        ridOwner: { company: 'Не указано', division: 'Не указано' },
        userStats: { companies: 0, licenses: 0 },
        status: draft.status,
        repository: undefined,
        api: undefined,
        specificationUrl: '#',
        apiContractsUrl: '#',
        techDesignUrl: '#',
        architectureDiagramUrl: '#',
        licenseServerIntegrated: false,
        libraries: [],
        clientType: 'web',
        deploymentTool: 'docker',
        dependencies: uniqueDependencies,
        produces: uniqueProduces,
        reuseScore: 0,
        metrics: { tests: 0, coverage: 0, automationRate: 0 },
        dataIn: sanitizedInputs,
        dataOut: sanitizedOutputs,
        formula: '',
        nonFunctional: {
          responseTimeMs: 0,
          throughputRps: 0,
          resourceConsumption: '—',
          baselineUsers: 0
        }
      };

      const inputSourceIds = sanitizedInputs
        .map((input) => input.sourceId)
        .filter((value): value is string => Boolean(value));

      const updatedArtifacts = artifactData.map((artifact) => {
        let next = artifact;
        if (inputSourceIds.includes(artifact.id) && !artifact.consumerIds.includes(moduleId)) {
          next = { ...next, consumerIds: [...next.consumerIds, moduleId] };
        }
        if (uniqueProduces.includes(artifact.id) && next.producedBy !== moduleId) {
          next = { ...next, producedBy: moduleId };
        }
        return next;
      });

      setArtifactData(updatedArtifacts);
      setModuleData([...moduleData, newModule]);
      setSelectedDomains((prev) => {
        const next = new Set(prev);
        domainIds.forEach((domainId) => {
          if (domainId) {
            next.add(domainId);
          }
        });
        return next;
      });
      setSelectedNode({ ...newModule, type: 'module' });
      setViewMode('graph');
    },
    [artifactData, firstDomainId, moduleData, selectedNode]
  );

  const handleCreateDomain = useCallback(
    (draft: DomainDraftPayload) => {
      const flattened = flattenDomainTree(domainData);
      const existingIds = new Set(flattened.map((domain) => domain.id));
      const domainId = createEntityId('domain', draft.name, existingIds);
      const normalizedName = draft.name.trim() || `Новый домен ${existingIds.size + 1}`;
      const normalizedDescription = draft.description.trim() || 'Описание не заполнено';
      const newDomain: DomainNode = { id: domainId, name: normalizedName, description: normalizedDescription };

      const updatedDomains = addDomainToTree(domainData, draft.parentId, newDomain);
      setDomainData(updatedDomains);

      if (draft.moduleIds.length > 0) {
        const moduleSet = new Set(draft.moduleIds);
        setModuleData((prev) =>
          prev.map((module) =>
            moduleSet.has(module.id) && !module.domains.includes(domainId)
              ? { ...module, domains: [...module.domains, domainId] }
              : module
          )
        );
      }

      setSelectedDomains((prev) => {
        const next = new Set(prev);
        next.add(domainId);
        return next;
      });

      setSelectedNode({ ...newDomain, type: 'domain' });
      setViewMode('graph');
    },
    [domainData]
  );

  const handleCreateArtifact = useCallback(
    (draft: ArtifactDraftPayload) => {
      const existingIds = new Set(artifactData.map((artifact) => artifact.id));
      const artifactId = createEntityId('artifact', draft.name, existingIds);
      const normalizedName = draft.name.trim() || `Новый артефакт ${existingIds.size + 1}`;
      const normalizedDescription = draft.description.trim() || 'Описание не заполнено';
      const normalizedDataType = draft.dataType.trim() || 'Не указан';
      const normalizedSampleUrl = draft.sampleUrl.trim() || '#';
      const producerId = draft.producedBy as string;
      const domainId = draft.domainId ?? moduleById[producerId]?.domains[0] ?? firstDomainId;
      const consumers = deduplicateNonEmpty(draft.consumerIds);

      if (!domainId) {
        return;
      }

      const newArtifact: ArtifactNode = {
        id: artifactId,
        name: normalizedName,
        description: normalizedDescription,
        domainId,
        producedBy: producerId,
        consumerIds: consumers,
        dataType: normalizedDataType,
        sampleUrl: normalizedSampleUrl
      };

      setArtifactData([...artifactData, newArtifact]);

      setModuleData((prev) =>
        prev.map((module) => {
          if (module.id === producerId) {
            const produces = module.produces.includes(artifactId)
              ? module.produces
              : [...module.produces, artifactId];
            const dataOut = module.dataOut.some((output) => output.label === normalizedName)
              ? module.dataOut
              : [
                  ...module.dataOut,
                  {
                    id: `output-${module.dataOut.length + 1}-${artifactId}`,
                    label: normalizedName,
                    consumerIds: consumers
                  }
                ];
            return { ...module, produces, dataOut };
          }

          if (consumers.includes(module.id) && !module.dataIn.some((input) => input.sourceId === artifactId)) {
            return {
              ...module,
              dataIn: [
                ...module.dataIn,
                {
                  id: `input-${module.dataIn.length + 1}-${artifactId}`,
                  label: normalizedName,
                  sourceId: artifactId
                }
              ]
            };
          }

          return module;
        })
      );

      setSelectedNode({ ...newArtifact, type: 'artifact', reuseScore: 0 });
      setSelectedDomains((prev) => {
        const next = new Set(prev);
        next.add(domainId);
        return next;
      });
      setViewMode('graph');
    },
    [artifactData, firstDomainId, moduleById]
  );

  const handleImportGraph = useCallback((snapshot: GraphSnapshotPayload) => {
    setDomainData(snapshot.domains);
    setModuleData(snapshot.modules);
    setArtifactData(snapshot.artifacts);
    setSelectedNode(null);
    setSearch('');
    setStatusFilters(new Set(allStatuses));
    setProductFilter(buildProductList(snapshot.modules));
    setSelectedDomains(
      new Set(flattenDomainTree(snapshot.domains).map((domain) => domain.id))
    );
  }, []);

  const activeViewTab = viewTabs.find((tab) => tab.value === viewMode) ?? viewTabs[0];
  const isGraphActive = viewMode === 'graph';
  const isStatsActive = viewMode === 'stats';
  const isCreateActive = viewMode === 'create';

  const headerTitle = (() => {
    if (isGraphActive) {
      return 'Граф модулей и доменных областей';
    }
    if (isStatsActive) {
      return 'Статистика экосистемы решений';
    }
    return 'Конструктор сущностей экосистемы';
  })();

  const headerDescription = (() => {
    if (isGraphActive) {
      return 'Выберите домены, чтобы увидеть связанные модули и выявить пересечения.';
    }
    if (isStatsActive) {
      return 'Обзор ключевых метрик по системам, модулям и обмену данными для планирования развития.';
    }
    return 'Добавляйте новые модули, домены и артефакты, связывая их с уже существующими элементами графа.';
  })();

  useEffect(() => {
    if (viewMode === 'stats' && !statsActivated) {
      setStatsActivated(true);
    }
  }, [statsActivated, viewMode]);

  return (
    <Layout className={styles.app} direction="column">
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Text size="2xl" weight="bold">
            {headerTitle}
          </Text>
          <Text size="s" view="secondary">
            {headerDescription}
          </Text>
        </div>
        <Tabs
          size="s"
          items={viewTabs}
          value={activeViewTab}
          getItemKey={(item) => item.value}
          getItemLabel={(item) => item.label}
          onChange={(tab) => setViewMode(tab.value)}
        />
      </header>
      <main
        className={styles.main}
        hidden={!isGraphActive}
        aria-hidden={!isGraphActive}
        style={{ display: isGraphActive ? undefined : 'none' }}
      >
          <aside className={styles.sidebar}>
            <Text size="s" weight="semibold" className={styles.sidebarTitle}>
              Домены
            </Text>
            <DomainTree
              tree={domainData}
              selected={selectedDomains}
              onToggle={handleDomainToggle}
              descendants={domainDescendants}
            />
            <Text size="s" weight="semibold" className={styles.sidebarTitle}>
              Фильтры
            </Text>
            <FiltersPanel
              search={search}
              onSearchChange={setSearch}
              statuses={allStatuses}
              activeStatuses={statusFilters}
              onToggleStatus={(status) => {
                setSelectedNode(null);
                setStatusFilters((prev) => {
                  const next = new Set(prev);
                  if (next.has(status)) {
                    next.delete(status);
                  } else {
                    next.add(status);
                  }
                  return next;
                });
              }}
              products={products}
              productFilter={productFilter}
              onProductChange={(nextProducts) => {
                setSelectedNode(null);
                setProductFilter(nextProducts);
              }}
              showAllConnections={showAllConnections}
              onToggleConnections={(value) => setShowAllConnections(value)}
            />
          </aside>
          <section className={styles.graphSection}>
            <div className={styles.graphContainer}>
              <GraphView
                modules={graphModules}
                domains={graphDomains}
                artifacts={graphArtifacts}
                links={filteredLinks}
                onSelect={handleSelectNode}
                highlightedNode={selectedNode?.id ?? null}
                visibleDomainIds={relevantDomainIds}
              />
            </div>
            <div className={styles.analytics}>
              <AnalyticsPanel modules={filteredModules} domainNameMap={domainNameMap} />
            </div>
          </section>
          <aside className={styles.details}>
            <NodeDetails
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
              onNavigate={handleNavigate}
              moduleNameMap={moduleNameMap}
              artifactNameMap={artifactNameMap}
              domainNameMap={domainNameMap}
            />
          </aside>
      </main>
      {(statsActivated || isStatsActive) && (
        <main
          className={styles.statsMain}
          hidden={!isStatsActive}
          aria-hidden={!isStatsActive}
          style={{ display: isStatsActive ? undefined : 'none' }}
        >
          <Suspense fallback={<Loader size="m" />}>
            <StatsDashboard
              modules={moduleData}
              domains={domainData}
              artifacts={artifactData}
              reuseHistory={reuseIndexHistory}
            />
          </Suspense>
        </main>
      )}
      <main
        className={styles.creationMain}
        hidden={!isCreateActive}
        aria-hidden={!isCreateActive}
        style={{ display: isCreateActive ? undefined : 'none' }}
      >
        <GraphPersistenceControls
          modules={moduleData}
          domains={domainData}
          artifacts={artifactData}
          onImport={handleImportGraph}
        />
        <EntityCreation
          modules={moduleData}
          domains={domainData}
          artifacts={artifactData}
          onCreateModule={handleCreateModule}
          onCreateDomain={handleCreateDomain}
          onCreateArtifact={handleCreateArtifact}
        />
      </main>
    </Layout>
  );
}

function buildProductList(modules: ModuleNode[]): string[] {
  const products = new Set<string>();
  modules.forEach((module) => {
    if (module.productName) {
      products.add(module.productName);
    }
  });
  return Array.from(products).sort((a, b) => a.localeCompare(b, 'ru'));
}

function deduplicateNonEmpty(values: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach((value) => {
    if (!value) {
      return;
    }
    if (!seen.has(value)) {
      seen.add(value);
      result.push(value);
    }
  });
  return result;
}

function createEntityId(prefix: string, name: string, existing: Set<string>): string {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const base = normalized ? `${prefix}-${normalized}` : `${prefix}-${Date.now()}`;
  let candidate = base;
  let counter = 1;
  while (existing.has(candidate)) {
    candidate = `${base}-${counter++}`;
  }
  return candidate;
}

function addDomainToTree(domains: DomainNode[], parentId: string | undefined, newDomain: DomainNode): DomainNode[] {
  if (!parentId) {
    return [...domains, newDomain];
  }

  const [next, inserted] = insertDomain(domains, parentId, newDomain);
  if (inserted) {
    return next;
  }

  return [...domains, newDomain];
}

function insertDomain(domains: DomainNode[], parentId: string, newDomain: DomainNode): [DomainNode[], boolean] {
  let inserted = false;
  const next = domains.map((domain) => {
    if (domain.id === parentId) {
      inserted = true;
      const children = domain.children ? [...domain.children, newDomain] : [newDomain];
      return { ...domain, children };
    }

    if (domain.children) {
      const [childUpdated, childInserted] = insertDomain(domain.children, parentId, newDomain);
      if (childInserted) {
        inserted = true;
        return { ...domain, children: childUpdated };
      }
    }

    return domain;
  });

  return [next, inserted];
}

function buildModuleLinks(modules: ModuleNode[], artifacts: ArtifactNode[]): GraphLink[] {
  const artifactMap = new Map<string, ArtifactNode>();
  artifacts.forEach((artifact) => artifactMap.set(artifact.id, artifact));

  return modules.flatMap((module) => {
    const domainLinks: GraphLink[] = module.domains.map((domainId) => ({
      source: module.id,
      target: domainId,
      type: 'domain'
    }));

    const dependencyLinks: GraphLink[] = module.dependencies.map((dependencyId) => ({
      source: module.id,
      target: dependencyId,
      type: 'dependency'
    }));

    const produceLinks: GraphLink[] = module.produces.map((artifactId) => ({
      source: module.id,
      target: artifactId,
      type: 'produces'
    }));

    const consumeLinks: GraphLink[] = module.dataIn
      .filter((input) => input.sourceId && artifactMap.has(input.sourceId))
      .map((input) => ({
        source: input.sourceId as string,
        target: module.id,
        type: 'consumes'
      }));

    return [...domainLinks, ...dependencyLinks, ...produceLinks, ...consumeLinks];
  });
}

function flattenDomainTree(domains: DomainNode[]): DomainNode[] {
  return domains.flatMap((domain) => [domain, ...(domain.children ? flattenDomainTree(domain.children) : [])]);
}

function buildDomainDescendants(domains: DomainNode[]): Map<string, string[]> {
  const map = new Map<string, string[]>();

  const visit = (node: DomainNode): string[] => {
    const collected = new Set<string>([node.id]);

    node.children?.forEach((child) => {
      visit(child).forEach((id) => collected.add(id));
    });

    map.set(node.id, Array.from(collected));
    return Array.from(collected);
  };

  domains.forEach((domain) => {
    visit(domain);
  });

  return map;
}

function buildDomainAncestors(domains: DomainNode[]): Map<string, string[]> {
  const map = new Map<string, string[]>();

  const visit = (node: DomainNode, ancestors: string[]) => {
    map.set(node.id, ancestors);
    node.children?.forEach((child) => {
      visit(child, [...ancestors, node.id]);
    });
  };

  domains.forEach((domain) => visit(domain, []));

  return map;
}

function filterDomainTreeByIds(domains: DomainNode[], allowed: Set<string>): DomainNode[] {
  if (allowed.size === 0) {
    return [];
  }

  return domains
    .map((domain) => {
      const children = domain.children ? filterDomainTreeByIds(domain.children, allowed) : [];
      const include = allowed.has(domain.id) || children.length > 0;

      if (!include) {
        return null;
      }

      return {
        ...domain,
        children: children.length > 0 ? children : undefined
      };
    })
    .filter((domain): domain is DomainNode => domain !== null);
}

type LinkEndpoint = string | { id: string };

function getLinkEndpointId(value: LinkEndpoint): string {
  if (typeof value === 'object' && value !== null && 'id' in value) {
    return value.id;
  }

  return value;
}

export default App;
