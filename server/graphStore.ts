import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ArtifactNode, DomainNode, ModuleNode } from '../src/data';
import {
  artifacts as initialArtifacts,
  domainTree as initialDomainTree,
  modules as initialModules
} from '../src/data';
import {
  GRAPH_SNAPSHOT_VERSION,
  type GraphLayoutSnapshot,
  type GraphSnapshotPayload
} from '../src/types/graph';

type GraphStoreOptions = {
  databasePath?: string;
  seedWithInitialData?: boolean;
};

type DomainRow = {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  position: number;
};

type ModuleRow = {
  id: string;
  data: string;
  position: number;
};

type ArtifactRow = {
  id: string;
  data: string;
  position: number;
};

const require = createRequire(import.meta.url);
const sqlJsWasmDirectory = path.dirname(require.resolve('sql.js/dist/sql-wasm.wasm'));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultDataDirectory = path.resolve(__dirname, '..', 'data');
const defaultDatabasePath = path.join(defaultDataDirectory, 'graph.db');

let sqlModulePromise: Promise<typeof import('sql.js')> | null = null;
let db: SqlJsDatabase | null = null;
let activeDatabasePath: string | null = null;

export async function initializeGraphStore(options?: GraphStoreOptions): Promise<void> {
  const SQL = await loadSqlModule();
  const databasePath = resolveDatabasePath(options?.databasePath);

  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  const initialData = fs.existsSync(databasePath) ? fs.readFileSync(databasePath) : null;

  disposeDatabase();

  try {
    db = initialData && initialData.length > 0 ? new SQL.Database(initialData) : new SQL.Database();
  } catch (error) {
    console.warn('Failed to load existing database, creating a new one.', error);
    db = new SQL.Database();
  }

  activeDatabasePath = databasePath;

  initializeSchema();

  const shouldSeed = options?.seedWithInitialData ?? true;
  if (shouldSeed) {
    seedInitialData();
  }

  persistDatabase();
}

export function closeGraphStore(): void {
  disposeDatabase();
  activeDatabasePath = null;
}

export function loadSnapshot(): GraphSnapshotPayload {
  const database = assertDatabase();

  const domainStatement = database.prepare(
    'SELECT id, name, description, parent_id, position FROM domains ORDER BY parent_id IS NOT NULL, parent_id, position'
  );
  const domainRows: DomainRow[] = [];
  try {
    while (domainStatement.step()) {
      const row = domainStatement.getAsObject() as DomainRow;
      domainRows.push({
        id: String(row.id),
        name: String(row.name),
        description: row.description ?? null,
        parent_id: row.parent_id ?? null,
        position: Number(row.position)
      });
    }
  } finally {
    domainStatement.free();
  }

  const moduleStatement = database.prepare('SELECT id, data, position FROM modules ORDER BY position');
  const moduleRows: ModuleRow[] = [];
  try {
    while (moduleStatement.step()) {
      const row = moduleStatement.getAsObject() as ModuleRow;
      moduleRows.push({
        id: String(row.id),
        data: String(row.data),
        position: Number(row.position)
      });
    }
  } finally {
    moduleStatement.free();
  }

  const artifactStatement = database.prepare('SELECT id, data, position FROM artifacts ORDER BY position');
  const artifactRows: ArtifactRow[] = [];
  try {
    while (artifactStatement.step()) {
      const row = artifactStatement.getAsObject() as ArtifactRow;
      artifactRows.push({
        id: String(row.id),
        data: String(row.data),
        position: Number(row.position)
      });
    }
  } finally {
    artifactStatement.free();
  }

  const version = readMetadata('snapshotVersion');
  const exportedAt = readMetadata('updatedAt');
  const layoutRaw = readMetadata('layout');
  const layout = layoutRaw ? safeParseLayout(layoutRaw) : undefined;

  return {
    version: version ? Number.parseInt(version, 10) : GRAPH_SNAPSHOT_VERSION,
    exportedAt: exportedAt ?? undefined,
    domains: buildDomainTree(domainRows),
    modules: moduleRows.map((row) => JSON.parse(row.data) as ModuleNode),
    artifacts: artifactRows.map((row) => JSON.parse(row.data) as ArtifactNode),
    layout
  };
}

export function persistSnapshot(snapshot: GraphSnapshotPayload): void {
  const database = assertDatabase();

  try {
    database.run('BEGIN TRANSACTION');
    database.run('DELETE FROM domains');
    database.run('DELETE FROM modules');
    database.run('DELETE FROM artifacts');

    const domainRows = flattenDomains(snapshot.domains);
    const insertDomain = database.prepare(
      'INSERT INTO domains (id, name, description, parent_id, position) VALUES (?, ?, ?, ?, ?)'
    );
    try {
      domainRows.forEach((row) => {
        insertDomain.run([
          row.id,
          row.name,
          row.description ?? null,
          row.parent_id,
          row.position
        ]);
      });
    } finally {
      insertDomain.free();
    }

    const insertModule = database.prepare('INSERT INTO modules (id, position, data) VALUES (?, ?, ?)');
    try {
      snapshot.modules.forEach((module, index) => {
        insertModule.run([module.id, index, JSON.stringify(module)]);
      });
    } finally {
      insertModule.free();
    }

    const insertArtifact = database.prepare(
      'INSERT INTO artifacts (id, position, data) VALUES (?, ?, ?)'
    );
    try {
      snapshot.artifacts.forEach((artifact, index) => {
        insertArtifact.run([artifact.id, index, JSON.stringify(artifact)]);
      });
    } finally {
      insertArtifact.free();
    }

    const normalizedLayout = normalizeLayout(snapshot.layout);

    upsertMetadata('snapshotVersion', String(snapshot.version ?? GRAPH_SNAPSHOT_VERSION));
    upsertMetadata('updatedAt', snapshot.exportedAt ?? new Date().toISOString());

    if (normalizedLayout) {
      upsertMetadata('layout', JSON.stringify(normalizedLayout));
    } else {
      deleteMetadata('layout');
    }

    database.run('COMMIT');
    persistDatabase();
  } catch (error) {
    try {
      database.run('ROLLBACK');
    } catch {
      // ignore rollback errors
    }
    throw error;
  }
}

export function isGraphSnapshotPayload(value: unknown): value is GraphSnapshotPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<GraphSnapshotPayload>;
  if (
    !Array.isArray(candidate.domains) ||
    !Array.isArray(candidate.modules) ||
    !Array.isArray(candidate.artifacts)
  ) {
    return false;
  }

  return true;
}

function loadSqlModule(): Promise<typeof import('sql.js')> {
  if (!sqlModulePromise) {
    sqlModulePromise = initSqlJs({
      locateFile: (file) => path.join(sqlJsWasmDirectory, file)
    });
  }
  return sqlModulePromise;
}

function resolveDatabasePath(explicitPath?: string): string {
  if (explicitPath) {
    return explicitPath;
  }

  return defaultDatabasePath;
}

function disposeDatabase(): void {
  if (db) {
    try {
      db.close();
    } catch {
      // ignore close errors
    }
    db = null;
  }
}

function initializeSchema(): void {
  const database = assertDatabase();
  database.run(`
    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS domains (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      parent_id TEXT REFERENCES domains(id) ON DELETE CASCADE,
      position INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS modules (
      id TEXT PRIMARY KEY,
      position INTEGER NOT NULL,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS artifacts (
      id TEXT PRIMARY KEY,
      position INTEGER NOT NULL,
      data TEXT NOT NULL
    );
  `);
}

function seedInitialData(): boolean {
  const domainCount = countRows('domains');
  const moduleCount = countRows('modules');
  const artifactCount = countRows('artifacts');

  if (domainCount > 0 || moduleCount > 0 || artifactCount > 0) {
    return false;
  }

  const snapshot: GraphSnapshotPayload = {
    version: GRAPH_SNAPSHOT_VERSION,
    exportedAt: new Date().toISOString(),
    domains: initialDomainTree,
    modules: initialModules,
    artifacts: initialArtifacts
  };

  persistSnapshot(snapshot);
  return true;
}

function countRows(table: 'domains' | 'modules' | 'artifacts'): number {
  const database = assertDatabase();
  const statement = database.prepare(`SELECT COUNT(*) as count FROM ${table}`);

  try {
    const hasRow = statement.step();
    if (!hasRow) {
      return 0;
    }

    const result = statement.getAsObject() as { count?: number };
    return typeof result.count === 'number' ? result.count : 0;
  } finally {
    statement.free();
  }
}

function flattenDomains(domains: DomainNode[], parentId: string | null = null): DomainRow[] {
  return domains.flatMap((domain, index) => {
    const row: DomainRow = {
      id: domain.id,
      name: domain.name,
      description: domain.description ?? null,
      parent_id: parentId,
      position: index
    };

    const children = domain.children ? flattenDomains(domain.children, domain.id) : [];
    return [row, ...children];
  });
}

function buildDomainTree(rows: DomainRow[]): DomainNode[] {
  const childrenMap = new Map<string | null, Array<DomainNode & { position: number }>>();

  rows.forEach((row) => {
    const node: DomainNode & { position: number } = {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      position: row.position
    };

    if (!childrenMap.has(row.parent_id)) {
      childrenMap.set(row.parent_id, []);
    }

    childrenMap.get(row.parent_id)?.push(node);
  });

  const build = (parentId: string | null): DomainNode[] => {
    const nodes = childrenMap.get(parentId) ?? [];
    nodes.sort((a, b) => a.position - b.position);

    return nodes.map((node) => {
      const children = build(node.id);
      const domain: DomainNode = {
        id: node.id,
        name: node.name,
        description: node.description
      };

      if (children.length > 0) {
        domain.children = children;
      }

      return domain;
    });
  };

  return build(null);
}

function safeParseLayout(raw: string): GraphLayoutSnapshot | undefined {
  try {
    const parsed = JSON.parse(raw) as GraphLayoutSnapshot;
    return normalizeLayout(parsed);
  } catch {
    return undefined;
  }
}

function normalizeLayout(
  layout: GraphLayoutSnapshot | undefined | null
): GraphLayoutSnapshot | undefined {
  if (!layout || typeof layout !== 'object' || !layout.nodes) {
    return undefined;
  }

  const entries = Object.entries(layout.nodes).reduce<
    Array<[string, GraphLayoutSnapshot['nodes'][string]]>
  >((acc, [id, position]) => {
    if (!position || typeof position !== 'object') {
      return acc;
    }

    const x = Number((position as { x?: number }).x);
    const y = Number((position as { y?: number }).y);

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return acc;
    }

    const next: GraphLayoutSnapshot['nodes'][string] = { x, y };
    const fx = (position as { fx?: number }).fx;
    const fy = (position as { fy?: number }).fy;

    if (Number.isFinite(fx)) {
      next.fx = Number(fx);
    }

    if (Number.isFinite(fy)) {
      next.fy = Number(fy);
    }

    acc.push([id, next]);
    return acc;
  }, []);

  if (entries.length === 0) {
    return undefined;
  }

  return { nodes: Object.fromEntries(entries) };
}

function readMetadata(key: string): string | null {
  const database = assertDatabase();
  const statement = database.prepare('SELECT value FROM metadata WHERE key = ?');

  try {
    statement.bind([key]);
    if (!statement.step()) {
      return null;
    }

    const result = statement.getAsObject() as { value?: string };
    return result.value ?? null;
  } finally {
    statement.free();
  }
}

function upsertMetadata(key: string, value: string): void {
  const database = assertDatabase();
  const statement = database.prepare(
    'INSERT INTO metadata (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  );

  try {
    statement.run([key, value]);
  } finally {
    statement.free();
  }
}

function deleteMetadata(key: string): void {
  const database = assertDatabase();
  const statement = database.prepare('DELETE FROM metadata WHERE key = ?');

  try {
    statement.run([key]);
  } finally {
    statement.free();
  }
}

function persistDatabase(): void {
  if (!activeDatabasePath) {
    return;
  }

  const database = assertDatabase();
  const exported = database.export();
  fs.writeFileSync(activeDatabasePath, exported);
}

function assertDatabase(): SqlJsDatabase {
  if (!db) {
    throw new Error('Database has not been initialized');
  }

  return db;
}

export type { GraphStoreOptions };
