import { Layout } from '@consta/uikit/Layout';
import { Text } from '@consta/uikit/Text';
import { useMemo, useState } from 'react';
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
  type ModuleStatus
} from './data';
import styles from './App.module.css';

const allStatuses: ModuleStatus[] = ['production', 'in-dev', 'deprecated'];

function App() {
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [statusFilters, setStatusFilters] = useState<Set<ModuleStatus>>(new Set(allStatuses));
  const [teamFilter, setTeamFilter] = useState<string | null>(null);
  const [showDependencies, setShowDependencies] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const highlightedDomainId = selectedNode?.type === 'domain' ? selectedNode.id : null;

  const teams = useMemo(() => Array.from(new Set(modules.map((module) => module.team))).sort(), []);

  const domainDescendants = useMemo(() => buildDomainDescendants(domainTree), []);

  const filteredModules = useMemo(() => {
    return modules.filter((module) => {
      const matchesDomain =
        selectedDomains.size === 0 || module.domains.some((domain) => selectedDomains.has(domain));
      const matchesSearch =
        search.trim().length === 0 ||
        module.name.toLowerCase().includes(search.toLowerCase()) ||
        module.owner.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilters.has(module.status);
      const matchesTeam = teamFilter ? module.team === teamFilter : true;
      return matchesDomain && matchesSearch && matchesStatus && matchesTeam;
    });
  }, [selectedDomains, search, statusFilters, teamFilter]);

  const graphModules = useMemo(() => {
    if (selectedNode?.type !== 'module') {
      return filteredModules;
    }

    if (filteredModules.some((module) => module.id === selectedNode.id)) {
      return filteredModules;
    }

    const fallback = moduleById[selectedNode.id];
    return fallback ? [...filteredModules, fallback] : filteredModules;
  }, [filteredModules, selectedNode]);

  const filteredLinks = useMemo(() => {
    const moduleIds = new Set(graphModules.map((module) => module.id));
    return moduleLinks.filter((link) => {
      if (!moduleIds.has(link.source as string) && !moduleIds.has(link.target as string)) {
        return false;
      }
      if (!showDependencies && link.type === 'dependency') {
        return false;
      }
      return true;
    });
  }, [graphModules, showDependencies]);

  const relevantDomainIds = useMemo(() => {
    const ids = new Set<string>();
    graphModules.forEach((module) => {
      module.domains.forEach((domainId) => ids.add(domainId));
    });
    if (highlightedDomainId) {
      ids.add(highlightedDomainId);
    }
    return ids;
  }, [graphModules, highlightedDomainId]);

  const artifactMap = useMemo(() => new Map(artifacts.map((artifact) => [artifact.id, artifact])), []);
  const domainMap = useMemo(() => new Map(flattenDomainTree(domainTree).map((domain) => [domain.id, domain])), []);

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

  const ensureDomainsVisible = (domainIds: string[]) => {
    setSelectedDomains((prev) => {
      const next = new Set(prev);
      let changed = false;
      domainIds.forEach((domainId) => {
        if (!next.has(domainId)) {
          changed = true;
          next.add(domainId);
        }
      });
      return changed ? next : prev;
    });
  };

  const handleSelectNode = (node: GraphNode | null) => {
    if (node?.type === 'module') {
      ensureDomainsVisible(node.domains);
    }

    if (node?.type === 'artifact') {
      ensureDomainsVisible([node.domainId]);
    }

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

  const handleNavigate = (nodeId: string) => {
    if (moduleById[nodeId]) {
      const module = moduleById[nodeId];
      ensureDomainsVisible(module.domains);
      setSelectedNode({ ...module, type: 'module' });
      return;
    }

    const artifact = artifactMap.get(nodeId);
    if (artifact) {
      ensureDomainsVisible([artifact.domainId]);
      setSelectedNode({ ...artifact, type: 'artifact', reuseScore: 0 });
      return;
    }

    const domain = domainMap.get(nodeId);
    if (domain) {
      setSelectedNode({ ...domain, type: 'domain' });
    }
  };

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
              domains={domainTree}
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

export default App;
