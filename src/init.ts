import fs from 'node:fs';
import path from 'node:path';
import { AGENTS_MD, extractStatusTemplate } from './templates.ts';

export const SKILL_DEST = '.claude/skills/ai-sdlc';
export const CODEX_SKILL_DEST = '.agents/skills/ai-sdlc';
export const SKILL_DESTS = [SKILL_DEST, CODEX_SKILL_DEST];

export type Status = 'created' | 'updated' | 'unchanged' | 'skipped';

export interface InitResult {
  path: string;
  status: Status;
  note?: string;
}

export interface InitOptions {
  targetDir: string;
  skillSourceDir: string;
}

interface Step {
  realTargetDir: string;
  results: InitResult[];
}

const EXISTS_NOTE = '이미 있음';

const IGNORED = new Set(['.DS_Store']);

export class WriteError extends Error {
  results: InitResult[] = [];

  constructor(file: string, reason: string) {
    super(`쓰지 못했습니다: ${file} (${reason})`);
    this.name = 'WriteError';
  }
}

function onTarget<T>(rel: string, step: () => T): T {
  try {
    return step();
  } catch (error) {
    if (error instanceof WriteError) throw error;
    throw new WriteError(rel, error instanceof Error ? error.message : String(error));
  }
}

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

function exists(file: string): boolean {
  return fs.lstatSync(file, { throwIfNoEntry: false }) !== undefined;
}

function isInside(parent: string, child: string): boolean {
  const rel = path.relative(parent, child);
  const escapes = rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel);
  return !escapes;
}

function assertInsideTarget(realTargetDir: string, rel: string): string {
  const dest = path.resolve(realTargetDir, rel);
  if (!isInside(realTargetDir, dest)) {
    throw new WriteError(rel, '대상 폴더 밖의 경로입니다');
  }
  for (let current = dest; ; current = path.dirname(current)) {
    const stat = fs.lstatSync(current, { throwIfNoEntry: false });
    if (stat === undefined) continue;
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
    if (fs.lstatSync(dest, { throwIfNoEntry: false })?.isSymbolicLink()) {
      throw new WriteError(rel, '심볼릭 링크라서 덮어쓰지 않습니다');
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, data);
  });
}

function syncSkill({ realTargetDir, dest, skill, results }: Step & { dest: string; skill: SourceFile[] }): void {
  for (const { file, data: source } of skill) {
    const rel = `${dest}/${file}`;
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

  const skill = readSkill(skillSourceDir);
  const statusMd = onTarget('docs/STATUS.md', () => exists(path.join(realTargetDir, 'docs/STATUS.md')))
    ? null
    : extractStatusTemplate(fs.readFileSync(path.join(skillSourceDir, 'templates.md'), 'utf8'));

  try {
    for (const dest of SKILL_DESTS) syncSkill({ realTargetDir, dest, skill, results });
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
