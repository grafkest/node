import cors from 'cors';
import express from 'express';
import type { Request, Response } from 'express';
import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  artifacts as initialArtifacts,
  domainTree as initialDomainTree,
  modules as initialModules
} from '../src/data';
import type { ArtifactNode, DomainNode, ModuleNode } from '../src/data';
import {
  GRAPH_SNAPSHOT_VERSION,
  type GraphSnapshotPayload
} from '../src/types/graph';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDirectory = path.resolve(__dirname, '..', 'data');
const databasePath = path.join(dataDirectory, 'graph.db');

fs.mkdirSync(dataDirectory, { recursive: true });

let db: SqlJsDatabase | null = null;
const require = createRequire(import.meta.url);
const sqlJsWasmDirectory = path.dirname(require.resolve('sql.js/dist/sql-wasm.wasm'));

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/api/graph', (_req: Request, res: Response) => {
  try {
    const snapshot = loadSnapshot();
    res.json(snapshot);
  } catch (error) {
    console.error('Failed to load graph snapshot', error);
    res.status(500).json({ message: 'Не удалось получить данные графа.' });
  }
});

app.post('/api/graph', (req: Request, res: Response) => {
  const payload = req.body;

  if (!isGraphSnapshotPayload(payload)) {
    res.status(400).json({ message: 'Некорректный формат данных графа.' });
    return;
  }

  try {
    persistSnapshot(payload);
    res.status(204).end();
  } catch (error) {
    console.error('Failed to save graph snapshot', error);
    res.status(500).json({ message: 'Не удалось сохранить данные графа.' });
  }
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

void initializeDatabase()
  .then(() => {
    const port = Number.parseInt(process.env.PORT ?? '4000', 10);
    app.listen(port, () => {
      console.log(`Graph storage server listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database', error);
    process.exit(1);
  });

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

async function initializeDatabase(): Promise<void> {
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(sqlJsWasmDirectory, file)
  });

  const databaseExists = fs.existsSync(databasePath);
  const initialData = databaseExists ? fs.readFileSync(databasePath) : null;

  try {
    db = initialData && initialData.length > 0 ? new SQL.Database(initialData) : new SQL.Database();
  } catch (error) {
    console.warn('Failed to load existing database, creating a new one.', error);
    db = new SQL.Database();
  }

  initializeSchema();
  const seeded = seedInitialData();

  if (!seeded) {
    persistDatabase();
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

function loadSnapshot(): GraphSnapshotPayload {
  const database = assertDatabase();

  const domainRows: DomainRow[] = [];
  const domainStatement = database.prepare(
    'SELECT id, name, description, parent_id, position FROM domains ORDER BY parent_id IS NOT NULL, parent_id, position'
  );
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

  const moduleRows: ModuleRow[] = [];
  const moduleStatement = database.prepare(
    'SELECT id, data, position FROM modules ORDER BY position'
  );
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

  const artifactRows: ArtifactRow[] = [];
  const artifactStatement = database.prepare(
    'SELECT id, data, position FROM artifacts ORDER BY position'
  );
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

  return {
    version: version ? Number.parseInt(version, 10) : GRAPH_SNAPSHOT_VERSION,
    exportedAt: exportedAt ?? undefined,
    domains: buildDomainTree(domainRows),
    modules: moduleRows.map((row) => JSON.parse(row.data) as ModuleNode),
    artifacts: artifactRows.map((row) => JSON.parse(row.data) as ArtifactNode)
  };
}

function persistSnapshot(snapshot: GraphSnapshotPayload): void {
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

    const insertModule = database.prepare(
      'INSERT INTO modules (id, position, data) VALUES (?, ?, ?)'
    );
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

    upsertMetadata('snapshotVersion', String(snapshot.version ?? GRAPH_SNAPSHOT_VERSION));
    upsertMetadata('updatedAt', snapshot.exportedAt ?? new Date().toISOString());

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
      return {
        id: node.id,
        name: node.name,
        description: node.description,
        children: children.length > 0 ? children : undefined
      };
    });
  };

  return build(null);
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

function persistDatabase(): void {
  const database = assertDatabase();
  const exported = database.export();
  fs.writeFileSync(databasePath, exported);
}

function assertDatabase(): SqlJsDatabase {
  if (!db) {
    throw new Error('Database has not been initialized');
  }

  return db;
}

function isGraphSnapshotPayload(value: unknown): value is GraphSnapshotPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<GraphSnapshotPayload>;
  if (!Array.isArray(candidate.domains) || !Array.isArray(candidate.modules) || !Array.isArray(candidate.artifacts)) {
    return false;
  }

  return true;
}
