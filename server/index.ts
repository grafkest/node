import cors from 'cors';
import express from 'express';
import type { Request, Response } from 'express';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
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

const db = new Database(databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

initializeSchema();
seedInitialData();

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

const port = Number.parseInt(process.env.PORT ?? '4000', 10);
app.listen(port, () => {
  console.log(`Graph storage server listening on port ${port}`);
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

function initializeSchema(): void {
  db.exec(`
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

function seedInitialData(): void {
  const domainCount = countRows('domains');
  const moduleCount = countRows('modules');
  const artifactCount = countRows('artifacts');

  if (domainCount > 0 || moduleCount > 0 || artifactCount > 0) {
    return;
  }

  const snapshot: GraphSnapshotPayload = {
    version: GRAPH_SNAPSHOT_VERSION,
    exportedAt: new Date().toISOString(),
    domains: initialDomainTree,
    modules: initialModules,
    artifacts: initialArtifacts
  };

  persistSnapshot(snapshot);
}

function countRows(table: 'domains' | 'modules' | 'artifacts'): number {
  const statement = db.prepare(`SELECT COUNT(*) as count FROM ${table}`);
  const result = statement.get() as { count: number };
  return result.count;
}

function loadSnapshot(): GraphSnapshotPayload {
  const domainRows = db
    .prepare<[], DomainRow>('SELECT * FROM domains ORDER BY parent_id IS NOT NULL, parent_id, position')
    .all();
  const moduleRows = db
    .prepare<[], ModuleRow>('SELECT * FROM modules ORDER BY position')
    .all();
  const artifactRows = db
    .prepare<[], ArtifactRow>('SELECT * FROM artifacts ORDER BY position')
    .all();

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
  const save = db.transaction((payload: GraphSnapshotPayload) => {
    db.prepare('DELETE FROM domains').run();
    db.prepare('DELETE FROM modules').run();
    db.prepare('DELETE FROM artifacts').run();

    const domainRows = flattenDomains(payload.domains);
    const insertDomain = db.prepare(
      'INSERT INTO domains (id, name, description, parent_id, position) VALUES (?, ?, ?, ?, ?)'
    );
    domainRows.forEach((row) => {
      insertDomain.run(row.id, row.name, row.description, row.parent_id, row.position);
    });

    const insertModule = db.prepare(
      'INSERT INTO modules (id, position, data) VALUES (?, ?, ?)' 
    );
    payload.modules.forEach((module, index) => {
      insertModule.run(module.id, index, JSON.stringify(module));
    });

    const insertArtifact = db.prepare(
      'INSERT INTO artifacts (id, position, data) VALUES (?, ?, ?)' 
    );
    payload.artifacts.forEach((artifact, index) => {
      insertArtifact.run(artifact.id, index, JSON.stringify(artifact));
    });

    upsertMetadata('snapshotVersion', String(payload.version ?? GRAPH_SNAPSHOT_VERSION));
    upsertMetadata('updatedAt', payload.exportedAt ?? new Date().toISOString());
  });

  save(snapshot);
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
  const statement = db.prepare('SELECT value FROM metadata WHERE key = ?');
  const result = statement.get(key) as { value?: string } | undefined;
  return result?.value ?? null;
}

function upsertMetadata(key: string, value: string): void {
  db.prepare(
    'INSERT INTO metadata (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, value);
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
