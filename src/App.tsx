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

  const filteredModules = useMemo(() => {
    return modules.filter((module) => {
      const matchesDomain = module.domains.some((domain) => selectedDomains.size === 0 || selectedDomains.has(domain));
      const matchesSearch =
        search.trim().length === 0 ||
        module.name.toLowerCase().includes(search.toLowerCase()) ||
        module.owner.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilters.has(module.status);
      const matchesTeam = teamFilter ? module.team === teamFilter : true;
      return matchesDomain && matchesSearch && matchesStatus && matchesTeam;
    });
  }, [selectedDomains, search, statusFilters, teamFilter]);

  const filteredLinks = useMemo(() => {
    const moduleIds = new Set(filteredModules.map((module) => module.id));
    return moduleLinks.filter((link) => {
      if (!moduleIds.has(link.source as string) && !moduleIds.has(link.target as string)) {
        return false;
      }
      if (!showDependencies && link.type === 'dependency') {
        return false;
      }
      return true;
    });
  }, [filteredModules, showDependencies]);

  const relevantDomainIds = useMemo(() => {
    const ids = new Set<string>();
    filteredModules.forEach((module) => {
      module.domains.forEach((domainId) => ids.add(domainId));
    });
    if (highlightedDomainId) {
      ids.add(highlightedDomainId);
    }
    return ids;
  }, [filteredModules, highlightedDomainId]);

  const artifactMap = useMemo(() => new Map(artifacts.map((artifact) => [artifact.id, artifact])), []);
  const domainMap = useMemo(() => new Map(flattenDomainTree(domainTree).map((domain) => [domain.id, domain])), []);

  const ensureDomainsVisible = (domainIds: string[]) => {
    setSelectedDomains((prev) => {
      const missing = domainIds.some((domainId) => !prev.has(domainId));
      if (!missing) {
        return prev;
      }
      const next = new Set(prev);
      domainIds.forEach((domainId) => next.add(domainId));
      return next;
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
          <DomainTree
            tree={domainTree}
            selected={selectedDomains}
            onToggle={(domainId) => {
              setSelectedDomains((prev) => {
                const next = new Set(prev);
                if (next.has(domainId)) {
                  next.delete(domainId);
                  if (selectedNode?.id === domainId) {
                    setSelectedNode(null);
                  }
                } else {
                  next.add(domainId);
                  const domain = domainMap.get(domainId);
                  if (domain) {
                    setSelectedNode({ ...domain, type: 'domain' });
                  }
                }
                return next;
              });
            }}
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
              modules={filteredModules}
              domains={domainTree}
              artifacts={artifacts}
              links={filteredLinks}
              showDependencies={showDependencies}
              onSelect={(node) => setSelectedNode(node)}
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

export default App;
