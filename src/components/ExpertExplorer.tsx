import { Badge } from '@consta/uikit/Badge';
import { Button } from '@consta/uikit/Button';
import { Card } from '@consta/uikit/Card';
import { Combobox } from '@consta/uikit/Combobox';
import { Tabs } from '@consta/uikit/Tabs';
import { Text } from '@consta/uikit/Text';
import { TextField } from '@consta/uikit/TextField';
import { useTheme } from '@consta/uikit/Theme';
import clsx from 'clsx';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import ForceGraph2D, {
  ForceGraphMethods,
  LinkObject,
  NodeObject
} from 'react-force-graph-2d';
import type { ExpertProfile } from '../data';
import styles from './ExpertExplorer.module.css';

type ViewOption = {
  label: string;
  value: 'list' | 'graph';
};

type ViewMode = ViewOption['value'];

type ExpertExplorerProps = {
  experts: ExpertProfile[];
  moduleNameMap: Record<string, string>;
  moduleDomainMap: Record<string, string[]>;
  domainNameMap: Record<string, string>;
};

type SkillFocus = {
  type: 'domain' | 'competency' | 'consulting';
  originId: string;
  label: string;
  expertIds: string[];
};

type ForceNode = NodeObject & {
  id: string;
  type: SkillFocus['type'] | 'expert';
  originId: string;
  label: string;
};

type ForceLink = LinkObject & {
  id: string;
  type: SkillFocus['type'];
};

type ExpertPalette = {
  background: string;
  text: string;
  textMuted: string;
  textOnAccent: string;
  expert: string;
  domain: string;
  competency: string;
  consulting: string;
  edge: string;
  edgeHighlight: string;
};

type AvailabilityMeta = {
  label: string;
  status: 'success' | 'warning' | 'system';
};

const viewOptions: ViewOption[] = [
  { label: 'Список', value: 'list' },
  { label: 'Граф навыков', value: 'graph' }
];

const availabilityMeta: Record<ExpertProfile['availability'], AvailabilityMeta> = {
  available: { label: 'Готов к консалтингу', status: 'success' },
  partial: { label: 'Ограниченная доступность', status: 'warning' },
  busy: { label: 'Планирование заранее', status: 'system' }
};

const DEFAULT_PALETTE: ExpertPalette = {
  background: '#ffffff',
  text: '#1f1f1f',
  textMuted: '#525966',
  textOnAccent: '#ffffff',
  expert: '#3F8CFF',
  domain: '#FF8C69',
  competency: '#45C7B0',
  consulting: '#A067FF',
  edge: 'rgba(82, 96, 115, 0.35)',
  edgeHighlight: '#3F8CFF'
};

const skillTypeLabel: Record<SkillFocus['type'], string> = {
  domain: 'Домен',
  competency: 'Компетенция',
  consulting: 'Консалтинговый навык'
};

const MAX_FOCUSED_EXPERTS = 6;

const ExpertExplorer: React.FC<ExpertExplorerProps> = ({
  experts,
  moduleNameMap,
  moduleDomainMap,
  domainNameMap
}) => {
  const { theme } = useTheme();
  const themeClassName = theme?.className;
  const palette = useMemo(
    () => resolveExpertPalette(themeClassName),
    [themeClassName]
  );

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState<string[]>([]);
  const [competencyFilter, setCompetencyFilter] = useState<string[]>([]);
  const [consultingFilter, setConsultingFilter] = useState<string[]>([]);
  const [selectedExpertId, setSelectedExpertId] = useState<string | null>(null);
  const [focusedSkill, setFocusedSkill] = useState<SkillFocus | null>(null);

  const graphRef = useRef<ForceGraphMethods | null>(null);
  const graphContainerRef = useRef<HTMLDivElement | null>(null);
  const [graphDimensions, setGraphDimensions] = useState({ width: 0, height: 0 });

  const expertById = useMemo(() => {
    const map = new Map<string, ExpertProfile>();
    experts.forEach((expert) => map.set(expert.id, expert));
    return map;
  }, [experts]);

  const domainOptions = useMemo(() => {
    const set = new Set<string>();
    experts.forEach((expert) => {
      expert.domains.forEach((domainId) => set.add(domainId));
    });
    return Array.from(set).sort((a, b) =>
      (domainNameMap[a] ?? a).localeCompare(domainNameMap[b] ?? b, 'ru')
    );
  }, [experts, domainNameMap]);

  const competencyOptions = useMemo(() => {
    const set = new Set<string>();
    experts.forEach((expert) => {
      expert.competencies.forEach((competency) => set.add(competency));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ru'));
  }, [experts]);

  const consultingOptions = useMemo(() => {
    const set = new Set<string>();
    experts.forEach((expert) => {
      expert.consultingSkills.forEach((skill) => set.add(skill));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ru'));
  }, [experts]);

  const normalizedSearch = search.trim().toLowerCase();
  const selectedDomainSet = useMemo(
    () => new Set(domainFilter),
    [domainFilter]
  );
  const selectedCompetencySet = useMemo(
    () => new Set(competencyFilter),
    [competencyFilter]
  );
  const selectedConsultingSet = useMemo(
    () => new Set(consultingFilter),
    [consultingFilter]
  );

  const filteredExperts = useMemo(() => {
    return experts
      .filter((expert) => {
        if (
          selectedDomainSet.size > 0 &&
          !expert.domains.some((domainId) => selectedDomainSet.has(domainId))
        ) {
          return false;
        }

        if (
          selectedCompetencySet.size > 0 &&
          !Array.from(selectedCompetencySet).every((competency) =>
            expert.competencies.includes(competency)
          )
        ) {
          return false;
        }

        if (
          selectedConsultingSet.size > 0 &&
          !Array.from(selectedConsultingSet).every((skill) =>
            expert.consultingSkills.includes(skill)
          )
        ) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        const moduleNames = expert.modules.map(
          (moduleId) => moduleNameMap[moduleId] ?? moduleId
        );
        const domainNames = expert.domains.map(
          (domainId) => domainNameMap[domainId] ?? domainId
        );
        const haystack = [
          expert.fullName,
          expert.title,
          expert.summary,
          expert.location,
          expert.contact,
          ...moduleNames,
          ...domainNames,
          ...expert.competencies,
          ...expert.consultingSkills,
          ...expert.focusAreas,
          ...expert.notableProjects,
          ...expert.languages
        ]
          .join(' ')
          .toLowerCase();

        return haystack.includes(normalizedSearch);
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'ru'));
  }, [
    experts,
    domainNameMap,
    moduleNameMap,
    normalizedSearch,
    selectedCompetencySet,
    selectedConsultingSet,
    selectedDomainSet
  ]);

  const selectedExpert = useMemo(
    () => filteredExperts.find((expert) => expert.id === selectedExpertId) ?? null,
    [filteredExperts, selectedExpertId]
  );

  useEffect(() => {
    if (filteredExperts.length === 0) {
      setSelectedExpertId(null);
      return;
    }

    if (!selectedExpertId || !filteredExperts.some((expert) => expert.id === selectedExpertId)) {
      setSelectedExpertId(filteredExperts[0].id);
    }
  }, [filteredExperts, selectedExpertId]);

  useEffect(() => {
    if (!focusedSkill) {
      return;
    }

    const hasExpert = focusedSkill.expertIds.some((expertId) =>
      filteredExperts.some((expert) => expert.id === expertId)
    );
    if (!hasExpert) {
      setFocusedSkill(null);
    }
  }, [filteredExperts, focusedSkill]);

  useLayoutEffect(() => {
    if (typeof window === 'undefined' || typeof window.ResizeObserver === 'undefined') {
      return;
    }

    if (viewMode !== 'graph') {
      return;
    }

    const element = graphContainerRef.current;
    if (!element) {
      return;
    }

    const measure = (target: Element | null) => {
      if (!target) {
        return;
      }

      const { width, height } = (target as HTMLElement).getBoundingClientRect();
      setGraphDimensions({
        width: Math.max(0, width),
        height: Math.max(0, height)
      });
    };

    measure(element);

    const observer = new window.ResizeObserver((entries) => {
      const entry = entries[0];
      measure(entry?.target ?? null);
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, [viewMode]);

  useEffect(() => {
    if (viewMode !== 'graph') {
      return;
    }

    if (!graphRef.current) {
      return;
    }

    const timeout = window.setTimeout(() => {
      graphRef.current?.zoomToFit(400, 40, (node) => (node as ForceNode).type === 'expert');
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [filteredExperts, graphDimensions.height, graphDimensions.width, viewMode]);

  const graphData = useMemo(() => {
    const nodes: ForceNode[] = [];
    const links: ForceLink[] = [];
    const seenNodes = new Map<string, ForceNode>();

    const ensureNode = (node: ForceNode) => {
      if (seenNodes.has(node.id)) {
        return seenNodes.get(node.id)!;
      }
      seenNodes.set(node.id, node);
      nodes.push(node);
      return node;
    };

    const appendLink = (link: ForceLink) => {
      links.push(link);
    };

    filteredExperts.forEach((expert) => {
      const expertNodeId = `expert:${expert.id}`;
      ensureNode({
        id: expertNodeId,
        originId: expert.id,
        type: 'expert',
        label: expert.fullName
      });

      expert.domains.forEach((domainId) => {
        const nodeId = `domain:${domainId}`;
        ensureNode({
          id: nodeId,
          originId: domainId,
          type: 'domain',
          label: domainNameMap[domainId] ?? domainId
        });
        appendLink({
          id: `${expertNodeId}->${nodeId}`,
          source: expertNodeId,
          target: nodeId,
          type: 'domain'
        });
      });

      expert.competencies.forEach((competency) => {
        const nodeId = `competency:${competency}`;
        ensureNode({
          id: nodeId,
          originId: competency,
          type: 'competency',
          label: competency
        });
        appendLink({
          id: `${expertNodeId}->${nodeId}`,
          source: expertNodeId,
          target: nodeId,
          type: 'competency'
        });
      });

      expert.consultingSkills.forEach((skill) => {
        const nodeId = `consulting:${skill}`;
        ensureNode({
          id: nodeId,
          originId: skill,
          type: 'consulting',
          label: skill
        });
        appendLink({
          id: `${expertNodeId}->${nodeId}`,
          source: expertNodeId,
          target: nodeId,
          type: 'consulting'
        });
      });
    });

    return { nodes, links };
  }, [domainNameMap, filteredExperts]);

  useEffect(() => {
    if (viewMode !== 'graph') {
      return;
    }

    const graph = graphRef.current;
    if (!graph) {
      return;
    }

    const chargeForce = graph.d3Force('charge');
    if (chargeForce && typeof (chargeForce as { strength?: unknown }).strength === 'function') {
      (chargeForce as { strength: (value: number) => void }).strength(-160);
    }

    const linkForce = graph.d3Force('link');
    if (linkForce && typeof (linkForce as { distance?: unknown }).distance === 'function') {
      (linkForce as { distance: (value: number) => void }).distance(90);
    }
    if (linkForce && typeof (linkForce as { strength?: unknown }).strength === 'function') {
      (linkForce as { strength: (value: number) => void }).strength(0.6);
    }
  }, [viewMode, graphData]);

  const highlightNodeIds = useMemo(() => {
    const set = new Set<string>();
    if (selectedExpert) {
      set.add(`expert:${selectedExpert.id}`);
      selectedExpert.domains.forEach((domainId) => set.add(`domain:${domainId}`));
      selectedExpert.competencies.forEach((competency) =>
        set.add(`competency:${competency}`)
      );
      selectedExpert.consultingSkills.forEach((skill) =>
        set.add(`consulting:${skill}`)
      );
    }

    if (focusedSkill) {
      set.add(`${focusedSkill.type}:${focusedSkill.originId}`);
      focusedSkill.expertIds.forEach((expertId) => set.add(`expert:${expertId}`));
    }

    return set;
  }, [focusedSkill, selectedExpert]);

  const highlightLinkIds = useMemo(() => {
    const set = new Set<string>();
    if (selectedExpert) {
      selectedExpert.domains.forEach((domainId) =>
        set.add(`expert:${selectedExpert.id}->domain:${domainId}`)
      );
      selectedExpert.competencies.forEach((competency) =>
        set.add(`expert:${selectedExpert.id}->competency:${competency}`)
      );
      selectedExpert.consultingSkills.forEach((skill) =>
        set.add(`expert:${selectedExpert.id}->consulting:${skill}`)
      );
    }

    if (focusedSkill) {
      focusedSkill.expertIds.forEach((expertId) =>
        set.add(`expert:${expertId}->${focusedSkill.type}:${focusedSkill.originId}`)
      );
    }

    return set;
  }, [focusedSkill, selectedExpert]);

  const handleSelectExpert = useCallback((expertId: string) => {
    setSelectedExpertId(expertId);
    setFocusedSkill(null);
  }, []);

  const handleNodeClick = useCallback(
    (node?: NodeObject) => {
      if (!node) {
        return;
      }

      const typed = node as ForceNode;
      if (typed.type === 'expert') {
        handleSelectExpert(typed.originId);
        return;
      }

      const relatedExperts = filteredExperts.filter((expert) => {
        if (typed.type === 'domain') {
          return expert.domains.includes(typed.originId);
        }
        if (typed.type === 'competency') {
          return expert.competencies.includes(typed.originId);
        }
        return expert.consultingSkills.includes(typed.originId);
      });

      setFocusedSkill({
        type: typed.type,
        originId: typed.originId,
        label: typed.label,
        expertIds: relatedExperts.map((expert) => expert.id)
      });

      if (relatedExperts.length === 1) {
        handleSelectExpert(relatedExperts[0].id);
      }
    },
    [filteredExperts, handleSelectExpert]
  );

  const nodeCanvasObject = useCallback(
    (node: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const typed = node as ForceNode;
      const radius = typed.type === 'expert' ? 14 : typed.type === 'domain' ? 11 : 9;
      const baseColor =
        typed.type === 'expert'
          ? palette.expert
          : typed.type === 'domain'
            ? palette.domain
            : typed.type === 'competency'
              ? palette.competency
              : palette.consulting;
      const isHighlighted = highlightNodeIds.has(typed.id);
      const fillColor = isHighlighted ? baseColor : withAlpha(baseColor, 0.22);

      const fontSizeBase = typed.type === 'expert' ? 16 : typed.type === 'domain' ? 14 : 12;
      const fontSize = fontSizeBase / Math.sqrt(Math.max(globalScale, 0.6));
      const textY = (node.y ?? 0) + radius + 4;

      ctx.save();
      ctx.beginPath();
      ctx.arc(node.x ?? 0, node.y ?? 0, radius, 0, 2 * Math.PI, false);
      ctx.fillStyle = fillColor;
      ctx.globalAlpha = isHighlighted ? 1 : 0.9;
      ctx.fill();

      if (isHighlighted) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = baseColor;
        ctx.stroke();
      }
      ctx.restore();

      ctx.save();
      ctx.font = `${fontSize}px "Inter", "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      if (isHighlighted) {
        ctx.lineWidth = Math.max(2, fontSize / 3);
        ctx.strokeStyle = withAlpha(palette.background, 0.9);
        ctx.strokeText(typed.label, node.x ?? 0, textY);
        ctx.fillStyle = palette.text;
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = palette.text;
        ctx.globalAlpha = Math.min(0.95, 0.55 + globalScale * 0.2);
      }

      ctx.fillText(typed.label, node.x ?? 0, textY);
      ctx.restore();
    },
    [highlightNodeIds, palette]
  );

  const linkColor = useCallback(
    (link: LinkObject) => {
      const typed = link as ForceLink;
      if (typed.id && highlightLinkIds.has(typed.id)) {
        return palette.edgeHighlight;
      }
      return palette.edge;
    },
    [highlightLinkIds, palette]
  );

  const linkWidth = useCallback(
    (link: LinkObject) => {
      const typed = link as ForceLink;
      return typed.id && highlightLinkIds.has(typed.id) ? 1.6 : 0.6;
    },
    [highlightLinkIds]
  );

  const resetFilters = useCallback(() => {
    setSearch('');
    setDomainFilter([]);
    setCompetencyFilter([]);
    setConsultingFilter([]);
    setFocusedSkill(null);
  }, []);

  const summary = useMemo(() => {
    const domainSet = new Set<string>();
    const competencySet = new Set<string>();
    const consultingSet = new Set<string>();
    const moduleSet = new Set<string>();

    filteredExperts.forEach((expert) => {
      expert.domains.forEach((domainId) => domainSet.add(domainId));
      expert.competencies.forEach((competency) => competencySet.add(competency));
      expert.consultingSkills.forEach((skill) => consultingSet.add(skill));
      expert.modules.forEach((moduleId) => moduleSet.add(moduleId));
    });

    return {
      domains: domainSet,
      competencies: competencySet,
      consulting: consultingSet,
      modules: moduleSet
    };
  }, [filteredExperts]);

  const activeView =
    viewOptions.find((option) => option.value === viewMode) ?? viewOptions[0];

  return (
    <div className={styles.root}>
      <section className={styles.controls}>
        <div className={styles.field}>
          <Text size="xs" weight="semibold">
            Поиск
          </Text>
          <TextField
            size="s"
            placeholder="Введите ФИО, компетенцию или модуль"
            value={search}
            onChange={(value) => setSearch(value ?? '')}
            className={styles.searchField}
          />
        </div>
        <div className={styles.field}>
          <Text size="xs" weight="semibold">
            Домены
          </Text>
          <Combobox<string>
            size="s"
            items={domainOptions}
            value={domainFilter}
            multiple
            getItemKey={(item) => item}
            getItemLabel={(item) => domainNameMap[item] ?? item}
            onChange={(value) => setDomainFilter(value ?? [])}
            placeholder="Все домены"
          />
        </div>
        <div className={styles.field}>
          <Text size="xs" weight="semibold">
            Компетенции
          </Text>
          <Combobox<string>
            size="s"
            items={competencyOptions}
            value={competencyFilter}
            multiple
            getItemKey={(item) => item}
            getItemLabel={(item) => item}
            onChange={(value) => setCompetencyFilter(value ?? [])}
            placeholder="Все компетенции"
          />
        </div>
        <div className={styles.field}>
          <Text size="xs" weight="semibold">
            Консалтинговые навыки
          </Text>
          <Combobox<string>
            size="s"
            items={consultingOptions}
            value={consultingFilter}
            multiple
            getItemKey={(item) => item}
            getItemLabel={(item) => item}
            onChange={(value) => setConsultingFilter(value ?? [])}
            placeholder="Все навыки"
          />
        </div>
      </section>

      <section className={styles.summaryRow}>
        <Card className={styles.summaryCard} verticalSpace="m" horizontalSpace="l" shadow={false}>
          <Text size="xs" view="secondary">
            Отобранные эксперты
          </Text>
          <Text size="2xl" weight="bold">
            {filteredExperts.length}
          </Text>
          <Text size="xs" view="ghost">
            из {experts.length} в каталоге
          </Text>
        </Card>
        <Card className={styles.summaryCard} verticalSpace="m" horizontalSpace="l" shadow={false}>
          <Text size="xs" view="secondary">
            Компетенции
          </Text>
          <Text size="2xl" weight="bold">
            {summary.competencies.size}
          </Text>
          <Text size="xs" view="ghost">
            объединены по выбранным экспертам
          </Text>
        </Card>
        <Card className={styles.summaryCard} verticalSpace="m" horizontalSpace="l" shadow={false}>
          <Text size="xs" view="secondary">
            Консалтинг
          </Text>
          <Text size="2xl" weight="bold">
            {summary.consulting.size}
          </Text>
          <Text size="xs" view="ghost">
            уникальных форматов поддержки
          </Text>
        </Card>
        <Card className={styles.summaryCard} verticalSpace="m" horizontalSpace="l" shadow={false}>
          <Text size="xs" view="secondary">
            Модули
          </Text>
          <Text size="2xl" weight="bold">
            {summary.modules.size}
          </Text>
          <Text size="xs" view="ghost">
            где эксперты являются носителями знаний
          </Text>
        </Card>
      </section>

      <section className={styles.viewToolbar}>
        <Tabs
          size="s"
          items={viewOptions}
          value={activeView}
          getItemKey={(item) => item.value}
          getItemLabel={(item) => item.label}
          onChange={(tab) => setViewMode(tab.value)}
          className={styles.modeTabs}
        />
        <div className={styles.toolbarActions}>
          <Badge
            size="s"
            view="stroked"
            label={`${filteredExperts.length} экспертов`}
            className={styles.countBadge}
          />
          <Button size="s" view="ghost" label="Сбросить фильтры" onClick={resetFilters} />
        </div>
      </section>

      <section className={styles.content}>
        {viewMode === 'list' ? (
          <div className={styles.listPane}>
            {filteredExperts.length === 0 ? (
              <div className={styles.placeholder}>
                <Text size="s" view="secondary">
                  Под подходящие условия не попал ни один эксперт.
                </Text>
                <Text size="xs" view="ghost">
                  Попробуйте расширить фильтры или очистить поиск.
                </Text>
              </div>
            ) : (
              <div className={styles.list}>
                {filteredExperts.map((expert) => {
                  const availability = availabilityMeta[expert.availability];
                  const isActive = expert.id === selectedExpertId;
                  return (
                    <Card
                      key={expert.id}
                      className={clsx(styles.expertCard, {
                        [styles.expertCardActive]: isActive
                      })}
                      verticalSpace="l"
                      horizontalSpace="l"
                      shadow={false}
                      onClick={() => handleSelectExpert(expert.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleSelectExpert(expert.id);
                        }
                      }}
                    >
                      <div className={styles.expertCardHeader}>
                        <Text size="m" weight="semibold">
                          {expert.fullName}
                        </Text>
                        <Text size="xs" view="secondary">
                          {expert.title}
                        </Text>
                      </div>
                      <Text size="xs" view="ghost">
                        {expert.summary}
                      </Text>
                      <div className={styles.expertCardMeta}>
                        <Badge size="xs" view="filled" label={`${expert.experienceYears} лет опыта`} />
                        <Badge size="xs" view="stroked" label={expert.location} />
                        <Badge
                          size="xs"
                          view="filled"
                          status={availability.status}
                          label={availability.label}
                        />
                      </div>
                      <div className={styles.skillBadges}>
                        {expert.competencies.slice(0, 4).map((competency) => (
                          <Badge key={competency} size="xs" view="stroked" label={competency} />
                        ))}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className={styles.graphPane}>
            {focusedSkill && (
              <Card className={styles.focusCard} verticalSpace="m" horizontalSpace="l" shadow={false}>
                <Text size="xs" view="secondary">
                  {skillTypeLabel[focusedSkill.type]}
                </Text>
                <Text size="s" weight="semibold">
                  {focusedSkill.label}
                </Text>
                <Text size="xs" view="ghost">
                  Экспертов: {focusedSkill.expertIds.length}
                </Text>
                <div className={styles.focusExpertButtons}>
                  {focusedSkill.expertIds.slice(0, MAX_FOCUSED_EXPERTS).map((expertId) => {
                    const expert = expertById.get(expertId);
                    if (!expert) {
                      return null;
                    }
                    return (
                      <Button
                        key={expert.id}
                        size="xs"
                        view={expert.id === selectedExpertId ? 'primary' : 'ghost'}
                        label={expert.fullName}
                        onClick={() => handleSelectExpert(expert.id)}
                        className={styles.focusExpertButton}
                      />
                    );
                  })}
                  {focusedSkill.expertIds.length > MAX_FOCUSED_EXPERTS && (
                    <Badge
                      size="xs"
                      view="filled"
                      label={`+${focusedSkill.expertIds.length - MAX_FOCUSED_EXPERTS}`}
                    />
                  )}
                </div>
              </Card>
            )}
            <div ref={graphContainerRef} className={styles.graphContainer}>
              {filteredExperts.length === 0 ? (
                <div className={styles.graphPlaceholder}>
                  <Text size="s" view="secondary">
                    Нет данных для построения графа с выбранными фильтрами.
                  </Text>
                </div>
              ) : (
                <ForceGraph2D
                  ref={graphRef}
                  width={graphDimensions.width}
                  height={graphDimensions.height}
                  graphData={graphData}
                  backgroundColor={palette.background}
                  nodeRelSize={4}
                  cooldownTicks={80}
                  onNodeClick={handleNodeClick}
                  nodeCanvasObject={nodeCanvasObject}
                  nodeCanvasObjectMode={() => 'replace'}
                  linkColor={linkColor}
                  linkWidth={linkWidth}
                  enableZoomInteraction
                  enablePanInteraction
                />
              )}
            </div>
          </div>
        )}

        <aside className={styles.detailsPane}>
          {selectedExpert ? (
            <ExpertDetails
              expert={selectedExpert}
              moduleNameMap={moduleNameMap}
              moduleDomainMap={moduleDomainMap}
              domainNameMap={domainNameMap}
            />
          ) : (
            <div className={styles.placeholder}>
              <Text size="s" view="secondary">
                Выберите эксперта, чтобы увидеть детальную информацию.
              </Text>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
};

type ExpertDetailsProps = {
  expert: ExpertProfile;
  moduleNameMap: Record<string, string>;
  moduleDomainMap: Record<string, string[]>;
  domainNameMap: Record<string, string>;
};

const ExpertDetails: React.FC<ExpertDetailsProps> = ({
  expert,
  moduleNameMap,
  moduleDomainMap,
  domainNameMap
}) => {
  const availability = availabilityMeta[expert.availability];
  const modules = expert.modules.map((moduleId) => ({
    id: moduleId,
    name: moduleNameMap[moduleId] ?? moduleId,
    domains: moduleDomainMap[moduleId] ?? []
  }));

  return (
    <div className={styles.detailsContent}>
      <div className={styles.detailHeader}>
        <Text size="l" weight="bold">
          {expert.fullName}
        </Text>
        <Text size="s" view="secondary">
          {expert.title}
        </Text>
      </div>
      <Text size="s" view="secondary">
        {expert.summary}
      </Text>
      <div className={styles.detailBadges}>
        <Badge size="s" view="filled" label={`${expert.experienceYears} лет опыта`} />
        <Badge size="s" view="stroked" label={expert.location} />
        <Badge size="s" view="stroked" label={expert.languages.join(', ')} />
        <Badge size="s" view="filled" status={availability.status} label={availability.label} />
      </div>
      <Text size="xs" view="ghost">
        {expert.availabilityComment}
      </Text>

      <section className={styles.detailSection}>
        <Text size="xs" weight="semibold" className={styles.sectionTitle}>
          Домены
        </Text>
        <div className={styles.badgeGroup}>
          {expert.domains.map((domainId) => (
            <Badge key={domainId} size="xs" view="stroked" label={domainNameMap[domainId] ?? domainId} />
          ))}
        </div>
      </section>

      <section className={styles.detailSection}>
        <Text size="xs" weight="semibold" className={styles.sectionTitle}>
          Ключевые компетенции
        </Text>
        <div className={styles.badgeGroup}>
          {expert.competencies.map((competency) => (
            <Badge key={competency} size="xs" view="stroked" label={competency} />
          ))}
        </div>
      </section>

      <section className={styles.detailSection}>
        <Text size="xs" weight="semibold" className={styles.sectionTitle}>
          Консалтинговая поддержка
        </Text>
        <div className={styles.badgeGroup}>
          {expert.consultingSkills.map((skill) => (
            <Badge key={skill} size="xs" view="stroked" label={skill} />
          ))}
        </div>
      </section>

      <section className={styles.detailSection}>
        <Text size="xs" weight="semibold" className={styles.sectionTitle}>
          Фокусы развития
        </Text>
        <ul className={styles.focusList}>
          {expert.focusAreas.map((item) => (
            <li key={item}>
              <Text size="xs">{item}</Text>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.detailSection}>
        <Text size="xs" weight="semibold" className={styles.sectionTitle}>
          Модули и продукты
        </Text>
        <ul className={styles.detailList}>
          {modules.map((module) => (
            <li key={module.id} className={styles.detailListItem}>
              <Text size="s" weight="semibold">
                {module.name}
              </Text>
              <div className={styles.badgeGroup}>
                {module.domains.map((domainId) => (
                  <Badge
                    key={`${module.id}-${domainId}`}
                    size="xs"
                    view="stroked"
                    label={domainNameMap[domainId] ?? domainId}
                  />
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.detailSection}>
        <Text size="xs" weight="semibold" className={styles.sectionTitle}>
          Ключевые результаты
        </Text>
        <ul className={styles.detailList}>
          {expert.notableProjects.map((project) => (
            <li key={project} className={styles.detailListItem}>
              <Text size="xs">{project}</Text>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.detailSection}>
        <Text size="xs" weight="semibold" className={styles.sectionTitle}>
          Контакты
        </Text>
        <Text size="xs">
          <a className={styles.contactLink} href={`mailto:${expert.contact}`}>
            {expert.contact}
          </a>
        </Text>
      </section>
    </div>
  );
};

function resolveExpertPalette(themeClassName?: string): ExpertPalette {
  if (typeof window === 'undefined') {
    return DEFAULT_PALETTE;
  }

  const themeElement = themeClassName ? document.querySelector(`.${themeClassName}`) : null;
  const stylesRef = getComputedStyle((themeElement as HTMLElement) ?? document.body);
  const getVar = (token: string, fallback: string) =>
    stylesRef.getPropertyValue(token).trim() || fallback;

  const edgeBase = getVar('--color-bg-border', DEFAULT_PALETTE.edge);

  return {
    background: getVar('--color-bg-default', DEFAULT_PALETTE.background),
    text: getVar('--color-typo-primary', DEFAULT_PALETTE.text),
    textMuted: getVar('--color-typo-secondary', DEFAULT_PALETTE.textMuted),
    textOnAccent: getVar('--color-typo-ghost', DEFAULT_PALETTE.textOnAccent),
    expert: getVar('--color-bg-link', DEFAULT_PALETTE.expert),
    domain: getVar('--color-bg-warning', DEFAULT_PALETTE.domain),
    competency: getVar('--color-bg-success', DEFAULT_PALETTE.competency),
    consulting: getVar('--color-bg-info', DEFAULT_PALETTE.consulting),
    edge: edgeBase,
    edgeHighlight: getVar('--color-bg-link', DEFAULT_PALETTE.edgeHighlight)
  };
}

function withAlpha(color: string, alpha: number) {
  if (!color.startsWith('#')) {
    return color;
  }

  const hex = color.slice(1);
  if (hex.length !== 6) {
    return color;
  }

  const numeric = Number.parseInt(hex, 16);
  const r = (numeric >> 16) & 255;
  const g = (numeric >> 8) & 255;
  const b = numeric & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default ExpertExplorer;
