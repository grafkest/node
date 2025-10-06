/* eslint-env node */

const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');

function getStaticDir() {
  const buildDir = path.join(__dirname, 'dist');
  if (!fs.existsSync(buildDir)) {
    throw new Error('Build artifacts not found. Run "npm run build" before packaging.');
  }

  if (!process.pkg) {
    return buildDir;
  }

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'domain-graph-'));
  const targetDir = path.join(tempRoot, 'dist');
  fs.cpSync(buildDir, targetDir, { recursive: true });
  return targetDir;
}

function openBrowser(url) {
  if (process.env.NO_AUTO_OPEN) {
    return;
  }

  const platform = process.platform;
  let command;
  let args;

  if (platform === 'darwin') {
    command = 'open';
    args = [url];
  } else if (platform === 'win32') {
    command = 'cmd';
    args = ['/c', 'start', '', url];
  } else {
    command = 'xdg-open';
    args = [url];
  }

  try {
    const { spawn } = require('child_process');
    const child = spawn(command, args, { stdio: 'ignore', detached: true });
    child.unref();
  } catch (error) {
    console.warn('Failed to open browser automatically:', error.message);
  }
}

function start() {
  const app = express();
  const staticDir = getStaticDir();
  const port = Number(process.env.PORT || 4173);

  app.use(express.static(staticDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
  });

  app.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log(`Domain graph viewer running at ${url}`);
    openBrowser(url);
  });
}

start();
