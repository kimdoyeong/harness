import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { run } from '../src/cli.ts';
import { capture, fakeSource, repoRoot, tmpDir } from './helpers.ts';

const bin = path.join(repoRoot, 'bin/harness.ts');

const HELP = `사용법: harness init

  init    현재 폴더에 ai-sdlc 스킬, docs 뼈대, AGENTS.md를 만든다.
          스킬 파일은 항상 최신으로 덮어쓰고, 이미 있는 docs와 AGENTS.md는 건드리지 않는다.
`;

function runCli(argv: string[]) {
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

function runInit(target: string, source: string) {
  const stdout = capture();
  const stderr = capture();
  const code = run({ argv: ['init'], cwd: target, skillSourceDir: source, stdout, stderr });
  return { code, stdout: stdout.text(), stderr: stderr.text() };
}

test('R5: 첫 실행과 두 번째 실행의 출력이 spec의 예시와 같다', (t) => {
  const source = fakeSource(t);
  const target = tmpDir(t, 'target');

  assert.deepEqual(runInit(target, source), {
    code: 0,
    stderr: '',
    stdout: `harness init: ${target}

  created    .claude/skills/ai-sdlc/SKILL.md
  created    .claude/skills/ai-sdlc/templates.md
  created    docs/STATUS.md
  created    docs/specs/.gitkeep
  created    docs/archive/.gitkeep
  created    AGENTS.md

다음: AGENTS.md의 <TODO>에 실제 명령을 적고, Claude Code에서 /ai-sdlc 를 실행하세요.
`,
  });

  fs.writeFileSync(path.join(source, 'SKILL.md'), '# skill v2\n');

  assert.deepEqual(runInit(target, source), {
    code: 0,
    stderr: '',
    stdout: `harness init: ${target}

  updated    .claude/skills/ai-sdlc/SKILL.md
  unchanged  .claude/skills/ai-sdlc/templates.md
  skipped    docs/STATUS.md (이미 있음)
  skipped    docs/specs/ (이미 있음)
  skipped    docs/archive/ (이미 있음)
  skipped    AGENTS.md (이미 있음)
`,
  });
});

test('R9: 쓰지 못하면 경로와 이유를 stderr에 쓰고 1로 끝난다', (t) => {
  if (process.getuid?.() === 0) return t.skip('root는 읽기 전용 폴더에도 쓸 수 있다');
  const source = fakeSource(t);
  const target = tmpDir(t, 'target');
  fs.chmodSync(target, 0o555);

  const result = runInit(target, source);

  assert.equal(result.code, 1);
  assert.match(result.stderr, /^쓰지 못했습니다: \.claude\/skills\/ai-sdlc\/SKILL\.md \(EACCES: .+\)\n$/);
  assert.equal(result.stdout, `harness init: ${target}\n\n`);
  assert.deepEqual(fs.readdirSync(target), []);
});

test('R9: 중간에 실패하면 그때까지 한 일을 출력한다', (t) => {
  if (process.getuid?.() === 0) return t.skip('root는 읽기 전용 폴더에도 쓸 수 있다');
  const source = fakeSource(t);
  const target = tmpDir(t, 'target');
  fs.mkdirSync(path.join(target, 'docs'));
  fs.chmodSync(path.join(target, 'docs'), 0o555);

  const result = runInit(target, source);
  fs.chmodSync(path.join(target, 'docs'), 0o755);

  assert.equal(result.code, 1);
  assert.match(result.stderr, /^쓰지 못했습니다: docs\/STATUS\.md \(EACCES: .+\)\n$/);
  assert.ok(result.stdout.includes('  created    .claude/skills/ai-sdlc/SKILL.md\n'));
});

test('templates.md에 STATUS 양식이 없으면 아무것도 쓰지 않고 1로 끝난다', (t) => {
  const source = fakeSource(t);
  fs.writeFileSync(path.join(source, 'templates.md'), '# 양식 없음\n');
  const target = tmpDir(t, 'target');

  const result = runInit(target, source);

  assert.equal(result.code, 1);
  assert.equal(result.stderr, '오류: templates.md에서 "## docs/STATUS.md" 절을 찾지 못했습니다.\n');
  assert.deepEqual(fs.readdirSync(target), []);
});

test('bin: 임시 폴더에서 init을 실행하면 실제 스킬이 설치된다', (t) => {
  const target = tmpDir(t, 'target');

  const result = spawnSync(process.execPath, [bin, 'init'], { cwd: target, encoding: 'utf8' });

  assert.equal(result.status, 0);
  assert.deepEqual(
    fs.readFileSync(path.join(target, '.claude/skills/ai-sdlc/SKILL.md')),
    fs.readFileSync(path.join(repoRoot, '.claude/skills/ai-sdlc/SKILL.md')),
  );
});
