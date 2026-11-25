import { parseArgs } from 'node:util';

const USAGE_LINE = '사용법: harness init';

const HELP = `${USAGE_LINE}

  init    현재 폴더에 ai-sdlc 스킬, docs 뼈대, AGENTS.md를 만든다.
          스킬 파일은 항상 최신으로 덮어쓰고, 이미 있는 docs와 AGENTS.md는 건드리지 않는다.
`;

function parse(argv) {
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

export function run({ argv, cwd, skillSourceDir, stdout, stderr }) {
  const parsed = parse(argv);

  if (parsed && (parsed.values.help || parsed.positionals.length === 0)) {
    stdout.write(HELP);
    return 0;
  }

  if (parsed && parsed.positionals.length === 1 && parsed.positionals[0] === 'init') {
    stderr.write('init은 아직 구현되지 않았습니다.\n');
    return 1;
  }

  stderr.write(`알 수 없는 명령: ${argv.join(' ')}\n${USAGE_LINE}\n`);
  return 1;
}
