import fs from 'node:fs';
import path from 'node:path';
import { AGENTS_MD, extractStatusTemplate } from './templates.js';

export const SKILL_DEST = '.claude/skills/ai-sdlc';

const EXISTS_NOTE = '이미 있음';

// Finder metadata is not part of the skill.
const IGNORED = new Set(['.DS_Store']);

// A write that could not be done. `results` holds what was done before it.
export class WriteError extends Error {
  constructor(file, reason) {
    super(`쓰지 못했습니다: ${file} (${reason})`);
    this.name = 'WriteError';
    this.results = [];
  }
}

function listFiles(dir, prefix = '') {
  const names = fs.readdirSync(dir).filter((name) => !IGNORED.has(name)).sort();
  const files = [];
  for (const name of names) {
    const rel = prefix ? `${prefix}/${name}` : name;
    if (fs.statSync(path.join(dir, name)).isDirectory()) {
      files.push(...listFiles(path.join(dir, name), rel));
    } else {
      files.push(rel);
    }
  }
  return files;
}

function readIfExists(file) {
  try {
    return fs.readFileSync(file);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

// True for anything at that path, including a dangling symlink. Does not open it.
function exists(file) {
  return fs.lstatSync(file, { throwIfNoEntry: false }) !== undefined;
}

function isInside(parent, child) {
  const rel = path.relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

// Refuses a destination that a symlink inside the target would redirect to
// somewhere outside it.
function assertInsideTarget(realTargetDir, rel) {
  const dest = path.resolve(realTargetDir, rel);
  if (!isInside(realTargetDir, dest)) {
    throw new WriteError(rel, '대상 폴더 밖의 경로입니다');
  }
  for (let current = dest; ; current = path.dirname(current)) {
    const stat = fs.lstatSync(current, { throwIfNoEntry: false });
    if (stat === undefined) continue;
    // A dangling symlink has no real path, and writing through it would
    // create its outside destination.
    const real = stat.isSymbolicLink() && !fs.existsSync(current) ? null : fs.realpathSync(current);
    if (real === null || !isInside(realTargetDir, real)) {
      throw new WriteError(rel, '심볼릭 링크가 대상 폴더 밖을 가리킵니다');
    }
    return dest;
  }
}

function write(realTargetDir, rel, data) {
  const dest = assertInsideTarget(realTargetDir, rel);
  try {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, data);
  } catch (error) {
    throw new WriteError(rel, error.message);
  }
}

// Always brings the target in line with the source. Files the source does not
// have are never read or removed.
function syncSkill({ realTargetDir, skillSourceDir, results }) {
  for (const file of listFiles(skillSourceDir)) {
    const rel = `${SKILL_DEST}/${file}`;
    const source = fs.readFileSync(path.join(skillSourceDir, file));
    const current = readIfExists(path.join(realTargetDir, rel));

    if (current === null) {
      write(realTargetDir, rel, source);
      results.push({ path: rel, status: 'created' });
    } else if (current.equals(source)) {
      results.push({ path: rel, status: 'unchanged' });
    } else {
      write(realTargetDir, rel, source);
      results.push({ path: rel, status: 'updated' });
    }
  }
}

// For files the user edits: written once, then never opened again.
function createOnce({ realTargetDir, rel, data, results }) {
  if (exists(path.join(realTargetDir, rel))) {
    results.push({ path: rel, status: 'skipped', note: EXISTS_NOTE });
    return;
  }
  write(realTargetDir, rel, data);
  results.push({ path: rel, status: 'created' });
}

function createDirOnce({ realTargetDir, rel, results }) {
  if (exists(path.join(realTargetDir, rel))) {
    results.push({ path: `${rel}/`, status: 'skipped', note: EXISTS_NOTE });
    return;
  }
  write(realTargetDir, `${rel}/.gitkeep`, '');
  results.push({ path: `${rel}/.gitkeep`, status: 'created' });
}

export function init({ targetDir, skillSourceDir }) {
  const realTargetDir = fs.realpathSync(targetDir);
  const results = [];

  // Read the form before writing anything, so a broken templates.md leaves
  // the target untouched.
  const statusMd = exists(path.join(realTargetDir, 'docs/STATUS.md'))
    ? null
    : extractStatusTemplate(fs.readFileSync(path.join(skillSourceDir, 'templates.md'), 'utf8'));

  try {
    syncSkill({ realTargetDir, skillSourceDir, results });
    createOnce({ realTargetDir, rel: 'docs/STATUS.md', data: statusMd, results });
    createDirOnce({ realTargetDir, rel: 'docs/specs', results });
    createDirOnce({ realTargetDir, rel: 'docs/archive', results });
    createOnce({ realTargetDir, rel: 'AGENTS.md', data: AGENTS_MD, results });
  } catch (error) {
    if (error instanceof WriteError) error.results = results;
    throw error;
  }
  return results;
}
