import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { run } from '../src/cli.js';
import { capture, fakeSource, repoRoot, tmpDir } from './helpers.js';

const bin = path.join(repoRoot, 'bin/harness.js');

const HELP = `사용법: harness init

  init    현재 폴더에 ai-sdlc 스킬, docs 뼈대, AGENTS.md를 만든다.
          스킬 파일은 항상 최신으로 덮어쓰고, 이미 있는 docs와 AGENTS.md는 건드리지 않는다.
`;

function runCli(argv) {
  const stdout = capture();
  const stderr = capture();
  const code = run({ argv, cwd: '/nonexistent', skillSourceDir: '/nonexistent', stdout, stderr });
  return { code, stdout: stdout.text(), stderr: stderr.text() };
}

test('인자가 없으면 사용법을 출력하고 0으로 끝난다', () => {
  assert.deepEqual(runCli([]), { code: 0, stdout: HELP, stderr: '' });
});

test('--help는 사용법을 출력하고 0으로 끝난다', () => {
  assert.deepEqual(runCli(['--help']), { code: 0, stdout: HELP, stderr: '' });
});

test('모르는 명령은 stderr에 사용법을 쓰고 1로 끝난다', () => {
  assert.deepEqual(runCli(['foo']), {
    code: 1,
    stdout: '',
    stderr: '알 수 없는 명령: foo\n사용법: harness init\n',
  });
});

test('모르는 옵션은 1로 끝난다', () => {
  assert.deepEqual(runCli(['init', '--foo']), {
    code: 1,
    stdout: '',
    stderr: '알 수 없는 명령: init --foo\n사용법: harness init\n',
  });
});

test('init 뒤의 추가 인자는 1로 끝난다', () => {
  assert.deepEqual(runCli(['init', 'extra']), {
    code: 1,
    stdout: '',
    stderr: '알 수 없는 명령: init extra\n사용법: harness init\n',
  });
});

test('bin: --help는 0, 모르는 명령은 1', () => {
  const help = spawnSync(process.execPath, [bin, '--help'], { encoding: 'utf8' });
  assert.equal(help.status, 0);
  assert.equal(help.stdout, HELP);

  const unknown = spawnSync(process.execPath, [bin, 'foo'], { encoding: 'utf8' });
  assert.equal(unknown.status, 1);
  assert.equal(unknown.stderr, '알 수 없는 명령: foo\n사용법: harness init\n');
});

test('R5: init은 다룬 파일마다 상태를 한 줄씩 출력하고 0으로 끝난다', (t) => {
  const source = fakeSource(t);
  const target = tmpDir(t, 'target');
  const runInit = () => {
    const stdout = capture();
    const stderr = capture();
    const code = run({ argv: ['init'], cwd: target, skillSourceDir: source, stdout, stderr });
    return { code, stdout: stdout.text(), stderr: stderr.text() };
  };

  const first = runInit();
  assert.equal(first.code, 0);
  assert.equal(first.stderr, '');
  assert.ok(first.stdout.startsWith(`harness init: ${target}\n\n`));
  assert.ok(first.stdout.includes('  created    .claude/skills/ai-sdlc/SKILL.md\n'));
  assert.ok(first.stdout.includes('  created    .claude/skills/ai-sdlc/templates.md\n'));

  fs.writeFileSync(path.join(source, 'SKILL.md'), '# skill v2\n');
  const second = runInit();
  assert.equal(second.code, 0);
  assert.ok(second.stdout.includes('  updated    .claude/skills/ai-sdlc/SKILL.md\n'));
  assert.ok(second.stdout.includes('  unchanged  .claude/skills/ai-sdlc/templates.md\n'));
});
