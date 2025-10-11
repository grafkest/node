import type { ArtifactNode, DomainNode, ModuleNode } from '../data';

export const GRAPH_SNAPSHOT_VERSION = 1;

export type GraphSnapshotPayload = {
  version: number;
  exportedAt?: string;
  modules: ModuleNode[];
  domains: DomainNode[];
  artifacts: ArtifactNode[];
};

export type GraphSyncStatus =
  | { state: 'idle'; message?: string }
  | { state: 'saving'; message?: string }
  | { state: 'error'; message: string };
