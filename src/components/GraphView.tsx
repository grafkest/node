import { Badge } from '@consta/uikit/Badge';
import { Loader } from '@consta/uikit/Loader';
import { useTheme } from '@consta/uikit/Theme';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D, { LinkObject, NodeObject, ForceGraphMethods } from 'react-force-graph-2d';
import type { DomainNode, ModuleNode, ArtifactNode, GraphLink } from '../data';
import type { GraphLayoutNodePosition } from '../types/graph';
import styles from './GraphView.module.css';

type GraphNode =
  | ({ type: 'module' } & ModuleNode)
  | ({ type: 'domain' } & DomainNode)
  | ({ type: 'artifact'; reuseScore?: number } & ArtifactNode);

type GraphViewProps = {
  modules: ModuleNode[];
  domains: DomainNode[];
  artifacts: ArtifactNode[];
  links: GraphLink[];
  onSelect: (node: GraphNode | null) => void;
  highlightedNode: string | null;
  visibleDomainIds: Set<string>;
  layoutPositions: Record<string, GraphLayoutNodePosition>;
  onLayoutChange?: (positions: Record<string, GraphLayoutNodePosition>) => void;
};

type ForceNode = NodeObject & GraphNode;
type ForceLink = LinkObject & GraphLink;

const GraphView: React.FC<GraphViewProps> = ({
  modules,
  domains,
  artifacts,
  links,
  onSelect,
  highlightedNode,
  visibleDomainIds,
  layoutPositions,
  onLayoutChange
}) => {
  const { theme } = useTheme();
  const themeClassName = theme?.className ?? 'default';

  const palette = useMemo(() => resolvePalette(themeClassName), [themeClassName]);
  const graphRef = useRef<ForceGraphMethods | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nodeCacheRef = useRef<Map<string, ForceNode>>(new Map());
  const lastReportedLayoutRef = useRef<string>('');
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    lastReportedLayoutRef.current = JSON.stringify(layoutPositions ?? {});
  }, [layoutPositions]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.ResizeObserver === 'undefined') {
      return;
    }

    const element = containerRef.current;
    if (!element) {
      return;
    }

    const observer = new window.ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      const { width, height } = entry.contentRect;
      setDimensions((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height }
      );
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const domainNodes = useMemo(() => {
    const flatDomains = flattenDomains(domains, visibleDomainIds);
    return flatDomains.map((domain) => ({
      ...domain,
      type: 'domain'
    }));
  }, [domains, visibleDomainIds]);

  const moduleNodes = useMemo<GraphNode[]>(
    () =>
      modules.map((module) => ({
        ...module,
        type: 'module'
      })),
    [modules]
  );

  const artifactNodes = useMemo<GraphNode[]>(
    () =>
      artifacts.map((artifact) => ({
        ...artifact,
        type: 'artifact',
        reuseScore: 0
      })),
    [artifacts]
  );

  const nodes = useMemo(() => {
    const nextNodes: ForceNode[] = [];

    const upsertNode = (node: GraphNode) => {
      const cached = nodeCacheRef.current.get(node.id);
      if (cached && cached.type === node.type) {
        Object.assign(cached, node);
        applyLayoutPosition(cached, layoutPositions);
        nextNodes.push(cached);
        return;
      }

      const hydratedNode = { ...node } as ForceNode;
      applyLayoutPosition(hydratedNode, layoutPositions);
      nodeCacheRef.current.set(node.id, hydratedNode);
      nextNodes.push(hydratedNode);
    };

    domainNodes.forEach(upsertNode);
    artifactNodes.forEach(upsertNode);
    moduleNodes.forEach(upsertNode);

    return nextNodes;
  }, [domainNodes, artifactNodes, moduleNodes, layoutPositions]);

  const graphData = useMemo(
    () => ({
      nodes,
      links
    }),
    [nodes, links]
  );

  const nodeCount = nodes.length;
  const linkCount = links.length;

  useEffect(() => {
    if (!highlightedNode || !graphRef.current) {
      return;
    }

    const target = (graphData.nodes as ForceNode[]).find((node) => node.id === highlightedNode);
    if (!target || typeof target.x !== 'number' || typeof target.y !== 'number') {
      return;
    }

    const graph = graphRef.current;
    graph.centerAt(target.x, target.y, 400);
    if (typeof graph.zoom === 'function') {
      const currentZoom = graph.zoom() as number;
      const desiredZoom = currentZoom < 1.8 ? 1.8 : currentZoom;
      graph.zoom(desiredZoom, 400);
    }
  }, [highlightedNode, graphData]);

  useEffect(() => {
    if (import.meta.env.DEV && typeof window !== 'undefined' && graphRef.current) {
      (window as typeof window & { __forceGraphRef?: ForceGraphMethods }).__forceGraphRef = graphRef.current;
    }
  }, [graphData]);

  useEffect(() => {
    if (!graphRef.current) {
      return;
    }

    const reheat = (graphRef.current as ForceGraphMethods & {
      d3ReheatSimulation?: () => void;
    }).d3ReheatSimulation;

    if (typeof reheat === 'function') {
      reheat();
    }
  }, [nodeCount, linkCount]);

  const emitLayoutUpdate = useCallback(() => {
    if (!onLayoutChange) {
      return;
    }

    const entries: Array<[string, GraphLayoutNodePosition]> = [];
    nodeCacheRef.current.forEach((node, id) => {
      if (typeof node.x !== 'number' || Number.isNaN(node.x) || typeof node.y !== 'number' || Number.isNaN(node.y)) {
        return;
      }

      const payload: GraphLayoutNodePosition = {
        x: roundCoordinate(node.x),
        y: roundCoordinate(node.y)
      };

      if (typeof node.fx === 'number' && !Number.isNaN(node.fx)) {
        payload.fx = roundCoordinate(node.fx);
      }

      if (typeof node.fy === 'number' && !Number.isNaN(node.fy)) {
        payload.fy = roundCoordinate(node.fy);
      }

      entries.push([id, payload]);
    });

    const serialized = JSON.stringify(Object.fromEntries(entries));
    if (serialized === lastReportedLayoutRef.current) {
      return;
    }

    lastReportedLayoutRef.current = serialized;
    onLayoutChange(Object.fromEntries(entries));
  }, [onLayoutChange]);

  const handleNodeDragEnd = useCallback(
    (node: ForceNode) => {
      if (node && typeof node.id === 'string') {
        const layout = layoutPositions[node.id];
        const hasFixedX = typeof layout?.fx === 'number' && Number.isFinite(layout.fx);
        const hasFixedY = typeof layout?.fy === 'number' && Number.isFinite(layout.fy);

        const resolvedX = resolveCoordinate(node.x, layout?.x ?? null, layout?.fx ?? null);
        const resolvedY = resolveCoordinate(node.y, layout?.y ?? null, layout?.fy ?? null);

        if (resolvedX !== null) {
          node.x = resolvedX;
          node.fx = hasFixedX ? resolvedX : undefined;
        } else {
          node.fx = undefined;
          if (layout?.x !== undefined) {
            node.x = layout.x;
          }
        }

        if (resolvedY !== null) {
          node.y = resolvedY;
          node.fy = hasFixedY ? resolvedY : undefined;
        } else {
          node.fy = undefined;
          if (layout?.y !== undefined) {
            node.y = layout.y;
          }
        }

        if (typeof node.vx === 'number') {
          node.vx = 0;
        }
        if (typeof node.vy === 'number') {
          node.vy = 0;
        }

        nodeCacheRef.current.set(node.id, node);
      }

      emitLayoutUpdate();
    },
    [emitLayoutUpdate, layoutPositions]
  );

  const handleEngineStop = useCallback(() => {
    emitLayoutUpdate();
  }, [emitLayoutUpdate]);

  return (
    <div ref={containerRef} className={styles.container}>
      <div className={styles.legend}>
        <Badge label="Модуль" size="s" view="filled" status="warning" />
        <Badge label="Домен" size="s" view="filled" status="system" />
        <Badge label="Артефакт" size="s" view="filled" status="success" />
      </div>
      <React.Suspense fallback={<Loader size="m" />}>
        <ForceGraph2D
          ref={graphRef}
          width={dimensions.width || 600}
          height={dimensions.height || 400}
          graphData={graphData}
          nodeLabel={(node: ForceNode) => node.name ?? node.id}
          linkColor={(link: ForceLink) => resolveLinkColor(link, palette, visibleDomainIds)}
          nodeCanvasObject={(node: ForceNode, ctx, globalScale) => {
            drawNode(node, ctx, globalScale, highlightedNode, palette, visibleDomainIds);
          }}
          nodeCanvasObjectMode={() => 'replace'}
          onNodeClick={(node) => {
            onSelect(node as ForceNode);
          }}
          onNodeDragEnd={handleNodeDragEnd}
          onEngineStop={handleEngineStop}
        />
      </React.Suspense>
    </div>
  );
};

function applyLayoutPosition(node: ForceNode, layoutPositions: Record<string, GraphLayoutNodePosition>) {
  const layout = layoutPositions[node.id];
  if (!layout) {
    return;
  }

  node.x = layout.x;
  node.y = layout.y;

  if (typeof layout.fx === 'number') {
    node.fx = layout.fx;
  } else if (node.fx !== undefined) {
    node.fx = undefined;
  }

  if (typeof layout.fy === 'number') {
    node.fy = layout.fy;
  } else if (node.fy !== undefined) {
    node.fy = undefined;
  }
}

function roundCoordinate(value: number): number {
  return Number(value.toFixed(2));
}

function resolveCoordinate(
  primary: unknown,
  stored: number | null,
  storedFixed: number | null
): number | null {
  if (typeof primary === 'number' && Number.isFinite(primary)) {
    return roundCoordinate(primary);
  }

  if (typeof storedFixed === 'number' && Number.isFinite(storedFixed)) {
    return roundCoordinate(storedFixed);
  }

  if (typeof stored === 'number' && Number.isFinite(stored)) {
    return roundCoordinate(stored);
  }

  return null;
}

function flattenDomains(domains: DomainNode[], visibleDomainIds?: Set<string>): DomainNode[] {
  const visible = visibleDomainIds && visibleDomainIds.size > 0 ? visibleDomainIds : null;

  const collect = (node: DomainNode): DomainNode[] => {
    const childLists = node.children?.map(collect) ?? [];
    const hasVisibleChild = childLists.some((list) => list.length > 0);
    const includeSelf = (!visible || visible.has(node.id) || hasVisibleChild) && (!node.children || node.children.length === 0);

    const collectedChildren = childLists.flat();

    if (!includeSelf) {
      return collectedChildren;
    }

    return [node, ...collectedChildren];
  };

  return domains.flatMap(collect);
}

type GraphPalette = {
  module: string;
  domain: string;
  artifact: string;
  text: string;
  linkDependency: string;
  linkProduces: string;
  linkRelates: string;
  linkConsumes: string;
};

function drawNode(
  node: ForceNode,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
  highlighted: string | null,
  palette: GraphPalette,
  visibleDomainIds: Set<string>
) {
  const label = node.name ?? node.id;
  const fontSize = 12 / Math.sqrt(globalScale);
  const radius = node.type === 'module' ? 10 : node.type === 'domain' ? 8 : 6;
  const isDomainDimmed =
    node.type === 'domain' && visibleDomainIds.size > 0 && !visibleDomainIds.has(node.id);
  const isHighlighted = highlighted && node.id === highlighted;
  const baseAlpha = isHighlighted ? 1 : isDomainDimmed ? 0.2 : 1;
  ctx.save();
  ctx.beginPath();
  ctx.arc(node.x ?? 0, node.y ?? 0, radius, 0, 2 * Math.PI, false);
  ctx.fillStyle =
    node.type === 'module'
      ? palette.module
      : node.type === 'domain'
        ? palette.domain
        : palette.artifact;
  ctx.globalAlpha = highlighted && node.id !== highlighted ? 0.5 * baseAlpha : baseAlpha;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.font = `${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = palette.text;
  if (isDomainDimmed && !isHighlighted) {
    ctx.globalAlpha = 0.6;
  }
  ctx.fillText(label, node.x ?? 0, (node.y ?? 0) + radius + 4);
  ctx.restore();
}

function resolveLinkColor(link: ForceLink, palette: GraphPalette, visibleDomainIds: Set<string>) {
  const baseColor =
    link.type === 'dependency'
      ? palette.linkDependency
      : link.type === 'produces'
        ? palette.linkProduces
        : link.type === 'consumes'
          ? palette.linkConsumes
          : palette.linkRelates;

  if (link.type !== 'domain' || visibleDomainIds.size === 0) {
    return baseColor;
  }

  const targetId = typeof link.target === 'object' ? (link.target as ForceNode).id : String(link.target);
  if (visibleDomainIds.has(targetId)) {
    return baseColor;
  }

  return withAlpha(baseColor, 0.2);
}

function withAlpha(color: string, alpha: number) {
  if (!color.startsWith('#')) {
    return color;
  }

  const hex = color.slice(1);
  if (hex.length !== 6) {
    return color;
  }

  const bigint = Number.parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function resolvePalette(themeClassName?: string): GraphPalette {
  if (typeof window === 'undefined') {
    return DEFAULT_PALETTE;
  }

  const themeElement = themeClassName ? document.querySelector(`.${themeClassName}`) : null;
  const styles = getComputedStyle((themeElement as HTMLElement) ?? document.body);
  const getVar = (token: string, fallback: string) => styles.getPropertyValue(token).trim() || fallback;

  return {
    module: getVar('--color-bg-warning', DEFAULT_PALETTE.module),
    domain: getVar('--color-bg-info', DEFAULT_PALETTE.domain),
    artifact: getVar('--color-bg-success', DEFAULT_PALETTE.artifact),
    text: getVar('--color-typo-primary', DEFAULT_PALETTE.text),
    linkDependency: getVar('--color-bg-border', DEFAULT_PALETTE.linkDependency),
    linkProduces: getVar('--color-bg-success', DEFAULT_PALETTE.linkProduces),
    linkRelates: getVar('--color-bg-info', DEFAULT_PALETTE.linkRelates),
    linkConsumes: getVar('--color-bg-normal', DEFAULT_PALETTE.linkConsumes)
  };
}

const DEFAULT_PALETTE: GraphPalette = {
  module: '#FF8C69',
  domain: '#5B8FF9',
  artifact: '#45C7B0',
  text: '#1F1F1F',
  linkDependency: '#B8B8B8',
  linkProduces: '#45C7B0',
  linkRelates: '#5B8FF9',
  linkConsumes: '#8E8E93'
};

export type { GraphNode };
export default GraphView;
