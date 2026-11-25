import fs from 'node:fs';
import path from 'node:path';

export const SKILL_DEST = '.claude/skills/ai-sdlc';

// Finder metadata is not part of the skill.
const IGNORED = new Set(['.DS_Store']);

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

function write(targetDir, rel, data) {
  const dest = path.join(targetDir, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, data);
}

// Always brings the target in line with the source. Files the source does not
// have are never read or removed.
function syncSkill({ targetDir, skillSourceDir, results }) {
  for (const file of listFiles(skillSourceDir)) {
    const rel = `${SKILL_DEST}/${file}`;
    const source = fs.readFileSync(path.join(skillSourceDir, file));
    const current = readIfExists(path.join(targetDir, rel));

    if (current === null) {
      write(targetDir, rel, source);
      results.push({ path: rel, status: 'created' });
    } else if (current.equals(source)) {
      results.push({ path: rel, status: 'unchanged' });
    } else {
      write(targetDir, rel, source);
      results.push({ path: rel, status: 'updated' });
    }
  }
}

export function init({ targetDir, skillSourceDir }) {
  const results = [];
  syncSkill({ targetDir, skillSourceDir, results });
  return results;
}
