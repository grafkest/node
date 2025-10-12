import type { ArtifactNode, DomainNode, ModuleNode } from '../data';

export const GRAPH_SNAPSHOT_VERSION = 1;

export type GraphLayoutNodePosition = {
  x: number;
  y: number;
  fx?: number;
  fy?: number;
};

export type GraphLayoutSnapshot = {
  nodes: Record<string, GraphLayoutNodePosition>;
};

export type GraphSnapshotPayload = {
  version: number;
  exportedAt?: string;
  modules: ModuleNode[];
  domains: DomainNode[];
  artifacts: ArtifactNode[];
  layout?: GraphLayoutSnapshot;
};

export type GraphSyncStatus =
  | { state: 'idle'; message?: string }
  | { state: 'saving'; message?: string }
  | { state: 'error'; message: string };

export type GraphSummary = {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt?: string;
};

export type GraphCopyRequest = {
  graphId: string;
  includeDomains: boolean;
  includeModules: boolean;
  includeArtifacts: boolean;
};
