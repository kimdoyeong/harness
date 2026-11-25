import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { init, SKILL_DEST } from '../src/init.js';
import { fakeSource, hashes, realSkillDir, tmpDir } from './helpers.js';

const skillResults = (results) => results.filter((r) => r.path.startsWith(SKILL_DEST));

test('R1: 빈 대상에 원본의 모든 스킬 파일을 같은 내용으로 만든다', (t) => {
  const source = fakeSource(t);
  fs.mkdirSync(path.join(source, 'nested'));
  fs.writeFileSync(path.join(source, 'nested/extra.md'), 'extra\n');
  const target = tmpDir(t, 'target');

  const results = init({ targetDir: target, skillSourceDir: source });

  assert.deepEqual(hashes(path.join(target, SKILL_DEST)), hashes(source));
  assert.deepEqual(skillResults(results), [
    { path: `${SKILL_DEST}/SKILL.md`, status: 'created' },
    { path: `${SKILL_DEST}/nested/extra.md`, status: 'created' },
    { path: `${SKILL_DEST}/templates.md`, status: 'created' },
  ]);
});

test('R1: 실제 저장소의 스킬 폴더를 원본으로 써도 같다', (t) => {
  const target = tmpDir(t, 'target');

  init({ targetDir: target, skillSourceDir: realSkillDir });

  const copied = hashes(path.join(target, SKILL_DEST));
  assert.deepEqual(copied, hashes(realSkillDir));
  assert.deepEqual(Object.keys(copied).sort(), ['SKILL.md', 'templates.md']);
});

test('R4: 대상에서 고친 스킬 파일은 원본 내용으로 돌아온다', (t) => {
  const source = fakeSource(t);
  const target = tmpDir(t, 'target');
  init({ targetDir: target, skillSourceDir: source });
  fs.writeFileSync(path.join(target, SKILL_DEST, 'SKILL.md'), 'local edit\n');

  const results = init({ targetDir: target, skillSourceDir: source });

  assert.deepEqual(hashes(path.join(target, SKILL_DEST)), hashes(source));
  assert.deepEqual(skillResults(results), [
    { path: `${SKILL_DEST}/SKILL.md`, status: 'updated' },
    { path: `${SKILL_DEST}/templates.md`, status: 'unchanged' },
  ]);
});

test('R6: 원본을 고치면 다음 실행에 반영된다', (t) => {
  const source = fakeSource(t);
  const target = tmpDir(t, 'target');
  init({ targetDir: target, skillSourceDir: source });
  fs.writeFileSync(path.join(source, 'SKILL.md'), '# skill v2\n');

  const results = init({ targetDir: target, skillSourceDir: source });

  assert.equal(fs.readFileSync(path.join(target, SKILL_DEST, 'SKILL.md'), 'utf8'), '# skill v2\n');
  assert.equal(skillResults(results)[0].status, 'updated');
});

test('원본에 없는 파일과 다른 스킬 폴더는 건드리지 않는다', (t) => {
  const source = fakeSource(t);
  const target = tmpDir(t, 'target');
  fs.mkdirSync(path.join(target, SKILL_DEST), { recursive: true });
  fs.mkdirSync(path.join(target, '.claude/skills/other'), { recursive: true });
  fs.writeFileSync(path.join(target, SKILL_DEST, 'my-notes.md'), 'mine\n');
  fs.writeFileSync(path.join(target, '.claude/skills/other/SKILL.md'), 'other\n');

  init({ targetDir: target, skillSourceDir: source });

  assert.equal(fs.readFileSync(path.join(target, SKILL_DEST, 'my-notes.md'), 'utf8'), 'mine\n');
  assert.equal(fs.readFileSync(path.join(target, '.claude/skills/other/SKILL.md'), 'utf8'), 'other\n');
});

test('R8: 원본과 대상이 같은 폴더면 unchanged이고 내용이 그대로다', (t) => {
  const target = tmpDir(t, 'target');
  const source = path.join(target, SKILL_DEST);
  fs.mkdirSync(source, { recursive: true });
  fs.writeFileSync(path.join(source, 'SKILL.md'), '# skill v1\n');
  fs.writeFileSync(path.join(source, 'templates.md'), fs.readFileSync(path.join(realSkillDir, 'templates.md')));
  const before = hashes(source);

  const results = init({ targetDir: target, skillSourceDir: source });

  assert.deepEqual(hashes(source), before);
  assert.deepEqual(skillResults(results).map((r) => r.status), ['unchanged', 'unchanged']);
});
