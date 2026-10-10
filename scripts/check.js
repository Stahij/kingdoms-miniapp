'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const jsFiles = [
  'server.js',
  'public/game.js',
  'public/economy.js',
  'public/three-renderer.js'
];
let failed = false;

for (const file of jsFiles) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) {
    console.error('Missing required file:', file);
    failed = true;
    continue;
  }
  const result = spawnSync(process.execPath, ['--check', full], { encoding: 'utf8' });
  if (result.status !== 0) {
    console.error('Syntax check failed:', file);
    process.stderr.write(result.stderr || result.stdout);
    failed = true;
  } else {
    console.log('OK syntax:', file);
  }
}

const htmlPath = path.join(root, 'public/index.html');
if (fs.existsSync(htmlPath)) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  for (const required of ['economy.js', 'three-renderer.js', 'game.js']) {
    if (!html.includes(required)) {
      console.error('public/index.html does not include', required);
      failed = true;
    }
  }
  console.log('OK client script references');
} else {
  console.error('Missing required file: public/index.html');
  failed = true;
}

const glbDir = path.join(root, 'public/assets/kenney/Models/GLB format');
for (const file of ['tower.glb', 'tower-top.glb', 'tree-large.glb', 'wall-fortified.glb']) {
  if (!fs.existsSync(path.join(glbDir, file))) {
    console.error('Missing expected 3D asset:', file);
    failed = true;
  }
}
if (!failed) console.log('OK required 3D assets');
process.exitCode = failed ? 1 : 0;
