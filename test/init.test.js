import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { init, SKILL_DEST, WriteError } from '../src/init.js';
import { AGENTS_MD, extractStatusTemplate } from '../src/templates.js';
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

const realStatusTemplate = () =>
  extractStatusTemplate(fs.readFileSync(path.join(realSkillDir, 'templates.md'), 'utf8'));

test('R2, R3: 빈 대상에 docs 뼈대와 AGENTS.md를 만든다', (t) => {
  const source = fakeSource(t);
  const target = tmpDir(t, 'target');

  const results = init({ targetDir: target, skillSourceDir: source });

  assert.equal(fs.readFileSync(path.join(target, 'docs/STATUS.md'), 'utf8'), realStatusTemplate());
  assert.equal(fs.readFileSync(path.join(target, 'docs/specs/.gitkeep'), 'utf8'), '');
  assert.equal(fs.readFileSync(path.join(target, 'docs/archive/.gitkeep'), 'utf8'), '');
  assert.equal(fs.readFileSync(path.join(target, 'AGENTS.md'), 'utf8'), AGENTS_MD);
  assert.deepEqual(results.slice(2), [
    { path: 'docs/STATUS.md', status: 'created' },
    { path: 'docs/specs/.gitkeep', status: 'created' },
    { path: 'docs/archive/.gitkeep', status: 'created' },
    { path: 'AGENTS.md', status: 'created' },
  ]);
});

test('R3: AGENTS.md의 내용은 spec에 적힌 그대로다', () => {
  const spec = fs.readFileSync(path.join(realSkillDir, '../../../docs/specs/cli.md'), 'utf8');
  const section = spec.slice(spec.indexOf('### 생성되는 `AGENTS.md`'));
  const block = section.split('```')[1].replace(/^\n/, '');
  assert.equal(AGENTS_MD, block);
});

test('STATUS 양식은 templates.md의 코드 블록 그대로다', () => {
  const status = realStatusTemplate();
  assert.ok(status.startsWith('# Status\n'));
  assert.ok(status.includes('## 알려진 문제\n'));
  assert.ok(status.endsWith('테스트가 처음에 통과했는지.\n'));
  assert.ok(!status.includes('```'));
});

test('extractStatusTemplate: 제목이나 코드 블록이 없으면 오류', () => {
  assert.throws(() => extractStatusTemplate('# 양식\n'), /절을 찾지 못했습니다/);
  assert.throws(() => extractStatusTemplate('## docs/STATUS.md\n\n글만 있음\n'), /코드 블록을 찾지 못했습니다/);
  assert.throws(
    () => extractStatusTemplate('## docs/STATUS.md\n\n## 다음 절\n```\nx\n```\n'),
    /코드 블록을 찾지 못했습니다/,
  );
});

test('R2: docs/specs가 이미 있으면 그 안에 아무것도 만들지 않는다', (t) => {
  const source = fakeSource(t);
  const target = tmpDir(t, 'target');
  fs.mkdirSync(path.join(target, 'docs/specs'), { recursive: true });
  fs.writeFileSync(path.join(target, 'docs/specs/a.md'), 'a\n');

  const results = init({ targetDir: target, skillSourceDir: source });

  assert.deepEqual(fs.readdirSync(path.join(target, 'docs/specs')), ['a.md']);
  assert.ok(fs.existsSync(path.join(target, 'docs/archive/.gitkeep')));
  assert.deepEqual(results.find((r) => r.path === 'docs/specs/'), {
    path: 'docs/specs/',
    status: 'skipped',
    note: '이미 있음',
  });
});

test('R4: 다시 실행해도 docs와 AGENTS.md는 내용과 수정 시각이 그대로다', (t) => {
  const source = fakeSource(t);
  const target = tmpDir(t, 'target');
  init({ targetDir: target, skillSourceDir: source });
  const kept = ['docs/STATUS.md', 'AGENTS.md', 'docs/specs/.gitkeep', 'docs/archive/.gitkeep'];
  fs.writeFileSync(path.join(target, 'docs/STATUS.md'), 'my status\n');
  fs.writeFileSync(path.join(target, 'AGENTS.md'), 'my agents\n');
  const snapshot = () =>
    kept.map((rel) => {
      const file = path.join(target, rel);
      return [rel, fs.readFileSync(file, 'utf8'), fs.statSync(file).mtimeMs];
    });
  const before = snapshot();

  const results = init({ targetDir: target, skillSourceDir: source });

  assert.deepEqual(snapshot(), before);
  assert.deepEqual(
    results.slice(2).map((r) => r.status),
    ['skipped', 'skipped', 'skipped', 'skipped'],
  );
});

test('R7: 결과의 모든 경로가 대상 폴더 아래다', (t) => {
  const source = fakeSource(t);
  const target = tmpDir(t, 'target');

  const results = init({ targetDir: target, skillSourceDir: source });

  for (const { path: rel } of results) {
    assert.ok(!path.relative(target, path.resolve(target, rel)).startsWith('..'), rel);
  }
});

test('R7: 대상 안의 심볼릭 링크가 밖을 가리키면 쓰지 않는다', (t) => {
  const source = fakeSource(t);
  const outside = tmpDir(t, 'outside');
  const target = tmpDir(t, 'target');
  fs.symlinkSync(outside, path.join(target, '.claude'));

  assert.throws(() => init({ targetDir: target, skillSourceDir: source }), WriteError);
  assert.deepEqual(fs.readdirSync(outside), []);
});

test('R7: 끊어진 심볼릭 링크를 타고 밖에 파일을 만들지 않는다', (t) => {
  const source = fakeSource(t);
  const outside = tmpDir(t, 'outside');
  const target = tmpDir(t, 'target');
  fs.mkdirSync(path.join(target, SKILL_DEST), { recursive: true });
  fs.symlinkSync(path.join(outside, 'planted.md'), path.join(target, SKILL_DEST, 'SKILL.md'));

  assert.throws(() => init({ targetDir: target, skillSourceDir: source }), WriteError);
  assert.deepEqual(fs.readdirSync(outside), []);
});
