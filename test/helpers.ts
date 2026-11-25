import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { TestContext } from 'node:test';
import { fileURLToPath } from 'node:url';

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const realSkillDir = path.join(repoRoot, '.claude/skills/ai-sdlc');

export function tmpDir(t: TestContext, name: string): string {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), `harness-${name}-`)));
  t.after(() => {
    fs.chmodSync(dir, 0o755);
    fs.rmSync(dir, { recursive: true, force: true });
  });
  return dir;
}

// A stand-in for the repository's skill folder, so tests can edit the source.
export function fakeSource(t: TestContext): string {
  const dir = tmpDir(t, 'source');
  fs.writeFileSync(path.join(dir, 'SKILL.md'), '# skill v1\n');
  fs.copyFileSync(path.join(realSkillDir, 'templates.md'), path.join(dir, 'templates.md'));
  return dir;
}

export function hashes(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const entry of fs.readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || entry.name === '.DS_Store') continue;
    const file = path.join(entry.parentPath, entry.name);
    out[path.relative(dir, file)] = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  }
  return out;
}

export function capture() {
  const chunks: string[] = [];
  return { write: (s: string) => chunks.push(s), text: () => chunks.join('') };
}
