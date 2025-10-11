import {
  GRAPH_SNAPSHOT_VERSION,
  type GraphLayoutSnapshot,
  type GraphSnapshotPayload
} from '../types/graph';

const API_BASE = import.meta.env.VITE_API_BASE ?? '';
const GRAPH_ENDPOINT = '/api/graph';

export async function fetchGraphSnapshot(signal?: AbortSignal): Promise<GraphSnapshotPayload> {
  const response = await fetch(`${API_BASE}${GRAPH_ENDPOINT}`, { signal });

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
    layout: normalizeLayout(snapshot.layout)
  };
}

export async function persistGraphSnapshot(
  snapshot: GraphSnapshotPayload,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch(`${API_BASE}${GRAPH_ENDPOINT}`, {
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

function normalizeLayout(layout: GraphSnapshotPayload['layout']): GraphLayoutSnapshot | undefined {
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

  return { nodes: Object.fromEntries(normalizedEntries) };
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
