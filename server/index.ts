import cors from 'cors';
import express from 'express';
import type { Request, Response } from 'express';
import process from 'node:process';
import {
  closeGraphStore,
  initializeGraphStore,
  isGraphSnapshotPayload,
  loadSnapshot,
  persistSnapshot
} from './graphStore';

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

void initializeGraphStore()
  .then(() => {
    const port = Number.parseInt(process.env.PORT ?? '4000', 10);
    const server = app.listen(port, () => {
      console.log(`Graph storage server listening on port ${port}`);
    });

    const shutdown = () => {
      console.log('Shutting down graph storage server');
      closeGraphStore();
      server.close(() => {
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  })
  .catch((error) => {
    console.error('Failed to initialize database', error);
    process.exit(1);
  });
