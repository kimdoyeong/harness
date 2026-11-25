import path from 'node:path';
import { parseArgs } from 'node:util';
import { init, WriteError, type InitResult } from './init.ts';

export interface Output {
  write(chunk: string): unknown;
}

export interface RunOptions {
  argv: string[];
  cwd: string;
  skillSourceDir: string;
  stdout: Output;
  stderr: Output;
}

const USAGE_LINE = '사용법: harness init';

const HELP = `${USAGE_LINE}

  init    현재 폴더에 ai-sdlc 스킬, docs 뼈대, AGENTS.md를 만든다.
          스킬 파일은 항상 최신으로 덮어쓰고, 이미 있는 docs와 AGENTS.md는 건드리지 않는다.
`;

const NEXT_STEP =
  '다음: AGENTS.md의 <TODO>에 실제 명령을 적고, Claude Code에서 /ai-sdlc 를 실행하세요.';

function report(targetDir: string, results: InitResult[]): string {
  const lines = [`harness init: ${targetDir}`, ''];
  for (const { path: file, status, note } of results) {
    lines.push(`  ${status.padEnd(11)}${file}${note ? ` (${note})` : ''}`);
  }
  if (results.some((r) => r.path === 'AGENTS.md' && r.status === 'created')) {
    lines.push('', NEXT_STEP);
  }
  return `${lines.join('\n')}\n`;
}

function parse(argv: string[]) {
  try {
    return parseArgs({
      args: argv,
      options: { help: { type: 'boolean', short: 'h' } },
      allowPositionals: true,
      strict: true,
    });
  } catch {
    return null;
  }
}

export function run({ argv, cwd, skillSourceDir, stdout, stderr }: RunOptions): number {
  const parsed = parse(argv);

  if (parsed && (parsed.values.help || parsed.positionals.length === 0)) {
    stdout.write(HELP);
    return 0;
  }

  if (parsed && parsed.positionals.length === 1 && parsed.positionals[0] === 'init') {
    const targetDir = path.resolve(cwd);
    try {
      stdout.write(report(targetDir, init({ targetDir, skillSourceDir })));
      return 0;
    } catch (error) {
      if (error instanceof WriteError) {
        stdout.write(report(targetDir, error.results));
        stderr.write(`${error.message}\n`);
      } else {
        stderr.write(`오류: ${error instanceof Error ? error.message : String(error)}\n`);
      }
      return 1;
    }
  }

  stderr.write(`알 수 없는 명령: ${argv.join(' ')}\n${USAGE_LINE}\n`);
  return 1;
}
