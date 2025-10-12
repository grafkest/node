import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, afterEach, beforeEach, test } from 'node:test';
import {
  closeGraphStore,
  initializeGraphStore,
  loadSnapshot,
  persistSnapshot
} from './graphStore';
import { GRAPH_SNAPSHOT_VERSION, type GraphSnapshotPayload } from '../src/types/graph';
import {
  artifacts as initialArtifacts,
  domainTree as initialDomainTree,
  modules as initialModules
} from '../src/data';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'graph-store-tests-'));
let databasePath: string;

beforeEach(() => {
  databasePath = path.join(tempRoot, `${crypto.randomUUID()}.db`);
});

afterEach(() => {
  closeGraphStore();
  if (databasePath && fs.existsSync(databasePath)) {
    fs.unlinkSync(databasePath);
  }
});

after(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true });
});

test('seeds initial data when database is empty by default', { concurrency: false }, async () => {
  await initializeGraphStore({ databasePath });
  const snapshot = loadSnapshot();

  assert.equal(snapshot.modules.length, initialModules.length);
  assert.equal(snapshot.domains.length, initialDomainTree.length);
  assert.equal(snapshot.artifacts.length, initialArtifacts.length);
});

test('persists snapshots and reloads them from disk', { concurrency: false }, async () => {
  await initializeGraphStore({ databasePath, seedWithInitialData: false });

  const customSnapshot: GraphSnapshotPayload = {
    version: GRAPH_SNAPSHOT_VERSION,
    exportedAt: new Date().toISOString(),
    domains: [
      {
        id: 'root-domain',
        name: 'Root domain',
        description: 'Test root domain',
        children: [
          { id: 'child-domain', name: 'Child domain', description: 'Nested domain' }
        ]
      }
    ],
    modules: [
      {
        id: 'module-alpha',
        name: 'Module Alpha',
        description: 'A test module',
        domains: ['root-domain'],
        team: 'Test Team',
        productName: 'Test Product',
        projectTeam: [],
        technologyStack: [],
        localization: 'ru',
        ridOwner: { company: 'Test Co', division: 'Digital' },
        userStats: { companies: 1, licenses: 10 },
        status: 'production',
        repository: 'https://example.com/repo',
        api: 'https://example.com/api',
        specificationUrl: '#spec',
        apiContractsUrl: '#contracts',
        techDesignUrl: '#design',
        architectureDiagramUrl: '#diagram',
        licenseServerIntegrated: true,
        libraries: [],
        clientType: 'web',
        deploymentTool: 'docker',
        dependencies: [],
        produces: ['artifact-x'],
        reuseScore: 5,
        metrics: { tests: 12, coverage: 80, automationRate: 60 },
        dataIn: [],
        dataOut: [
          {
            id: 'output-1',
            label: 'Primary output',
            consumerIds: ['module-beta']
          }
        ],
        formula: 'x + y',
        nonFunctional: {
          responseTimeMs: 100,
          throughputRps: 50,
          resourceConsumption: 'low',
          baselineUsers: 200
        }
      },
      {
        id: 'module-beta',
        name: 'Module Beta',
        description: 'Second module',
        domains: ['child-domain'],
        team: 'Beta Team',
        productName: 'Test Product',
        projectTeam: [],
        technologyStack: [],
        localization: 'ru',
        ridOwner: { company: 'Test Co', division: 'R&D' },
        userStats: { companies: 1, licenses: 5 },
        status: 'in-dev',
        repository: undefined,
        api: undefined,
        specificationUrl: '#spec-beta',
        apiContractsUrl: '#contracts-beta',
        techDesignUrl: '#design-beta',
        architectureDiagramUrl: '#diagram-beta',
        licenseServerIntegrated: false,
        libraries: [],
        clientType: 'desktop',
        deploymentTool: 'kubernetes',
        dependencies: ['module-alpha'],
        produces: [],
        reuseScore: 0,
        metrics: { tests: 0, coverage: 0, automationRate: 0 },
        dataIn: [
          {
            id: 'input-1',
            label: 'Alpha output',
            sourceId: 'artifact-x'
          }
        ],
        dataOut: [],
        formula: '',
        nonFunctional: {
          responseTimeMs: 0,
          throughputRps: 0,
          resourceConsumption: 'medium',
          baselineUsers: 0
        }
      }
    ],
    artifacts: [
      {
        id: 'artifact-x',
        name: 'Artifact X',
        description: 'Shared artifact',
        domainId: 'root-domain',
        producedBy: 'module-alpha',
        consumerIds: ['module-beta'],
        dataType: 'json',
        sampleUrl: 'https://example.com/sample.json'
      }
    ],
    layout: {
      nodes: {
        'module-alpha': { x: 10, y: 20, fx: 10, fy: 20 },
        'module-beta': { x: 120, y: 35 },
        'artifact-x': { x: 60, y: 80 }
      }
    }
  };

  persistSnapshot(customSnapshot);
  const storedSnapshot = JSON.parse(JSON.stringify(customSnapshot)) as GraphSnapshotPayload;
  const loaded = loadSnapshot();

  assert.deepEqual(loaded.modules, storedSnapshot.modules);
  assert.deepEqual(loaded.domains, storedSnapshot.domains);
  assert.deepEqual(loaded.artifacts, storedSnapshot.artifacts);
  assert.deepEqual(loaded.layout, storedSnapshot.layout);

  closeGraphStore();

  await initializeGraphStore({ databasePath, seedWithInitialData: false });
  const reloaded = loadSnapshot();

  assert.deepEqual(reloaded.modules, storedSnapshot.modules);
  assert.deepEqual(reloaded.domains, storedSnapshot.domains);
  assert.deepEqual(reloaded.artifacts, storedSnapshot.artifacts);
  assert.deepEqual(reloaded.layout, storedSnapshot.layout);
});

test('normalizes invalid layout entries on persist', { concurrency: false }, async () => {
  await initializeGraphStore({ databasePath, seedWithInitialData: false });

  const snapshot: GraphSnapshotPayload = {
    version: GRAPH_SNAPSHOT_VERSION,
    exportedAt: new Date().toISOString(),
    domains: [],
    modules: [],
    artifacts: [],
    layout: {
      nodes: {
        valid: { x: 1, y: 2, fx: Number.NaN, fy: 3 },
        invalidNumbers: { x: Number.NaN, y: 5 },
        withInfinity: { x: 3, y: 4, fx: 6, fy: Number.POSITIVE_INFINITY }
      }
    }
  };

  persistSnapshot(snapshot);
  const loaded = loadSnapshot();

  assert.ok(loaded.layout);
  assert.deepEqual(loaded.layout?.nodes.valid, { x: 1, y: 2, fy: 3 });
  assert.ok(!('invalidNumbers' in loaded.layout!.nodes));
  assert.deepEqual(loaded.layout?.nodes.withInfinity, { x: 3, y: 4, fx: 6 });
});
