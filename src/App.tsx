import { Badge } from '@consta/uikit/Badge';
import { Button } from '@consta/uikit/Button';
import { CheckboxGroup } from '@consta/uikit/CheckboxGroup';
import { Collapse } from '@consta/uikit/Collapse';
import { Layout } from '@consta/uikit/Layout';
import { Loader } from '@consta/uikit/Loader';
import { Select } from '@consta/uikit/Select';
import { Tabs } from '@consta/uikit/Tabs';
import { Text } from '@consta/uikit/Text';
import { TextField } from '@consta/uikit/TextField';
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AnalyticsPanel from './components/AnalyticsPanel';
import DomainTree from './components/DomainTree';
import AdminPanel, {
  type ArtifactDraftPayload,
  type DomainDraftPayload,
  type ModuleDraftPayload
} from './components/AdminPanel';
import FiltersPanel from './components/FiltersPanel';
import GraphPersistenceControls from './components/GraphPersistenceControls';
import {
  GRAPH_SNAPSHOT_VERSION,
  type GraphLayoutNodePosition,
  type GraphLayoutSnapshot,
  type GraphSnapshotPayload,
  type GraphSummary,
  type GraphSyncStatus
} from './types/graph';
import {
  createGraph as createGraphRequest,
  deleteGraph as deleteGraphRequest,
  fetchGraphSnapshot,
  fetchGraphSummaries,
  importGraphFromSource,
  persistGraphSnapshot
} from './services/graphStorage';
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
  type ModuleMetrics,
  type ModuleNode,
  type ModuleStatus,
  type NonFunctionalRequirements
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
  { label: 'Администрирование', value: 'admin' }
] as const;

type ViewMode = (typeof viewTabs)[number]['value'];

type AdminNotice = {
  id: number;
  type: 'success' | 'error';
  message: string;
};

function App() {
  const [graphs, setGraphs] = useState<GraphSummary[]>([]);
  const [activeGraphId, setActiveGraphId] = useState<string | null>(null);
  const [isGraphsLoading, setIsGraphsLoading] = useState(true);
  const [graphListError, setGraphListError] = useState<string | null>(null);
  const [domainData, setDomainData] = useState<DomainNode[]>(initialDomainTree);
  const [moduleData, setModuleDataState] = useState<ModuleNode[]>(() =>
    recalculateReuseScores(initialModules)
  );
  const [artifactData, setArtifactData] = useState<ArtifactNode[]>(initialArtifacts);
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(
    () => new Set(flattenDomainTree(initialDomainTree).map((domain) => domain.id))
  );
  const [search, setSearch] = useState('');
  const [statusFilters, setStatusFilters] = useState<Set<ModuleStatus>>(new Set(allStatuses));
  const [productFilter, setProductFilter] = useState<string[]>(initialProducts);
  const [companyFilter, setCompanyFilter] = useState<string | null>(null);
  const [showAllConnections, setShowAllConnections] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('graph');
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);
  const [adminNotice, setAdminNotice] = useState<AdminNotice | null>(null);
  const highlightedDomainId = selectedNode?.type === 'domain' ? selectedNode.id : null;
  const [statsActivated, setStatsActivated] = useState(() => viewMode === 'stats');
  const [isSnapshotLoading, setIsSnapshotLoading] = useState(true);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<GraphSyncStatus | null>(null);
  const [isSyncAvailable, setIsSyncAvailable] = useState(false);
  const [isReloadingSnapshot, setIsReloadingSnapshot] = useState(false);
  const [snapshotRetryAttempt, setSnapshotRetryAttempt] = useState(0);
  const hasLoadedSnapshotRef = useRef(false);
  const skipNextSyncRef = useRef(false);
  const activeSnapshotControllerRef = useRef<AbortController | null>(null);
  const activeGraphIdRef = useRef<string | null>(null);
  const loadedGraphsRef = useRef(new Set<string>());
  const adminNoticeIdRef = useRef(0);
  const [layoutPositions, setLayoutPositions] = useState<Record<string, GraphLayoutNodePosition>>({});
  const layoutSnapshot = useMemo<GraphLayoutSnapshot>(
    () => ({ nodes: layoutPositions }),
    [layoutPositions]
  );
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [graphNameDraft, setGraphNameDraft] = useState('');
  const [graphSourceIdDraft, setGraphSourceIdDraft] = useState<string | null>(null);
  const [graphCopyOptions, setGraphCopyOptions] = useState<
    Set<'domains' | 'modules' | 'artifacts'>
  >(() => new Set(['domains', 'modules', 'artifacts']));
  const [isGraphActionInProgress, setIsGraphActionInProgress] = useState(false);
  const [graphActionStatus, setGraphActionStatus] = useState<
    { type: 'success' | 'error'; message: string } | null
  >(null);
  const refreshGraphs = useCallback(
    async (
      preferredGraphId?: string | null,
      options: { preserveSelection?: boolean } = {}
    ) => {
      const { preserveSelection = true } = options;
      setIsGraphsLoading(true);
      try {
        const list = await fetchGraphSummaries();
        setGraphs(list);
        setGraphListError(null);
        loadedGraphsRef.current = new Set(
          [...loadedGraphsRef.current].filter((id) => list.some((graph) => graph.id === id))
        );
        setActiveGraphId((prev) => {
          if (preferredGraphId && list.some((graph) => graph.id === preferredGraphId)) {
            return preferredGraphId;
          }
          if (preserveSelection && prev && list.some((graph) => graph.id === prev)) {
            return prev;
          }
          const fallback = list.find((graph) => graph.isDefault) ?? list[0] ?? null;
          return fallback ? fallback.id : null;
        });
      } catch (error) {
        console.error('Не удалось обновить список графов', error);
        const fallbackMessage = 'Не удалось загрузить список графов.';
        let message = fallbackMessage;

        if (error instanceof TypeError) {
          message =
            'Не удалось подключиться к серверу графа. Запустите "npm run server" или используйте "npm run dev:full".';
        } else if (error instanceof Error && error.message) {
          message = error.message;
        }

        setGraphListError(message);
        setGraphs([]);
        setActiveGraphId(null);
        setIsSnapshotLoading(false);
        setIsReloadingSnapshot(false);
        hasLoadedSnapshotRef.current = false;
      } finally {
        setIsGraphsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void refreshGraphs(null, { preserveSelection: false });
  }, [refreshGraphs]);

  useEffect(() => {
    activeGraphIdRef.current = activeGraphId;
  }, [activeGraphId]);

  const showAdminNotice = useCallback(
    (type: AdminNotice['type'], message: string) => {
      adminNoticeIdRef.current += 1;
      setAdminNotice({ id: adminNoticeIdRef.current, type, message });
    },
    []
  );

  const dismissAdminNotice = useCallback(() => {
    setAdminNotice(null);
  }, []);

  const products = useMemo(() => buildProductList(moduleData), [moduleData]);
  const companies = useMemo(() => buildCompanyList(moduleData), [moduleData]);

  useEffect(() => {
    if (companyFilter && !companies.includes(companyFilter)) {
      setCompanyFilter(null);
    }
  }, [companyFilter, companies]);

  const applySnapshot = useCallback(
    (snapshot: GraphSnapshotPayload) => {
      setDomainData(snapshot.domains);
      setModuleDataState(recalculateReuseScores(snapshot.modules));
      setArtifactData(snapshot.artifacts);
      setSelectedNode(null);
      setSearch('');
      setStatusFilters(new Set(allStatuses));
      setProductFilter(buildProductList(snapshot.modules));
      setCompanyFilter(null);
      setSelectedDomains(
        new Set(flattenDomainTree(snapshot.domains).map((domain) => domain.id))
      );
      setLayoutPositions(snapshot.layout?.nodes ?? {});
      hasLoadedSnapshotRef.current = true;
    },
    []
  );

  const loadSnapshot = useCallback(
    async (graphId: string, { withOverlay }: { withOverlay?: boolean } = {}) => {
      activeSnapshotControllerRef.current?.abort();

      const controller = new AbortController();
      activeSnapshotControllerRef.current = controller;

      if (withOverlay) {
        setIsSnapshotLoading(true);
      } else {
        setIsReloadingSnapshot(true);
      }

      try {
        const snapshot = await fetchGraphSnapshot(graphId, controller.signal);
        if (controller.signal.aborted || activeGraphIdRef.current !== graphId) {
          return;
        }
        applySnapshot(snapshot);
        loadedGraphsRef.current.add(graphId);
        skipNextSyncRef.current = true;
        setSnapshotError(null);
        setSnapshotRetryAttempt(0);
        setIsSyncAvailable(true);
        setSyncStatus({
          state: 'idle',
          message: 'Данные синхронизированы с сервером.'
        });
      } catch (error) {
        if (controller.signal.aborted || activeGraphIdRef.current !== graphId) {
          return;
        }

        console.error(`Не удалось загрузить граф ${graphId}`, error);
        const detail = error instanceof Error ? error.message : null;
        setSnapshotError(
          detail
            ? `Не удалось загрузить данные графа (${detail}). Используются локальные данные.`
            : 'Не удалось загрузить данные графа. Используются локальные данные.'
        );
        setSnapshotRetryAttempt((attempt) => attempt + 1);
        setIsSyncAvailable(false);
        const syncErrorMessage = detail
          ? `Нет связи с сервером (${detail}). Изменения не сохранятся.`
          : 'Нет связи с сервером. Изменения не сохранятся.';
        setSyncStatus({
          state: 'error',
          message: syncErrorMessage
        });
      } finally {
        const isCurrentRequest = activeSnapshotControllerRef.current === controller;

        if (isCurrentRequest) {
          activeSnapshotControllerRef.current = null;
        }

        if (withOverlay) {
          if (isCurrentRequest && activeGraphIdRef.current === graphId) {
            setIsSnapshotLoading(false);
          }
        } else if (isCurrentRequest && activeGraphIdRef.current === graphId) {
          setIsReloadingSnapshot(false);
        }
      }
    },
    [applySnapshot]
  );

  useEffect(() => {
    if (!activeGraphId) {
      return;
    }
    hasLoadedSnapshotRef.current = false;
    setIsSyncAvailable(false);
    setSyncStatus(null);
    setSnapshotError(null);
    setSnapshotRetryAttempt(0);
    setIsReloadingSnapshot(false);
    setIsSnapshotLoading(true);
    void loadSnapshot(activeGraphId, { withOverlay: true });
  }, [activeGraphId, loadSnapshot]);

  useEffect(() => {
    return () => {
      if (activeSnapshotControllerRef.current) {
        activeSnapshotControllerRef.current.abort();
        activeSnapshotControllerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!snapshotError || snapshotRetryAttempt === 0 || typeof window === 'undefined') {
      return;
    }

    if (isReloadingSnapshot) {
      return;
    }

    const backoffDelay = Math.min(30000, 2000 * 2 ** (snapshotRetryAttempt - 1));
    const timer = window.setTimeout(() => {
      if (activeGraphIdRef.current) {
        void loadSnapshot(activeGraphIdRef.current, { withOverlay: false });
      }
    }, backoffDelay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [snapshotError, snapshotRetryAttempt, isReloadingSnapshot, loadSnapshot]);

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
      const producerId = artifact.producedBy;
      if (!producerId) {
        return;
      }
      if (!dependents.has(producerId)) {
        dependents.set(producerId, new Set());
      }
      const entry = dependents.get(producerId)!;
      artifact.consumerIds.forEach((consumerId) => {
        entry.add(consumerId);
      });
    });

    return dependents;
  }, [moduleData, artifactData]);

  const domainNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    flattenDomainTree(domainData).forEach((domain) => {
      map[domain.id] = domain.name;
    });
    return map;
  }, [domainData]);

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

  const moduleSearchIndex = useMemo(() => {
    const index: Record<string, string> = {};

    moduleData.forEach((module) => {
      const collected: string[] = [];
      collectSearchableValues(module, collected);

      module.domains.forEach((domainId) => {
        const domainName = domainNameMap[domainId];
        if (domainName) {
          collected.push(domainName);
        }
      });

      module.dependencies.forEach((dependencyId) => {
        const dependencyName = moduleNameMap[dependencyId];
        if (dependencyName) {
          collected.push(dependencyName);
        }
      });

      module.produces.forEach((artifactId) => {
        const artifactName = artifactNameMap[artifactId];
        if (artifactName) {
          collected.push(artifactName);
        }
      });

      module.dataIn.forEach((input) => {
        if (!input.sourceId) {
          return;
        }
        const sourceArtifactName = artifactNameMap[input.sourceId];
        if (sourceArtifactName) {
          collected.push(sourceArtifactName);
        }
      });

      module.dataOut.forEach((output) => {
        output.consumerIds?.forEach((consumerId) => {
          const consumerName = moduleNameMap[consumerId];
          if (consumerName) {
            collected.push(consumerName);
          }
        });
      });

      const normalized = collected
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length > 0);

      index[module.id] = normalized.join(' ');
    });

    return index;
  }, [moduleData, domainNameMap, moduleNameMap, artifactNameMap]);

  useEffect(() => {
    if (!isSyncAvailable || !hasLoadedSnapshotRef.current || !activeGraphId) {
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return () => {
        controller.abort();
      };
    }

    setSyncStatus((prev) => {
      if (prev?.state === 'error') {
        return { state: 'saving', message: 'Повторяем синхронизацию...' };
      }
      return { state: 'saving', message: 'Сохраняем изменения в хранилище...' };
    });

    const graphId = activeGraphId;
    const exportTimestamp = new Date().toISOString();

    persistGraphSnapshot(
      graphId,
      {
        version: GRAPH_SNAPSHOT_VERSION,
        exportedAt: exportTimestamp,
        modules: moduleData,
        domains: domainData,
        artifacts: artifactData,
        layout: { nodes: layoutPositions }
      },
      controller.signal
    )
      .then(() => {
        if (cancelled) {
          return;
        }
        setSyncStatus({
          state: 'idle',
          message: `Сохранено ${new Date().toLocaleTimeString()}`
        });
        setGraphs((prev) =>
          prev.map((graph) =>
            graph.id === graphId ? { ...graph, updatedAt: exportTimestamp } : graph
          )
        );
      })
      .catch((error) => {
        if (cancelled || controller.signal.aborted) {
          return;
        }
        console.error('Не удалось сохранить граф', error);
        setSyncStatus({
          state: 'error',
          message:
            error instanceof Error ? error.message : 'Не удалось сохранить данные.'
        });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    artifactData,
    domainData,
    moduleData,
    isSyncAvailable,
    layoutPositions,
    activeGraphId
  ]);

  const matchesModuleFilters = useCallback(
    (module: ModuleNode) => {
      const matchesDomain =
        selectedDomains.size > 0 && module.domains.some((domain) => selectedDomains.has(domain));
      const normalizedSearch = search.trim().toLowerCase();
      const searchableText = moduleSearchIndex[module.id] ?? '';
      const matchesSearch =
        normalizedSearch.length === 0 || searchableText.includes(normalizedSearch);
      const matchesStatus = statusFilters.has(module.status);
      const matchesProduct =
        productFilter.length === 0
          ? false
          : productFilter.includes(module.productName);
      const matchesCompany =
        !companyFilter ||
        module.userStats.companies.some((company) => company.name === companyFilter);
      return (
        matchesDomain && matchesSearch && matchesStatus && matchesProduct && matchesCompany
      );
    },
    [
      search,
      selectedDomains,
      statusFilters,
      productFilter,
      companyFilter,
      moduleSearchIndex
    ]
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

  const graphSelectOptions = useMemo(
    () =>
      graphs.map((graph) => ({
        label: graph.isDefault ? `${graph.name} • основной` : graph.name,
        value: graph.id
      })),
    [graphs]
  );

  const graphSelectValue = useMemo(
    () => graphSelectOptions.find((option) => option.value === activeGraphId) ?? null,
    [graphSelectOptions, activeGraphId]
  );

  const graphSourceSelectValue = useMemo(
    () => graphSelectOptions.find((option) => option.value === graphSourceIdDraft) ?? null,
    [graphSelectOptions, graphSourceIdDraft]
  );

  const graphCopyOptionItems = useMemo(
    () =>
      [
        { id: 'domains' as const, label: 'Домены' },
        { id: 'modules' as const, label: 'Модули' },
        { id: 'artifacts' as const, label: 'Артефакты' }
      ],
    []
  );

  const selectedGraphCopyOptionItems = useMemo(
    () => graphCopyOptionItems.filter((item) => graphCopyOptions.has(item.id)),
    [graphCopyOptionItems, graphCopyOptions]
  );

  const activeGraph = useMemo(
    () => graphs.find((graph) => graph.id === activeGraphId) ?? null,
    [graphs, activeGraphId]
  );

  const activeGraphBadge = useMemo(() => {
    if (!activeGraph) {
      return null;
    }

    return {
      label: activeGraph.isDefault ? 'Основной граф' : 'Дополнительный граф',
      status: activeGraph.isDefault ? ('success' as const) : ('system' as const)
    };
  }, [activeGraph]);

  const sourceGraphDraft = useMemo(
    () => graphs.find((graph) => graph.id === graphSourceIdDraft) ?? null,
    [graphs, graphSourceIdDraft]
  );

  const defaultDomainId = useMemo(() => {
    const flattened = flattenDomainTree(domainData);
    const firstLeaf = flattened.find((domain) => !domain.children || domain.children.length === 0);
    return firstLeaf ? firstLeaf.id : null;
  }, [domainData]);

  const leafDomainIds = useMemo(() => collectLeafDomainIds(domainData), [domainData]);
  const leafDomainIdSet = useMemo(() => new Set(leafDomainIds), [leafDomainIds]);
  const catalogDomainIdSet = useMemo(() => new Set(collectCatalogDomainIds(domainData)), [domainData]);
  const domainIdSet = useMemo(
    () => new Set(flattenDomainTree(domainData).map((domain) => domain.id)),
    [domainData]
  );
  const displayableDomainIdSet = useMemo(
    () =>
      new Set(
        flattenDomainTree(domainData)
          .filter((domain) => !domain.isCatalogRoot)
          .map((domain) => domain.id)
      ),
    [domainData]
  );

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
        if (sourceArtifact?.producedBy) {
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
      if (selectedNode.producedBy) {
        ids.add(selectedNode.producedBy);
      }
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
    const extraModuleIds = new Set(contextModuleIds);

    if (showAllConnections) {
      filteredModules.forEach((module) => {
        module.dependencies.forEach((dependencyId) => {
          extraModuleIds.add(dependencyId);
        });

        const dependents = moduleDependents.get(module.id);
        dependents?.forEach((dependentId) => {
          extraModuleIds.add(dependentId);
        });

        module.produces.forEach((artifactId) => {
          const artifact = artifactMap.get(artifactId);
          artifact?.consumerIds.forEach((consumerId) => extraModuleIds.add(consumerId));
        });

        module.dataIn.forEach((input) => {
          if (!input.sourceId) {
            return;
          }
          const artifact = artifactMap.get(input.sourceId);
          if (artifact?.producedBy) {
            extraModuleIds.add(artifact.producedBy);
          }
        });
      });
    }

    if (extraModuleIds.size === 0) {
      return filteredModules;
    }

    const existing = new Set(filteredModules.map((module) => module.id));
    const extended = [...filteredModules];

    extraModuleIds.forEach((moduleId) => {
      if (existing.has(moduleId)) {
        return;
      }
      const module = moduleById[moduleId];
      if (!module) {
        return;
      }
      if (
        companyFilter &&
        !module.userStats.companies.some((company) => company.name === companyFilter)
      ) {
        return;
      }
      extended.push(module);
      existing.add(moduleId);
    });

    return extended;
  }, [
    filteredModules,
    contextModuleIds,
    moduleById,
    showAllConnections,
    artifactMap,
    moduleDependents,
    companyFilter
  ]);

  const relevantDomainIds = useMemo(() => {
    const ids = new Set<string>();

    const addWithAncestors = (domainId: string) => {
      ids.add(domainId);
      const ancestors = domainAncestors.get(domainId);
      ancestors?.forEach((ancestorId) => ids.add(ancestorId));
    };

    selectedDomains.forEach((domainId) => {
      addWithAncestors(domainId);
    });

    graphModules.forEach((module) => {
      module.domains.forEach((domainId) => addWithAncestors(domainId));
    });

    if (highlightedDomainId) {
      addWithAncestors(highlightedDomainId);
    }

    return ids;
  }, [graphModules, highlightedDomainId, domainAncestors, selectedDomains]);

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

    let scopedArtifacts = artifactData.filter((artifact) => {
      if (relevantArtifactIds.has(artifact.id)) {
        return true;
      }
      if (artifact.producedBy && moduleIds.has(artifact.producedBy)) {
        return true;
      }
      return artifact.consumerIds.some((consumerId) => moduleIds.has(consumerId));
    });

    if (selectedNode?.type === 'artifact' && !scopedArtifacts.some((artifact) => artifact.id === selectedNode.id)) {
      const fallback = artifactData.find((artifact) => artifact.id === selectedNode.id);
      if (fallback) {
        scopedArtifacts = [...scopedArtifacts, fallback];
      }
    }

    return scopedArtifacts;
  }, [artifactData, graphModules, selectedNode]);

  const graphLinksAll = useMemo(
    () => buildModuleLinks(moduleData, artifactData, displayableDomainIdSet),
    [moduleData, artifactData, displayableDomainIdSet]
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

        const producerProduct = artifact.producedBy
          ? moduleById[artifact.producedBy]?.productName ?? null
          : null;
        const consumerProduct = moduleById[targetId]?.productName ?? null;

        return Boolean(producerProduct && consumerProduct && producerProduct === consumerProduct);
      }

      return false;
    });
  }, [
    artifactMap,
    graphArtifacts,
    graphLinksAll,
    graphModules,
    moduleById,
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

          const producerProduct = artifact.producedBy
            ? moduleById[artifact.producedBy]?.productName ?? null
            : null;
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
            const producerProduct = artifact?.producedBy
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
    moduleById,
    relevantDomainIds,
    selectedDomains,
    showAllConnections
  ]);

  useEffect(() => {
    if (viewMode === 'stats' && !statsActivated) {
      setStatsActivated(true);
    }
  }, [statsActivated, viewMode]);

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

  const activeNodeIds = useMemo(() => {
    const ids = new Set<string>();

    moduleData.forEach((module) => ids.add(module.id));
    artifactData.forEach((artifact) => ids.add(artifact.id));
    flattenDomainTree(domainData).forEach((domain) => ids.add(domain.id));

    return ids;
  }, [artifactData, domainData, moduleData]);

  const handleLayoutChange = useCallback(
    (positions: Record<string, GraphLayoutNodePosition>) => {
      setLayoutPositions((prev) => {
        const merged = mergeLayoutPositions(prev, positions);
        const ensuredActiveIds = new Set(activeNodeIds);
        Object.keys(positions).forEach((id) => ensuredActiveIds.add(id));
        const pruned = pruneLayoutPositions(merged, ensuredActiveIds);
        return layoutsEqual(prev, pruned) ? prev : pruned;
      });
    },
    [activeNodeIds]
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
      const fallbackDomains =
        draft.domainIds.length > 0
          ? draft.domainIds
          : selectedNode?.type === 'domain'
            ? [selectedNode.id]
            : defaultDomainId
              ? [defaultDomainId]
              : [];

      const result = buildModuleFromDraft(moduleId, draft, fallbackDomains, leafDomainIdSet, {
        fallbackName: draft.name.trim() || `Новый модуль ${existingIds.size + 1}`,
        currentProduces: []
      });
      if (!result) {
        showAdminNotice(
          'error',
          'Не удалось сохранить модуль: выберите хотя бы одну доменную область.'
        );
        return;
      }

      const { module: newModule, consumedArtifactIds } = result;
      const recalculatedModules = recalculateReuseScores([...moduleData, newModule]);
      const createdModule = recalculatedModules.find((module) => module.id === moduleId);
      setModuleDataState(recalculatedModules);

      setArtifactData((prev) =>
        prev.map((artifact) => {
          let next = artifact;
          if (consumedArtifactIds.includes(artifact.id) && !artifact.consumerIds.includes(moduleId)) {
            next = { ...next, consumerIds: [...artifact.consumerIds, moduleId] };
          }
          if (createdModule?.produces.includes(artifact.id) && artifact.producedBy !== moduleId) {
            next = { ...next, producedBy: moduleId };
          }
          return next;
        })
      );
      setLayoutPositions((prev) => {
        if (prev[moduleId]) {
          return prev;
        }

        const anchorIds = [...newModule.dependencies, ...newModule.domains];
        const initialPosition = resolveInitialModulePosition(prev, anchorIds);
        if (!initialPosition) {
          return prev;
        }

        return {
          ...prev,
          [moduleId]: initialPosition
        };
      });
      setSelectedDomains((prev) => {
        const next = new Set(prev);
        createdModule?.domains.forEach((domainId) => {
          if (domainId) {
            next.add(domainId);
          }
        });
        return next;
      });
      if (createdModule) {
        setSelectedNode({ ...createdModule, type: 'module' });
      }
      setViewMode('graph');
      if (createdModule) {
        showAdminNotice('success', `Модуль «${createdModule.name}» создан.`);
      }
    },
    [defaultDomainId, leafDomainIdSet, moduleData, selectedNode, showAdminNotice]
  );

  const handleUpdateModule = useCallback(
    (moduleId: string, draft: ModuleDraftPayload) => {
      const existing = moduleData.find((module) => module.id === moduleId);
      if (!existing) {
        return;
      }

      const fallbackDomains =
        draft.domainIds.length > 0
          ? draft.domainIds
          : existing.domains.length > 0
            ? existing.domains
            : defaultDomainId
              ? [defaultDomainId]
              : [];

      const result = buildModuleFromDraft(moduleId, draft, fallbackDomains, leafDomainIdSet, {
        fallbackName: existing.name,
        currentProduces: existing.produces
      });
      if (!result) {
        showAdminNotice(
          'error',
          'Не удалось сохранить модуль: выберите хотя бы одну доменную область.'
        );
        return;
      }

      const { module: updatedModule, consumedArtifactIds } = result;
      const recalculatedModules = recalculateReuseScores(
        moduleData.map((module) => (module.id === moduleId ? updatedModule : module))
      );
      const recalculatedModule = recalculatedModules.find((module) => module.id === moduleId);
      const producedSet = new Set(recalculatedModule?.produces ?? []);

      setModuleDataState(recalculatedModules);

      setArtifactData((prev) =>
        prev.map((artifact) => {
          let next = artifact;
          const consumes = consumedArtifactIds.includes(artifact.id);
          if (consumes && !artifact.consumerIds.includes(moduleId)) {
            next = { ...next, consumerIds: [...artifact.consumerIds, moduleId] };
          }
          if (!consumes && artifact.consumerIds.includes(moduleId)) {
            next = {
              ...next,
              consumerIds: artifact.consumerIds.filter((consumerId) => consumerId !== moduleId)
            };
          }

          if (producedSet.has(artifact.id)) {
            if (artifact.producedBy !== moduleId) {
              next = { ...next, producedBy: moduleId };
            }
          } else if (artifact.producedBy === moduleId) {
            next = { ...next, producedBy: undefined };
          }

          return next;
        })
      );

      setSelectedNode((prev) =>
        prev && prev.id === moduleId && recalculatedModule
          ? { ...recalculatedModule, type: 'module' }
          : prev
      );

      if (recalculatedModule) {
        showAdminNotice('success', `Модуль «${recalculatedModule.name}» обновлён.`);
      }
    },
    [defaultDomainId, leafDomainIdSet, moduleData, showAdminNotice]
  );

  const handleDeleteModule = useCallback(
    (moduleId: string) => {
      const removedModule = moduleData.find((module) => module.id === moduleId);
      const producedArtifacts = artifactData
        .filter((artifact) => artifact.producedBy === moduleId)
        .map((artifact) => artifact.id);
      const removedArtifactIds = new Set(producedArtifacts);

      setArtifactData((prev) =>
        prev
          .filter((artifact) => artifact.producedBy !== moduleId)
          .map((artifact) => ({
            ...artifact,
            consumerIds: artifact.consumerIds.filter((consumerId) => consumerId !== moduleId)
          }))
      );

      const nextModulesBase = moduleData
        .filter((module) => module.id !== moduleId)
        .map((module) => ({
          ...module,
          dependencies: module.dependencies.filter((dependencyId) => dependencyId !== moduleId),
          dataOut: module.dataOut.map((output) => ({
            ...output,
            consumerIds: (output.consumerIds ?? []).filter((consumerId) => consumerId !== moduleId)
          })),
          produces: module.produces.filter((artifactId) => !removedArtifactIds.has(artifactId)),
          dataIn: module.dataIn.filter((input) =>
            input.sourceId ? !removedArtifactIds.has(input.sourceId) : true
          )
        }));

      setModuleDataState(recalculateReuseScores(nextModulesBase));

      setLayoutPositions((prev) => {
        const next = { ...prev };
        delete next[moduleId];
        removedArtifactIds.forEach((id) => {
          delete next[id];
        });
        return next;
      });

      setSelectedNode((prev) => {
        if (!prev) {
          return prev;
        }
        if (prev.id === moduleId || removedArtifactIds.has(prev.id)) {
          return null;
        }
        return prev;
      });
      if (removedModule) {
        showAdminNotice('success', `Модуль «${removedModule.name}» удалён.`);
      }
    },
    [artifactData, moduleData, showAdminNotice]
  );

  const handleCreateDomain = useCallback(
    (draft: DomainDraftPayload) => {
      const flattened = flattenDomainTree(domainData);
      const existingIds = new Set(flattened.map((domain) => domain.id));
      const domainId = createEntityId('domain', draft.name, existingIds);
      const normalizedName = draft.name.trim() || `Новый домен ${existingIds.size + 1}`;
      const normalizedDescription = draft.description.trim() || 'Описание не заполнено';
      const rawParentId = draft.parentId ?? undefined;
      const normalizedParentId = draft.isCatalogRoot
        ? rawParentId && catalogDomainIdSet.has(rawParentId)
          ? rawParentId
          : undefined
        : rawParentId && domainIdSet.has(rawParentId)
          ? rawParentId
          : undefined;

      if (!draft.isCatalogRoot && !normalizedParentId) {
        showAdminNotice(
          'error',
          'Не удалось создать домен: выберите родительскую область.'
        );
        return;
      }

      const experts = draft.experts.map((expert) => expert.trim()).filter((expert) => expert);
      const meetupLink = draft.meetupLink.trim();
      const newDomain: DomainNode = {
        id: domainId,
        name: normalizedName,
        description: normalizedDescription,
        isCatalogRoot: draft.isCatalogRoot,
        experts,
        meetupLink: meetupLink || undefined
      };

      const targetParentId = draft.isCatalogRoot ? normalizedParentId : normalizedParentId!;
      const updatedDomains = addDomainToTree(domainData, targetParentId, newDomain);
      setDomainData(updatedDomains);

      const moduleIds = !draft.isCatalogRoot && targetParentId ? draft.moduleIds : [];
      if (moduleIds.length > 0) {
        const moduleSet = new Set(moduleIds);
        setModuleDataState((prev) =>
          recalculateReuseScores(
            prev.map((module) =>
              moduleSet.has(module.id) && !module.domains.includes(domainId)
                ? { ...module, domains: [...module.domains, domainId] }
                : module
            )
          )
        );
      }

      setSelectedDomains((prev) => {
        const next = new Set(prev);
        next.add(domainId);
        return next;
      });

      if (!draft.isCatalogRoot) {
        setSelectedNode({ ...newDomain, type: 'domain' });
      }
      setViewMode('graph');
      showAdminNotice(
        'success',
        `${draft.isCatalogRoot ? 'Корневой каталог' : 'Домен'} «${normalizedName}» создан.`
      );
    },
    [catalogDomainIdSet, domainData, domainIdSet, showAdminNotice]
  );

  const handleUpdateDomain = useCallback(
    (domainId: string, draft: DomainDraftPayload) => {
      const [treeWithoutDomain, extracted, previousParentId] = removeDomainFromTree(domainData, domainId);
      if (!extracted) {
        return;
      }

      const sanitizedName = draft.name.trim() || extracted.name;
      const sanitizedDescription =
        draft.description.trim() || extracted.description || 'Описание не заполнено';
      const experts = draft.experts.map((expert) => expert.trim()).filter((expert) => expert);
      const meetupLink = draft.meetupLink.trim();

      const updatedDomain: DomainNode = {
        ...extracted,
        name: sanitizedName,
        description: sanitizedDescription,
        isCatalogRoot: draft.isCatalogRoot,
        experts,
        meetupLink: meetupLink || undefined
      };

      const descendantIds = new Set(collectDomainIds(updatedDomain));
      const rawParentId = draft.parentId ?? undefined;
      let normalizedParentId = draft.isCatalogRoot
        ? rawParentId && catalogDomainIdSet.has(rawParentId)
          ? rawParentId
          : undefined
        : rawParentId && domainIdSet.has(rawParentId)
          ? rawParentId
          : undefined;

      if (!draft.isCatalogRoot && !normalizedParentId) {
        const restoredTree = addDomainToTree(
          treeWithoutDomain,
          previousParentId ?? undefined,
          extracted
        );
        setDomainData(restoredTree);
        showAdminNotice(
          'error',
          'Не удалось обновить домен: выберите родительскую область.'
        );
        return;
      }

      let targetParentId: string | null = normalizedParentId ?? null;

      if (targetParentId && (targetParentId === domainId || descendantIds.has(targetParentId))) {
        const fallbackParentId = previousParentId ?? null;
        const fallbackIsValid =
          fallbackParentId !== null &&
          (draft.isCatalogRoot
            ? catalogDomainIdSet.has(fallbackParentId)
            : domainIdSet.has(fallbackParentId)) &&
          !descendantIds.has(fallbackParentId) &&
          fallbackParentId !== domainId;

        targetParentId = fallbackIsValid ? fallbackParentId : null;
      }

      if (!draft.isCatalogRoot && !targetParentId) {
        const restoredTree = addDomainToTree(
          treeWithoutDomain,
          previousParentId ?? undefined,
          extracted
        );
        setDomainData(restoredTree);
        showAdminNotice(
          'error',
          'Не удалось обновить домен: выберите родительскую область.'
        );
        return;
      }

      const rebuiltTree = addDomainToTree(treeWithoutDomain, targetParentId ?? undefined, updatedDomain);
      setDomainData(rebuiltTree);

      const moduleSet = !draft.isCatalogRoot && targetParentId
        ? new Set(draft.moduleIds)
        : new Set<string>();
      setModuleDataState((prev) =>
        recalculateReuseScores(
          prev.map((module) => {
            const hasDomain = module.domains.includes(domainId);
            if (moduleSet.has(module.id)) {
              return hasDomain ? module : { ...module, domains: [...module.domains, domainId] };
            }
            return hasDomain
              ? { ...module, domains: module.domains.filter((id) => id !== domainId) }
              : module;
          })
        )
      );

      setSelectedNode((prev) =>
        prev && prev.id === domainId
          ? updatedDomain.isCatalogRoot
            ? null
            : { ...updatedDomain, type: 'domain' }
          : prev
      );
      showAdminNotice(
        'success',
        `${updatedDomain.isCatalogRoot ? 'Корневой каталог' : 'Домен'} «${sanitizedName}» обновлён.`
      );
    },
    [catalogDomainIdSet, domainData, domainIdSet, showAdminNotice]
  );

  const handleDeleteDomain = useCallback(
    (domainId: string) => {
      const [nextTree, removedDomain] = removeDomainFromTree(domainData, domainId);
      if (!removedDomain) {
        return;
      }

      const removedIds = new Set(collectDomainIds(removedDomain));

      setDomainData(nextTree);
      setModuleDataState((prev) =>
        recalculateReuseScores(
          prev.map((module) => ({
            ...module,
            domains: module.domains.filter((id) => !removedIds.has(id))
          }))
        )
      );
      setArtifactData((prev) => prev.filter((artifact) => !removedIds.has(artifact.domainId)));
      setSelectedDomains((prev) => {
        const next = new Set(prev);
        removedIds.forEach((id) => next.delete(id));
        return next;
      });
      setLayoutPositions((prev) => {
        const next = { ...prev };
        removedIds.forEach((id) => {
          delete next[id];
        });
        return next;
      });
      setSelectedNode((prev) => (prev && removedIds.has(prev.id) ? null : prev));
      showAdminNotice(
        'success',
        `${removedDomain.isCatalogRoot ? 'Корневой каталог' : 'Домен'} «${removedDomain.name}» удалён.`
      );
    },
    [domainData, showAdminNotice]
  );

  const handleCreateArtifact = useCallback(
    (draft: ArtifactDraftPayload) => {
      const existingIds = new Set(artifactData.map((artifact) => artifact.id));
      const artifactId = createEntityId('artifact', draft.name, existingIds);
      const normalizedName = draft.name.trim() || `Новый артефакт ${existingIds.size + 1}`;
      const normalizedDescription = draft.description.trim() || 'Описание не заполнено';
      const normalizedDataType = draft.dataType.trim() || 'Не указан';
      const normalizedSampleUrl = draft.sampleUrl.trim() || '#';
      const producerId = draft.producedBy?.trim();
      const fallbackDomainId =
        draft.domainId ?? (producerId ? moduleById[producerId]?.domains[0] : undefined) ?? defaultDomainId;
      const domainId = fallbackDomainId && leafDomainIdSet.has(fallbackDomainId) ? fallbackDomainId : null;
      const consumers = deduplicateNonEmpty(draft.consumerIds);

      if (!domainId) {
        showAdminNotice('error', 'Не удалось сохранить артефакт: выберите доменную область.');
        return;
      }

      const newArtifact: ArtifactNode = {
        id: artifactId,
        name: normalizedName,
        description: normalizedDescription,
        domainId,
        producedBy: producerId || undefined,
        consumerIds: consumers,
        dataType: normalizedDataType,
        sampleUrl: normalizedSampleUrl
      };

      setArtifactData([...artifactData, newArtifact]);

      setModuleDataState((prev) =>
        recalculateReuseScores(
          prev.map((module) => {
            let next = module;

            if (producerId && module.id === producerId) {
              const produces = module.produces.includes(artifactId)
                ? module.produces
                : [...module.produces, artifactId];
              const existingOutputIndex = module.dataOut.findIndex((output) => output.label === normalizedName);
              const dataOut = existingOutputIndex >= 0
                ? module.dataOut.map((output, index) =>
                    index === existingOutputIndex
                      ? { ...output, label: normalizedName, consumerIds: consumers }
                      : output
                  )
                : [
                    ...module.dataOut,
                    {
                      id: `output-${module.dataOut.length + 1}-${artifactId}`,
                      label: normalizedName,
                      consumerIds: consumers
                    }
                  ];
              next = { ...next, produces, dataOut };
            }

            if (consumers.includes(module.id) && !module.dataIn.some((input) => input.sourceId === artifactId)) {
              next = {
                ...next,
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

            return next;
          })
        )
      );

      setSelectedNode({ ...newArtifact, type: 'artifact', reuseScore: 0 });
      setSelectedDomains((prev) => {
        const next = new Set(prev);
        next.add(domainId);
        return next;
      });
      setViewMode('graph');
      showAdminNotice('success', `Артефакт «${normalizedName}» создан.`);
    },
    [artifactData, defaultDomainId, leafDomainIdSet, moduleById, showAdminNotice]
  );

  const handleUpdateArtifact = useCallback(
    (artifactId: string, draft: ArtifactDraftPayload) => {
      const existing = artifactData.find((artifact) => artifact.id === artifactId);
      if (!existing) {
        return;
      }

      const normalizedName = draft.name.trim() || existing.name;
      const normalizedDescription = draft.description.trim() || existing.description;
      const normalizedDataType = draft.dataType.trim() || existing.dataType;
      const normalizedSampleUrl = draft.sampleUrl.trim() || existing.sampleUrl;
      const producerId = draft.producedBy?.trim();
      const candidateDomainId = draft.domainId ?? existing.domainId;
      if (!candidateDomainId || !leafDomainIdSet.has(candidateDomainId)) {
        showAdminNotice('error', 'Не удалось сохранить артефакт: выберите доменную область.');
        return;
      }
      const domainId = candidateDomainId;
      const consumers = deduplicateNonEmpty(draft.consumerIds);

      const updatedArtifact: ArtifactNode = {
        id: artifactId,
        name: normalizedName,
        description: normalizedDescription,
        domainId,
        producedBy: producerId || undefined,
        consumerIds: consumers,
        dataType: normalizedDataType,
        sampleUrl: normalizedSampleUrl
      };

      setArtifactData((prev) =>
        prev.map((artifact) => (artifact.id === artifactId ? updatedArtifact : artifact))
      );

      setModuleDataState((prev) =>
        recalculateReuseScores(
          prev.map((module) => {
            let next = module;
            const isProducer = producerId && module.id === producerId;
            const wasProducer = existing.producedBy && module.id === existing.producedBy;
            let produces = module.produces;
            let dataOut = module.dataOut;

            if (isProducer) {
              if (!produces.includes(artifactId)) {
                produces = [...produces, artifactId];
              }
              const outputIndex = dataOut.findIndex(
                (output) => output.label === existing.name || output.label === normalizedName
              );
              if (outputIndex >= 0) {
                dataOut = dataOut.map((output, index) =>
                  index === outputIndex
                    ? {
                        ...output,
                        label: normalizedName,
                        consumerIds: consumers
                      }
                    : output
                );
              } else {
                dataOut = [
                  ...dataOut,
                  {
                    id: `output-${dataOut.length + 1}-${artifactId}`,
                    label: normalizedName,
                    consumerIds: consumers
                  }
                ];
              }
            } else if (wasProducer) {
              produces = produces.filter((id) => id !== artifactId);
              dataOut = dataOut.filter(
                (output) => output.label !== existing.name && output.label !== normalizedName
              );
            }

            const isConsumer = consumers.includes(module.id);
            const wasConsumer = existing.consumerIds.includes(module.id);
            let dataIn = module.dataIn;

            if (isConsumer) {
              if (dataIn.some((input) => input.sourceId === artifactId)) {
                dataIn = dataIn.map((input) =>
                  input.sourceId === artifactId ? { ...input, label: normalizedName } : input
                );
              } else {
                dataIn = [
                  ...dataIn,
                  {
                    id: `input-${dataIn.length + 1}-${artifactId}`,
                    label: normalizedName,
                    sourceId: artifactId
                  }
                ];
              }
            } else if (wasConsumer) {
              dataIn = dataIn.filter((input) => input.sourceId !== artifactId);
            }

            if (
              produces !== module.produces ||
              dataOut !== module.dataOut ||
              dataIn !== module.dataIn
            ) {
              next = { ...module, produces, dataOut, dataIn };
            }

            return next;
          })
        )
      );

      setSelectedNode((prev) =>
        prev && prev.id === artifactId ? { ...updatedArtifact, type: 'artifact', reuseScore: 0 } : prev
      );
      showAdminNotice('success', `Артефакт «${normalizedName}» обновлён.`);
    },
    [artifactData, leafDomainIdSet, showAdminNotice]
  );

  const handleDeleteArtifact = useCallback(
    (artifactId: string) => {
      const existing = artifactData.find((artifact) => artifact.id === artifactId);
      if (!existing) {
        return;
      }

      setArtifactData((prev) => prev.filter((artifact) => artifact.id !== artifactId));

      setModuleDataState((prev) =>
        recalculateReuseScores(
          prev.map((module) => ({
            ...module,
            produces: module.produces.filter((id) => id !== artifactId),
            dataOut: module.dataOut.filter((output) => output.label !== existing.name),
            dataIn: module.dataIn.filter((input) => input.sourceId !== artifactId)
          }))
        )
      );

      setLayoutPositions((prev) => {
        const next = { ...prev };
        delete next[artifactId];
        return next;
      });

      setSelectedNode((prev) => (prev && prev.id === artifactId ? null : prev));
      showAdminNotice('success', `Артефакт «${existing.name}» удалён.`);
    },
    [artifactData, showAdminNotice]
  );

  const handleImportGraph = useCallback(
    (snapshot: GraphSnapshotPayload) => {
      applySnapshot(snapshot);
      skipNextSyncRef.current = true;
    },
    [applySnapshot]
  );

  const handleImportFromExistingGraph = useCallback(
    async (request: {
      graphId: string;
      includeDomains: boolean;
      includeModules: boolean;
      includeArtifacts: boolean;
    }) => {
      try {
        const snapshot = await importGraphFromSource(request);
        applySnapshot(snapshot);
        skipNextSyncRef.current = true;
        setIsSyncAvailable(true);
        return {
          domains: snapshot.domains.length,
          modules: snapshot.modules.length,
          artifacts: snapshot.artifacts.length
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Не удалось импортировать данные графа.';
        showAdminNotice('error', message);
        throw error instanceof Error ? error : new Error(message);
      }
    },
    [applySnapshot, showAdminNotice]
  );

  const handleSelectGraph = useCallback((graphId: string) => {
    setGraphActionStatus(null);
    setIsCreatePanelOpen(false);
    setActiveGraphId(graphId);
  }, []);

  const handleSubmitCreateGraph = useCallback(async () => {
    if (isGraphActionInProgress) {
      return;
    }

    const trimmedName = graphNameDraft.trim();
    if (!trimmedName) {
      setGraphActionStatus({ type: 'error', message: 'Введите название графа.' });
      return;
    }

    const normalizedName = trimmedName.toLowerCase();
    const hasDuplicate = graphs.some(
      (graph) => graph.name.trim().toLowerCase() === normalizedName
    );
    if (hasDuplicate) {
      setGraphActionStatus({ type: 'error', message: 'Граф с таким названием уже существует.' });
      return;
    }

    const includeDomains = graphCopyOptions.has('domains');
    const includeModules = graphCopyOptions.has('modules');
    const includeArtifacts = graphCopyOptions.has('artifacts');

    if (graphSourceIdDraft && !includeDomains && !includeModules && !includeArtifacts) {
      setGraphActionStatus({
        type: 'error',
        message: 'Выберите хотя бы один тип данных для копирования из выбранного графа.'
      });
      return;
    }

    setIsGraphActionInProgress(true);
    try {
      const created = await createGraphRequest({
        name: trimmedName,
        sourceGraphId: graphSourceIdDraft ?? undefined,
        includeDomains,
        includeModules,
        includeArtifacts
      });
      setGraphActionStatus({
        type: 'success',
        message: `Граф «${created.name}» создан.`
      });
      setGraphNameDraft('');
      setGraphSourceIdDraft(null);
      setGraphCopyOptions(new Set(['domains', 'modules', 'artifacts']));
      setIsCreatePanelOpen(false);
      await refreshGraphs(created.id, { preserveSelection: false });
      showAdminNotice('success', `Граф «${created.name}» создан.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось создать граф.';
      setGraphActionStatus({ type: 'error', message });
    } finally {
      setIsGraphActionInProgress(false);
    }
  }, [
    graphNameDraft,
    graphSourceIdDraft,
    graphCopyOptions,
    isGraphActionInProgress,
    refreshGraphs,
    showAdminNotice,
    graphs
  ]);

  const handleDeleteGraph = useCallback(
    async (graphId: string) => {
      if (isGraphActionInProgress) {
        return;
      }

      const target = graphs.find((graph) => graph.id === graphId);
      if (!target) {
        return;
      }

      if (target.isDefault) {
        setGraphActionStatus({ type: 'error', message: 'Основной граф нельзя удалить.' });
        return;
      }

      const confirmed =
        typeof window !== 'undefined'
          ? window.confirm(`Удалить граф «${target.name}» без возможности восстановления?`)
          : true;

      if (!confirmed) {
        return;
      }

      setIsGraphActionInProgress(true);
      setGraphActionStatus(null);
      try {
        await deleteGraphRequest(graphId);
        await refreshGraphs(null, { preserveSelection: true });
        setGraphActionStatus({ type: 'success', message: `Граф «${target.name}» удалён.` });
        showAdminNotice('success', `Граф «${target.name}» удалён.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Не удалось удалить граф.';
        setGraphActionStatus({ type: 'error', message });
      } finally {
        setIsGraphActionInProgress(false);
      }
    },
    [graphs, isGraphActionInProgress, refreshGraphs, showAdminNotice]
  );

  const shouldShowInitialLoader =
    (isGraphsLoading && graphs.length === 0) ||
    (isSnapshotLoading && !hasLoadedSnapshotRef.current);

  if (shouldShowInitialLoader) {
    return (
      <Layout className={styles.app} direction="column">
        <div className={styles.loadingState}>
          <Loader size="m" />
          <Text size="s" view="secondary">
            Загружаем доступные графы и их содержимое...
          </Text>
        </div>
      </Layout>
    );
  }

  const activeViewTab = viewTabs.find((tab) => tab.value === viewMode) ?? viewTabs[0];
  const isGraphActive = viewMode === 'graph';
  const isStatsActive = viewMode === 'stats';
  const isAdminActive = viewMode === 'admin';

  const headerTitle = (() => {
    if (isGraphActive) {
      return 'Граф модулей и доменных областей';
    }
    if (isStatsActive) {
      return 'Статистика экосистемы решений';
    }
    return 'Панель администрирования экосистемы';
  })();

  const headerDescription = (() => {
    if (isGraphActive) {
      return 'Выберите домены, чтобы увидеть связанные модули и выявить пересечения.';
    }
    if (isStatsActive) {
      return 'Обзор ключевых метрик по системам, модулям и обмену данными для планирования развития.';
    }
    return 'Управляйте данными графа: обновляйте карточки модулей, доменов и артефактов, а также удаляйте устаревшие связи.';
  })();

  const deleteGraphDisabled =
    !activeGraph || activeGraph.isDefault || isGraphActionInProgress || isGraphsLoading;

  const createButtonLabel = isCreatePanelOpen ? 'Отменить создание' : 'Создать граф';

  return (
    <Layout className={styles.app} direction="column">
      {snapshotError && (
        <div className={styles.errorBanner} role="status" aria-live="polite">
          <div className={styles.errorBannerContent}>
            <Text size="s" view="alert">
              {snapshotError}
            </Text>
            <Button
              size="xs"
              view="secondary"
              label={isReloadingSnapshot ? 'Повторяем попытку...' : 'Повторить попытку'}
              loading={isReloadingSnapshot}
              disabled={isReloadingSnapshot}
              onClick={() => {
                void loadSnapshot({ withOverlay: false });
              }}
            />
          </div>
        </div>
      )}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Text size="2xl" weight="bold">
            {headerTitle}
          </Text>
          <Text size="s" view="secondary">
            {headerDescription}
          </Text>
          <div className={styles.graphSelector}>
            <div className={styles.graphSelectorHeading}>
              <Text size="xs" weight="semibold">
                Текущий граф
              </Text>
              {activeGraph?.updatedAt && (
                <Text size="xs" view="secondary">
                  Обновлено: {new Date(activeGraph.updatedAt).toLocaleString()}
                </Text>
              )}
            </div>
            <div className={styles.graphSelectorControls}>
              <Select<{ label: string; value: string }>
                size="s"
                items={graphSelectOptions}
                value={graphSelectValue}
                placeholder={isGraphsLoading ? 'Загрузка графов...' : 'Выберите граф'}
                disabled={graphSelectOptions.length === 0 || isGraphsLoading}
                getItemLabel={(item) => item.label}
                getItemKey={(item) => item.value}
                onChange={(option) => {
                  if (option) {
                    handleSelectGraph(option.value);
                  }
                }}
              />
              {activeGraphBadge && (
                <Badge
                  className={styles.graphBadge}
                  size="s"
                  view="filled"
                  status={activeGraphBadge.status}
                  label={activeGraphBadge.label}
                />
              )}
              <Button
                size="s"
                view="secondary"
                label={createButtonLabel}
                onClick={() => {
                  setIsCreatePanelOpen((prev) => !prev);
                  setGraphActionStatus(null);
                }}
                disabled={isGraphsLoading}
              />
              <Button
                size="s"
                view="ghost"
                label="Удалить граф"
                onClick={() => {
                  if (activeGraphId) {
                    void handleDeleteGraph(activeGraphId);
                  }
                }}
                disabled={deleteGraphDisabled}
              />
            </div>
            {graphListError && (
              <Text size="xs" view="alert">
                {graphListError}
              </Text>
            )}
            {!isCreatePanelOpen && graphActionStatus && (
              <Text
                size="xs"
                view={graphActionStatus.type === 'error' ? 'alert' : 'success'}
              >
                {graphActionStatus.message}
              </Text>
            )}
          </div>
          {isCreatePanelOpen && (
            <div className={styles.graphCreatePanel}>
              <div className={styles.graphCreateRow}>
                <TextField
                  size="s"
                  label="Название графа"
                  placeholder="Например, Экспериментальный"
                  value={graphNameDraft}
                  disabled={isGraphActionInProgress}
                  onChange={(value) => setGraphNameDraft(value ?? '')}
                />
                <Select<{ label: string; value: string }>
                  size="s"
                  items={graphSelectOptions}
                  value={graphSourceSelectValue}
                  getItemLabel={(item) => item.label}
                  getItemKey={(item) => item.value}
                  placeholder="Без копирования"
                  disabled={isGraphActionInProgress || graphSelectOptions.length <= 1}
                  onChange={(option) => {
                    setGraphSourceIdDraft(option?.value ?? null);
                  }}
                  style={{ minWidth: 220 }}
                />
              </div>
              <div className={styles.graphCopyOptions}>
                <CheckboxGroup
                  size="s"
                  direction="row"
                  items={graphCopyOptionItems}
                  value={selectedGraphCopyOptionItems}
                  getItemKey={(item) => item.id}
                  getItemLabel={(item) => item.label}
                  onChange={(items) => {
                    setGraphCopyOptions(new Set((items ?? []).map((item) => item.id)));
                  }}
                  disabled={!graphSourceIdDraft || isGraphActionInProgress}
                />
                {graphSourceIdDraft && sourceGraphDraft && (
                  <Badge
                    className={styles.graphSourceBadge}
                    size="xs"
                    view="filled"
                    status={sourceGraphDraft.isDefault ? 'success' : 'system'}
                    label={
                      sourceGraphDraft.isDefault
                        ? `Источник: ${sourceGraphDraft.name} • основной`
                        : `Источник: ${sourceGraphDraft.name}`
                    }
                  />
                )}
                <Text size="xs" view="secondary">
                  {graphSourceIdDraft
                    ? 'Выберите, какие данные скопировать из выбранного графа.'
                    : 'Если источник не выбран, граф создаётся пустым.'}
                </Text>
              </div>
              <div className={styles.graphCreateActions}>
                <Button
                  size="s"
                  label="Создать граф"
                  onClick={() => {
                    void handleSubmitCreateGraph();
                  }}
                  loading={isGraphActionInProgress}
                  disabled={isGraphActionInProgress}
                />
                <Button
                  size="s"
                  view="ghost"
                  label="Отмена"
                  onClick={() => {
                    setIsCreatePanelOpen(false);
                    setGraphActionStatus(null);
                  }}
                  disabled={isGraphActionInProgress}
                />
              </div>
              {graphActionStatus && (
                <Text
                  size="xs"
                  view={graphActionStatus.type === 'error' ? 'alert' : 'success'}
                >
                  {graphActionStatus.message}
                </Text>
              )}
            </div>
          )}
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
      {adminNotice && (
        <div
          key={adminNotice.id}
          className={`${styles.noticeBanner} ${
            adminNotice.type === 'success' ? styles.noticeSuccess : styles.noticeError
          }`}
          role={adminNotice.type === 'error' ? 'alert' : 'status'}
          aria-live={adminNotice.type === 'error' ? 'assertive' : 'polite'}
        >
          <Text
            size="s"
            view={adminNotice.type === 'error' ? 'alert' : 'success'}
            className={
              adminNotice.type === 'success' ? styles.noticeSuccessMessage : undefined
            }
          >
            {adminNotice.message}
          </Text>
          <Button size="xs" view="ghost" label="Скрыть" onClick={dismissAdminNotice} />
        </div>
      )}
      <main
        className={styles.main}
        hidden={!isGraphActive}
        aria-hidden={!isGraphActive}
        style={{ display: isGraphActive ? undefined : 'none' }}
      >
          <aside className={styles.sidebar}>
            <div className={styles.sidebarScrollArea}>
              <Text size="s" weight="semibold" className={styles.sidebarTitle}>
                Домены
              </Text>
              <DomainTree
                tree={domainData}
                selected={selectedDomains}
                onToggle={handleDomainToggle}
                descendants={domainDescendants}
              />
              <Collapse
                label={
                  <Text size="s" weight="semibold">
                    Фильтры
                  </Text>
                }
                isOpen={areFiltersOpen}
                onClick={() => setAreFiltersOpen((prev) => !prev)}
                className={styles.filtersCollapse}
              >
                <div className={styles.filtersCollapseContent}>
                  {areFiltersOpen ? (
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
                      companies={companies}
                      companyFilter={companyFilter}
                      onCompanyChange={(nextCompany) => {
                        setSelectedNode(null);
                        setCompanyFilter(nextCompany);
                      }}
                      showAllConnections={showAllConnections}
                      onToggleConnections={(value) => setShowAllConnections(value)}
                    />
                  ) : null}
                </div>
              </Collapse>
            </div>
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
                layoutPositions={layoutPositions}
                onLayoutChange={handleLayoutChange}
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
        hidden={!isAdminActive}
        aria-hidden={!isAdminActive}
        style={{ display: isAdminActive ? undefined : 'none' }}
      >
        <GraphPersistenceControls
          modules={moduleData}
          domains={domainData}
          artifacts={artifactData}
          onImport={handleImportGraph}
          onImportFromGraph={handleImportFromExistingGraph}
          graphs={graphs}
          activeGraphId={activeGraphId}
          isGraphListLoading={isGraphsLoading}
          syncStatus={syncStatus}
          layout={layoutSnapshot}
        />
        <AdminPanel
          modules={moduleData}
          domains={domainData}
          artifacts={artifactData}
          onCreateModule={handleCreateModule}
          onUpdateModule={handleUpdateModule}
          onDeleteModule={handleDeleteModule}
          onCreateDomain={handleCreateDomain}
          onUpdateDomain={handleUpdateDomain}
          onDeleteDomain={handleDeleteDomain}
          onCreateArtifact={handleCreateArtifact}
          onUpdateArtifact={handleUpdateArtifact}
          onDeleteArtifact={handleDeleteArtifact}
        />
      </main>
    </Layout>
  );
}

type ModuleBuildResult = {
  module: ModuleNode;
  consumedArtifactIds: string[];
};

function buildModuleFromDraft(
  moduleId: string,
  draft: ModuleDraftPayload,
  fallbackDomains: string[],
  allowedDomainIds: Set<string>,
  options: { fallbackName: string; currentProduces?: string[] }
): ModuleBuildResult | null {
  const normalizedName = draft.name.trim() || options.fallbackName;
  const normalizedDescription = draft.description.trim() || 'Описание не заполнено';
  const normalizedProduct = draft.productName.trim() || 'Новый продукт';
  const normalizedCreatorCompany =
    draft.creatorCompany.trim() || 'Компания создатель не указана';

  const uniqueDomains = deduplicateNonEmpty(draft.domainIds).filter((id) => allowedDomainIds.has(id));
  const fallbackCandidates = deduplicateNonEmpty(fallbackDomains).filter((id) => allowedDomainIds.has(id));
  const resolvedDomains = uniqueDomains.length > 0 ? uniqueDomains : fallbackCandidates;
  if (resolvedDomains.length === 0) {
    return null;
  }

  const dependencies = deduplicateNonEmpty(draft.dependencyIds).filter((id) => id !== moduleId);
  const produces = deduplicateNonEmpty(options.currentProduces ?? []);

  const preparedInputs = (draft.dataIn.length > 0 ? draft.dataIn : [{ id: '', label: '', sourceId: undefined }]).map((input, index) => ({
    id: input.id?.trim() || `input-${index + 1}`,
    label: input.label.trim() || `Вход ${index + 1}`,
    sourceId: input.sourceId?.trim() || undefined
  }));
  const consumedArtifactIds = deduplicateNonEmpty(preparedInputs.map((input) => input.sourceId ?? null));

  const preparedOutputs = (draft.dataOut.length > 0 ? draft.dataOut : [{ id: '', label: '', consumerIds: [] }]).map((output, index) => ({
    id: output.id?.trim() || `output-${index + 1}`,
    label: output.label.trim() || `Выход ${index + 1}`,
    consumerIds: deduplicateNonEmpty(output.consumerIds ?? [])
  }));

  const technologyStack = deduplicateNonEmpty(draft.technologyStack.map((item) => item.trim())).filter(Boolean);

  const preparedTeam = (draft.projectTeam.length > 0 ? draft.projectTeam : [{ id: '', fullName: '', role: 'Аналитик' }]).map((member, index) => ({
    id: member.id?.trim() || `member-${index + 1}`,
    fullName: member.fullName.trim() || `Участник ${index + 1}`,
    role: member.role
  }));

  const libraries = draft.libraries
    .map((library) => ({ name: library.name.trim(), version: library.version.trim() }))
    .filter((library) => library.name || library.version)
    .map((library) => ({
      name: library.name || 'Не указано',
      version: library.version || '—'
    }));

  const ridOwnerCompany = draft.ridOwner.company.trim() || 'Не указано';
  const ridOwnerDivision = draft.ridOwner.division.trim() || 'Не указано';

  const localization = draft.localization.trim() || 'ru';

  const normalizedCompanies = draft.userStats.companies
    .map((company) => {
      const name = company.name?.trim() ?? '';
      const licenses = Math.max(
        0,
        Math.trunc(typeof company.licenses === 'number' ? company.licenses : 0)
      );
      if (!name) {
        return null;
      }
      return { name, licenses };
    })
    .filter((company): company is { name: string; licenses: number } => company !== null);

  const mergedCompanies = new Map<string, number>();
  normalizedCompanies.forEach((company) => {
    mergedCompanies.set(company.name, (mergedCompanies.get(company.name) ?? 0) + company.licenses);
  });

  const userStats = {
    companies: Array.from(mergedCompanies.entries())
      .map(([name, licenses]) => ({ name, licenses }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  };

  const reuseScore = clampNumber(draft.reuseScore ?? 0, 0, 100);
  const metrics: ModuleMetrics = {
    coverage: clampNumber(draft.metrics.coverage ?? 0, 0, 100),
    tests: Math.max(0, draft.metrics.tests ?? 0),
    automationRate: clampNumber(draft.metrics.automationRate ?? 0, 0, 100)
  };

  const nonFunctional: NonFunctionalRequirements = {
    responseTimeMs: Math.max(0, draft.nonFunctional.responseTimeMs ?? 0),
    throughputRps: Math.max(0, draft.nonFunctional.throughputRps ?? 0),
    resourceConsumption: draft.nonFunctional.resourceConsumption.trim() || '—',
    baselineUsers: Math.max(0, draft.nonFunctional.baselineUsers ?? 0)
  };

  const module: ModuleNode = {
    id: moduleId,
    name: normalizedName,
    description: normalizedDescription,
    domains: resolvedDomains,
    creatorCompany: normalizedCreatorCompany,
    productName: normalizedProduct,
    projectTeam: preparedTeam,
    technologyStack,
    localization,
    ridOwner: { company: ridOwnerCompany, division: ridOwnerDivision },
    userStats,
    status: draft.status,
    repository: draft.repository?.trim() || undefined,
    api: draft.api?.trim() || undefined,
    specificationUrl: draft.specificationUrl.trim() || '#',
    apiContractsUrl: draft.apiContractsUrl.trim() || '#',
    techDesignUrl: draft.techDesignUrl.trim() || '#',
    architectureDiagramUrl: draft.architectureDiagramUrl.trim() || '#',
    licenseServerIntegrated: draft.licenseServerIntegrated,
    libraries,
    clientType: draft.clientType,
    deploymentTool: draft.deploymentTool,
    dependencies,
    produces,
    reuseScore,
    metrics,
    dataIn: preparedInputs,
    dataOut: preparedOutputs,
    formula: draft.formula.trim(),
    nonFunctional
  };

  return { module, consumedArtifactIds };
}

function recalculateReuseScores(modules: ModuleNode[]): ModuleNode[] {
  if (modules.length === 0) {
    return modules;
  }

  const integrationMap = buildModuleIntegrationMap(modules);
  const denominator = Math.max(1, modules.length - 1);

  return modules.map((module) => {
    const connections = integrationMap.get(module.id);
    const score = connections ? Math.min(1, connections.size / denominator) : 0;
    return { ...module, reuseScore: score };
  });
}

function buildModuleIntegrationMap(modules: ModuleNode[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();

  modules.forEach((module) => {
    map.set(module.id, new Set());
  });

  modules.forEach((module) => {
    module.dependencies.forEach((dependencyId) => {
      if (!map.has(dependencyId) || dependencyId === module.id) {
        return;
      }
      map.get(module.id)?.add(dependencyId);
      map.get(dependencyId)?.add(module.id);
    });

    module.dataOut.forEach((output) => {
      (output.consumerIds ?? []).forEach((consumerId) => {
        if (!map.has(consumerId) || consumerId === module.id) {
          return;
        }
        map.get(module.id)?.add(consumerId);
        map.get(consumerId)?.add(module.id);
      });
    });
  });

  return map;
}

function clampNumber(value: number, min: number, max: number): number {
  const normalized = Number.isFinite(value) ? value : min;
  if (normalized < min) {
    return min;
  }
  if (normalized > max) {
    return max;
  }
  return normalized;
}

function buildCompanyList(modules: ModuleNode[]): string[] {
  const names = new Set<string>();

  modules.forEach((module) => {
    module.userStats.companies.forEach((company) => {
      const normalized = company.name.trim();
      if (normalized) {
        names.add(normalized);
      }
    });
  });

  return Array.from(names).sort((a, b) => a.localeCompare(b, 'ru'));
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

function mergeLayoutPositions(
  prev: Record<string, GraphLayoutNodePosition>,
  next: Record<string, GraphLayoutNodePosition>
): Record<string, GraphLayoutNodePosition> {
  const merged: Record<string, GraphLayoutNodePosition> = { ...prev };

  Object.entries(next).forEach(([id, position]) => {
    const existing = merged[id];
    if (!existing || !layoutPositionsEqual(existing, position)) {
      merged[id] = position;
    }
  });

  return merged;
}

function pruneLayoutPositions(
  positions: Record<string, GraphLayoutNodePosition>,
  activeIds: Set<string>
): Record<string, GraphLayoutNodePosition> {
  const result: Record<string, GraphLayoutNodePosition> = {};

  Object.entries(positions).forEach(([id, position]) => {
    if (activeIds.has(id)) {
      result[id] = position;
    }
  });

  return result;
}

function layoutsEqual(
  prev: Record<string, GraphLayoutNodePosition>,
  next: Record<string, GraphLayoutNodePosition>
): boolean {
  const prevKeys = Object.keys(prev);
  const nextKeys = Object.keys(next);

  if (prevKeys.length !== nextKeys.length) {
    return false;
  }

  return prevKeys.every((key) => {
    const prevPosition = prev[key];
    const nextPosition = next[key];

    if (!nextPosition) {
      return false;
    }

    return layoutPositionsEqual(prevPosition, nextPosition);
  });
}

function layoutPositionsEqual(
  prev: GraphLayoutNodePosition,
  next: GraphLayoutNodePosition
): boolean {
  if (prev.x !== next.x || prev.y !== next.y) {
    return false;
  }

  const prevFx = prev.fx ?? null;
  const nextFx = next.fx ?? null;
  if (prevFx !== nextFx) {
    return false;
  }

  const prevFy = prev.fy ?? null;
  const nextFy = next.fy ?? null;
  return prevFy === nextFy;
}

function resolveInitialModulePosition(
  positions: Record<string, GraphLayoutNodePosition>,
  anchorIds: string[]
): GraphLayoutNodePosition | null {
  const anchors = anchorIds
    .map((id) => positions[id])
    .filter((position): position is GraphLayoutNodePosition => Boolean(position));
  const fallbackEntries = Object.values(positions);

  const anchorValues = extractAxisValues(anchors);
  const fallbackValues = extractAxisValues(fallbackEntries);

  const xValues = anchorValues.x.length > 0 ? anchorValues.x : fallbackValues.x;
  const yValues = anchorValues.y.length > 0 ? anchorValues.y : fallbackValues.y;

  if (xValues.length === 0 || yValues.length === 0) {
    return { x: 0, y: 0 };
  }

  const anchorAverageX = anchorValues.x.length > 0
    ? anchorValues.x.reduce((sum, value) => sum + value, 0) / anchorValues.x.length
    : Math.max(...xValues);
  const averageY = yValues.reduce((sum, value) => sum + value, 0) / yValues.length;

  const horizontalOffset = anchorValues.x.length > 0 ? 80 : 140;
  const jitterSeed = Object.keys(positions).length;
  const verticalJitter = ((jitterSeed % 5) - 2) * 45;

  return {
    x: roundCoordinate(anchorAverageX + horizontalOffset),
    y: roundCoordinate(averageY + verticalJitter)
  };
}

function extractAxisValues(positions: GraphLayoutNodePosition[]): {
  x: number[];
  y: number[];
} {
  const x = positions
    .map((position) => getAxisCoordinate(position, 'x'))
    .filter((value): value is number => value !== null);
  const y = positions
    .map((position) => getAxisCoordinate(position, 'y'))
    .filter((value): value is number => value !== null);

  return { x, y };
}

function getAxisCoordinate(
  position: GraphLayoutNodePosition,
  axis: 'x' | 'y'
): number | null {
  const fixed = axis === 'x' ? position.fx : position.fy;
  if (typeof fixed === 'number' && Number.isFinite(fixed)) {
    return fixed;
  }

  const fallback = axis === 'x' ? position.x : position.y;
  if (typeof fallback === 'number' && Number.isFinite(fallback)) {
    return fallback;
  }

  return null;
}

function roundCoordinate(value: number): number {
  return Number(value.toFixed(2));
}

function collectSearchableValues(value: unknown, target: string[]): void {
  if (value === null || value === undefined) {
    return;
  }

  if (typeof value === 'string') {
    target.push(value);
    return;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    target.push(String(value));
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectSearchableValues(item, target));
    return;
  }

  if (typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach((item) => {
      collectSearchableValues(item, target);
    });
  }
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

function removeDomainFromTree(
  domains: DomainNode[],
  targetId: string,
  parentId: string | null = null
): [DomainNode[], DomainNode | null, string | null] {
  let removed: DomainNode | null = null;
  let removedParent: string | null = null;

  const next = domains
    .map((domain) => {
      if (domain.id === targetId) {
        removed = domain;
        removedParent = parentId;
        return null;
      }

      if (domain.children) {
        const [children, childRemoved, childParent] = removeDomainFromTree(domain.children, targetId, domain.id);
        if (childRemoved) {
          removed = childRemoved;
          removedParent = childParent;
          return { ...domain, children };
        }
      }

      return domain;
    })
    .filter((domain): domain is DomainNode => Boolean(domain));

  return [next, removed, removedParent];
}

function collectDomainIds(domain: DomainNode): string[] {
  const children = domain.children ?? [];
  return [domain.id, ...children.flatMap((child) => collectDomainIds(child))];
}

function buildModuleLinks(
  modules: ModuleNode[],
  artifacts: ArtifactNode[],
  allowedDomainIds: Set<string>
): GraphLink[] {
  const artifactMap = new Map<string, ArtifactNode>();
  artifacts.forEach((artifact) => artifactMap.set(artifact.id, artifact));

  return modules.flatMap((module) => {
    const domainLinks: GraphLink[] = module.domains
      .filter((domainId) => allowedDomainIds.has(domainId))
      .map((domainId) => ({
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
