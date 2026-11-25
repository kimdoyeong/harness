import fs from 'node:fs';
import path from 'node:path';
import { AGENTS_MD, extractStatusTemplate } from './templates.ts';

export const SKILL_DEST = '.claude/skills/ai-sdlc';

export type Status = 'created' | 'updated' | 'unchanged' | 'skipped';

export interface InitResult {
  path: string;
  status: Status;
  note?: string;
}

export interface InitOptions {
  /** The project to set up. */
  targetDir: string;
  /** The repository's skill folder that is copied from. */
  skillSourceDir: string;
}

interface Step {
  realTargetDir: string;
  results: InitResult[];
}

const EXISTS_NOTE = '이미 있음';

// Finder metadata is not part of the skill.
const IGNORED = new Set(['.DS_Store']);

// A write that could not be done. `results` holds what was done before it.
export class WriteError extends Error {
  results: InitResult[] = [];

  constructor(file: string, reason: string) {
    super(`쓰지 못했습니다: ${file} (${reason})`);
    this.name = 'WriteError';
  }
}

// Runs a file-system step on the target and reports any failure against the
// path being worked on, so the message always names it.
function onTarget<T>(rel: string, step: () => T): T {
  try {
    return step();
  } catch (error) {
    if (error instanceof WriteError) throw error;
    throw new WriteError(rel, error instanceof Error ? error.message : String(error));
  }
}

// Regular files only. Symlinks are skipped rather than followed: one that
// points at a parent folder would never end, and a dangling one cannot be read.
function listFiles(dir: string, prefix = ''): string[] {
  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => !IGNORED.has(entry.name))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const files: string[] = [];
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...listFiles(path.join(dir, entry.name), rel));
    } else if (entry.isFile()) {
      files.push(rel);
    }
  }
  return files;
}

interface SourceFile {
  file: string;
  data: Buffer;
}

function readSkill(skillSourceDir: string): SourceFile[] {
  return listFiles(skillSourceDir).map((file) => ({
    file,
    data: fs.readFileSync(path.join(skillSourceDir, file)),
  }));
}

function readIfExists(file: string): Buffer | null {
  try {
    return fs.readFileSync(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

// True for anything at that path, including a dangling symlink. Does not open it.
function exists(file: string): boolean {
  return fs.lstatSync(file, { throwIfNoEntry: false }) !== undefined;
}

function isInside(parent: string, child: string): boolean {
  const rel = path.relative(parent, child);
  // A name such as "..data" also starts with two dots but is not a parent.
  const escapes = rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel);
  return !escapes;
}

// Refuses a destination that a symlink inside the target would redirect to
// somewhere outside it.
function assertInsideTarget(realTargetDir: string, rel: string): string {
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

function write(realTargetDir: string, rel: string, data: string | Buffer): void {
  onTarget(rel, () => {
    const dest = assertInsideTarget(realTargetDir, rel);
    // Writing through a link would change whatever it points at, such as a
    // file that belongs to another skill.
    if (fs.lstatSync(dest, { throwIfNoEntry: false })?.isSymbolicLink()) {
      throw new WriteError(rel, '심볼릭 링크라서 덮어쓰지 않습니다');
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, data);
  });
}

// Always brings the target in line with the source. Files the source does not
// have are never read or removed.
function syncSkill({ realTargetDir, skill, results }: Step & { skill: SourceFile[] }): void {
  for (const { file, data: source } of skill) {
    const rel = `${SKILL_DEST}/${file}`;
    const current = onTarget(rel, () => readIfExists(path.join(realTargetDir, rel)));

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
function createOnce({ realTargetDir, rel, data, results }: Step & { rel: string; data: () => string }): void {
  if (onTarget(rel, () => exists(path.join(realTargetDir, rel)))) {
    results.push({ path: rel, status: 'skipped', note: EXISTS_NOTE });
    return;
  }
  write(realTargetDir, rel, data());
  results.push({ path: rel, status: 'created' });
}

function createDirOnce({ realTargetDir, rel, results }: Step & { rel: string }): void {
  if (onTarget(`${rel}/`, () => exists(path.join(realTargetDir, rel)))) {
    results.push({ path: `${rel}/`, status: 'skipped', note: EXISTS_NOTE });
    return;
  }
  write(realTargetDir, `${rel}/.gitkeep`, '');
  results.push({ path: `${rel}/.gitkeep`, status: 'created' });
}

export function init({ targetDir, skillSourceDir }: InitOptions): InitResult[] {
  const realTargetDir = fs.realpathSync(targetDir);
  const results: InitResult[] = [];

  // Read everything from the source before writing anything, so an unreadable
  // skill file or a broken templates.md leaves the target untouched.
  const skill = readSkill(skillSourceDir);
  const statusMd = onTarget('docs/STATUS.md', () => exists(path.join(realTargetDir, 'docs/STATUS.md')))
    ? null
    : extractStatusTemplate(fs.readFileSync(path.join(skillSourceDir, 'templates.md'), 'utf8'));

  try {
    syncSkill({ realTargetDir, skill, results });
    createOnce({ realTargetDir, rel: 'docs/STATUS.md', data: () => statusMd ?? '', results });
    createDirOnce({ realTargetDir, rel: 'docs/specs', results });
    createDirOnce({ realTargetDir, rel: 'docs/archive', results });
    createOnce({ realTargetDir, rel: 'AGENTS.md', data: () => AGENTS_MD, results });
  } catch (error) {
    if (error instanceof WriteError) error.results = results;
    throw error;
  }
  return results;
}
