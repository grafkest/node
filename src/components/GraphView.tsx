import { Badge } from '@consta/uikit/Badge';
import { Loader } from '@consta/uikit/Loader';
import { useTheme } from '@consta/uikit/Theme';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D, { LinkObject, NodeObject, ForceGraphMethods } from 'react-force-graph-2d';
import type { DomainNode, ModuleNode, ArtifactNode, GraphLink } from '../data';
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
  showDependencies: boolean;
  onSelect: (node: GraphNode | null) => void;
  highlightedNode: string | null;
  visibleDomainIds: Set<string>;
};

type ForceNode = NodeObject & GraphNode;
type ForceLink = LinkObject & GraphLink;

const GraphView: React.FC<GraphViewProps> = ({
  modules,
  domains,
  artifacts,
  links,
  showDependencies,
  onSelect,
  highlightedNode,
  visibleDomainIds
}) => {
  const { theme } = useTheme();
  const themeClassName = theme?.className ?? 'default';

  const palette = useMemo(() => resolvePalette(themeClassName), [themeClassName]);
  const graphRef = useRef<ForceGraphMethods | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nodeCacheRef = useRef<Map<string, ForceNode>>(new Map());
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

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
    const flatDomains = flattenDomains(domains);
    return flatDomains.map((domain) => ({
      ...domain,
      type: 'domain'
    }));
  }, [domains]);

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
        nextNodes.push(cached);
        return;
      }

      const hydratedNode = { ...node } as ForceNode;
      nodeCacheRef.current.set(node.id, hydratedNode);
      nextNodes.push(hydratedNode);
    };

    domainNodes.forEach(upsertNode);
    artifactNodes.forEach(upsertNode);
    moduleNodes.forEach(upsertNode);

    return nextNodes;
  }, [domainNodes, artifactNodes, moduleNodes]);

  const filteredLinks = useMemo(() => {
    const domainFilter = new Set(visibleDomainIds);
    return links.filter((link) => {
      if (!showDependencies && link.type === 'dependency') {
        return false;
      }

      if (visibleDomainIds.size > 0 && link.type === 'domain') {
        const targetId =
          typeof link.target === 'object' ? (link.target as ForceNode).id : String(link.target);
        return domainFilter.has(targetId);
      }

      return true;
    });
  }, [links, showDependencies, visibleDomainIds]);

  const graphData = useMemo(
    () => ({
      nodes,
      links: filteredLinks
    }),
    [nodes, filteredLinks]
  );

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

  return (
    <div ref={containerRef} className={styles.container}>
      <div className={styles.legend}>
        <Badge label="Модуль" size="s" view="filled" status="warning" />
        <Badge label="Домен" size="s" view="filled" status="info" />
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
        />
      </React.Suspense>
    </div>
  );
};

function flattenDomains(domains: DomainNode[]): DomainNode[] {
  return domains.flatMap((domain) => [domain, ...(domain.children ? flattenDomains(domain.children) : [])]);
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
