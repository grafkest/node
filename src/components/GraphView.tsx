import { Badge } from '@consta/uikit/Badge';
import { Loader } from '@consta/uikit/Loader';
import { useTheme } from '@consta/uikit/Theme';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D, {
  ForceGraphMethods,
  LinkObject,
  NodeObject
} from 'react-force-graph-2d';
import type { ArtifactNode, DomainNode, GraphLink, ModuleNode } from '../data';
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

type CameraState = {
  center: { x: number; y: number };
  zoom: number;
};

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
  const cameraStateRef = useRef<CameraState | null>(null);
  const captureTimeoutRef = useRef<number | null>(null);
  const lastFocusedNodeRef = useRef<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isFocusedView, setIsFocusedView] = useState(false);

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
    if (import.meta.env.DEV && typeof window !== 'undefined' && graphRef.current) {
      (window as typeof window & { __forceGraphRef?: ForceGraphMethods }).__forceGraphRef =
        graphRef.current;
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

  useEffect(() => {
    return () => {
      if (captureTimeoutRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(captureTimeoutRef.current);
      }
    };
  }, []);

  const captureCameraState = useCallback(() => {
    if (!graphRef.current || dimensions.width <= 0 || dimensions.height <= 0) {
      return;
    }

    const graph = graphRef.current;
    const zoomValue = typeof graph.zoom === 'function' ? (graph.zoom() as number) : undefined;

    if (!Number.isFinite(zoomValue) || !zoomValue || zoomValue <= 0) {
      return;
    }

    const center = graph.screen2GraphCoords?.(dimensions.width / 2, dimensions.height / 2);
    if (
      center &&
      typeof center.x === 'number' &&
      Number.isFinite(center.x) &&
      typeof center.y === 'number' &&
      Number.isFinite(center.y)
    ) {
      cameraStateRef.current = {
        center: { x: center.x, y: center.y },
        zoom: zoomValue
      };
    }
  }, [dimensions.height, dimensions.width]);

  const scheduleCameraCapture = useCallback(
    (delay = 0) => {
      if (typeof window === 'undefined') {
        captureCameraState();
        return;
      }

      if (captureTimeoutRef.current !== null) {
        window.clearTimeout(captureTimeoutRef.current);
        captureTimeoutRef.current = null;
      }

      if (delay <= 0) {
        captureCameraState();
        return;
      }

      captureTimeoutRef.current = window.setTimeout(() => {
        captureCameraState();
        captureTimeoutRef.current = null;
      }, delay);
    },
    [captureCameraState]
  );

  const restoreCamera = useCallback(() => {
    if (!graphRef.current || dimensions.width <= 0 || dimensions.height <= 0) {
      return;
    }

    const graph = graphRef.current;
    const saved = cameraStateRef.current;

    if (saved) {
      if (typeof graph.zoom === 'function') {
        graph.zoom(saved.zoom, 0);
      }
      graph.centerAt(saved.center.x, saved.center.y, 0);
      return;
    }

    graph.zoomToFit?.(0, 60);
    scheduleCameraCapture(80);
  }, [dimensions.height, dimensions.width, scheduleCameraCapture]);

  useEffect(() => {
    restoreCamera();
  }, [graphData, dimensions.height, dimensions.width, restoreCamera]);

  useEffect(() => {
    if (!highlightedNode) {
      setIsFocusedView(false);
      lastFocusedNodeRef.current = null;
      return;
    }

    if (lastFocusedNodeRef.current && highlightedNode !== lastFocusedNodeRef.current) {
      setIsFocusedView(false);
    }

    if (!graphRef.current || dimensions.width <= 0 || dimensions.height <= 0) {
      return;
    }

    const target = nodeCacheRef.current.get(highlightedNode);
    if (!target || typeof target.x !== 'number' || typeof target.y !== 'number') {
      return;
    }

    const graph = graphRef.current;
    const screenCoords = graph.graph2ScreenCoords?.(target.x, target.y);
    if (!screenCoords) {
      return;
    }

    const margin = 48;
    const needsPan =
      screenCoords.x < margin ||
      screenCoords.x > dimensions.width - margin ||
      screenCoords.y < margin ||
      screenCoords.y > dimensions.height - margin;

    if (needsPan) {
      graph.centerAt(target.x, target.y, 400);
      const zoomValue =
        typeof graph.zoom === 'function' ? (graph.zoom() as number) : cameraStateRef.current?.zoom ?? 1;
      cameraStateRef.current = {
        center: { x: target.x, y: target.y },
        zoom: zoomValue
      };
      scheduleCameraCapture(420);
    }
  }, [highlightedNode, dimensions.height, dimensions.width, scheduleCameraCapture]);

  const focusOnNode = useCallback(
    (node: ForceNode): boolean => {
      if (!graphRef.current || typeof node.x !== 'number' || typeof node.y !== 'number') {
        return false;
      }

      const graph = graphRef.current;
      const label = node.name ?? node.id;
      const targetZoom = computeFocusZoom(dimensions, label);

      graph.centerAt(node.x, node.y, 0);
      if (typeof graph.zoom === 'function') {
        graph.zoom(targetZoom, 400);
      }
      graph.centerAt(node.x, node.y, 400);

      cameraStateRef.current = {
        center: { x: node.x, y: node.y },
        zoom: targetZoom
      };
      lastFocusedNodeRef.current = node.id;
      scheduleCameraCapture(420);
      return true;
    },
    [dimensions, scheduleCameraCapture]
  );

  const showEntireGraph = useCallback(() => {
    if (!graphRef.current) {
      return;
    }

    const graph = graphRef.current;
    lastFocusedNodeRef.current = null;
    setIsFocusedView(false);
    cameraStateRef.current = null;
    graph.zoomToFit?.(400, 80);
    scheduleCameraCapture(450);
  }, [scheduleCameraCapture]);

  const handleNodeDoubleClick = useCallback(
    (node: ForceNode) => {
      onSelect(node);

      if (isFocusedView && lastFocusedNodeRef.current === node.id) {
        showEntireGraph();
        return;
      }

      const focused = focusOnNode(node);
      setIsFocusedView(focused);
    },
    [focusOnNode, isFocusedView, onSelect, showEntireGraph]
  );

  const handleFocusButton = useCallback(() => {
    if (!highlightedNode) {
      return;
    }

    const node = nodeCacheRef.current.get(highlightedNode);
    if (!node) {
      return;
    }

    if (isFocusedView && lastFocusedNodeRef.current === node.id) {
      showEntireGraph();
      return;
    }

    const focused = focusOnNode(node);
    setIsFocusedView(focused);
  }, [focusOnNode, highlightedNode, isFocusedView, showEntireGraph]);

  const handleShowAllButton = useCallback(() => {
    showEntireGraph();
  }, [showEntireGraph]);

  const handleZoomTransform = useCallback(
    (transform?: { k: number; x: number; y: number }) => {
      if (!transform || dimensions.width <= 0 || dimensions.height <= 0) {
        return;
      }

      const { k, x, y } = transform;
      if (!Number.isFinite(k) || k <= 0) {
        return;
      }

      cameraStateRef.current = {
        center: {
          x: (dimensions.width / 2 - x) / k,
          y: (dimensions.height / 2 - y) / k
        },
        zoom: k
      };
    },
    [dimensions.height, dimensions.width]
  );

  const handleZoomEnd = useCallback(() => {
    scheduleCameraCapture(0);
  }, [scheduleCameraCapture]);

  const emitLayoutUpdate = useCallback(() => {
    if (!onLayoutChange) {
      return;
    }

    const entries: Array<[string, GraphLayoutNodePosition]> = [];
    nodeCacheRef.current.forEach((node, id) => {
      if (
        typeof node.x !== 'number' ||
        Number.isNaN(node.x) ||
        typeof node.y !== 'number' ||
        Number.isNaN(node.y)
      ) {
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

        const resolvedX = resolveCoordinate(
          node.x,
          node.fx,
          layout?.x ?? null,
          layout?.fx ?? null
        );
        const resolvedY = resolveCoordinate(
          node.y,
          node.fy,
          layout?.y ?? null,
          layout?.fy ?? null
        );

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
      {highlightedNode ? (
        <div className={styles.viewControls}>
          <button
            type="button"
            className={styles.controlButton}
            onClick={handleFocusButton}
            title="Двойное нажатие по модулю, домену или артефакту приближает граф"
          >
            Приблизить
          </button>
          <button
            type="button"
            className={styles.controlButton}
            onClick={handleShowAllButton}
            title="Двойное нажатие повторно показывает весь граф"
          >
            Показать все
          </button>
        </div>
      ) : null}
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
          onNodeDoubleClick={(node) => {
            handleNodeDoubleClick(node as ForceNode);
          }}
          onNodeDragEnd={handleNodeDragEnd}
          onEngineStop={handleEngineStop}
          onZoom={handleZoomTransform}
          onZoomEnd={handleZoomEnd}
        />
      </React.Suspense>
    </div>
  );
};

function applyLayoutPosition(
  node: ForceNode,
  layoutPositions: Record<string, GraphLayoutNodePosition>
) {
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
  fallback: unknown,
  stored: number | null,
  storedFixed: number | null
): number | null {
  if (typeof primary === 'number' && Number.isFinite(primary)) {
    return roundCoordinate(primary);
  }

  if (typeof fallback === 'number' && Number.isFinite(fallback)) {
    return roundCoordinate(fallback);
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
    const isLeaf = !node.children || node.children.length === 0;
    const includeSelf =
      !node.isCatalogRoot && (!visible || visible.has(node.id) || hasVisibleChild) && isLeaf;

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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function computeFocusZoom(
  dimensions: { width: number; height: number },
  label: string
): number {
  const minViewport = Math.min(dimensions.width || 0, dimensions.height || 0);
  const boundedViewport = clamp(minViewport || 0, 360, 1440);
  const viewportRatio = 1 - (boundedViewport - 360) / (1440 - 360);
  const baseZoom = 2.4 + viewportRatio * 1.2; // 2.4 .. 3.6
  const labelAdjustment = clamp(label.length / 24, 0, 0.6);
  return clamp(baseZoom + labelAdjustment, 2.6, 4.2);
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
