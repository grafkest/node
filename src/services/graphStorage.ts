import {
  GRAPH_SNAPSHOT_VERSION,
  type GraphCopyRequest,
  type GraphLayoutSnapshot,
  type GraphSnapshotPayload,
  type GraphSummary
} from '../types/graph';

const API_BASE = import.meta.env.VITE_API_BASE ?? '';
const GRAPHS_ENDPOINT = '/api/graphs';

export async function fetchGraphSummaries(signal?: AbortSignal): Promise<GraphSummary[]> {
  const response = await fetch(`${API_BASE}${GRAPHS_ENDPOINT}`, { signal });

  if (!response.ok) {
    throw new Error(`Не удалось загрузить список графов. Код ответа: ${response.status}`);
  }

  const payload = (await response.json()) as GraphSummary[];
  return payload.map((graph) => ({
    ...graph,
    createdAt: graph.createdAt,
    updatedAt: graph.updatedAt ?? undefined,
    isDefault: Boolean(graph.isDefault)
  }));
}

export async function createGraph(
  payload: {
    name: string;
    sourceGraphId?: string | null;
    includeDomains: boolean;
    includeModules: boolean;
    includeArtifacts: boolean;
  },
  signal?: AbortSignal
): Promise<GraphSummary> {
  const response = await fetch(`${API_BASE}${GRAPHS_ENDPOINT}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(
      message ?? `Не удалось создать граф. Код ответа: ${response.status}`
    );
  }

  const graph = (await response.json()) as GraphSummary;
  return { ...graph, isDefault: Boolean(graph.isDefault), updatedAt: graph.updatedAt ?? undefined };
}

export async function deleteGraph(graphId: string, signal?: AbortSignal): Promise<void> {
  const response = await fetch(`${API_BASE}${GRAPHS_ENDPOINT}/${encodeURIComponent(graphId)}`, {
    method: 'DELETE',
    signal
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message ?? `Не удалось удалить граф. Код ответа: ${response.status}`);
  }
}

export async function fetchGraphSnapshot(
  graphId: string,
  signal?: AbortSignal
): Promise<GraphSnapshotPayload> {
  const response = await fetch(`${API_BASE}${GRAPHS_ENDPOINT}/${encodeURIComponent(graphId)}`, {
    signal
  });

  if (!response.ok) {
    throw new Error(`Не удалось загрузить граф. Код ответа: ${response.status}`);
  }

  const snapshot = (await response.json()) as GraphSnapshotPayload;
  return {
    version: snapshot.version ?? GRAPH_SNAPSHOT_VERSION,
    exportedAt: snapshot.exportedAt,
    modules: snapshot.modules,
    domains: snapshot.domains,
    artifacts: snapshot.artifacts,
    layout: normalizeLayoutSnapshot(snapshot.layout)
  };
}

export async function persistGraphSnapshot(
  graphId: string,
  snapshot: GraphSnapshotPayload,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch(`${API_BASE}${GRAPHS_ENDPOINT}/${encodeURIComponent(graphId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(snapshot),
    signal
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(
      message ?? `Не удалось сохранить граф. Код ответа: ${response.status}`
    );
  }
}

export function normalizeLayoutSnapshot(
  layout: GraphSnapshotPayload['layout']
): GraphLayoutSnapshot | undefined {
  if (!layout || typeof layout !== 'object' || !layout.nodes) {
    return undefined;
  }

  const normalizedEntries = Object.entries(layout.nodes).reduce<
    Array<[string, GraphLayoutSnapshot['nodes'][string]]>
  >((acc, [id, position]) => {
    if (!position || typeof position !== 'object') {
      return acc;
    }

    const { x, y, fx, fy } = position as GraphLayoutSnapshot['nodes'][string];

    if (typeof x !== 'number' || Number.isNaN(x) || typeof y !== 'number' || Number.isNaN(y)) {
      return acc;
    }

    const next: GraphLayoutSnapshot['nodes'][string] = { x, y };

    if (typeof fx === 'number' && !Number.isNaN(fx)) {
      next.fx = fx;
    }

    if (typeof fy === 'number' && !Number.isNaN(fy)) {
      next.fy = fy;
    }

    acc.push([id, next]);
    return acc;
  }, []);

  if (normalizedEntries.length === 0) {
    return undefined;
  }

  return { nodes: Object.fromEntries(normalizedEntries) };
}

export async function importGraphFromSource(
  request: GraphCopyRequest,
  signal?: AbortSignal
): Promise<GraphSnapshotPayload> {
  const snapshot = await fetchGraphSnapshot(request.graphId, signal);
  return {
    version: snapshot.version,
    exportedAt: snapshot.exportedAt,
    domains: request.includeDomains ? snapshot.domains : [],
    modules: request.includeModules ? snapshot.modules : [],
    artifacts: request.includeArtifacts ? snapshot.artifacts : [],
    layout:
      request.includeModules && snapshot.layout
        ? normalizeLayoutSnapshot(snapshot.layout) ?? undefined
        : undefined
  };
}

async function readErrorMessage(response: Response): Promise<string | null> {
  try {
    const data = (await response.json()) as { message?: string } | undefined;
    if (data && typeof data.message === 'string') {
      return data.message;
    }
  } catch {
    // ignore JSON parse errors
  }
  return null;
}
