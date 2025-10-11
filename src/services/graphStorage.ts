import { GRAPH_SNAPSHOT_VERSION, type GraphSnapshotPayload } from '../types/graph';

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
    artifacts: snapshot.artifacts
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
