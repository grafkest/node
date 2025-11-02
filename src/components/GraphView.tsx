import { Badge } from '@consta/uikit/Badge';
import { Loader } from '@consta/uikit/Loader';
import { useTheme } from '@consta/uikit/Theme';
import { forceCollide } from 'd3-force-3d';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph3D, {
  ForceGraphMethods,
  LinkObject,
  NodeObject
} from 'react-force-graph-3d';
import { CanvasTexture, LinearFilter, Sprite, SpriteMaterial, Vector3 } from 'three';
import type {
  ArtifactNode,
  DomainNode,
  GraphLink,
  Initiative,
  ModuleNode,
  ModuleStatus
} from '../data';
import type { GraphLayoutNodePosition } from '../types/graph';
import styles from './GraphView.module.css';

const CAMERA_STORAGE_KEY = 'graph-view:camera-main';

type NodeSpriteData = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: CanvasTexture;
  sprite: Sprite;
  pixelRatio: number;
  size: number;
};

type GraphNode =
  | ({ type: 'module' } & ModuleNode)
  | ({ type: 'domain' } & DomainNode)
  | ({ type: 'initiative' } & Initiative)
  | ({ type: 'artifact'; reuseScore?: number } & ArtifactNode);

type LayoutChangeReason = 'drag' | 'engine';

type GraphViewProps = {
  modules: ModuleNode[];
  domains: DomainNode[];
  artifacts: ArtifactNode[];
  initiatives: Initiative[];
  links: GraphLink[];
  onSelect: (node: GraphNode | null) => void;
  highlightedNode: string | null;
  visibleDomainIds: Set<string>;
  visibleModuleStatuses: Set<ModuleStatus>;
  layoutPositions: Record<string, GraphLayoutNodePosition>;
  normalizationRequest?: number;
  onLayoutChange?: (
    positions: Record<string, GraphLayoutNodePosition>,
    reason: LayoutChangeReason
  ) => void;
};

type ForceNode = (NodeObject & GraphNode) & { __spriteData?: NodeSpriteData };
type ForceLink = LinkObject & GraphLink;

type CameraState = {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
};

type ForceGraph3DMethods = ForceGraphMethods & {
  cameraPosition?: (
    position?: Partial<{ x: number; y: number; z: number }>,
    lookAt?: { x: number; y: number; z: number },
    transitionMs?: number
  ) => unknown;
  camera?: () => { position: Vector3 };
  controls?: () => {
    target: Vector3;
    addEventListener?: (type: string, listener: () => void) => void;
    removeEventListener?: (type: string, listener: () => void) => void;
  };
  graph2ScreenCoords?: (x: number, y: number, z?: number) => { x: number; y: number };
  screen2GraphCoords?: (
    x: number,
    y: number,
    distance?: number
  ) => { x: number; y: number; z: number } | undefined;
};

function readStoredCameraState(): CameraState | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(CAMERA_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as unknown;
    if (
      parsed &&
      typeof parsed === 'object' &&
      'position' in parsed &&
      'target' in parsed &&
      parsed.position &&
      parsed.target &&
      typeof (parsed as { position: { x: unknown } }).position.x === 'number' &&
      Number.isFinite((parsed as { position: { x: number } }).position.x) &&
      typeof (parsed as { position: { y: unknown } }).position.y === 'number' &&
      Number.isFinite((parsed as { position: { y: number } }).position.y) &&
      typeof (parsed as { position: { z: unknown } }).position.z === 'number' &&
      Number.isFinite((parsed as { position: { z: number } }).position.z) &&
      typeof (parsed as { target: { x: unknown } }).target.x === 'number' &&
      Number.isFinite((parsed as { target: { x: number } }).target.x) &&
      typeof (parsed as { target: { y: unknown } }).target.y === 'number' &&
      Number.isFinite((parsed as { target: { y: number } }).target.y) &&
      typeof (parsed as { target: { z: unknown } }).target.z === 'number' &&
      Number.isFinite((parsed as { target: { z: number } }).target.z)
    ) {
      return {
        position: {
          x: (parsed as { position: { x: number } }).position.x,
          y: (parsed as { position: { y: number } }).position.y,
          z: (parsed as { position: { z: number } }).position.z
        },
        target: {
          x: (parsed as { target: { x: number } }).target.x,
          y: (parsed as { target: { y: number } }).target.y,
          z: (parsed as { target: { z: number } }).target.z
        }
      };
    }
  } catch (error) {
    console.warn('Failed to read camera state from storage', error);
  }

  return null;
}

function writeStoredCameraState(state: CameraState | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (!state) {
      window.sessionStorage.removeItem(CAMERA_STORAGE_KEY);
      return;
    }

    window.sessionStorage.setItem(CAMERA_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to persist camera state', error);
  }
}

const GraphView: React.FC<GraphViewProps> = ({
  modules,
  domains,
  artifacts,
  initiatives,
  links,
  onSelect,
  highlightedNode,
  visibleDomainIds,
  visibleModuleStatuses,
  layoutPositions,
  normalizationRequest,
  onLayoutChange
}) => {
  const { theme } = useTheme();
  const themeClassName = theme?.className ?? 'default';

  const palette = useMemo(() => resolvePalette(themeClassName), [themeClassName]);
  const initialCameraState = useMemo(() => readStoredCameraState(), []);
  const graphRef = useRef<ForceGraph3DMethods | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nodeCacheRef = useRef<Map<string, ForceNode>>(new Map());
  const lastReportedLayoutRef = useRef<string>('');
  const cameraStateRef = useRef<CameraState | null>(initialCameraState);
  const captureTimeoutRef = useRef<number | null>(null);
  const lastFocusedNodeRef = useRef<string | null>(null);
  const hasInitialFitRef = useRef(false);
  const viewportSizeRef = useRef({ width: 0, height: 0 });
  const maxNodeCountRef = useRef(0);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isFocusedView, setIsFocusedView] = useState(false);

  useEffect(() => {
    lastReportedLayoutRef.current = JSON.stringify(layoutPositions ?? {});
  }, [layoutPositions]);

  const updateViewportSize = useCallback((width: number, height: number) => {
    const normalizedWidth = Math.max(0, Math.round(width));
    const normalizedHeight = Math.max(0, Math.round(height));
    const current = viewportSizeRef.current;
    if (current.width === normalizedWidth && current.height === normalizedHeight) {
      return;
    }
    viewportSizeRef.current = { width: normalizedWidth, height: normalizedHeight };
    setDimensions((prev) =>
      prev.width === normalizedWidth && prev.height === normalizedHeight
        ? prev
        : { width: normalizedWidth, height: normalizedHeight }
    );
  }, []);

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
      updateViewportSize(width, height);
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, [updateViewportSize]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth > 0 && clientHeight > 0) {
      updateViewportSize(clientWidth, clientHeight);
    }
  }, [updateViewportSize]);

  const getViewportSize = useCallback(() => {
    const current = viewportSizeRef.current;
    if (current.width > 0 && current.height > 0) {
      return current;
    }

    const element = containerRef.current;
    if (element) {
      const width = element.clientWidth;
      const height = element.clientHeight;
      if (width > 0 && height > 0) {
        updateViewportSize(width, height);
        return viewportSizeRef.current;
      }
    }

    return current;
  }, [updateViewportSize]);

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

  const moduleStatusMap = useMemo(() => {
    const map = new Map<string, ModuleStatus>();
    moduleNodes.forEach((node) => {
      if (node.type === 'module') {
        map.set(node.id, node.status);
      }
    });
    return map;
  }, [moduleNodes]);

  const artifactNodes = useMemo<GraphNode[]>(
    () =>
      artifacts.map((artifact) => ({
        ...artifact,
        type: 'artifact',
        reuseScore: 0
      })),
    [artifacts]
  );

  const initiativeNodes = useMemo<GraphNode[]>(
    () =>
      initiatives.map((initiative) => ({
        ...initiative,
        type: 'initiative'
      })),
    [initiatives]
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
    initiativeNodes.forEach(upsertNode);

    return nextNodes;
  }, [domainNodes, artifactNodes, moduleNodes, initiativeNodes, layoutPositions]);

  const graphData = useMemo(
    () => ({
      nodes,
      links
    }),
    [nodes, links]
  );

  const nodeTypeMap = useMemo(() => {
    const map = new Map<string, GraphNode['type']>();
    nodes.forEach((node) => {
      map.set(node.id, node.type);
    });
    return map;
  }, [nodes]);

  const connectionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    links.forEach((link) => {
      counts.set(link.source, (counts.get(link.source) ?? 0) + 1);
      counts.set(link.target, (counts.get(link.target) ?? 0) + 1);
    });
    return counts;
  }, [links]);

  const isolatedNodeIds = useMemo(() => {
    const isolated = new Set<string>();
    nodes.forEach((node) => {
      if ((connectionCounts.get(node.id) ?? 0) === 0) {
        isolated.add(node.id);
      }
    });
    return isolated;
  }, [connectionCounts, nodes]);

  const nodeCount = nodes.length;
  const linkCount = links.length;

  useEffect(() => {
    if (nodeCount > 0) {
      maxNodeCountRef.current = Math.max(maxNodeCountRef.current, nodeCount);
    }
  }, [nodeCount]);

  useEffect(() => {
    if (import.meta.env.DEV && typeof window !== 'undefined' && graphRef.current) {
      (window as typeof window & { __forceGraphRef?: ForceGraph3DMethods }).__forceGraphRef =
        graphRef.current;
    }
  }, [graphData]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) {
      return;
    }

    const renderer = graph.renderer?.();
    const scene = graph.scene?.();
    const camera = graph.camera?.();
    const controls = graph.controls?.();

    if (!renderer || !scene || !camera) {
      return;
    }

    const renderFrame = () => {
      controls?.update?.();
      renderer.render(scene, camera);
    };

    renderer.setAnimationLoop(renderFrame);

    return () => {
      renderer.setAnimationLoop(null);
    };
  }, [graphData, dimensions.width, dimensions.height]);

  useEffect(() => {
    if (!graphRef.current) {
      return;
    }

    const reheat = (graphRef.current as ForceGraph3DMethods & {
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
    if (!graphRef.current) {
      return;
    }

    const graph = graphRef.current;
    const camera = graph.camera?.();
    const controls = graph.controls?.();

    if (!camera || !controls) {
      return;
    }

    const position = camera.position;
    const target = controls.target;

    const nextState: CameraState = {
      position: { x: position.x, y: position.y, z: position.z },
      target: { x: target.x, y: target.y, z: target.z }
    };
    cameraStateRef.current = nextState;
    writeStoredCameraState(nextState);
  }, []);

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
    if (!graphRef.current) {
      return;
    }

    const graph = graphRef.current;
    const saved = cameraStateRef.current;

    if (saved && typeof graph.cameraPosition === 'function') {
      graph.cameraPosition(saved.position, saved.target, 220);
      scheduleCameraCapture(260);
      return;
    }

    graph.zoomToFit?.(260, 80);
    scheduleCameraCapture(320);
  }, [scheduleCameraCapture]);

  useEffect(() => {
    restoreCamera();
  }, [graphData, restoreCamera]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) {
      return;
    }

    const controls = graph.controls?.();
    if (!controls || typeof controls.addEventListener !== 'function') {
      return;
    }

    const handleChange = () => {
      scheduleCameraCapture(160);
    };

    controls.addEventListener('change', handleChange);

    return () => {
      controls.removeEventListener?.('change', handleChange);
    };
  }, [graphData, scheduleCameraCapture]);

  useEffect(() => {
    if (!normalizationRequest || nodes.length === 0) {
      return;
    }

    restoreCamera();

    const graph = graphRef.current;
    if (!graph) {
      return;
    }

    const reheat = (graph as ForceGraph3DMethods & { d3ReheatSimulation?: () => void }).d3ReheatSimulation;
    if (typeof reheat === 'function') {
      reheat();
    }
  }, [normalizationRequest, nodes.length, restoreCamera]);

  const configureSimulation = useCallback(() => {
    if (!graphRef.current || nodes.length === 0) {
      return;
    }

    const graph = graphRef.current;
    const maxNodes = Math.max(maxNodeCountRef.current, nodes.length);
    const relativeDensity =
      maxNodes > 0 ? clamp(Math.sqrt(nodes.length) / Math.sqrt(maxNodes), 0.5, 1) : 1;
    const hasExplicitFilters =
      visibleDomainIds.size > 0 || visibleModuleStatuses.size > 0 || nodes.length < maxNodes;
    const filterScale = hasExplicitFilters ? 0.82 : 1;
    const spacingFactor = relativeDensity * filterScale;

    const baseLinkDistance = clamp(160 * spacingFactor, 58, 220);
    const baseChargeStrength = -110 * spacingFactor;
    const isolatedChargeStrength = -26 * filterScale;
    const chargeDistanceMax = 480 * spacingFactor + (hasExplicitFilters ? 60 : 140);

    const chargeForce = graph.d3Force('charge') as
      | ((alpha: number) => void) &
          {
            strength?: (value?: number | ((node: ForceNode) => number)) => typeof chargeForce;
            distanceMax?: (value?: number) => typeof chargeForce;
            distanceMin?: (value?: number) => typeof chargeForce;
          }
      | undefined;

    if (chargeForce?.strength && chargeForce.distanceMax && chargeForce.distanceMin) {
      chargeForce
        .strength((node: ForceNode) =>
          isolatedNodeIds.has(node.id) ? isolatedChargeStrength : baseChargeStrength
        )
        .distanceMax(chargeDistanceMax)
        .distanceMin(18);
    }

    const linkForce = graph.d3Force('link') as
      | ((alpha: number) => void) &
          {
            distance?: (value?: number | ((link: ForceLink) => number)) => typeof linkForce;
          }
      | undefined;

    if (linkForce?.distance) {
      linkForce.distance((link: ForceLink) => {
        const sourceId =
          typeof link.source === 'object' && link.source
            ? (link.source as ForceNode).id
            : String(link.source);
        const targetId =
          typeof link.target === 'object' && link.target
            ? (link.target as ForceNode).id
            : String(link.target);

        const sourceType = nodeTypeMap.get(sourceId);
        const targetType = nodeTypeMap.get(targetId);

        const involvesDomain = sourceType === 'domain' || targetType === 'domain';
        const involvesInitiative = sourceType === 'initiative' || targetType === 'initiative';
        const involvesArtifact = sourceType === 'artifact' || targetType === 'artifact';

        let distance = baseLinkDistance;

        if (involvesDomain && !involvesInitiative) {
          distance *= 0.72;
        } else if (involvesArtifact) {
          distance *= 0.82;
        } else if (involvesInitiative) {
          distance *= 1.08;
        }

        return clamp(distance, 58, 220);
      });
    }

    const collideForce = forceCollide<ForceNode>()
      .radius((node) => {
        switch (node.type) {
          case 'initiative':
            return 34;
          case 'module':
            return 26;
          case 'domain':
            return 22;
          default:
            return 20;
        }
      })
      .strength(0.9)
      .iterations(2);

    graph.d3Force('collide', collideForce);
    graph.d3ReheatSimulation?.();
  }, [
    isolatedNodeIds,
    nodeTypeMap,
    nodes.length,
    visibleDomainIds,
    visibleModuleStatuses
  ]);

  useEffect(() => {
    configureSimulation();
  }, [configureSimulation]);

  const nodeThreeObject = useCallback(
    (node: ForceNode) => {
      const existing = node.__spriteData;
      if (!existing) {
        const data = createNodeSpriteData(
          node,
          highlightedNode,
          palette,
          visibleDomainIds,
          visibleModuleStatuses
        );
        node.__spriteData = data;
        return data.sprite;
      }

      refreshNodeSpriteData(
        node,
        existing,
        highlightedNode,
        palette,
        visibleDomainIds,
        visibleModuleStatuses
      );
      return existing.sprite;
    },
    [highlightedNode, palette, visibleDomainIds, visibleModuleStatuses]
  );

  useEffect(() => {
    nodeCacheRef.current.forEach((node) => {
      const data = node.__spriteData;
      if (!data) {
        return;
      }
      refreshNodeSpriteData(
        node,
        data,
        highlightedNode,
        palette,
        visibleDomainIds,
        visibleModuleStatuses
      );
    });
    graphRef.current?.refresh?.();
  }, [highlightedNode, palette, visibleDomainIds, visibleModuleStatuses]);

  useEffect(() => {
    if (!highlightedNode) {
      setIsFocusedView(false);
      lastFocusedNodeRef.current = null;
      return;
    }

    if (lastFocusedNodeRef.current && highlightedNode !== lastFocusedNodeRef.current) {
      setIsFocusedView(false);
    }

    const { width, height } = getViewportSize();
    if (!graphRef.current || width <= 0 || height <= 0) {
      return;
    }

    const target = nodeCacheRef.current.get(highlightedNode);
    if (!target || typeof target.x !== 'number' || typeof target.y !== 'number') {
      return;
    }

    const graph = graphRef.current;
    const camera = graph.camera?.();
    const controls = graph.controls?.();

    if (!camera || !controls) {
      return;
    }

    const screenCoords = graph.graph2ScreenCoords?.(
      target.x,
      target.y,
      typeof target.z === 'number' ? target.z : 0
    );
    if (!screenCoords) {
      return;
    }

    const margin = 48;
    const needsPan =
      screenCoords.x < margin ||
      screenCoords.x > width - margin ||
      screenCoords.y < margin ||
      screenCoords.y > height - margin;

    if (needsPan && typeof graph.cameraPosition === 'function') {
      const currentTarget = controls.target;
      const currentPosition = camera.position;
      const directionVector = new Vector3(
        currentPosition.x - currentTarget.x,
        currentPosition.y - currentTarget.y,
        currentPosition.z - currentTarget.z
      );
      const distance = directionVector.length() || 320;
      const direction = directionVector.length() > 0 ? directionVector.normalize() : new Vector3(0, 0, 1);
      const targetVector = new Vector3(
        target.x,
        target.y,
        typeof target.z === 'number' ? target.z : 0
      );
      const nextPosition = targetVector.clone().add(direction.multiplyScalar(distance));

      graph.cameraPosition(
        { x: nextPosition.x, y: nextPosition.y, z: nextPosition.z },
        { x: targetVector.x, y: targetVector.y, z: targetVector.z },
        420
      );

      const nextState: CameraState = {
        position: { x: nextPosition.x, y: nextPosition.y, z: nextPosition.z },
        target: { x: targetVector.x, y: targetVector.y, z: targetVector.z }
      };
      cameraStateRef.current = nextState;
      writeStoredCameraState(nextState);
      scheduleCameraCapture(480);
    }
  }, [getViewportSize, highlightedNode, scheduleCameraCapture]);

  const focusOnNode = useCallback(
    (node: ForceNode): boolean => {
      if (!graphRef.current || typeof node.x !== 'number' || typeof node.y !== 'number') {
        return false;
      }

      const graph = graphRef.current;
      if (typeof graph.cameraPosition !== 'function') {
        return false;
      }

      const camera = graph.camera?.();
      const controls = graph.controls?.();

      if (!camera || !controls) {
        return false;
      }

      const currentTarget = controls.target;
      const currentPosition = camera.position;
      const directionVector = new Vector3(
        currentPosition.x - currentTarget.x,
        currentPosition.y - currentTarget.y,
        currentPosition.z - currentTarget.z
      );
      const currentDistance = directionVector.length() || 320;
      const direction = directionVector.length() > 0 ? directionVector.normalize() : new Vector3(0, 0, 1);

      const viewport = getViewportSize();
      const label = node.name ?? node.id;
      const desiredDistance = computeFocusDistance(viewport, label, currentDistance);

      const targetVector = new Vector3(
        node.x,
        node.y,
        typeof node.z === 'number' ? node.z : 0
      );
      const nextPosition = targetVector.clone().add(direction.multiplyScalar(desiredDistance));

      graph.cameraPosition(
        { x: nextPosition.x, y: nextPosition.y, z: nextPosition.z },
        { x: targetVector.x, y: targetVector.y, z: targetVector.z },
        420
      );

      const nextState: CameraState = {
        position: { x: nextPosition.x, y: nextPosition.y, z: nextPosition.z },
        target: { x: targetVector.x, y: targetVector.y, z: targetVector.z }
      };
      cameraStateRef.current = nextState;
      writeStoredCameraState(nextState);
      lastFocusedNodeRef.current = node.id;
      scheduleCameraCapture(480);
      return true;
    },
    [getViewportSize, scheduleCameraCapture]
  );

  const showEntireGraph = useCallback(() => {
    if (!graphRef.current) {
      return;
    }

    const graph = graphRef.current;
    lastFocusedNodeRef.current = null;
    setIsFocusedView(false);
    cameraStateRef.current = null;
    writeStoredCameraState(null);
    graph.zoomToFit?.(400, 80);
    scheduleCameraCapture(450);
  }, [scheduleCameraCapture]);

  useEffect(() => {
    if (cameraStateRef.current || hasInitialFitRef.current) {
      return;
    }

    if (highlightedNode) {
      return;
    }

    const { width, height } = getViewportSize();
    if (!graphRef.current || width <= 0 || height <= 0) {
      return;
    }

    if (nodes.length === 0) {
      return;
    }

    showEntireGraph();
    hasInitialFitRef.current = true;
  }, [
    getViewportSize,
    highlightedNode,
    nodes,
    showEntireGraph
  ]);

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

  const emitLayoutUpdate = useCallback(
    (reason: LayoutChangeReason) => {
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

      if (typeof node.z === 'number' && !Number.isNaN(node.z)) {
        payload.z = roundCoordinate(node.z);
      }

      if (typeof node.fx === 'number' && !Number.isNaN(node.fx)) {
        payload.fx = roundCoordinate(node.fx);
      }

      if (typeof node.fy === 'number' && !Number.isNaN(node.fy)) {
        payload.fy = roundCoordinate(node.fy);
      }

      if (typeof node.fz === 'number' && !Number.isNaN(node.fz)) {
        payload.fz = roundCoordinate(node.fz);
      }

      entries.push([id, payload]);
    });

    const serialized = JSON.stringify(Object.fromEntries(entries));
    if (serialized === lastReportedLayoutRef.current) {
      return;
    }

    lastReportedLayoutRef.current = serialized;
    onLayoutChange(Object.fromEntries(entries), reason);
  }, [onLayoutChange]);

  const handleNodeDragEnd = useCallback(
    (node: ForceNode) => {
      if (node && typeof node.id === 'string') {
        const layout = layoutPositions[node.id];
        const hasFixedX = typeof layout?.fx === 'number' && Number.isFinite(layout.fx);
        const hasFixedY = typeof layout?.fy === 'number' && Number.isFinite(layout.fy);
        const hasFixedZ = typeof layout?.fz === 'number' && Number.isFinite(layout.fz);

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
        const resolvedZ = resolveCoordinate(
          node.z,
          node.fz,
          layout?.z ?? null,
          layout?.fz ?? null
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

        if (resolvedZ !== null) {
          node.z = resolvedZ;
          node.fz = hasFixedZ ? resolvedZ : undefined;
        } else {
          node.fz = undefined;
          if (layout?.z !== undefined) {
            node.z = layout.z;
          }
        }

        if (typeof node.vx === 'number') {
          node.vx = 0;
        }
        if (typeof node.vy === 'number') {
          node.vy = 0;
        }
        if (typeof node.vz === 'number') {
          node.vz = 0;
        }

        nodeCacheRef.current.set(node.id, node);
      }

      emitLayoutUpdate('drag');
    },
    [emitLayoutUpdate, layoutPositions]
  );

  const handleEngineStop = useCallback(() => {
    emitLayoutUpdate('engine');
  }, [emitLayoutUpdate]);

  return (
    <div ref={containerRef} className={styles.container}>
      <div className={styles.legend}>
        <Badge label="🚀 Модуль • prod" size="s" view="filled" status="warning" />
        <Badge label="🔧 Модуль • in-dev" size="s" view="filled" status="normal" />
        <Badge label="🛑 Модуль • deprecated" size="s" view="filled" status="alert" />
        <Badge label="📂 Домен" size="s" view="filled" status="system" />
        <Badge label="🧩 Артефакт" size="s" view="filled" status="success" />
        <Badge label="🎯 Инициатива" size="s" view="filled" status="warning" />
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
        <ForceGraph3D
          ref={graphRef}
          width={dimensions.width || 600}
          height={dimensions.height || 400}
          backgroundColor="rgba(0, 0, 0, 0)"
          graphData={graphData}
          nodeLabel={(node: ForceNode) => node.name ?? node.id}
          linkColor={(link: ForceLink) =>
            resolveLinkColor(link, palette, visibleDomainIds, visibleModuleStatuses, moduleStatusMap)
          }
          nodeThreeObject={(node) => nodeThreeObject(node as ForceNode)}
          nodeThreeObjectExtend
          onNodeClick={(node) => {
            onSelect(node as ForceNode);
          }}
          onNodeDoubleClick={(node) => {
            handleNodeDoubleClick(node as ForceNode);
          }}
          onNodeDragEnd={handleNodeDragEnd}
          onEngineStop={handleEngineStop}
          enableNodeDrag
          enableNavigationControls
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

  if (typeof layout.z === 'number') {
    node.z = layout.z;
  }

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

  if (typeof layout.fz === 'number') {
    node.fz = layout.fz;
  } else if (node.fz !== undefined) {
    node.fz = undefined;
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
  moduleProduction: string;
  moduleInDev: string;
  moduleDeprecated: string;
  domain: string;
  artifact: string;
  initiative: string;
  text: string;
  linkDependency: string;
  linkProduces: string;
  linkRelates: string;
  linkConsumes: string;
  linkInitiative: string;
};

function createNodeSpriteData(
  node: ForceNode,
  highlighted: string | null,
  palette: GraphPalette,
  visibleDomainIds: Set<string>,
  visibleModuleStatuses: Set<ModuleStatus>
): NodeSpriteData {
  const size = 192;
  const pixelRatio = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2.5) : 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(size * pixelRatio);
  canvas.height = Math.round(size * pixelRatio);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to create canvas context for node sprite');
  }

  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;

  const material = new SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false
  });

  const sprite = new Sprite(material);
  sprite.center.set(0.5, 0.5);

  const data: NodeSpriteData = { canvas, ctx, texture, sprite, pixelRatio, size };
  refreshNodeSpriteData(node, data, highlighted, palette, visibleDomainIds, visibleModuleStatuses);
  return data;
}

function refreshNodeSpriteData(
  node: ForceNode,
  data: NodeSpriteData,
  highlighted: string | null,
  palette: GraphPalette,
  visibleDomainIds: Set<string>,
  visibleModuleStatuses: Set<ModuleStatus>
): void {
  const { ctx, pixelRatio, size, texture, sprite } = data;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, size * pixelRatio, size * pixelRatio);
  ctx.scale(pixelRatio, pixelRatio);
  ctx.translate(size / 2, size / 2);

  const stubNode = { ...node, x: 0, y: 0 } as ForceNode;
  drawNode(stubNode, ctx, 1, highlighted, palette, visibleDomainIds, visibleModuleStatuses);

  ctx.restore();
  texture.needsUpdate = true;

  const isHighlighted = highlighted === node.id;
  const scale = resolveSpriteScale(node, isHighlighted);
  sprite.scale.set(scale, scale, scale);
  sprite.renderOrder = isHighlighted ? 10 : 1;
}

function resolveSpriteScale(node: ForceNode, isHighlighted: boolean): number {
  const base =
    node.type === 'initiative'
      ? 34
      : node.type === 'module'
        ? 28
        : node.type === 'domain'
          ? 26
          : 24;
  return isHighlighted ? base * 1.1 : base;
}

function drawNode(
  node: ForceNode,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
  highlighted: string | null,
  palette: GraphPalette,
  visibleDomainIds: Set<string>,
  visibleModuleStatuses: Set<ModuleStatus>
) {
  const label = node.name ?? node.id;
  const x = typeof node.x === 'number' ? node.x : 0;
  const y = typeof node.y === 'number' ? node.y : 0;
  const isHighlighted = highlighted === node.id;
  const isDomainDimmed =
    node.type === 'domain' && visibleDomainIds.size > 0 && !visibleDomainIds.has(node.id);
  const isModuleDimmed =
    node.type === 'module' &&
    visibleModuleStatuses.size > 0 &&
    !visibleModuleStatuses.has(node.status);
  const baseAlpha = isHighlighted ? 1 : 1;
  const dimFactor =
    (highlighted && node.id !== highlighted ? 0.4 : 1) *
    (isModuleDimmed && !isHighlighted ? 0.35 : 1) *
    (isDomainDimmed && !isHighlighted ? 0.35 : 1);
  const effectiveAlpha = clamp(baseAlpha * dimFactor, 0.1, 1);
  const labelFontSize = Math.max(12 / Math.sqrt(globalScale), 10);
  const iconFontSize = Math.max(14 / Math.sqrt(globalScale), 12);

  ctx.save();
  ctx.globalAlpha = effectiveAlpha;

  let labelOffset = 14;
  let iconColor = palette.text;
  const icon = resolveNodeIcon(node);

  switch (node.type) {
    case 'module': {
      const moduleRadius = 11;
      const fill = resolveModuleColor(node.status, palette);
      renderCircle(ctx, x, y, moduleRadius, fill, withAlpha(fill, 0.35));
      labelOffset = moduleRadius + 8;
      iconColor = '#FFFFFF';
      break;
    }
    case 'domain': {
      const domainRadius = 9;
      renderDiamond(ctx, x, y, domainRadius, palette.domain, withAlpha(palette.domain, 0.35));
      labelOffset = domainRadius + 10;
      break;
    }
    case 'artifact': {
      const artifactRadius = 8;
      renderTriangle(ctx, x, y, artifactRadius, palette.artifact, withAlpha(palette.artifact, 0.35));
      labelOffset = artifactRadius + 10;
      break;
    }
    case 'initiative': {
      const width = 26;
      const height = 16;
      renderRoundedRect(
        ctx,
        x - width / 2,
        y - height / 2,
        width,
        height,
        6,
        palette.initiative,
        withAlpha(palette.initiative, 0.35)
      );
      labelOffset = height / 2 + 10;
      iconColor = '#FFFFFF';
      break;
    }
  }

  if (icon) {
    ctx.font = `${iconFontSize}px sans-serif`;
    ctx.fillStyle = iconColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, x, y);
  }

  const textAlpha = isHighlighted ? 1 : Math.max(effectiveAlpha, 0.45);
  ctx.globalAlpha = textAlpha;
  ctx.font = `${labelFontSize}px sans-serif`;
  ctx.fillStyle = palette.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(label, x, y + labelOffset);

  ctx.restore();
}

function resolveLinkColor(
  link: ForceLink,
  palette: GraphPalette,
  visibleDomainIds: Set<string>,
  visibleModuleStatuses: Set<ModuleStatus>,
  moduleStatusMap: Map<string, ModuleStatus>
) {
  if (link.type === 'initiative-plan') {
    const moduleId =
      typeof link.target === 'object' ? (link.target as ForceNode).id : String(link.target);
    const base = palette.linkInitiative;

    if (visibleModuleStatuses.size > 0) {
      let status: ModuleStatus | undefined;
      if (typeof link.target === 'object' && (link.target as ForceNode).type === 'module') {
        status = (link.target as ForceNode & ModuleNode).status;
      } else {
        status = moduleStatusMap.get(moduleId);
      }

      if (status && !visibleModuleStatuses.has(status)) {
        return withAlpha(base, 0.2);
      }
    }

    return base;
  }

  const baseColor =
    link.type === 'dependency'
      ? palette.linkDependency
      : link.type === 'produces'
        ? palette.linkProduces
        : link.type === 'consumes'
          ? palette.linkConsumes
          : link.type === 'initiative-domain'
            ? palette.linkInitiative
            : palette.linkRelates;

  if ((link.type === 'domain' || link.type === 'initiative-domain') && visibleDomainIds.size > 0) {
    const targetId =
      typeof link.target === 'object' ? (link.target as ForceNode).id : String(link.target);
    if (!visibleDomainIds.has(targetId)) {
      return withAlpha(baseColor, 0.2);
    }
  }

  return baseColor;
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

function renderCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  fill: string,
  outline: string
) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function renderDiamond(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  fill: string,
  outline: string
) {
  ctx.beginPath();
  ctx.moveTo(x, y - radius);
  ctx.lineTo(x + radius, y);
  ctx.lineTo(x, y + radius);
  ctx.lineTo(x - radius, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function renderTriangle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  fill: string,
  outline: string
) {
  ctx.beginPath();
  ctx.moveTo(x, y - radius);
  ctx.lineTo(x + radius, y + radius);
  ctx.lineTo(x - radius, y + radius);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function renderRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string,
  outline: string
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function resolveModuleColor(status: ModuleStatus, palette: GraphPalette): string {
  switch (status) {
    case 'production':
      return palette.moduleProduction;
    case 'in-dev':
      return palette.moduleInDev;
    case 'deprecated':
    default:
      return palette.moduleDeprecated;
  }
}

const MODULE_ICON_MAP: Record<ModuleStatus, string> = {
  production: '🚀',
  'in-dev': '🔧',
  deprecated: '🛑'
};

function resolveNodeIcon(node: GraphNode): string {
  if (node.type === 'module') {
    return MODULE_ICON_MAP[node.status];
  }

  if (node.type === 'domain') {
    return '📂';
  }

  if (node.type === 'artifact') {
    return '🧩';
  }

  if (node.type === 'initiative') {
    return '🎯';
  }

  return '';
}

function resolvePalette(themeClassName?: string): GraphPalette {
  if (typeof window === 'undefined') {
    return DEFAULT_PALETTE;
  }

  const themeElement = themeClassName ? document.querySelector(`.${themeClassName}`) : null;
  const styles = getComputedStyle((themeElement as HTMLElement) ?? document.body);
  const getVar = (token: string, fallback: string) => styles.getPropertyValue(token).trim() || fallback;

  return {
    moduleProduction: getVar('--color-bg-warning', DEFAULT_PALETTE.moduleProduction),
    moduleInDev: getVar('--color-bg-normal', DEFAULT_PALETTE.moduleInDev),
    moduleDeprecated: getVar('--color-bg-alert', DEFAULT_PALETTE.moduleDeprecated),
    domain: getVar('--color-bg-info', DEFAULT_PALETTE.domain),
    artifact: getVar('--color-bg-success', DEFAULT_PALETTE.artifact),
    initiative: getVar('--color-bg-brand', DEFAULT_PALETTE.initiative),
    text: getVar('--color-typo-primary', DEFAULT_PALETTE.text),
    linkDependency: getVar('--color-bg-border', DEFAULT_PALETTE.linkDependency),
    linkProduces: getVar('--color-bg-success', DEFAULT_PALETTE.linkProduces),
    linkRelates: getVar('--color-bg-info', DEFAULT_PALETTE.linkRelates),
    linkConsumes: getVar('--color-bg-normal', DEFAULT_PALETTE.linkConsumes),
    linkInitiative: getVar('--color-bg-accent', DEFAULT_PALETTE.linkInitiative)
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

function computeFocusDistance(
  dimensions: { width: number; height: number },
  label: string,
  currentDistance: number
): number {
  const zoom = computeFocusZoom(dimensions, label);
  const normalizedZoom = clamp(zoom, 2.6, 4.2);
  const baseline = clamp(currentDistance || 320, 220, 760);
  const distance = baseline / (normalizedZoom / 2.6);
  return clamp(distance, 160, 540);
}

const DEFAULT_PALETTE: GraphPalette = {
  moduleProduction: '#FF8C69',
  moduleInDev: '#4C9AFF',
  moduleDeprecated: '#D06C6C',
  domain: '#5B8FF9',
  artifact: '#45C7B0',
  initiative: '#A25DDC',
  text: '#1F1F1F',
  linkDependency: '#B8B8B8',
  linkProduces: '#45C7B0',
  linkRelates: '#5B8FF9',
  linkConsumes: '#8E8E93',
  linkInitiative: '#A25DDC'
};

export type { GraphNode };
export default GraphView;
