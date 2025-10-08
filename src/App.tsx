import { Layout } from '@consta/uikit/Layout';
import { Text } from '@consta/uikit/Text';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AnalyticsPanel from './components/AnalyticsPanel';
import DomainTree from './components/DomainTree';
import FiltersPanel from './components/FiltersPanel';
import GraphView, { type GraphNode } from './components/GraphView';
import NodeDetails from './components/NodeDetails';
import {
  artifacts,
  domainTree,
  moduleById,
  moduleLinks,
  modules,
  type DomainNode,
  type ModuleNode,
  type ModuleStatus
} from './data';
import styles from './App.module.css';

const allStatuses: ModuleStatus[] = ['production', 'in-dev', 'deprecated'];

function App() {
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [statusFilters, setStatusFilters] = useState<Set<ModuleStatus>>(new Set(allStatuses));
  const [teamFilter, setTeamFilter] = useState<string[]>([]);
  const [showDependencies, setShowDependencies] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const highlightedDomainId = selectedNode?.type === 'domain' ? selectedNode.id : null;

  const teams = useMemo(() => Array.from(new Set(modules.map((module) => module.team))).sort(), []);

  const domainDescendants = useMemo(() => buildDomainDescendants(domainTree), []);
  const domainAncestors = useMemo(() => buildDomainAncestors(domainTree), []);

  const moduleDependents = useMemo(() => {
    const dependents = new Map<string, Set<string>>();

    modules.forEach((module) => {
      module.dependencies.forEach((dependencyId) => {
        if (!dependents.has(dependencyId)) {
          dependents.set(dependencyId, new Set());
        }
        dependents.get(dependencyId)!.add(module.id);
      });
    });

    artifacts.forEach((artifact) => {
      if (!dependents.has(artifact.producedBy)) {
        dependents.set(artifact.producedBy, new Set());
      }
      const entry = dependents.get(artifact.producedBy)!;
      artifact.consumerIds.forEach((consumerId) => {
        entry.add(consumerId);
      });
    });

    return dependents;
  }, []);

  const matchesModuleFilters = useCallback(
    (module: ModuleNode) => {
      const matchesDomain =
        selectedDomains.size > 0 && module.domains.some((domain) => selectedDomains.has(domain));
      const normalizedSearch = search.trim().toLowerCase();
      const matchesSearch =
        normalizedSearch.length === 0 ||
        module.name.toLowerCase().includes(normalizedSearch) ||
        module.owner.toLowerCase().includes(normalizedSearch);
      const matchesStatus = statusFilters.has(module.status);
      const matchesTeam =
        teamFilter.length > 0 ? teamFilter.includes(module.team) : true;
      return matchesDomain && matchesSearch && matchesStatus && matchesTeam;
    },
    [search, selectedDomains, statusFilters, teamFilter]
  );

  const filteredModules = useMemo(
    () => modules.filter((module) => matchesModuleFilters(module)),
    [matchesModuleFilters]
  );

  const artifactMap = useMemo(() => new Map(artifacts.map((artifact) => [artifact.id, artifact])), []);
  const domainMap = useMemo(
    () => new Map(flattenDomainTree(domainTree).map((domain) => [domain.id, domain])),
    []
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
      modules.forEach((module) => {
        if (module.domains.includes(selectedNode.id)) {
          ids.add(module.id);
        }
      });
    }

    return ids;
  }, [selectedNode, moduleDependents, artifactMap]);

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
    () => filterDomainTreeByIds(domainTree, relevantDomainIds),
    [relevantDomainIds]
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

    let scopedArtifacts = artifacts.filter(
      (artifact) =>
        relevantArtifactIds.has(artifact.id) ||
        moduleIds.has(artifact.producedBy) ||
        artifact.consumerIds.some((consumerId) => moduleIds.has(consumerId))
    );

    if (selectedNode?.type === 'artifact' && !scopedArtifacts.some((artifact) => artifact.id === selectedNode.id)) {
      const fallback = artifacts.find((artifact) => artifact.id === selectedNode.id);
      if (fallback) {
        scopedArtifacts = [...scopedArtifacts, fallback];
      }
    }

    return scopedArtifacts;
  }, [graphModules, selectedNode]);

  const filteredLinks = useMemo(() => {
    const moduleIds = new Set(graphModules.map((module) => module.id));
    const artifactIds = new Set(graphArtifacts.map((artifact) => artifact.id));
    const domainIds = relevantDomainIds.size > 0 ? relevantDomainIds : null;

    return moduleLinks.filter((link) => {
      const sourceId = getLinkEndpointId(link.source);
      const targetId = getLinkEndpointId(link.target);

      if (!showDependencies && link.type === 'dependency') {
        return false;
      }

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
        return artifactIds.has(sourceId) && moduleIds.has(targetId);
      }

      return false;
    });
  }, [graphModules, graphArtifacts, relevantDomainIds, showDependencies]);

  useEffect(() => {
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      const moduleIds = new Set(graphModules.map((module) => module.id));
      const artifactIds = new Set(graphArtifacts.map((artifact) => artifact.id));
      const domainIds = relevantDomainIds.size > 0 ? relevantDomainIds : null;

      const recomputedLinks = moduleLinks.filter((link) => {
        const sourceId = getLinkEndpointId(link.source);
        const targetId = getLinkEndpointId(link.target);

        if (!showDependencies && link.type === 'dependency') {
          return false;
        }

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
          return artifactIds.has(sourceId) && moduleIds.has(targetId);
        }

        return false;
      });

      const excludedLinks = moduleLinks
        .filter((link) => !recomputedLinks.includes(link))
        .map((link) => {
          const sourceId = getLinkEndpointId(link.source);
          const targetId = getLinkEndpointId(link.target);
          let reason = 'filtered';
          if (!showDependencies && link.type === 'dependency') {
            reason = 'hidden dependency toggle';
          } else if (link.type === 'dependency') {
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
            reason = `consumes source=${artifactIds.has(sourceId)} target=${moduleIds.has(targetId)}`;
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
    relevantDomainIds,
    selectedDomains,
    showDependencies
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
    [artifactMap, domainMap, moduleDependents]
  );

  useEffect(() => {
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      (window as typeof window & { __selectGraphNode?: (id: string) => void }).__selectGraphNode = (nodeId: string) => {
        handleNavigate(nodeId);
      };
    }
  }, [handleNavigate]);

  return (
    <Layout className={styles.app} direction="column">
      <header className={styles.header}>
        <div>
          <Text size="2xl" weight="bold">
            Граф модулей и доменных областей
          </Text>
          <Text size="s" view="secondary">
            Выберите домены, чтобы увидеть связанные модули и выявить пересечения.
          </Text>
        </div>
      </header>
      <main className={styles.main}>
        <aside className={styles.sidebar}>
          <Text size="s" weight="semibold" className={styles.sidebarTitle}>
            Домены
          </Text>
          <DomainTree tree={domainTree} selected={selectedDomains} onToggle={handleDomainToggle} descendants={domainDescendants} />
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
            teams={teams}
            teamFilter={teamFilter}
            onTeamChange={(team) => {
              setSelectedNode(null);
              setTeamFilter(team);
            }}
            showDependencies={showDependencies}
            onToggleDependencies={(value) => setShowDependencies(value)}
          />
        </aside>
        <section className={styles.graphSection}>
          <div className={styles.graphContainer}>
            <GraphView
              modules={graphModules}
              domains={graphDomains}
              artifacts={graphArtifacts}
              links={filteredLinks}
              showDependencies={showDependencies}
              onSelect={handleSelectNode}
              highlightedNode={selectedNode?.id ?? null}
              visibleDomainIds={relevantDomainIds}
            />
          </div>
          <div className={styles.analytics}>
            <AnalyticsPanel modules={filteredModules} />
          </div>
        </section>
        <aside className={styles.details}>
          <NodeDetails node={selectedNode} onClose={() => setSelectedNode(null)} onNavigate={handleNavigate} />
        </aside>
      </main>
    </Layout>
  );
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
